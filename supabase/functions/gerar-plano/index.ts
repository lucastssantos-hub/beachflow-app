// BeachFlow — Edge Function: gera diagnóstico + plano de treino via Claude API.
// A API key fica como secret no Supabase (ANTHROPIC_API_KEY), nunca no app.
// Regras pedagógicas = docs/ia-treinos-spec.md + casos em src/ia/testCasesBeachFlow.ts.
// Deploy: ver beachflow-app/supabase/README.md

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY");
// Default: Sonnet 4.6 — empatou com Opus 4.8 nos 5 casos de teste, mais barato/rápido.
// Override por requisição (body.model) restrito à allowlist abaixo.
const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `Você é a inteligência pedagógica do BeachFlow, copiloto de PROFESSORES de beach tennis. Não é um gerador genérico de treinos. Responda, com clareza e aplicabilidade na quadra: "Qual é o principal problema pedagógico desta turma/aluno agora, e qual treino resolve esse problema?"

PRINCÍPIO: todo plano nasce de um diagnóstico com evidência, nunca apenas do nível. Comece pelo PROBLEMA, nunca pelo exercício. Ordem: identificar alvo → nível → ler dados → achar gap → contexto do gap → intenção (estado) → método → plano compacto.

HIERARQUIA DOS DADOS (peso decrescente): 1) Scout recente com amostra suficiente; 2) Avaliação técnica do professor; 3) Histórico/evolução; 4) Autoavaliação do aluno; 5) Nível. A autoavaliação NÃO manda sozinha; se diverge do scout, prevalece o scout (e diga isso).

REGRA ANTI-GENÉRICO: cada plano precisa ser aplicável por um professor em quadra sem improvisar. Em cada bloco, escreva:
- quem participa e como organiza (filas, duplas, lado da quadra, quantidade por estação);
- onde o professor fica e como a bola começa (saque, bola lançada, feed da cesta, troca iniciada, ponto real);
- qual alvo/setor específico (cruzada, paralela, centro, fundo, zona entre a dupla, corpo, diagonal curta etc.);
- como os alunos rodam;
- qual métrica simples define sucesso/falha.
Se não houver dado suficiente, não preencha com treino padrão: gere uma aula diagnóstica específica para coletar o dado que falta.
PROIBIDO usar frases vagas como "melhorar consistência", "trabalhar posicionamento", "exercício de fundamentos", "manter a bola em jogo" sem contexto, setor, bola inicial e critério.

CONFIANÇA — calibre pela amostra do scout (pontosAnalisados) e convergência das fontes. Use 4 níveis:
- "muito baixa": scout < 10 pontos OU fontes divergentes sem confirmação.
- "baixa": evidência fraca/parcial (~10-20 pontos sem padrão nítido).
- "moderada": amostra razoável (~20-40 pontos) OU professor + scout convergindo.
- "alta": amostra grande (≈40+ pontos de scout) com padrão CLARO e fontes convergentes — nesse caso declare "alta", não seja conservador demais.
Nunca declare confiança alta com poucos pontos. Com confiança "muito baixa"/"baixa": trate o diagnóstico como HIPÓTESE, diga explicitamente a baixa confiança, peça MAIS PONTOS de observação e use scoutValidacao para validar antes de concluir. Nunca crie ciclo longo nesses casos.

NÍVEIS (apenas estes — tradução operacional das apostilas CBT Verde/Amarelo/Azul):
- INICIANTE (base do Verde): prioriza controle, continuidade, organização básica, redução de erro não forçado, posicionamento simples, segurança técnica (empunhadura, base, forehand, backhand, saque, lob, smash básico, gancho básico, bolas curtas). EVITAR: excesso de decisão, muitos alvos, pressão alta cedo, golpes avançados sem pré-requisito, finalização antes da continuidade. Treino: fechado (técnico básico) → semiaberto simples (já com execução mínima); aberto só com regra simples.
- INTERMEDIÁRIO (Verde fase II → Amarelo): prioriza direcionamento, construção do ponto, decisão simples, relação golpe↔intenção, transição defender/neutralizar/preparar/atacar; uso INICIAL de forehand anômalo, top spin, ventaglio, arcos QUANDO há pré-requisito técnico. EVITAR: finalização precipitada, aceleração sem vantagem, fechado sem transferência, golpe avançado como solução universal. Treino: semiaberto, sequência 2-3 bolas, jogo condicionado com poucas regras, alvos claros.
- AVANÇADO (Amarelo avançado/Azul): prioriza leitura de contexto, variação tática, pressão com controle, gestão de risco/tempo, decisão sob pressão, combinações, SETORES da quadra, ritmo, plano de jogo, hierarquia de pontos/games, dupla como unidade. EVITAR: fundamento genérico sem contexto, repetição sem decisão, exercício que não transfere, verdades absolutas que engessam a leitura. Treino: jogo condicionado, cenários, sequência com decisão, scout de validação. Em problema espacial cite sempre o SETOR exato (centro, zona entre a dupla, paralela/cruzada) e a comunicação da dupla; proibido "melhorar posicionamento" genérico.

GAP ESPACIAL/COBERTURA (espaço explorado pelo adversário, zona entre a dupla, abertura após uma bola): o estado costuma ser "direcionar"; nomeie o SETOR exato (ex.: centro, zona entre os jogadores), descreva o gatilho ("após a bola cruzada") e trate a COMUNICAÇÃO da dupla. Não use "reorganizar" quando o problema é cobrir um setor específico.
GAP DE SAQUE: conecte sempre o saque à próxima ação — saque COM DIREÇÃO/alvo → devolução previsível → organização da TERCEIRA BOLA → recuperação de base/posição após sacar. Nunca trate saque como golpe isolado.

MÉTODO (escolha exatamente um): "fechado" (repetição controlada, sem decisão), "semiaberto" (variação/decisão limitada), "aberto" (jogo condicionado/decisão real). Gap de execução pede fechado→semiaberto; gap de decisão/tática pede semiaberto→aberto. Iniciante com erro alto começa fechado.

ESTADO/INTENÇÃO: estabilizar, direcionar, construir, ganhar/tirar tempo, pressionar, finalizar, recuperar, reorganizar, reduzir erro não forçado.

TAXONOMIA OPERACIONAL:
- Fundamentos base: Saque, Devolução, Forehand, Backhand, Lob, Bolas curtas, Smash, Gancho.
- Recursos intermediários/avançados: Forehand anômalo, Ventaglio/Rainbow, Top spin (forehand/backhand/saque/lob), Defesa em arco inferior/superior, Gancho inside out, Fast hand, Saque com top spin/na subida.
- Componentes operacionais: Bandeja/controle de bola alta, Tapa/Acelerada/Espetada, Bloqueio, Controle próximo à rede, Bola neutra/de continuidade/de construção/de pressão/de finalização.
- Componentes táticos: Posicionamento, Leitura de jogo, Constância, Gestão de risco/tempo, Cobertura de quadra, Comunicação da dupla, Controle de ritmo, Setores da quadra, Plano de jogo, Hierarquia de pontos/games.

REGRAS TÉCNICAS OBRIGATÓRIAS:
- Voleio NÃO é golpe autônomo — especifique a ação: forehand/backhand dinâmico ou estático, bloqueio, controle próximo à rede, direcionamento, continuidade. (Errado: "treinar voleio". Certo: "forehand dinâmico em bola lenta, contato alto, direção definida".)
- Bandeja = componente de CONTROLE de bola alta (manter o ponto, ganhar tempo, controlar, preparar a próxima bola), NUNCA sinônimo de smash nem de finalização.
- Smash = ofensivo quando há condição real de ataque. NÃO prescrever quando o problema é controle, bola baixa, leitura ruim, desorganização, devolução instável ou erro não forçado. Iniciante: smash básico/controlado, não como prioridade de finalização.
- Backhand NÃO é a primeira opção genérica de aceleração (sobretudo iniciante/intermediário sem domínio); sem vantagem, prefira lob, bola neutra, profunda de continuidade, controle, defesa p/ ganhar tempo. PERMITIDO top spin de backhand em intermediário-avançado/avançado, em contexto específico (bola lenta, leitura adequada, reduzir o tempo do adversário). Bloqueie "acelerar de backhand para resolver o ponto" genérico.
- Bola média-alta/alta (ofensiva): opções = forehand dinâmico/anômalo, ventaglio/rainbow, tapa/acelerada/espetada, smash (se houver condição), gancho, controle de bola alta (se a intenção é organizar), top spin (controlar trajetória). SEMPRE relacione golpe + altura da bola + posição em quadra + equilíbrio + intenção + nível.
- Forehand anômalo: bola lenta/flutuante no lado do backhand, dentro do raio de ação, p/ ação mais agressiva. NÃO para iniciante sem domínio de forehand, movimentação e contato.
- Ventaglio/Rainbow: recurso de forehand no quadrante superior do lado não dominante; só com contexto claro (bola alta, leitura de tempo, domínio). Não é "nome bonito" para qualquer bola alta no backhand.
- Top spin: efeito p/ controlar trajetória e reduzir o tempo de reorganização do adversário; não prescrever a quem não controla contato/empunhadura/trajetória.
- Arcos (inferior/superior): defesas AVANÇADAS (recuo, base baixa, ganhar tempo); não para iniciantes.

CICLO PEDAGÓGICO: sugira só quando o problema claramente exige mais de uma aula (ex.: saque + organização de terceira bola), com duração ~2 semanas e justificativa. NUNCA crie ciclo sem necessidade nem com confiança muito baixa.

ESTILO: compacto, legível na quadra em < 60s. Sem texto acadêmico, sem "melhorar performance". Cada campo: 1-2 frases diretas, sem repetir o que já está em outro campo.

SAÍDA: responda SOMENTE com JSON válido (sem markdown, sem texto fora do JSON):
{
  "titulo": "string curta",
  "diagnostico": {
    "gapPrincipal": "o problema mais relevante agora",
    "contexto": "onde o gap aparece (situação de jogo/bola)",
    "fonte": "scout | avaliação do professor | histórico | autoavaliação | nível",
    "confianca": "muito baixa | baixa | moderada | alta",
    "justificativaConfianca": "1 frase ligada à amostra do scout / convergência das fontes"
  },
  "nivel": "Iniciante | Intermediário | Avançado",
  "decisaoPedagogica": {
    "estado": "intenção pedagógica",
    "metodo": "fechado | semiaberto | aberto",
    "focoTecnico": "fundamento da taxonomia",
    "focoTatico": "decisão/comportamento a treinar"
  },
  "objetivo": "o que a aula precisa melhorar",
  "blocos": [
    { "nome": "Bloco 1 — Aquecimento específico", "tempo": "10'", "organizacao": "inclua posições/duplas/filas", "bola_inicial": "como começa", "alvo_setor": "setor/alvo", "rotacao": "como roda", "comando": "string", "criterio_qualidade": "métrica observável" },
    { "nome": "Bloco 2 — Exercício principal", "tempo": "25'", "organizacao": "inclua posição do professor", "bola_inicial": "como começa", "alvo_setor": "setor/alvo", "rotacao": "como roda", "regra": "string", "correcao_principal": "string", "erro_a_observar": "string" },
    { "nome": "Bloco 3 — Jogo condicionado", "tempo": "15'", "organizacao": "duplas/lados/entrada e saída", "bola_inicial": "como começa", "alvo_setor": "setor/alvo", "rotacao": "como roda", "regra": "string", "pontuacao_especial": "string", "observar": "string" },
    { "nome": "Bloco 4 — Fechamento", "tempo": "10'", "organizacao": "como reunir/validar", "bola_inicial": "se houver bola, como começa; senão diga sem bola", "alvo_setor": "o que validar", "rotacao": "quem executa/observa", "pergunta_final": "string", "registro_professor": "string", "proximo_passo": "string" }
  ],
  "progressao": "quando aumentar a complexidade",
  "regressao": "quando simplificar",
  "scoutValidacao": "o que observar no scout para validar a transferência ao jogo",
  "cicloPedagogico": { "necessario": true, "duracaoSemanas": 0, "justificativa": "string (ou por que não é necessário)" }
}`;

function buildUserMessage(ctx: Record<string, unknown> = {}): string {
  return [
    "Dados disponíveis (JSON):",
    JSON.stringify(ctx, null, 2),
    "",
    "Resumo crítico extraído:",
    summarizeContext(ctx),
    "",
    "Instruções:",
    "- Siga a hierarquia de dados e calibre a confiança pela amostra do scout (pontosAnalisados).",
    "- Se houver alunos/avaliações/scout no JSON, use esses dados no diagnóstico; não gere plano apenas pelo nível.",
    "- Cada bloco precisa trazer bola inicial, alvo/setor, rotação e critério mensurável.",
    "- Respeite as técnicas permitidas/bloqueadas para o nível da turma.",
    "- Gere o diagnóstico e o plano SOMENTE no formato JSON exigido.",
  ].join("\n");
}

function summarizeContext(ctx: Record<string, any> = {}): string {
  const parts: string[] = [];
  if (ctx.alvo || ctx.nome || ctx.nivel) parts.push(`Alvo: ${ctx.alvo || "turma"} ${ctx.nome || ""} · nível ${ctx.nivel || "não informado"}.`);
  if (ctx.alunosMatriculados != null) parts.push(`Turma com ${ctx.alunosMatriculados} aluno(s) matriculado(s).`);
  const prof = Object.entries(ctx.avaliacaoProfessor || {}).sort((a, b) => Number(a[1]) - Number(b[1])).slice(0, 3);
  if (prof.length) parts.push(`Menores notas do professor: ${prof.map(([f, v]) => `${f} ${v}/5`).join(", ")}.`);
  const auto = Object.entries(ctx.autoavaliacao || {}).sort((a, b) => Number(a[1]) - Number(b[1])).slice(0, 3);
  if (auto.length) parts.push(`Menores autoavaliações: ${auto.map(([f, v]) => `${f} ${v}/5`).join(", ")}.`);
  const scout = ctx.scout || {};
  if (scout.totalEventos || scout.pontosAnalisados) parts.push(`Scout: ${scout.totalEventos || scout.pontosAnalisados} evento(s)/ponto(s), ${scout.erros ?? "?"} erro(s), ${scout.winners ?? "?"} winner(s).`);
  if (scout.erroPrincipal) parts.push(`Erro principal no scout: ${scout.erroPrincipal.fundamento} (${scout.erroPrincipal.total}).`);
  if (scout.zonaCritica) parts.push(`Zona crítica: ${scout.zonaCritica.zona}.`);
  if (Array.isArray(ctx.evidenciasScout) && ctx.evidenciasScout.length) parts.push(`Evidências do scout: ${ctx.evidenciasScout.join(" | ")}.`);
  if (Array.isArray(ctx.alunos) && ctx.alunos.length) {
    const individual = ctx.alunos
      .map((a: any) => {
        const bits = [a.nome, a.foco ? `foco ${a.foco}` : "", a.scout?.leitura ? `scout: ${a.scout.leitura}` : ""].filter(Boolean);
        return bits.join(" · ");
      })
      .slice(0, 6);
    parts.push(`Alunos considerados: ${individual.join("; ")}.`);
  }
  if (ctx.observacoes) parts.push(`Observações do professor/app: ${ctx.observacoes}`);
  return parts.length ? parts.join("\n") : "Poucos dados reais. Gere plano diagnóstico e declare baixa confiança.";
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

function extractJsonObject(s: string): string {
  const cleaned = stripFences(s);
  const start = cleaned.indexOf("{");
  if (start < 0) return cleaned;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escaped) { escaped = false; continue; }
    if (ch === "\\") { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }
  return cleaned.slice(start);
}

function normalizePlano(plano: any): any {
  const metodo = String(plano?.decisaoPedagogica?.metodo || "").toLowerCase();
  if (metodo) {
    let normalized = plano.decisaoPedagogica.metodo;
    if (metodo.includes("aberto") && !metodo.includes("semi")) normalized = "aberto";
    else if (metodo.includes("semi")) normalized = "semiaberto";
    else if (metodo.includes("fechado")) normalized = "fechado";
    plano.decisaoPedagogica.metodo = normalized;
  }
  plano.blocos = (plano.blocos || []).map((b: any) => ({
    bola_inicial: "Definir claramente como a bola começa neste bloco.",
    alvo_setor: "Definir setor/alvo antes de iniciar.",
    rotacao: "Rodar após a sequência para todos passarem pela função principal.",
    ...b,
  }));
  return plano;
}

// Deriva o id do professor do JWT (o gateway do Supabase já valida o token).
// Logado => auth.uid() (sub); anônimo => fallback (id local do cliente).
function teacherFromReq(req: Request, fallback?: string): string {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (payload.role === "authenticated" && payload.sub) return payload.sub;
  } catch { /* anon */ }
  return fallback || "anon";
}

// ---- persistência (service role, RLS bloqueia acesso direto do cliente) ----
const SB_URL = Deno.env.get("SUPABASE_URL");
const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const sbHeaders = {
  "content-type": "application/json",
  apikey: SB_SERVICE || "",
  Authorization: `Bearer ${SB_SERVICE || ""}`,
};
async function dbInsertPlano(row: Record<string, unknown>): Promise<string | null> {
  if (!SB_URL || !SB_SERVICE) return null;
  const res = await fetch(`${SB_URL}/rest/v1/planos`, {
    method: "POST",
    headers: { ...sbHeaders, Prefer: "return=representation" },
    body: JSON.stringify(row),
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.id ?? null;
}
async function dbSaveEdicao(id: string, planoEditado: unknown): Promise<boolean> {
  if (!SB_URL || !SB_SERVICE) return false;
  const res = await fetch(`${SB_URL}/rest/v1/planos?id=eq.${id}`, {
    method: "PATCH",
    headers: sbHeaders,
    body: JSON.stringify({ plano_editado: planoEditado, editado_em: new Date().toISOString() }),
  });
  return res.ok;
}
async function dbInsertAvaliacao(row: Record<string, unknown>): Promise<boolean> {
  if (!SB_URL || !SB_SERVICE) return false;
  const res = await fetch(`${SB_URL}/rest/v1/avaliacoes`, {
    method: "POST", headers: sbHeaders, body: JSON.stringify(row),
  });
  return res.ok;
}
async function dbListar(teacherId: string): Promise<unknown[]> {
  if (!SB_URL || !SB_SERVICE) return [];
  const q = `teacher_id=eq.${encodeURIComponent(teacherId)}&order=criado_em.desc&limit=30`;
  const res = await fetch(`${SB_URL}/rest/v1/planos?${q}`, { headers: sbHeaders });
  return res.ok ? await res.json() : [];
}
// aprendizado coletivo: edições recentes aprovadas por professores (de todos)
async function dbRecentEdicoes(limit = 3): Promise<any[]> {
  if (!SB_URL || !SB_SERVICE) return [];
  const q = `plano_editado=not.is.null&order=editado_em.desc.nullslast&limit=${limit}&select=plano_editado`;
  const res = await fetch(`${SB_URL}/rest/v1/planos?${q}`, { headers: sbHeaders });
  return res.ok ? await res.json() : [];
}
function exemplosBlock(rows: any[]): string {
  if (!rows.length) return "";
  const ex = rows.map((r, i) => {
    const p = r.plano_editado || {};
    const blocos = (p.blocos || []).map((b: any) =>
      `  - ${b.nome}: ${(b.organizacao || b.regra || b.comando || "").slice(0, 90)}`).join("\n");
    return `Exemplo ${i + 1}:\nTítulo: ${p.titulo}\nObjetivo: ${p.objetivo}\nMétodo: ${p.decisaoPedagogica?.metodo}\n${blocos}`;
  }).join("\n\n");
  return `\n\nEXEMPLOS DE PLANOS REFINADOS POR PROFESSORES REAIS (referência de estilo e profundidade — NÃO copie; adapte ao diagnóstico atual):\n${ex}`;
}

// Conhecimento do professor (roteiros por fundamento) — RAG a partir da metodologia dele.
async function dbKnowledge(teacherId: string): Promise<any[]> {
  if (!SB_URL || !SB_SERVICE) return [];
  const q = `teacher_id=eq.${teacherId}&approved=eq.true&select=fundamental,lesson_summary&limit=40`;
  const res = await fetch(`${SB_URL}/rest/v1/ai_training_knowledge?${q}`, { headers: sbHeaders });
  return res.ok ? await res.json() : [];
}
// fundamentos prováveis do gap, a partir do contexto (scout + avaliação + foco)
function pickFundamentos(ctx: any): string[] {
  const score: Record<string, number> = {};
  for (const p of (ctx.scout?.padroes || [])) score[p.fundamento] = (score[p.fundamento] || 0) + (p.frequencia || 1) * 2;
  if (ctx.scout?.erroPrincipal?.fundamento) score[ctx.scout.erroPrincipal.fundamento] = (score[ctx.scout.erroPrincipal.fundamento] || 0) + (ctx.scout.erroPrincipal.total || 3) * 2;
  for (const [f, v] of Object.entries(ctx.scout?.errosPorFundamento || {})) score[f] = (score[f] || 0) + Number(v) * 2;
  for (const [f, v] of Object.entries(ctx.avaliacaoProfessor || {})) score[f] = (score[f] || 0) + Math.max(0, 5 - Number(v));
  if (ctx.foco) score[ctx.foco] = (score[ctx.foco] || 0) + 3;
  return Object.entries(score).sort((a, b) => b[1] - a[1]).map(([f]) => f).slice(0, 3);
}
const FUND_ALIAS: Record<string, string> = { tapa: 'acelerada', espetada: 'acelerada', 'bolas curtas': 'curta', bandeja: 'aproximação', recepção: 'devolução' };
function knowledgeBlock(rows: any[], fundamentos: string[]): string {
  if (!rows.length || !fundamentos.length) return "";
  const norm = (s: string) => (s || '').toLowerCase();
  const wanted = fundamentos.flatMap((f) => { const n = norm(f); return [n, FUND_ALIAS[n], ...n.split('/').map((x) => x.trim())].filter(Boolean); });
  const sel = rows.filter((r) => { const rf = norm(r.fundamental); return wanted.some((w) => rf.includes(w) || w.includes(rf)); }).slice(0, 2);
  if (!sel.length) return "";
  const txt = sel.map((r) => `### ${r.fundamental}\n${(r.lesson_summary || '').replace(/^\[Master_V1\]\s*/, '')}`).join("\n\n");
  return `\n\nROTEIRO METODOLÓGICO DO PROFESSOR (base técnica oficial da metodologia dele — fundamente os blocos, sobretudo as correções e a organização, neste roteiro; NÃO copie cru, adapte ao diagnóstico e ao nível):\n${txt}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const { context, model, action, id, planoEditado, teacherId, alunoId, notas, notaLivre } = body;
    const uid = teacherFromReq(req, teacherId); // auth.uid() se logado, senão id local

    // ações de persistência (não chamam a IA)
    if (action === "salvarEdicao") {
      const ok = await dbSaveEdicao(id, planoEditado);
      return new Response(JSON.stringify({ ok }), { headers: { ...cors, "content-type": "application/json" } });
    }
    if (action === "salvarAvaliacao") {
      const ok = await dbInsertAvaliacao({ teacher_id: uid, aluno_id: alunoId, notas, nota_livre: notaLivre ?? null });
      return new Response(JSON.stringify({ ok }), { headers: { ...cors, "content-type": "application/json" } });
    }
    if (action === "listar") {
      const planos = await dbListar(uid);
      return new Response(JSON.stringify({ planos }), { headers: { ...cors, "content-type": "application/json" } });
    }

    if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY não configurada no Supabase");
    // allowlist de modelos (evita override arbitrário a partir do cliente)
    const ALLOWED = ["claude-opus-4-8", "claude-sonnet-4-6"];
    const chosen = ALLOWED.includes(model) ? model : MODEL;

    // monta a mensagem: dados + exemplos aprovados + roteiro metodológico (RAG)
    const fundamentos = pickFundamentos(context || {});
    const conhecimento = await dbKnowledge(uid);
    const userContent = buildUserMessage(context || {})
      + exemplosBlock(await dbRecentEdicoes(3))
      + knowledgeBlock(conhecimento, fundamentos);

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: chosen,
        max_tokens: 2600,
        temperature: 0.35,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      throw new Error(`Anthropic ${r.status}: ${t.slice(0, 400)}`);
    }

    const data = await r.json();
    const text: string = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("");

    let plano: any;
    let parseOk = true;
    try {
      plano = normalizePlano(JSON.parse(extractJsonObject(text)));
    } catch {
      plano = { _raw: text, _parseError: true };
      parseOk = false;
    }

    // persiste o plano gerado (não bloqueia a resposta se falhar)
    let savedId: string | null = null;
    if (parseOk) {
      try {
        savedId = await dbInsertPlano({
          teacher_id: uid,
          escopo: context?.alvo ?? null,
          nome: context?.nome ?? null,
          contexto: context ?? null,
          plano,
          modelo: chosen,
        });
      } catch { /* persistência é best-effort */ }
    }

    return new Response(JSON.stringify({ plano, id: savedId, usage: data.usage }), {
      headers: { ...cors, "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500,
      headers: { ...cors, "content-type": "application/json" },
    });
  }
});
