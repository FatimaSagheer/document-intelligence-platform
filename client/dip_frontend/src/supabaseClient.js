import { createClient } from '@supabase/supabase-js';

const supabaseUrl ='https://igbbkratqiplellhkxlz.supabase.co';
const supabaseKey = 'sb_publishable_G9xC96e0LaQacv3ImKc2Qw_B5QhqLs3';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env variables!', {
    supabaseUrl,
    supabaseKey
  });
}

export const supabase = createClient(supabaseUrl, supabaseKey);