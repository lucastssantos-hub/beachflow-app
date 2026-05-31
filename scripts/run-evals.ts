// Roda os casos de teste contra a Edge Function ao vivo e pontua vs. o checklist.
// Matcher concept/synonym-aware (reflete presença de conceito, não frase literal).
// Uso:
//   npx tsx scripts/run-evals.ts                 (modelo default da função)
//   npx tsx scripts/run-evals.ts claude-sonnet-4-6   (força um modelo via override)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { BEACHFLOW_TEST_CASES } from "../src/ia/testCasesBeachFlow.ts";

// --- ler .env ---
const env: Record<string, string> = {};
try {
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
} catch { /* sem .env */ }

const ENDPOINT = env.VITE_GERAR_PLANO_ENDPOINT;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const MODEL_OVERRIDE = process.argv[2]; // opcional
if (!ENDPOINT || !ANON) { console.error("Faltam VITE_GERAR_PLANO_ENDPOINT / VITE_SUPABASE_ANON_KEY no .env"); process.exit(1); }

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const asArr = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v]);

// --- grupos de sinônimos do domínio (beach tennis pedagógico) ---
const SYN_GROUPS: string[][] = [
  ["validar", "validacao", "confirmar", "confirmacao", "checar", "verificar", "testar"],
  ["pontos", "observacao", "observacoes", "amostra", "dados", "evidencia", "evidencias", "coletar", "registrar"],
  ["hipotese", "preliminar", "provisorio", "presumido", "incerto", "incerteza"],
  ["baixa", "pouca", "minima", "fraca"],
  ["base", "equilibrio", "pes", "postura", "ajuste", "estabilidade", "parada"],
  ["controle", "controlada", "controlado", "margem", "seguranca", "segura"],
  ["continuidade", "continuar", "sequencia", "rali", "troca", "manter"],
  ["vantagem", "oportunidade", "favoravel"],
  ["acelerar", "aceleracao", "atacar", "ataque", "agressiva", "agressividade", "winner", "finalizar", "forcar"],
  ["decisao", "decidir", "escolha", "escolher", "leitura", "ler", "reconhecer", "identificar"],
  ["terceira", "terceirabola"],
  ["recuperacao", "recuperar", "reposicionar", "voltar", "reposicionamento"],
  ["centro", "meio", "miolo", "central"],
  ["zona", "setor", "espaco", "area", "regiao"],
  ["comunicacao", "comunicar", "chamar", "avisar", "combinar", "dupla", "parceiro"],
  ["cruzada", "cruzado", "diagonal"],
  ["devolucao", "devolver", "recepcao", "responder"],
  ["direcao", "direcionar", "alvo", "direcionada", "direcionado"],
  ["previsivel", "previsibilidade", "consistente", "consistencia", "constancia"],
  ["saque", "servico", "sacar"],
  ["profundo", "profundidade", "fundo"],
];
const synLookup: Record<string, Set<string>> = {};
for (const g of SYN_GROUPS) for (const w of g) synLookup[w] = new Set(g);

const STOP = new Set(["de", "da", "do", "das", "dos", "a", "o", "e", "em", "no", "na", "nos", "nas",
  "sem", "com", "para", "por", "que", "se", "ao", "aos", "os", "as", "um", "uma", "antes", "depois",
  "mais", "menos", "the", "como", "quando", "onde", "sua", "seu", "essa", "esse", "isso", "ja"]);

function sigTokens(phrase: string): string[] {
  return norm(phrase).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !STOP.has(w));
}
function tokenPresent(tok: string, blob: string): boolean {
  if (blob.includes(tok)) return true;
  const group = synLookup[tok];
  if (group) for (const alt of group) if (blob.includes(alt)) return true;
  // raiz: tenta prefixo de 5 chars (devoluc -> devolucao/devolver)
  if (tok.length >= 6 && blob.includes(tok.slice(0, 5))) return true;
  return false;
}
// 1.0 coberto, 0.5 parcial, 0 ausente
function phraseCoverage(phrase: string, blob: string): { frac: number; missing: string[] } {
  const toks = sigTokens(phrase);
  if (!toks.length) return { frac: blob.includes(norm(phrase)) ? 1 : 0, missing: [] };
  const missing = toks.filter((t) => !tokenPresent(t, blob));
  return { frac: (toks.length - missing.length) / toks.length, missing };
}
// deveEvitar com detecção de negação (não punir "não usar smash")
const NEG = ["nao", "evite", "evitar", "sem", "nunca", "em vez", "ao inves", "jamais", "proibido", "no lugar"];
function isPrescribed(term: string, blob: string): boolean {
  const t = norm(term);
  let idx = blob.indexOf(t);
  while (idx !== -1) {
    const ctx = blob.slice(Math.max(0, idx - 30), idx);
    if (!NEG.some((n) => ctx.includes(n))) return true; // ocorrência não negada => prescrito
    idx = blob.indexOf(t, idx + t.length);
  }
  return false;
}

mkdirSync(new URL("../.evals", import.meta.url), { recursive: true });
const tag = MODEL_OVERRIDE ? `-${MODEL_OVERRIDE}` : "";

let totalScore = 0, maxScore = 0;
const resumo: string[] = [];

for (const tc of BEACHFLOW_TEST_CASES as any[]) {
  process.stdout.write(`\n▶ ${tc.id} — ${tc.nome}\n`);
  let plano: any;
  try {
    const body: any = { context: tc.input };
    if (MODEL_OVERRIDE) body.model = MODEL_OVERRIDE;
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON}`, apikey: ANON },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    plano = data.plano;
  } catch (e) {
    console.log("  ✗ erro de rede:", (e as Error).message);
    continue;
  }
  writeFileSync(new URL(`../.evals/${tc.id}${tag}.json`, import.meta.url), JSON.stringify(plano, null, 2));

  const exp = tc.esperado;
  const blob = norm(JSON.stringify(plano));
  const checks: string[] = [];
  let score = 0, max = 0;

  const okStruct = plano && plano.diagnostico && plano.decisaoPedagogica;
  max++; if (okStruct) { score++; checks.push("✓ estrutura"); } else checks.push("✗ estrutura inválida");

  if (exp.metodoPermitido) {
    max++;
    const metodo = norm(plano?.decisaoPedagogica?.metodo || "");
    const ok = exp.metodoPermitido.some((m: string) => metodo.includes(norm(m)));
    checks.push(`${ok ? "✓" : "✗"} método "${plano?.decisaoPedagogica?.metodo}"${ok ? "" : ` ∉ [${exp.metodoPermitido}]`}`);
    if (ok) score++;
  }
  if (exp.confiancaEsperada) {
    max++;
    const conf = norm(plano?.diagnostico?.confianca || "");
    const ok = asArr(exp.confiancaEsperada).some((c: string) => norm(c) === conf || conf.includes(norm(c)));
    checks.push(`${ok ? "✓" : "✗"} confiança "${plano?.diagnostico?.confianca}"${ok ? "" : ` ≠ [${asArr(exp.confiancaEsperada)}]`}`);
    if (ok) score++;
  }
  if (exp.estado) {
    max++;
    const estado = norm(plano?.decisaoPedagogica?.estado || "");
    const ok = asArr(exp.estado).some((e: string) => estado.includes(norm(e)) || tokenPresent(norm(e), estado));
    checks.push(`${ok ? "✓" : "✗"} estado "${plano?.decisaoPedagogica?.estado}"${ok ? "" : ` ≠ [${asArr(exp.estado)}]`}`);
    if (ok) score++;
  }
  // conteúdo: cobertura conceitual (vale 3 pts)
  if (exp.deveConter?.length) {
    max += 3;
    let cov = 0; const full: string[] = [], part: string[] = [], miss: string[] = [];
    for (const phrase of exp.deveConter) {
      const { frac } = phraseCoverage(phrase, blob);
      cov += frac >= 0.6 ? 1 : frac >= 0.34 ? 0.5 : 0;
      (frac >= 0.6 ? full : frac >= 0.34 ? part : miss).push(phrase);
    }
    const frac = cov / exp.deveConter.length;
    score += Math.round(frac * 3);
    checks.push(`${frac >= 0.7 ? "✓" : frac >= 0.4 ? "△" : "✗"} conteúdo ${cov.toFixed(1)}/${exp.deveConter.length}` +
      (miss.length ? ` · faltou: ${miss.join("; ")}` : "") + (part.length ? ` · parcial: ${part.join("; ")}` : ""));
  }
  // deveEvitar (negação-aware)
  if (exp.deveEvitar?.length) {
    max++;
    const viol = exp.deveEvitar.filter((t: string) => isPrescribed(t, blob));
    checks.push(viol.length ? `⚠ prescreveu termo a evitar: ${viol.join(", ")}` : "✓ sem técnicas proibidas prescritas");
    if (!viol.length) score++;
  }

  for (const c of checks) console.log("   " + c);
  console.log(`   → ${score}/${max}`);
  totalScore += score; maxScore += max;
  resumo.push(`${tc.id.padEnd(40)} ${score}/${max}`);
}

console.log(`\n========== RESUMO ${MODEL_OVERRIDE ? `(${MODEL_OVERRIDE})` : "(modelo default)"} ==========`);
for (const r of resumo) console.log("  " + r);
console.log(`  TOTAL: ${totalScore}/${maxScore} (${Math.round((totalScore / maxScore) * 100)}%)`);
console.log(`  Planos salvos em beachflow-app/.evals/*${tag}.json`);
