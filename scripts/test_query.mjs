import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://dnrlcidwgkwfsivlqtba.supabase.co', 'sb_publishable_ZCYndadkUgmhVx7FdDxdJA_KeooUPsk');

async function run() {
  const cleanNome = 'YURI ARAUJO';
  const expectedLogin = 'YURI ARAUJO@Mantran';
  
  try {
    const res1 = await supabase
      .from('usuario')
      .select('*')
      .eq('perfil', 'Cliente')
      .or(`nome.ilike.${cleanNome},login.ilike.${expectedLogin}`)
      .limit(1);
    console.log('Res1 data:', res1.data, 'error:', res1.error);
  } catch (e) {
    console.error('Res1 catch:', e);
  }
}
run();
