// Cliente Supabase do app (auth + leitura direta com RLS por usuário).
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Se não houver config, exporta null e o app cai no modo demo (sem auth real).
export const supabase = (URL && ANON) ? createClient(URL, ANON) : null;
export const authEnabled = !!supabase;
