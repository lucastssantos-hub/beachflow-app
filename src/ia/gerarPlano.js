// BeachFlow — cliente da IA de treinos.
// Chama a Edge Function do Supabase (que guarda a API key e fala com a Claude).
// Se o endpoint não estiver configurado/acessível, cai num PLANO DE EXEMPLO
// (caso §13 do spec) para a interface continuar funcionando.

const ENDPOINT = import.meta.env.VITE_GERAR_PLANO_ENDPOINT || '';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const FORCE_DEMO = import.meta.env.VITE_FORCE_DEMO === 'true';

// Plano de exemplo no contrato JSON aninhado (espelha a Edge Function).
export const SAMPLE_PLAN = {
  titulo: 'Devolução cruzada estável',
  diagnostico: {
    gapPrincipal: 'Devolução instável',
    contexto: 'Contra saque profundo, ao tentar acelerar a devolução sem equilíbrio',
    fonte: 'scout',
    confianca: 'moderada',
    justificativaConfianca: 'Scout aponta o padrão e a avaliação do professor confirma (devolução 2/5), mas a amostra ainda é pequena.',
  },
  nivel: 'Intermediário',
  decisaoPedagogica: {
    estado: 'Estabilizar',
    metodo: 'semiaberto',
    focoTecnico: 'Devolução',
    focoTatico: 'Devolver para continuar o ponto em vez de resolver cedo demais',
  },
  objetivo: 'Estabilizar a devolução cruzada antes de buscar agressividade.',
  blocos: [
    {
      nome: 'Bloco 1 — Aquecimento específico',
      tempo: "10'",
      organizacao: 'Duas colunas, devolução controlada com alvo amplo',
      comando: 'Equilíbrio antes da batida, base parada no momento do contato',
      criterio_qualidade: 'Bola passa com margem e cai na zona de continuidade',
    },
    {
      nome: 'Bloco 2 — Exercício principal',
      tempo: "25'",
      organizacao: 'Saque profundo + devolução cruzada, sem buscar winner',
      regra: 'Vale só a devolução que entra cruzada e dá sequência',
      correcao_principal: 'Reduzir a aceleração e priorizar direção/altura segura',
      erro_a_observar: 'Tentar acelerar a devolução em desequilíbrio',
    },
    {
      nome: 'Bloco 3 — Jogo condicionado',
      tempo: "15'",
      regra: 'Ponto só conta se a devolução entrar na zona de continuidade',
      pontuacao_especial: 'Devolução cruzada que mantém o rali vale 2',
      observar: 'A dupla devolve para construir ou tenta encerrar precoce?',
    },
    {
      nome: 'Bloco 4 — Fechamento',
      tempo: "10'",
      pergunta_final: 'Você devolveu para continuar o ponto ou tentou resolver cedo demais?',
      registro_professor: 'Anotar quem ainda acelera a devolução sob pressão',
      proximo_passo: 'Subir a pressão do saque quando a devolução estabilizar',
    },
  ],
  progressao: 'Aumentar a pressão/velocidade do saque quando a turma mantiver controle da devolução.',
  regressao: 'Reduzir a velocidade do saque e ampliar o alvo se os erros continuarem altos.',
  scoutValidacao: 'Contar devoluções que entram na zona de continuidade vs. erros de devolução sob saque profundo.',
  cicloPedagogico: { necessario: false, duracaoSemanas: 0, justificativa: 'Gap de execução resolvível em uma aula; reavaliar com novo scout.' },
};

function nivelFromTurma(turma = '') {
  const t = turma.toLowerCase();
  if (t.includes('inicia')) return 'Iniciante';
  if (t.includes('avanç') || t.includes('avanc')) return 'Avançado';
  return 'Intermediário';
}

// Store de avaliações do professor (alimenta a IA com dados reais quando o prof avalia).
// alunoId -> { notas: {Fundamento: 0-5}, notaLivre }
const _avaliacoes = new Map();
export function setAvaliacao(alunoId, data) { _avaliacoes.set(alunoId, data); }
export function getAvaliacao(alunoId) { return _avaliacoes.get(alunoId); }

// Monta o contexto a partir dos params da tela (aluno ou turma).
export function contextFromParams(params = {}) {
  const a = params.aluno;
  if (a) {
    const av = _avaliacoes.get(a.id); // avaliação manual feita na tela (override mais recente)
    const isReal = a.notasProf !== undefined || a.notasAuto !== undefined; // aluno vindo do banco
    let avaliacaoProfessor, autoavaliacao;
    if (av && av.notas && Object.keys(av.notas).length) {
      avaliacaoProfessor = { ...av.notas };
    } else if (a.notasProf && Object.keys(a.notasProf).length) {
      avaliacaoProfessor = { ...a.notasProf }; // notas reais do professor (todos os fundamentos)
    } else if (!isReal) {
      // aluno mock: deriva do radar
      const labels = ['Saque', 'Ataque', 'Defesa', 'Posicionamento', 'Constância', 'Devolução'];
      avaliacaoProfessor = {};
      (a.radar || []).forEach((v, i) => { avaliacaoProfessor[labels[i]] = Math.round(v * 5 * 10) / 10; });
    } // aluno real sem avaliação do professor: avaliacaoProfessor fica indefinido (IA usa autoaval com menor confiança)
    if (a.notasAuto && Object.keys(a.notasAuto).length) {
      autoavaliacao = { ...a.notasAuto };
    } else if (!isReal) {
      const autoLabels = ['Confiança no saque', 'Leitura de jogo', 'Constância', 'Recepção'];
      autoavaliacao = {};
      (a.auto || []).forEach((v, i) => { autoavaliacao[autoLabels[i]] = Math.round(v * 100) + '%'; });
    }
    return {
      alvo: 'aluno', nome: a.nome, nivel: a.nivel || nivelFromTurma(a.turma), foco: a.foco,
      ...(avaliacaoProfessor && Object.keys(avaliacaoProfessor).length ? { avaliacaoProfessor } : {}),
      ...(autoavaliacao && Object.keys(autoavaliacao).length ? { autoavaliacao } : {}),
      ...(a.notasScout && Object.keys(a.notasScout).length ? { avaliacaoScout: a.notasScout } : {}),
      ...(a.scoutResumo ? {
        scout: a.scoutResumo,
        scoutEventosRecentes: a.scoutResumo.eventosRecentes || [],
        evidenciasScout: [
          `${a.scoutResumo.totalEventos} evento(s) individuais do Scout`,
          a.scoutResumo.erroPrincipal ? `erro principal: ${a.scoutResumo.erroPrincipal.fundamento} (${a.scoutResumo.erroPrincipal.total})` : '',
          a.scoutResumo.zonaCritica ? `zona crítica: ${a.scoutResumo.zonaCritica.zona}` : '',
          a.scoutResumo.leitura || '',
        ].filter(Boolean),
      } : {}),
      ...(av && av.notaLivre ? { observacoes: av.notaLivre } : {}),
      duracaoMin: 60,
    };
  }
  return {
    alvo: 'turma', nome: params.turma || 'Turma B',
    nivel: params.nivel || 'Intermediário', duracaoMin: 60,
  };
}

// id local do professor (até existir auth real) — agrupa os planos por aparelho.
export function teacherId() {
  try {
    let t = localStorage.getItem('bf_teacher_id');
    if (!t) { t = 'tch_' + Math.random().toString(36).slice(2, 11); localStorage.setItem('bf_teacher_id', t); }
    return t;
  } catch { return 'anon'; }
}

// Usa o token do usuário logado (se houver) — assim a edge function deriva teacher_id = auth.uid().
async function _headers() {
  let token = ANON;
  try {
    const { supabase } = await import('../supabaseClient.js');
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) token = data.session.access_token;
    }
  } catch { /* sem auth → anon */ }
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: ANON };
}

// Cache em sessão: reabrir o mesmo contexto não chama a IA de novo (instantâneo).
const _cache = new Map();

// Gera o plano. Retorna { plano, id, fonte: 'ia' | 'exemplo' | 'cache', erro? }.
export async function gerarPlano(ctx) {
  if (FORCE_DEMO || !ENDPOINT) return { plano: SAMPLE_PLAN, id: null, fonte: 'exemplo' };
  const key = JSON.stringify(ctx);
  if (_cache.has(key)) return { ..._cache.get(key), fonte: 'cache' };
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: await _headers(),
      body: JSON.stringify({ context: ctx, teacherId: teacherId() }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const out = { plano: data.plano || data, id: data.id || null };
    _cache.set(key, out);
    return { ...out, fonte: 'ia' };
  } catch (e) {
    console.warn('[gerarPlano] usando plano de exemplo (edge function indisponível):', e.message);
    return { plano: SAMPLE_PLAN, id: null, fonte: 'exemplo', erro: e.message };
  }
}

// Lista os planos do professor logado (RLS por auth.uid via leitura direta).
export async function listarPlanos() {
  try {
    const { supabase } = await import('../supabaseClient.js');
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('planos')
      .select('id, nome, escopo, plano, plano_editado, modelo, criado_em')
      .order('criado_em', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.warn('[listarPlanos] falhou:', e.message);
    return [];
  }
}

// Salva a avaliação técnica do professor: atualiza o store (IA passa a usar) + persiste.
export async function salvarAvaliacao(alunoId, notas, notaLivre) {
  setAvaliacao(alunoId, { notas, notaLivre });
  if (FORCE_DEMO || !ENDPOINT) return false;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: await _headers(),
      body: JSON.stringify({ action: 'salvarAvaliacao', teacherId: teacherId(), alunoId, notas, notaLivre }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch (e) {
    console.warn('[salvarAvaliacao] falhou:', e.message);
    return false;
  }
}

// Persiste a edição do professor (base do aprendizado coletivo).
export async function salvarEdicao(id, planoEditado) {
  if (FORCE_DEMO || !ENDPOINT || !id) return false;
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: await _headers(),
      body: JSON.stringify({ action: 'salvarEdicao', id, planoEditado }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch (e) {
    console.warn('[salvarEdicao] falhou:', e.message);
    return false;
  }
}
