import { createClient } from '@supabase/supabase-js'

// Substitua pelas suas chaves reais do Supabase (Project Settings > API)
const supabaseUrl = 'https://ejteowagrhmczcxqrwkk.supabase.co'
const supabaseKey = 'sb_publishable_Vkr_8OcI0fFnM7wSwTdE8w_LWpRkD3H'

export const supabase = createClient(supabaseUrl, supabaseKey)