// BeachFlow — cliente da IA de treinos.
// Chama a Edge Function do Supabase (que guarda a API key e fala com a Claude).
// Se o endpoint não estiver configurado/acessível, gera um plano local com os
// dados disponíveis para a interface continuar funcionando em quadra.

import { DRILLS_CBT, recomendarDrillsCbt, recomendarSequenciaDrillsCbt, drillResumoParaIA, drillParaBloco } from '../data/drillsCbt.js';
import { pedagogicalPlanForContext } from './pedagogicalEngine.js';

const ENV = import.meta.env || {};
const ENDPOINT = ENV.VITE_GERAR_PLANO_ENDPOINT || '';
const ANON = ENV.VITE_SUPABASE_ANON_KEY || '';
const FORCE_DEMO = ENV.VITE_FORCE_DEMO === 'true';

const FUNDAMENTOS = ['Saque', 'Devolução', 'Forehand', 'Backhand', 'Lob', 'Smash', 'Bandeja', 'Gancho', 'Tapa', 'Curta', 'Posicionamento', 'Consistência', 'Decisão'];
const LEITURA_GAPS = new Set(['Decisão']);

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

function drillsFromPedagogicalPlan(planoPedagogico = {}) {
  const byId = new Map(DRILLS_CBT.map((d) => [d.id, d]));
  return (planoPedagogico.drillsSelecionados || []).map((id) => byId.get(id)).filter(Boolean);
}

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

function sortedTechnicalScores(obj = {}) {
  return sortedScores(obj).filter(([f]) => !LEITURA_GAPS.has(canonicalFund(f)));
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
  const sourcePref = ctx.preferredFocusSource || '';
  const autoWorst = sortedTechnicalScores(ctx.autoavaliacao || {})[0];
  const profWorst = sortedTechnicalScores(ctx.avaliacaoProfessor || {})[0];
  const scoutWorst = sortedTechnicalScores(ctx.avaliacaoScout || {})[0];
  const mergedWorst = sortedTechnicalScores(Object.fromEntries(Object.entries(merged).map(([f, v]) => [f, v.score])))[0];
  const scoutFund = ctx.scout?.erroPrincipal?.fundamento;
  const preferred =
    sourcePref === 'auto' ? autoWorst :
    sourcePref === 'prof' ? profWorst :
    sourcePref === 'scout' ? (scoutWorst || (scoutFund ? [scoutFund, null] : null)) :
    null;
  const picked = preferred || (scoutFund ? [scoutFund, null] : null) || mergedWorst || autoWorst || profWorst;
  const usedPreferred = !!preferred && picked === preferred;
  const fund = canonicalFund(picked?.[0] || ctx.foco || 'Consistência');
  return {
    fund,
    score: picked?.[1] ?? merged[fund]?.score ?? null,
    source: usedPreferred && sourcePref === 'auto' ? 'autoavaliação'
      : usedPreferred && sourcePref === 'prof' ? 'avaliação do professor'
      : usedPreferred && sourcePref === 'scout' ? 'scout'
      : scoutFund ? 'scout'
      : (merged[picked?.[0]]?.source || 'dados locais'),
    autoWorst,
    profWorst,
    scoutFund,
  };
}

function gameSituationTitle(planoPedagogico = {}, cfg = {}, focus = {}) {
  const transition = planoPedagogico.transicoesSelecionadas?.[0] || cfg.tatico || '';
  if (/saque|terceira bola/i.test(`${transition} ${focus.fund}`)) return 'Entrar no rali com iniciativa — saque e terceira bola';
  if (/devolu/i.test(`${transition} ${focus.fund}`)) return 'Entrar no ponto sem entregar a terceira bola';
  if (/finaliza|press|aceler|tapa|smash/i.test(`${transition} ${focus.fund}`)) return 'Criar vantagem antes de acelerar';
  if (/defesa|lob|gancho|recuper/i.test(`${transition} ${focus.fund}`)) return 'Recuperar espaço antes de atacar';
  if (/posicion|cobertura|centro/i.test(`${transition} ${focus.fund}`)) return 'Bater e recuperar o espaço da dupla';
  return cfg.titulo || 'Treino contextual de jogo';
}

function localPlanFromContext(ctx = {}, erro = '') {
  const planoPedagogico = ctx.planoPedagogico || pedagogicalPlanForContext(ctx);
  const focus = chooseFocus(ctx);
  const cfg = FUND_CONFIG[focus.fund] || FUND_CONFIG.Consistência;
  const scout = ctx.scout;
  const confidence = scout?.totalEventos >= 12 ? 'alta' : scout?.totalEventos >= 5 ? 'moderada' : 'baixa';
  const scoutContext = scout?.leitura || ctx.evidenciasScout?.join(' · ') || '';
  const scoreText = focus.score != null ? ` (${focus.score}/5)` : '';
  const source = focus.source || 'dados locais';
  const metodo = confidence === 'alta' ? 'aberto' : 'semiaberto';
  const drillCtx = { ...ctx, foco: focus.fund, fundamento: focus.fund, metodo };
  const drills = drillsFromPedagogicalPlan(planoPedagogico);
  const fallbackDrills = recomendarSequenciaDrillsCbt(drillCtx);
  const drillBlocks = drills.map((drill, i) => drillParaBloco(drill, [
    'Bloco 1 — Fechado do golpe',
    'Bloco 2 — Fechado da transição',
    'Bloco 3 — Semiaberto da transição',
    'Bloco 4 — Jogo condicionado',
  ][i] || `Bloco ${i + 1}`));
  const fallbackBlocks = [
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
  ];
  const exerciseBlocks = drillBlocks.length ? drillBlocks : (fallbackDrills.length ? fallbackDrills.map((drill, i) => drillParaBloco(drill, [
    'Bloco 1 — Fechado do golpe',
    'Bloco 2 — Fechado da transição',
    'Bloco 3 — Semiaberto da transição',
    'Bloco 4 — Jogo condicionado',
  ][i] || `Bloco ${i + 1}`)) : fallbackBlocks);
  return {
    titulo: gameSituationTitle(planoPedagogico, cfg, focus),
    diagnostico: {
      gapPrincipal: `${planoPedagogico.diagnostico?.gapPrincipal || cfg.gap}${scoreText}`,
      contexto: planoPedagogico.diagnostico?.justificativa || scoutContext || cfg.contexto,
      fonte: source,
      confianca: confidence,
      justificativaConfianca: scout
        ? `Plano local gerado com ${scout.totalEventos || 0} ação(ões) de scout e dados de avaliação disponíveis.`
        : `Plano local gerado a partir de ${source}.`,
      prioridadeDados: focus.source === 'scout' && focus.autoWorst?.[0] && focus.scoutFund && focus.scoutFund !== focus.autoWorst[0]
        ? `Autoavaliação indica ${focus.autoWorst[0]} (${focus.autoWorst[1]}/5), mas o scout apontou ${focus.scoutFund} como comportamento mais evidente em jogo.`
        : '',
      gapLeitura: sortedScores(ctx.autoavaliacao || {}).find(([f]) => LEITURA_GAPS.has(canonicalFund(f)))
        ? 'Decisão aparece como leitura de jogo; o treino trata isso por contexto, não como golpe isolado.'
        : '',
    },
    nivel: ctx.nivel || 'Intermediário',
    decisaoPedagogica: {
      estado: planoPedagogico.diagnostico?.estadoComprometido || 'Estabilizar',
      metodo,
      focoTecnico: planoPedagogico.golpesSelecionados?.[0] || cfg.tecnico,
      focoTatico: planoPedagogico.transicoesSelecionadas?.[0] || cfg.tatico,
    },
    objetivo: planoPedagogico.treino?.observacoesProfessor?.[0] || cfg.objetivo,
    blocos: [
      ...exerciseBlocks,
      {
        nome: `Bloco ${exerciseBlocks.length + 1} — Fechamento`,
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
    drillsCbt: (drills.length ? drills : fallbackDrills).map(drillResumoParaIA),
    planoPedagogico,
    _localFallback: true,
    _erroIA: erro || '',
  };
}

function enrichContextWithDrills(ctx = {}) {
  const planoPedagogico = pedagogicalPlanForContext(ctx);
  const focus = chooseFocus(ctx);
  const metodo = ctx.metodo || ctx.tipo_treino || ctx.decisaoPedagogica?.metodo || '';
  const drillCtx = { ...ctx, foco: focus.fund, fundamento: focus.fund, metodo };
  const sequencia = drillsFromPedagogicalPlan(planoPedagogico);
  const fallbackSequencia = recomendarSequenciaDrillsCbt(drillCtx);
  const baseSequencia = sequencia.length ? sequencia : fallbackSequencia;
  const extras = recomendarDrillsCbt(drillCtx, 5).filter(d => !baseSequencia.some(s => s.id === d.id));
  const drills = [...baseSequencia, ...extras].slice(0, 6).map(drillResumoParaIA);
  return {
    ...ctx,
    planoPedagogico,
    motorPedagogico: {
      diagnostico: planoPedagogico.diagnostico,
      estado_comprometido: planoPedagogico.diagnostico?.estadoComprometido,
      transicoes: planoPedagogico.transicoesSelecionadas,
      golpes: planoPedagogico.golpesSelecionados,
      drills: planoPedagogico.drillsSelecionados,
      restricoes: planoPedagogico.restricoesAplicadas,
      objetivo_da_aula: planoPedagogico.treino?.observacoesProfessor?.[0] || planoPedagogico.diagnostico?.justificativa,
    },
    ...(drills.length ? { bibliotecaDrillsCbt: drills } : {}),
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

function friendlyAiError(message = '') {
  const text = String(message || '');
  if (/credit balance is too low|purchase credits|plans? & billing|billing/i.test(text)) {
    return 'IA indisponível: a conta Anthropic está sem créditos. Use o plano local ou adicione créditos no painel da Anthropic.';
  }
  if (/ANTHROPIC_API_KEY/i.test(text)) {
    return 'IA indisponível: falta configurar a ANTHROPIC_API_KEY nos Secrets do Supabase.';
  }
  if (/GEMINI_API_KEY/i.test(text)) {
    return 'IA indisponível: falta configurar a GEMINI_API_KEY nos Secrets do Supabase.';
  }
  if (/Gemini\s+429|quota|rate limit|resource_exhausted/i.test(text)) {
    return 'IA indisponível: o Gemini atingiu o limite gratuito/cota. Use o plano local e tente novamente depois.';
  }
  if (/HTTP 404|not found/i.test(text)) {
    return 'IA indisponível: a função gerar-plano não foi publicada no Supabase.';
  }
  if (/HTTP 401|HTTP 403|unauthorized|forbidden/i.test(text)) {
    return 'IA indisponível: autorização da função Supabase recusada.';
  }
  if (/failed to fetch|network|timeout/i.test(text)) {
    return 'IA indisponível: falha de conexão com a função Supabase.';
  }
  return text || 'IA indisponível. Plano local gerado com os dados disponíveis.';
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
  try {
    if (FORCE_DEMO) return { plano: SAMPLE_PLAN, id: null, fonte: 'demo' };
    const enrichedCtx = enrichContextWithDrills(ctx || {});
    if (!ENDPOINT) return { plano: localPlanFromContext(enrichedCtx, 'Endpoint de IA não configurado'), id: null, fonte: 'local' };
    const key = JSON.stringify(enrichedCtx);
    if (_cache.has(key)) return { ..._cache.get(key), fonte: 'cache' };
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: await _headers(),
      body: JSON.stringify({ context: enrichedCtx, teacherId: teacherId() }),
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
    const friendly = friendlyAiError(e.message);
    console.warn('[gerarPlano] usando plano local:', friendly);
    return { plano: localPlanFromContext(ctx || {}, friendly), id: null, fonte: 'local', erro: friendly };
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
