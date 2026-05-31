# Edge Function — `gerar-plano`

Proxy seguro entre o app e a Claude API. A `ANTHROPIC_API_KEY` fica como secret no
Supabase, nunca no app (o navegador só fala com a função).

## Pré-requisitos
- Conta Anthropic com **ANTHROPIC_API_KEY** (https://console.anthropic.com → API Keys)
- Supabase CLI: `brew install supabase/tap/supabase`
- Projeto Supabase já existe: `btjsweysefmbceqqlyxx`

## Deploy (uma vez)
```bash
cd beachflow-app

# 1. login + vincular ao projeto
supabase login
supabase link --project-ref btjsweysefmbceqqlyxx

# 2. guardar a chave da Anthropic como secret (NÃO vai pro git)
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
Sem essas variáveis, a tela Plano usa um **plano de exemplo** (não chama a IA).

## Testar
```bash
curl -X POST https://btjsweysefmbceqqlyxx.supabase.co/functions/v1/gerar-plano \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"context":{"alvo":"turma","nome":"Turma B","nivel":"Intermediário","duracaoMin":60,"avaliacaoProfessor":{"Devolução":2,"Constância":3},"scout":"muitos erros na devolução cruzada"}}'
```
Deve retornar `{ "plano": { ... } }` no formato do spec.
