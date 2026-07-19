// Run from backend/ directory: node _run_migration.js
require('dotenv').config({ path: __dirname + '/.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  // Add quantity_in_carton column
  const { error: err1 } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity_in_carton INT DEFAULT 0`
  });
  if (err1) {
    // Fallback: try raw SQL via REST
    console.log('RPC not available, trying direct SQL...');
    const { error: err2 } = await supabase
      .from('products')
      .update({ quantity_in_carton: 0 })
      .eq('id', 0); // This will fail, but we're just testing

    // Actually let's query information_schema to check
    const { data, error } = await supabase
      .rpc('exec_sql', { sql: `SELECT column_name FROM information_schema.columns WHERE table_name='products'` });
    
    if (error) {
      console.error('Cannot use RPC:', error.message);
      console.log('Need to run SQL directly via Supabase dashboard or psql');
      
      // Try using the POSTGRES_URL directly with pg
      console.log('Falling back to pg...');
    }
  } else {
    console.log('Migration executed successfully');
  }

  // Just query the existing columns via the products endpoint
  const { data, error } = await supabase
    .from('products')
    .select('id, name, quantity_in_carton')
    .limit(1);
  
  if (error) {
    console.log('quantity_in_carton column does not exist:', error.message);
  } else {
    console.log('quantity_in_carton column exists:', data);
  }
}

main().catch(e => console.error(e));
