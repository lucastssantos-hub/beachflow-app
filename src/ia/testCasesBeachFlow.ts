export const BEACHFLOW_TEST_CASES = [
  {
    id: "TC01_INICIANTE_DEVOLUCAO_INSTAVEL",
    nome: "Iniciante com erro alto na devolução",
    objetivoDoTeste: "Verificar se a IA prioriza estabilizar devolução, usa método fechado/semiaberto simples e evita treino avançado.",
    input: {
      turma: {
        nome: "Turma Iniciante 18h",
        nivel: "iniciante",
        quantidadeAlunos: 6,
        focoAnterior: "saque básico e continuidade",
        observacaoProfessor:
          "A turma perde muitos pontos logo na devolução. Contra saque mais profundo, os alunos tentam bater forte e erram sem equilibrar a base."
      },
      avaliacaoTecnica: {
        saque: 3,
        devolucao: 2,
        forehand: 3,
        backhand: 2,
        lob: 2,
        smash: 1,
        posicionamento: 2,
        leituraDeJogo: 1,
        constancia: 2
      },
      autoavaliacao: {
        dificuldadePercebida: "devolução",
        confianca: 2,
        comentario: "Tenho dificuldade quando o saque vem mais fundo."
      },
      scout: {
        pontosAnalisados: 18,
        gamesAnalisados: 2,
        padroes: [
          {
            tipo: "erro não forçado",
            fundamento: "devolução",
            contexto: "saque profundo",
            frequencia: 9
          }
        ]
      }
    },
    esperado: {
      estado: "estabilizar",
      metodoPermitido: ["fechado", "semiaberto"],
      focoTecnicoEsperado: "devolução",
      deveConter: [
        "devolução com controle",
        "margem",
        "base antes do contato",
        "continuidade"
      ],
      deveEvitar: [
        "ventaglio",
        "forehand anômalo",
        "top spin avançado",
        "arco inferior",
        "arco superior",
        "finalização",
        "smash como solução"
      ],
      confiancaEsperada: ["baixa", "moderada"]
    }
  },

  {
    id: "TC02_INTERMEDIARIO_BOLA_MEDIA_ACELERACAO",
    nome: "Intermediário acelerando bola média sem vantagem",
    objetivoDoTeste: "Verificar se a IA identifica decisão precipitada, usa construir/gestão de risco e não cria treino genérico de ataque.",
    input: {
      turma: {
        nome: "Turma Intermediária 19h",
        nivel: "intermediário",
        quantidadeAlunos: 4,
        focoAnterior: "direcionamento de forehand",
        observacaoProfessor:
          "Os alunos conseguem trocar bola, mas quando recebem bola média tentam acelerar para ganhar o ponto. Muitos erros acontecem sem vantagem clara."
      },
      avaliacaoTecnica: {
        saque: 3,
        devolucao: 3,
        forehand: 4,
        backhand: 3,
        lob: 3,
        smash: 3,
        posicionamento: 3,
        leituraDeJogo: 2,
        constancia: 3
      },
      autoavaliacao: {
        dificuldadePercebida: "ganhar pontos",
        confianca: 3,
        comentario: "Sinto que preciso atacar mais."
      },
      scout: {
        pontosAnalisados: 32,
        gamesAnalisados: 4,
        padroes: [
          {
            tipo: "erro não forçado",
            fundamento: "forehand",
            contexto: "bola média sem vantagem clara",
            frequencia: 11
          },
          {
            tipo: "erro não forçado",
            fundamento: "tapa/acelerada",
            contexto: "bola média",
            frequencia: 7
          }
        ]
      }
    },
    esperado: {
      estado: "construir",
      metodoPermitido: ["semiaberto", "aberto"],
      focoTaticoEsperado: "gestão de risco",
      deveConter: [
        "bola média",
        "construir",
        "reconhecer vantagem",
        "não acelerar sem vantagem",
        "decisão"
      ],
      deveEvitar: [
        "finalizar toda bola média",
        "ataque livre",
        "treino apenas de potência",
        "smash",
        "winner como prioridade"
      ],
      confiancaEsperada: ["moderada", "alta"]
    }
  },

  {
    id: "TC03_AVANCADO_COBERTURA_CENTRO",
    nome: "Avançado com erro de cobertura do centro",
    objetivoDoTeste: "Verificar se a IA usa setores da quadra de forma específica, sem falar posicionamento de modo genérico.",
    input: {
      turma: {
        nome: "Turma Avançada Competição",
        nivel: "avançado",
        quantidadeAlunos: 4,
        focoAnterior: "pressão com bola cruzada",
        observacaoProfessor:
          "A dupla pressiona bem pela cruzada, mas depois da bola cruzada abre espaço no centro. O adversário explora a zona entre os jogadores."
      },
      avaliacaoTecnica: {
        saque: 4,
        devolucao: 4,
        forehand: 4,
        backhand: 4,
        lob: 4,
        smash: 4,
        posicionamento: 3,
        leituraDeJogo: 3,
        comunicacaoDaDupla: 2,
        constancia: 4
      },
      autoavaliacao: {
        dificuldadePercebida: "cobertura da dupla",
        confianca: 3,
        comentario: "Às vezes ficamos perdidos no meio."
      },
      scout: {
        pontosAnalisados: 46,
        gamesAnalisados: 5,
        padroes: [
          {
            tipo: "winner adversário",
            fundamento: "posicionamento",
            contexto: "bola explorada no centro após cruzada",
            frequencia: 12
          }
        ]
      }
    },
    esperado: {
      estado: "direcionar",
      metodoPermitido: ["semiaberto", "aberto"],
      focoTaticoEsperado: "cobertura de quadra",
      deveConter: [
        "centro",
        "zona entre os jogadores",
        "cobertura",
        "após bola cruzada",
        "comunicação da dupla"
      ],
      deveEvitar: [
        "melhorar posicionamento",
        "posicionamento genérico",
        "treino técnico isolado",
        "sem citar setor",
        "sem citar centro"
      ],
      confiancaEsperada: ["moderada", "alta"]
    }
  },

  {
    id: "TC04_SCOUT_INSUFICIENTE",
    nome: "Scout com poucos pontos analisados",
    objetivoDoTeste: "Verificar se a IA não finge certeza, declara confiança baixa e gera hipótese simples com scout de validação.",
    input: {
      turma: {
        nome: "Turma Intermediária Nova",
        nivel: "intermediário",
        quantidadeAlunos: 5,
        focoAnterior: "sem histórico",
        observacaoProfessor:
          "Percebi alguns erros na devolução, mas ainda observei pouco."
      },
      avaliacaoTecnica: {
        saque: 3,
        devolucao: 3,
        forehand: 3,
        backhand: 3,
        lob: 3,
        smash: 2,
        posicionamento: 3,
        leituraDeJogo: 2,
        constancia: 3
      },
      autoavaliacao: {
        dificuldadePercebida: "saque",
        confianca: 3,
        comentario: "Acho que erro mais no saque."
      },
      scout: {
        pontosAnalisados: 6,
        gamesAnalisados: 0,
        padroes: [
          {
            tipo: "erro não forçado",
            fundamento: "devolução",
            contexto: "primeira bola",
            frequencia: 3
          }
        ]
      }
    },
    esperado: {
      estado: ["estabilizar", "direcionar"],
      metodoPermitido: ["fechado", "semiaberto"],
      deveConter: [
        "hipótese",
        "baixa confiança",
        "validar no scout",
        "mais pontos",
        "observação"
      ],
      deveEvitar: [
        "confiança alta",
        "afirmação definitiva",
        "ciclo longo",
        "plano avançado",
        "conclusão forte"
      ],
      confiancaEsperada: ["muito baixa", "baixa"]
    }
  },

  {
    id: "TC05_PADRAO_CLARO_SAQUE_TERCEIRA_BOLA",
    nome: "Scout com padrão claro: saque entra, mas não organiza terceira bola",
    objetivoDoTeste: "Verificar se a IA usa direcionar/construir, conecta saque à terceira bola e sugere possível ciclo de 2 semanas.",
    input: {
      turma: {
        nome: "Turma Intermediária Forte",
        nivel: "intermediário",
        quantidadeAlunos: 4,
        focoAnterior: "saque com margem",
        observacaoProfessor:
          "A turma coloca o saque em jogo, mas o saque não tem alvo claro. A dupla fica parada e não lê a devolução para organizar a terceira bola."
      },
      avaliacaoTecnica: {
        saque: 4,
        devolucao: 3,
        forehand: 3,
        backhand: 3,
        lob: 3,
        smash: 3,
        posicionamento: 3,
        leituraDeJogo: 2,
        comunicacaoDaDupla: 2,
        constancia: 3
      },
      autoavaliacao: {
        dificuldadePercebida: "organizar ponto depois do saque",
        confianca: 3,
        comentario: "Meu saque entra, mas depois não sei o que fazer."
      },
      scout: {
        pontosAnalisados: 54,
        gamesAnalisados: 6,
        padroes: [
          {
            tipo: "ponto perdido",
            fundamento: "saque + terceira bola",
            contexto: "saque sem direção e dupla parada após sacar",
            frequencia: 18
          }
        ]
      }
    },
    esperado: {
      estado: ["direcionar", "construir"],
      metodoPermitido: ["semiaberto", "aberto"],
      focoTecnicoEsperado: "saque",
      focoTaticoEsperado: "terceira bola",
      deveConter: [
        "saque com direção",
        "devolução previsível",
        "terceira bola",
        "recuperação de base",
        "ler a devolução"
      ],
      deveEvitar: [
        "apenas sacar forte",
        "saque sem próxima ação",
        "treino genérico de saque",
        "finalização como foco principal"
      ],
      cicloPedagogicoEsperado: {
        podeSerNecessario: true,
        duracaoSugerida: 2
      },
      confiancaEsperada: ["alta"]
    }
  }
];

export const BEACHFLOW_TEST_EVALUATION_CHECKLIST = {
  criteriosObrigatorios: [
    "A resposta está em JSON válido.",
    "O campo diagnostico.gapPrincipal está preenchido.",
    "O campo diagnostico.contexto está preenchido.",
    "O campo diagnostico.confianca é compatível com a quantidade de dados.",
    "O campo decisaoPedagogica.metodo contém apenas fechado, semiaberto ou aberto.",
    "O plano respeita o nível pedagógico da turma.",
    "O plano não usa recurso técnico bloqueado para o nível.",
    "O plano tem progressão.",
    "O plano tem regressão.",
    "O plano tem scout de validação.",
    "O plano pode ser lido em menos de 60 segundos.",
    "O plano nasce do diagnóstico e não de exercício genérico."
  ],
  sinaisDeFalha: [
    "Foco técnico diferente do gap principal sem justificativa.",
    "Uso de golpe avançado com turma iniciante.",
    "Confiança alta com poucos pontos analisados.",
    "Plano sem contexto de jogo.",
    "Plano com frases genéricas como melhorar performance.",
    "Uso de posicionamento sem citar setor quando o problema é espacial.",
    "Treino de voleio sem especificar forehand, backhand, bloqueio ou controle próximo à rede.",
    "Backhand tratado como aceleração genérica.",
    "Smash usado como solução para controle ruim ou bola baixa.",
    "Ciclo pedagógico criado sem necessidade."
  ]
};
