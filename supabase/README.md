# Edge Function — `gerar-plano`

Proxy seguro entre o app e o provedor de IA. A chave fica como secret no
Supabase, nunca no app (o navegador só fala com a função).

Provedores suportados:
- Gemini: `GEMINI_API_KEY` + `AI_PROVIDER=gemini`
- Claude: `ANTHROPIC_API_KEY` + `AI_PROVIDER=anthropic`

## Pré-requisitos
- Chave do Gemini em Google AI Studio: **GEMINI_API_KEY** (https://aistudio.google.com/app/apikey)
  - O Gemini API tem tier gratuito para testes com limites menores, segundo a página oficial de preços do Google AI.
- Opcional: conta Anthropic com **ANTHROPIC_API_KEY** (https://console.anthropic.com → API Keys)
- Supabase CLI: `brew install supabase/tap/supabase`
- Projeto Supabase já existe: `btjsweysefmbceqqlyxx`

## Deploy (uma vez)
```bash
cd beachflow-app

# 1. login + vincular ao projeto
supabase login
supabase link --project-ref btjsweysefmbceqqlyxx

# 2. guardar a chave do Gemini como secret (NÃO vai pro git)
supabase secrets set AI_PROVIDER=gemini GEMINI_API_KEY=AIza...

# opcional: manter Claude como fallback manual/troca futura
supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

# 3. publicar a função
supabase functions deploy gerar-plano
```

A função fica em:
`https://btjsweysefmbceqqlyxx.supabase.co/functions/v1/gerar-plano`

## Ligar no app
Crie `beachflow-app/.env` (copie de `.env.example`) com:
```
VITE_GERAR_PLANO_ENDPOINT=https://btjsweysefmbceqqlyxx.supabase.co/functions/v1/gerar-plano
VITE_SUPABASE_ANON_KEY=<sua anon key>
```
Sem essas variáveis, a tela Plano gera um plano local com os dados disponíveis (não chama a IA).

## Testar
Diagnóstico rápido do app, tabelas REST e Edge Function:
```bash
npm run check:supabase
```

Esse comando lê o `.env`, mascara a anon key no terminal, testa as tabelas esperadas e chama
`gerar-plano` com `action: "listar"` para não gastar chamada de IA.

Teste manual de geração real:
```bash
curl -X POST https://btjsweysefmbceqqlyxx.supabase.co/functions/v1/gerar-plano \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"context":{"alvo":"turma","nome":"Turma B","nivel":"Intermediário","duracaoMin":60,"avaliacaoProfessor":{"Devolução":2,"Constância":3},"scout":"muitos erros na devolução cruzada"}}'
```
Deve retornar `{ "plano": { ... } }` no formato do spec.
