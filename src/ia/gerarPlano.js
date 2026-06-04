// BeachFlow — cliente da IA de treinos.
// Chama a Edge Function do Supabase (que guarda a API key e fala com a Claude).
// Se o endpoint não estiver configurado/acessível, cai num PLANO DE EXEMPLO
// (caso §13 do spec) para a interface continuar funcionando.

const ENDPOINT = import.meta.env.VITE_GERAR_PLANO_ENDPOINT || '';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const FORCE_DEMO = import.meta.env.VITE_FORCE_DEMO === 'true';

const FUNDAMENTOS = ['Saque', 'Devolução', 'Forehand', 'Backhand', 'Lob', 'Smash', 'Bandeja', 'Gancho', 'Tapa', 'Curta', 'Posicionamento', 'Consistência', 'Decisão'];

const FUND_CONFIG = {
  Saque: {
    titulo: 'Saque para preparar a terceira bola',
    gap: 'Saque ainda não organiza a próxima ação',
    contexto: 'Quando o saque entra sem intenção, a dupla demora para preparar a terceira bola.',
    objetivo: 'Usar o saque para gerar devolução previsível e entrar organizado na próxima bola.',
    tecnico: 'Saque',
    tatico: 'Sacar com direção, entrar em base e preparar a terceira bola',
    comando: 'Saque no alvo, um passo de entrada e leitura da devolução.',
    regra: 'Ponto bônus só vale se o saque vier com recuperação e terceira bola organizada.',
  },
  Devolução: {
    titulo: 'Devolução estável para continuar o ponto',
    gap: 'Devolução ainda entrega tempo para o adversário',
    contexto: 'Contra saque com pressão, a devolução perde profundidade ou tenta resolver cedo demais.',
    objetivo: 'Estabilizar a devolução antes de buscar agressividade.',
    tecnico: 'Devolução',
    tatico: 'Devolver para continuar o ponto, tirar a terceira bola forte do adversário e recuperar base',
    comando: 'Devolução cruzada/profunda com margem e recuperação imediata.',
    regra: 'Ponto bônus para devolução que mantém o rali e reduz a terceira bola.',
  },
  Backhand: {
    titulo: 'Backhand com margem e recuperação',
    gap: 'Backhand perde controle quando tenta acelerar',
    contexto: 'O lado não dominante pede sustentação antes da bola agressiva.',
    objetivo: 'Usar o backhand para neutralizar, ganhar margem e voltar para a base.',
    tecnico: 'Backhand',
    tatico: 'No backhand, neutralizar primeiro; acelerar só com ventaglio/anômala em bola favorável',
    comando: 'Bola de backhand com alvo amplo, margem e retorno para o centro.',
    regra: 'Aceleração de backhand só vale com bola média-alta e equilíbrio.',
  },
  Tapa: {
    titulo: 'Tapa somente em bola vulnerável',
    gap: 'Tapa aparece antes da vantagem real',
    contexto: 'A turma tenta tirar tempo quando a bola ainda pede construção ou controle.',
    objetivo: 'Reconhecer a bola certa para usar tapa no forehand sem transformar tudo em definição.',
    tecnico: 'Tapa',
    tatico: 'Tapa no forehand em bola média-alta; no backhand usar ventaglio/anômala ou controle',
    comando: 'Misturar bola vulnerável e bola baixa; só a vulnerável libera aceleração.',
    regra: 'Tapa em bola baixa ou backhand zera a sequência.',
  },
  Lob: {
    titulo: 'Lob profundo para ganhar tempo',
    gap: 'Lob ainda não compra tempo suficiente',
    contexto: 'Em pressão, a bola de recuperação precisa dar tempo real para a dupla reorganizar.',
    objetivo: 'Usar lob profundo para sair da pressão e recuperar espaço.',
    tecnico: 'Lob',
    tatico: 'Ganhar tempo, reorganizar a dupla e voltar ao ponto',
    comando: 'Lob profundo saindo da pressão + retorno para base.',
    regra: 'O ponto só libera depois da dupla recuperar profundidade.',
  },
  Gancho: {
    titulo: 'Gancho de recuperação com margem',
    gap: 'Gancho vira improviso sem reorganizar',
    contexto: 'Quando a bola sai do eixo, a prioridade é sobreviver e recompor a posição.',
    objetivo: 'Usar gancho para manter continuidade e recuperar a estrutura.',
    tecnico: 'Gancho',
    tatico: 'Baixar a bola com margem ou contra-lob quando a recuperação pedir tempo',
    comando: 'Gancho de cobertura após bola alta/funda, seguido de retorno para base.',
    regra: 'Sequência só conta se houver recuperação depois do gancho.',
  },
  Curta: {
    titulo: 'Curta com intenção e cobertura',
    gap: 'Curta aparece sem preparação ou sem cobertura',
    contexto: 'A curta precisa deslocar o adversário e permitir avanço, não apenas encurtar a bola.',
    objetivo: 'Usar curta para criar desequilíbrio e organizar a cobertura da dupla.',
    tecnico: 'Curta',
    tatico: 'Baixar a bola com intenção, avançar e proteger o centro',
    comando: 'Curta no alvo baixo + avanço coordenado.',
    regra: 'Curta só vale se a dupla fechar espaço depois.',
  },
  Consistência: {
    titulo: 'Sustentar uma bola a mais',
    gap: 'Consistência quebra antes da vantagem',
    contexto: 'O ponto termina cedo por erro quando ainda pedia volume e profundidade.',
    objetivo: 'Aumentar regularidade com margem antes de acelerar.',
    tecnico: 'Consistência',
    tatico: 'Volume, profundidade e paciência para construir a bola certa',
    comando: 'Rali com meta de bolas e alvo profundo.',
    regra: 'Bônus quando a dupla sustenta antes de atacar.',
  },
  Posicionamento: {
    titulo: 'Cobertura e centro protegido',
    gap: 'Posicionamento chega tarde na cobertura',
    contexto: 'A dupla perde espaço depois da ação porque não recupera centro e profundidade.',
    objetivo: 'Reorganizar a dupla após cada ação para reduzir bolas entregues.',
    tecnico: 'Posicionamento',
    tatico: 'Fechar centro, ajustar profundidade e cobrir a resposta',
    comando: 'Ação + recuperação obrigatória da dupla.',
    regra: 'Ponto bônus só conta se a cobertura aparecer depois da bola.',
  },
};

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function sortedScores(obj = {}) {
  return Object.entries(obj || {})
    .map(([f, v]) => [f, num(v)])
    .filter(([, v]) => v != null)
    .sort((a, b) => a[1] - b[1]);
}

function mergeScoreSources(ctx = {}) {
  const out = {};
  for (const [f, v] of Object.entries(ctx.autoavaliacao || {})) out[f] = { score: num(v), source: 'autoavaliação' };
  for (const [f, v] of Object.entries(ctx.avaliacaoScout || {})) out[f] = { score: num(v), source: 'scout' };
  for (const [f, v] of Object.entries(ctx.avaliacaoProfessor || {})) out[f] = { score: num(v), source: 'avaliação do professor' };

  for (const aluno of ctx.alunos || []) {
    const pref = aluno.avaliacaoProfessor && Object.keys(aluno.avaliacaoProfessor).length
      ? aluno.avaliacaoProfessor
      : aluno.autoavaliacao;
    for (const [f, v] of Object.entries(pref || {})) {
      const n = num(v);
      if (n == null) continue;
      out[f] = out[f] || { score: n, source: aluno.avaliacaoProfessor?.[f] != null ? 'avaliação do professor' : 'autoavaliação' };
      out[f].score = Math.min(out[f].score, n);
    }
  }
  return out;
}

function canonicalFund(f = '') {
  const found = FUNDAMENTOS.find(x => x.toLowerCase() === String(f).toLowerCase());
  return found || f || 'Consistência';
}

function chooseFocus(ctx = {}) {
  const merged = mergeScoreSources(ctx);
  const worst = sortedScores(Object.fromEntries(Object.entries(merged).map(([f, v]) => [f, v.score])))[0];
  const scoutFund = ctx.scout?.erroPrincipal?.fundamento;
  const fund = canonicalFund(scoutFund || worst?.[0] || ctx.foco || 'Consistência');
  return {
    fund,
    score: worst?.[1] ?? null,
    source: scoutFund ? 'scout' : (merged[worst?.[0]]?.source || 'dados locais'),
  };
}

function localPlanFromContext(ctx = {}, erro = '') {
  const focus = chooseFocus(ctx);
  const cfg = FUND_CONFIG[focus.fund] || FUND_CONFIG.Consistência;
  const scout = ctx.scout;
  const confidence = scout?.totalEventos >= 12 ? 'alta' : scout?.totalEventos >= 5 ? 'moderada' : 'baixa';
  const scoutContext = scout?.leitura || ctx.evidenciasScout?.join(' · ') || '';
  const scoreText = focus.score != null ? ` (${focus.score}/5)` : '';
  const source = focus.source || 'dados locais';
  return {
    titulo: cfg.titulo,
    diagnostico: {
      gapPrincipal: `${cfg.gap}${scoreText}`,
      contexto: scoutContext || cfg.contexto,
      fonte: source,
      confianca: confidence,
      justificativaConfianca: scout
        ? `Plano local gerado com ${scout.totalEventos || 0} ação(ões) de scout e dados de avaliação disponíveis.`
        : `Plano local gerado a partir de ${source}.`,
    },
    nivel: ctx.nivel || 'Intermediário',
    decisaoPedagogica: {
      estado: 'Estabilizar',
      metodo: confidence === 'alta' ? 'aberto' : 'semiaberto',
      focoTecnico: cfg.tecnico,
      focoTatico: cfg.tatico,
    },
    objetivo: cfg.objetivo,
    blocos: [
      {
        nome: 'Bloco 1 — Aquecimento específico',
        tempo: "10'",
        organizacao: 'Duplas em meia quadra, cesto e alvo amplo.',
        comando: cfg.comando,
        criterio_qualidade: 'Executa com margem e recupera a base antes da próxima bola.',
      },
      {
        nome: 'Bloco 2 — Exercício principal',
        tempo: "25'",
        organizacao: 'Professor inicia a situação do gap; dupla executa e joga a bola seguinte.',
        regra: cfg.regra,
        correcao_principal: 'Uma correção por aluno: base, contato, direção ou recuperação.',
        erro_a_observar: cfg.gap,
      },
      {
        nome: 'Bloco 3 — Jogo condicionado',
        tempo: "15'",
        regra: cfg.regra,
        pontuacao_especial: 'Bônus apenas quando a escolha aparece no contexto certo.',
        observar: 'A ação resolve o problema de jogo ou vira tentativa apressada?',
      },
      {
        nome: 'Bloco 4 — Fechamento',
        tempo: "10'",
        pergunta_final: 'Qual bola pediu controle e qual bola liberou pressão?',
        registro_professor: 'Anotar se o padrão melhorou no jogo com regra.',
        proximo_passo: 'Repetir o scout curto quando a turma jogar novamente.',
      },
    ],
    progressao: 'Diminuir alvo, aumentar velocidade ou liberar a bola seguinte viva.',
    regressao: 'Aumentar alvo, reduzir velocidade e voltar para execução com margem.',
    scoutValidacao: 'Observar se o mesmo erro reduz quando volta para jogo real.',
    cicloPedagogico: { necessario: false, duracaoSemanas: 0, justificativa: 'Plano local de contingência até a IA externa estar disponível.' },
    _localFallback: true,
    _erroIA: erro || '',
  };
}

function isExamplePlan(plan) {
  if (!plan || typeof plan !== 'object') return true;
  const text = JSON.stringify(plan).toLowerCase();
  return text.includes('plano de exemplo')
    || text.includes('configure a ia')
    || text.includes('supabase/readme')
    || plan.titulo === SAMPLE_PLAN.titulo;
}

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
  if (FORCE_DEMO) return { plano: SAMPLE_PLAN, id: null, fonte: 'demo' };
  if (!ENDPOINT) return { plano: localPlanFromContext(ctx, 'Endpoint de IA não configurado'), id: null, fonte: 'local' };
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
    const plano = data.plano || data;
    if (isExamplePlan(plano)) {
      return { plano: localPlanFromContext(ctx, 'A IA retornou um plano de exemplo'), id: null, fonte: 'local' };
    }
    const out = { plano, id: data.id || null };
    _cache.set(key, out);
    return { ...out, fonte: 'ia' };
  } catch (e) {
    console.warn('[gerarPlano] usando plano local (edge function indisponível):', e.message);
    return { plano: localPlanFromContext(ctx, e.message), id: null, fonte: 'local', erro: e.message };
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
