require('dotenv').config({ path: '../.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('keywords').select('keyword, is_tracked').eq('is_tracked', true);
  console.log(data);
  console.error(error);
}
run();
