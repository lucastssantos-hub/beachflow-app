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

export const ONTOLOGY_PROMPT_BLOCK = `
ONTOLOGIA CANÔNICA INVISÍVEL DO BEACHFLOW:
- O jogo vem antes do golpe. O golpe é consequência da situação.
- Decisão vem antes da execução. Resultado positivo fora de contexto não valida a decisão.
- Estados internos: Saque, Defesa, Reconstrução, Neutro, Construção, Pressão, Finalização.
- Não exponha esses estados para alunos; traduza para linguagem prática.
- Saque: direção -> devolução previsível -> terceira bola.
- Devolução: reduzir qualidade da terceira bola adversária; evitar winner automático.
- Defesa -> Reconstrução: ganhar tempo com lob profundo, gancho com margem ou defesa estática.
- Neutro -> Construção: criar desequilíbrio antes de pressionar.
- Construção -> Pressão -> Finalização: finalizar apenas com vantagem clara.
- Proibições: smash em zona vermelha; tapa de backhand como aceleração principal; lob curto; curta com adversário adiantado.
- Tapa é prioritariamente forehand em bola média-alta, à frente, com equilíbrio. Backhand usa ventaglio/anômala ou controle.
- Bandeja é controle/continuidade, não semi-smash.
REGRA DE SAÍDA:
- Para o professor, entregue ação curta e executável.
- Para aluno, nunca usar termos como Neutro, Reconstrução, Pressão ou transição. Traduza para o que ele errou na prática.
`;
