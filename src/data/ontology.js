// Ontologia canônica do BeachFlow.
// Uso: motor interno. A UI deve exibir traduções práticas, não estados abstratos.

export const STATES = ['Saque', 'Defesa', 'Reconstrução', 'Neutro', 'Construção', 'Pressão', 'Finalização'];

const PRESSURE_ACTIONS = ['Acelerada', 'Ventaglio', 'Anômalo', 'Voleio'];
const DEFENSE_ACTIONS = ['Lob', 'Defesa alta', 'Defesa baixa'];
const NEUTRAL_ACTIONS = ['Forehand', 'Backhand', 'Neutra', 'Devolução', 'Saque'];

export const ABSOLUTE_RULES = [
  {
    id: 'no_backhand_tapa',
    match: ({ technique = '' }) => technique === 'Tapa backhand',
    issue: 'Tapa de backhand proibido como aceleração principal',
    practical: 'No backhand, não tentar tapa para resolver. Usar ventaglio/anômala, bola profunda ou controle.',
  },
  {
    id: 'smash_red_zone',
    match: ({ technique = '', zone = '' }) => technique === 'Smash' && zone === 'Vermelha',
    issue: 'Smash em zona vermelha',
    practical: 'A bola estava funda/atrasada. Em vez de smash, ganhar tempo com gancho ou lob.',
  },
  {
    id: 'tapa_low_or_late',
    match: ({ technique = '', optional_context = '' }) => technique === 'Tapa' && /baixa|atrasad/i.test(optional_context),
    issue: 'Tapa em bola baixa ou atrasada',
    practical: 'A bola não estava à frente. Primeiro controlar; tapa só em bola média-alta no forehand.',
  },
  {
    id: 'short_lob',
    match: ({ technique = '', outcome = '', optional_context = '' }) => technique === 'Lob' && (/curt/i.test(optional_context) || /erro/i.test(outcome)),
    issue: 'Lob sem profundidade',
    practical: 'O lob não comprou tempo. A meta é empurrar o adversário ao fundo e recuperar base.',
  },
];

export function inferIntentionFromOntology(technique = '', outcome = '', zone = '') {
  if (technique === 'Saque') return 'Saque';
  if (technique === 'Smash') return zone === 'Vermelha' ? 'Finalização precipitada' : 'Finalização';
  if (technique === 'Tapa') return outcome === 'Winner' || zone === 'Verde' ? 'Finalização' : 'Pressão';
  if (technique === 'Gancho' && outcome === 'Winner') return 'Finalização';
  if (technique === 'Curta' && outcome === 'Winner') return 'Finalização';
  if (PRESSURE_ACTIONS.includes(technique) || (technique === 'Gancho' && zone === 'Verde')) return 'Pressão';
  if (['Curta', 'Bandeja'].includes(technique) || (technique === 'Lob' && outcome === 'Winner')) return 'Construção';
  if (technique === 'Gancho') return 'Reconstrução';
  if (DEFENSE_ACTIONS.includes(technique)) return 'Defesa';
  if (NEUTRAL_ACTIONS.includes(technique)) return 'Neutro';
  return 'Neutro';
}

export function inferTacticalIssue(event = {}) {
  const technique = event.technique || event.shot || event.fundamental || '';
  const outcome = event.outcome || event.kind || '';
  const zone = event.zone || '';
  const optional_context = event.optional_context || event.note || '';
  const isError = /erro|error/i.test(outcome);
  const isWinner = /winner|ace/i.test(outcome);

  for (const rule of ABSOLUTE_RULES) {
    if (rule.match({ technique, outcome, zone, optional_context })) {
      return { issue: rule.issue, practical: rule.practical, severity: 'alta' };
    }
  }

  if (isError && ['Smash', 'Tapa'].includes(technique) && zone === 'Amarela') {
    return {
      issue: 'Finalização precoce',
      practical: 'Tentou resolver antes de criar vantagem clara. Construir a bola certa antes de finalizar.',
      severity: 'alta',
    };
  }
  if (isError && PRESSURE_ACTIONS.includes(technique) && zone === 'Vermelha') {
    return {
      issue: 'Aceleração em desvantagem',
      practical: 'Tentou tirar tempo quando ainda precisava ganhar tempo. Recuperar posição antes de acelerar.',
      severity: 'alta',
    };
  }
  if (isError && technique === 'Devolução') {
    return {
      issue: 'Devolução sem continuidade',
      practical: 'A devolução entregou a terceira bola. Priorizar profundidade e recuperação, não winner.',
      severity: 'media',
    };
  }
  if (isWinner && ['Smash', 'Tapa'].includes(technique) && zone === 'Amarela') {
    return {
      issue: 'Winner de risco alto',
      practical: 'Mesmo vencendo o ponto, a escolha foi arriscada. Criar zona verde antes de definir.',
      severity: 'media',
    };
  }
  if (technique === 'Lob' && isError) {
    return {
      issue: 'Defesa sem saída',
      practical: 'A saída defensiva não devolveu tempo para a dupla. Lob precisa ser alto/profundo.',
      severity: 'media',
    };
  }
  return null;
}

export function practicalIssueText(issue = '') {
  const text = String(issue || '').toLowerCase();
  if (!text) return '';
  if (text.includes('finalização precoce')) return 'Você tentou ganhar o ponto antes de criar vantagem clara.';
  if (text.includes('aceleração em desvantagem')) return 'Você acelerou quando ainda precisava recuperar posição.';
  if (text.includes('devolução sem continuidade')) return 'Sua devolução não deu tempo para sua dupla entrar organizada no ponto.';
  if (text.includes('defesa sem saída')) return 'A bola de defesa não comprou tempo suficiente para reorganizar.';
  if (text.includes('winner de risco')) return 'Você venceu algumas bolas, mas com uma escolha arriscada demais para repetir como padrão.';
  if (text.includes('smash em zona vermelha')) return 'Você tentou smash em bola funda/atrasada, quando o melhor era ganhar tempo.';
  if (text.includes('lob sem profundidade')) return 'O lob ficou curto e não empurrou o adversário para trás.';
  if (text.includes('tapa de backhand')) return 'No backhand, o melhor é usar ventaglio/anômala ou controle, não tapa.';
  return issue;
}

export function focusCardFromIssue(issue = '') {
  const text = String(issue || '').toLowerCase();
  if (text.includes('finalização') || text.includes('winner')) {
    return { foco: 'Criar vantagem antes de acelerar.', regra: 'Winner cedo não vira padrão.' };
  }
  if (text.includes('aceleração')) {
    return { foco: 'Recuperar antes de acelerar.', regra: 'Ataque só depois da base voltar.' };
  }
  if (text.includes('devolução')) {
    return { foco: 'Devolver para continuar o ponto.', regra: 'Profundidade antes de agressividade.' };
  }
  if (text.includes('smash em zona vermelha')) {
    return { foco: 'Ganhar tempo antes de atacar.', regra: 'Smash só com bola à frente.' };
  }
  if (text.includes('defesa') || text.includes('lob')) {
    return { foco: 'Ganhar tempo na defesa.', regra: 'Lob curto não conta.' };
  }
  return { foco: 'Escolher a bola certa.', regra: 'Decisão antes da execução.' };
}

const FUNDAMENTAL_ALIASES = {
  recepcao: 'Devolução',
  devolucao: 'Devolução',
  devolução: 'Devolução',
  constancia: 'Consistência',
  constância: 'Consistência',
  consistencia: 'Consistência',
  consistência: 'Consistência',
  acelerada: 'Tapa',
  espetada: 'Tapa',
  'tapa/acelerada/espetada': 'Tapa',
  'bolas curtas': 'Curta',
  curta: 'Curta',
  'bandeja/controle': 'Bandeja',
  bandeja: 'Bandeja',
  posicao: 'Posicionamento',
  posição: 'Posicionamento',
  posicionamento: 'Posicionamento',
  neutra: 'Neutra',
};

const PRACTICAL_FOCUS = {
  Saque: 'começar o ponto com direção simples e já se preparar para a bola seguinte.',
  Devolução: 'devolver com profundidade suficiente para entrar no ponto organizado.',
  Forehand: 'usar o forehand com direção e recuperar a base depois da batida.',
  Backhand: 'controlar o lado do backhand antes de tentar mudar ritmo ou direção.',
  Lob: 'usar o lob alto e profundo para ganhar tempo de verdade.',
  Smash: 'finalizar só quando a bola estiver confortável, à frente e com equilíbrio.',
  Bandeja: 'usar a bandeja para manter controle e continuidade, sem transformar tudo em definição.',
  Gancho: 'usar o gancho para reorganizar o ponto quando a bola alta ficou funda ou desconfortável.',
  Tapa: 'escolher melhor o momento de acelerar, sem atacar bola baixa ou atrasada.',
  Curta: 'usar a curta quando ela realmente desloca o adversário, não como solução automática.',
  Posicionamento: 'recuperar melhor a posição depois da batida para não abrir espaço.',
  Consistência: 'manter mais bolas vivas com margem antes de tentar acelerar.',
  Neutra: 'usar bola neutra com profundidade para continuar o ponto sem entregar vantagem.',
};

const POSITIVE_FOCUS = {
  Saque: 'como ponto positivo, o saque apareceu bem para iniciar o ponto.',
  Devolução: 'como ponto positivo, a devolução ajudou a começar alguns pontos com mais segurança.',
  Forehand: 'como ponto positivo, o forehand ajudou a manter ou acelerar algumas trocas.',
  Backhand: 'como ponto positivo, o backhand ajudou a controlar o lado não dominante.',
  Lob: 'como ponto positivo, o lob ajudou a ganhar tempo e manter o ponto vivo.',
  Smash: 'como ponto positivo, o smash apareceu bem quando havia bola clara para finalizar.',
  Bandeja: 'como ponto positivo, a bandeja ajudou a controlar bolas altas sem precipitar.',
  Gancho: 'como ponto positivo, o gancho ajudou a recuperar bolas difíceis sem perder completamente o ponto.',
  Tapa: 'como ponto positivo, o tapa apareceu bem quando a bola estava confortável para acelerar.',
  Curta: 'como ponto positivo, a curta criou dúvida no adversário quando foi usada com intenção.',
};

const STRUCTURE_BY_FUNDAMENTAL = {
  Saque: { family: 'inicio', chain: 'saque', student: 'início do ponto', next: ['Forehand', 'Backhand', 'Neutra', 'Consistência', 'Posicionamento'] },
  Devolução: { family: 'inicio', chain: 'devolucao', student: 'resposta ao saque', next: ['Forehand', 'Backhand', 'Neutra', 'Consistência', 'Posicionamento'] },
  Forehand: { family: 'neutro', chain: 'rali', student: 'troca de fundo' },
  Backhand: { family: 'neutro', chain: 'rali', student: 'lado do backhand' },
  Neutra: { family: 'neutro', chain: 'rali', student: 'bola de continuidade' },
  Consistência: { family: 'neutro', chain: 'rali', student: 'regularidade da troca' },
  Posicionamento: { family: 'espacial', chain: 'dupla', student: 'recuperação de posição' },
  Lob: { family: 'defesa', chain: 'recuperacao', student: 'ganhar tempo' },
  Gancho: { family: 'reconstrucao', chain: 'recuperacao', student: 'reorganizar depois de bola alta/funda' },
  Bandeja: { family: 'controle', chain: 'continuidade', student: 'continuidade com bola alta' },
  Curta: { family: 'construcao', chain: 'construcao', student: 'deslocar o adversário' },
  Tapa: { family: 'pressao', chain: 'pressao', student: 'acelerar bola favorável' },
  Smash: { family: 'finalizacao', chain: 'finalizacao', student: 'finalizar bola favorável' },
};

const RALLY_FAMILIES = new Set(['neutro', 'espacial']);
const ATTACK_FAMILIES = new Set(['pressao', 'finalizacao']);
const RECOVERY_FAMILIES = new Set(['defesa', 'reconstrucao']);

function normalizeKey(value = '') {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function canonicalFundamental(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const key = normalizeKey(raw);
  return FUNDAMENTAL_ALIASES[key] || Object.keys(STRUCTURE_BY_FUNDAMENTAL).find((f) => normalizeKey(f) === key) || raw;
}

function familyOf(value = '') {
  return STRUCTURE_BY_FUNDAMENTAL[canonicalFundamental(value)]?.family || 'neutro';
}

function eventLooksLikeServeError(event = {}) {
  const fund = canonicalFundamental(event.fundamento || event.tecnica || event.technique || event.shot);
  const outcome = `${event.desfecho || ''} ${event.tipo || ''} ${event.outcome || ''} ${event.kind || ''}`.toLowerCase();
  return fund === 'Saque' && /erro|error|falta|dupla/.test(outcome);
}

function hasRecentServeError(events = []) {
  return events.some(eventLooksLikeServeError);
}

function cleanSentence(text = '') {
  return String(text || '').replace(/\s+/g, ' ').replace(/[.。]+$/g, '').trim();
}

function tacticalKind(text = '') {
  const value = normalizeKey(text);
  if (!value) return '';
  if (value.includes('defesa') || value.includes('lob') || value.includes('tempo') || value.includes('reorganiz')) return 'recuperacao';
  if (value.includes('finalizacao') || value.includes('winner') || value.includes('aceler') || value.includes('vantagem')) return 'aceleracao';
  if (value.includes('devolucao') || value.includes('terceira bola')) return 'entrada';
  if (value.includes('posicion') || value.includes('centro') || value.includes('espaco')) return 'posicao';
  return '';
}

export function practicalFundamentalFocus(fundamental = '') {
  const f = canonicalFundamental(fundamental);
  return PRACTICAL_FOCUS[f] || `usar ${fundamental || 'esse fundamento'} com mais escolha, controle e regularidade.`;
}

export function positiveFundamentalText(fundamental = '') {
  const f = canonicalFundamental(fundamental);
  return POSITIVE_FOCUS[f] || `${fundamental || 'esse recurso'} apareceu como ponto positivo no jogo.`;
}

function autoPhrase(autoStrong, autoWeak) {
  if (!autoStrong && !autoWeak) return 'a autoavaliação ainda não mostrou um ponto muito claro.';
  if (autoStrong && autoWeak && autoStrong === autoWeak) {
    return `suas respostas ficaram próximas, com ${autoWeak} aparecendo como referência inicial.`;
  }
  return `você colocou ${autoStrong || 'alguns fundamentos'} como ponto de confiança e ${autoWeak || 'um fundamento'} como ponto que pede mais atenção.`;
}

function bridgeAutoAndScout({ autoWeak, scoutError, scout, tacticalText }) {
  const weak = canonicalFundamental(autoWeak);
  const error = canonicalFundamental(scoutError?.fundamento || scoutError);
  const weakFamily = familyOf(weak);
  const errorFamily = familyOf(error);
  const recentEvents = scout?.eventosRecentes || [];
  const tactical = cleanSentence(tacticalText);
  const tKind = tacticalKind(tactical);

  if (!error) {
    if (tKind === 'recuperacao' && ATTACK_FAMILIES.has(weakFamily)) {
      return {
        gameText: 'No jogo, o ajuste não foi só o golpe de ataque: em algumas trocas a bola de defesa não deu tempo para reorganizar, então a aceleração chegou sem uma bola realmente confortável.',
        bridgeText: weak ? `Isso ajuda a explicar por que ${weak} apareceu como ponto de atenção: antes de acelerar, a bola anterior precisa comprar tempo ou criar vantagem.` : '',
        focusText: 'temos aqui um ponto a melhorar: ganhar tempo primeiro e só acelerar quando a bola estiver clara para ataque.',
        trainingTopic: 'Recuperar antes de acelerar',
      };
    }
    if (tKind === 'recuperacao') {
      return {
        gameText: 'No jogo, a bola de defesa não deu tempo suficiente para a dupla se organizar de novo.',
        bridgeText: weak ? `Isso conversa com o que você sentiu em ${weak}: o ajuste começa antes do golpe final, na qualidade da bola que devolve tempo para o ponto.` : '',
        focusText: 'temos aqui um ponto a melhorar: usar a bola de recuperação com mais altura, profundidade e tempo.',
        trainingTopic: 'Ganhar tempo na defesa',
      };
    }
    if (tKind === 'aceleracao') {
      return {
        gameText: 'No jogo, apareceu uma tendência de tentar resolver algumas bolas antes de criar uma vantagem clara.',
        bridgeText: weak ? `Isso se conecta com ${weak}: o golpe melhora quando a escolha da bola vem antes da força.` : '',
        focusText: 'temos aqui um ponto a melhorar: construir a bola certa antes de acelerar.',
        trainingTopic: 'Construir antes de finalizar',
      };
    }
    return {
      gameText: tactical
        ? `No jogo, apareceu este ajuste prático: ${tactical}.`
        : 'No jogo, ainda não apareceu um padrão forte o bastante para cravar o ajuste.',
      bridgeText: '',
      focusText: practicalFundamentalFocus(weak),
      trainingTopic: weak || 'Controle',
    };
  }

  if (error === 'Saque') {
    const directServeError = hasRecentServeError(recentEvents);
    return {
      gameText: directServeError
        ? 'No jogo, o ajuste apareceu no próprio saque: a primeira bola ainda precisa entrar com mais margem e direção.'
        : 'No jogo, o saque apareceu como ajuste, mas precisamos separar o erro do golpe inicial da organização logo depois dele.',
      bridgeText: weak && weak !== error
        ? `Você sentiu ${weak}; isso pode começar já na primeira bola, porque um saque sem direção deixa o ponto mais difícil desde o início.`
        : 'Isso combina com a sua percepção: o início do ponto precisa ficar mais estável.',
      focusText: directServeError
        ? 'o ponto a melhorar é reduzir o erro de saque: toss mais estável, contato limpo e alvo simples.'
        : 'o ponto a melhorar é sacar com direção simples e recuperar a base para jogar a próxima bola.',
      trainingTopic: 'Saque + entrada no rali',
    };
  }

  if (weak === 'Saque' && RALLY_FAMILIES.has(errorFamily)) {
    return {
      gameText: `No jogo, o ajuste mais claro apareceu depois do saque: ${error}.`,
      bridgeText: 'Isso não contradiz sua percepção do saque; pode ser a bola seguinte, a entrada no rali ou a recuperação depois de sacar.',
      focusText: 'o ponto a melhorar é sacar e já se organizar para a terceira bola, entrando no rali com mais controle.',
      trainingTopic: 'Saque + terceira bola',
    };
  }

  if (weak === 'Devolução' && RALLY_FAMILIES.has(errorFamily)) {
    return {
      gameText: `No jogo, o ajuste mais claro apareceu logo depois da devolução: ${error}.`,
      bridgeText: 'Isso pode mostrar que a dificuldade não está só em devolver, mas em entrar organizada no rali depois da resposta ao saque.',
      focusText: 'o ponto a melhorar é devolver com profundidade e recuperar a base para jogar a bola seguinte.',
      trainingTopic: 'Devolução + entrada no rali',
    };
  }

  if (RECOVERY_FAMILIES.has(weakFamily) && ATTACK_FAMILIES.has(errorFamily)) {
    return {
      gameText: `No jogo, o erro apareceu na tentativa de acelerar com ${error}.`,
      bridgeText: `Isso pode estar ligado ao ${weak}: a bola de recuperação ainda não está comprando tempo suficiente para atacar com segurança.`,
      focusText: 'o ponto a melhorar é ganhar tempo primeiro e só acelerar quando a bola vier realmente confortável.',
      trainingTopic: 'Recuperar antes de acelerar',
    };
  }

  if (ATTACK_FAMILIES.has(errorFamily) && /finaliza|winner|aceler|vantagem|cedo/i.test(tacticalText || '')) {
    return {
      gameText: `No jogo, ${error} apareceu como ajuste, principalmente na escolha do momento de acelerar.`,
      bridgeText: weak === error
        ? `Isso confirma sua percepção: ${weak} pediu atenção na autoavaliação e também apareceu no jogo.`
        : weak ? `Você sentiu ${weak}, mas o jogo mostrou que a aceleração com ${error} precisa nascer de uma bola melhor construída.` : '',
      focusText: 'o ponto a melhorar é criar vantagem antes de acelerar, sem tentar resolver bola neutra como ataque.',
      trainingTopic: 'Construir antes de finalizar',
    };
  }

  if (weak && error && weak === error) {
    return {
      gameText: `No jogo, ${error} também apareceu como principal ajuste.`,
      bridgeText: `Isso bate com o que você sentiu: ${weak} pediu atenção na autoavaliação e no jogo.`,
      focusText: `o ponto a melhorar é ${practicalFundamentalFocus(error)}`,
      trainingTopic: error,
    };
  }

  return {
    gameText: `No jogo, ${error} apareceu como o principal ajuste.${tactical ? ` ${tactical}.` : ''}`,
      bridgeText: weak
      ? `Você sentiu mais dificuldade em ${weak}, mas o jogo apontou ${error}; a leitura agora é entender onde essa diferença nasce dentro do ponto.`
      : '',
    focusText: `o ponto a melhorar é ${practicalFundamentalFocus(error)}`,
    trainingTopic: error,
  };
}

export function analyzeStudentFeedback({
  autoWeak,
  autoStrong,
  scoutError,
  scout,
  positives = [],
  tacticalText = '',
} = {}) {
  const weak = canonicalFundamental(autoWeak);
  const strong = canonicalFundamental(autoStrong);
  const positive = positives.map(canonicalFundamental).find((f) => f && f !== canonicalFundamental(scoutError?.fundamento || scoutError));
  const chain = bridgeAutoAndScout({ autoWeak: weak, scoutError, scout, tacticalText });

  return {
    autoText: autoPhrase(strong, weak),
    positiveText: positive ? positiveFundamentalText(positive) : '',
    gameText: chain.gameText,
    bridgeText: chain.bridgeText,
    focusText: chain.focusText,
    trainingTopic: chain.trainingTopic,
  };
}

export const ONTOLOGY_PROMPT_BLOCK = `
ONTOLOGIA CANÔNICA INVISÍVEL DO BEACHFLOW:
- O jogo vem antes do golpe. O golpe é consequência final da cadeia: situação -> intenção -> decisão -> execução.
- Decisão vem antes da execução. Resultado positivo fora de contexto não valida a decisão.
- Posicionamento da dupla vem antes da execução.
- Estados internos: Saque, Defesa, Reconstrução, Neutro, Construção, Pressão, Finalização.
- Não exponha esses estados para alunos; traduza para linguagem prática.
- Saque e Devolução são estruturas de entrada no ponto. Terceira bola inicia a leitura real do rali.
- Saque: direção -> devolução previsível -> terceira bola organizada. Se o scout aponta erro na bola seguinte, diagnostique entrada no rali, não só saque.
- Devolução: reduzir qualidade da terceira bola adversária; evitar winner automático. Se o scout aponta erro logo depois, diagnostique recuperação pós-devolução.
- Defesa -> Reconstrução: ganhar tempo com lob profundo, gancho com margem ou defesa estática.
- Reconstrução -> Neutro: recuperar faixa de atuação antes de acelerar.
- Neutro -> Construção: criar desequilíbrio antes de pressionar.
- Construção -> Pressão -> Finalização: finalizar apenas com vantagem clara.
- Pular estados é proibido: não transformar bola neutra em winner como padrão.
- Proibições: smash em zona vermelha; tapa de backhand como aceleração principal; lob curto; curta com adversário adiantado.
- Tapa é prioritariamente forehand em bola média-alta, à frente, com equilíbrio. Backhand usa ventaglio/anômala ou controle.
- Bandeja é controle/continuidade, não semi-smash.
REGRA DE SAÍDA:
- Para o professor, entregue ação curta e executável.
- Para aluno, nunca usar termos como Neutro, Reconstrução, Pressão ou transição. Traduza para o que ele errou na prática.
- Se autoavaliação e scout divergirem, não trate como contradição simples: explique a cadeia prática do ponto.
`;
