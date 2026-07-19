/**
 * RBAC Migration Runner
 * اجرای مستقیم فایل supabase/rbac-tables.sql روی Supabase از طریق RPC exec_sql
 *
 * Usage: node _run_rbac_migration.js
 */

require('dotenv').config({ path: __dirname + '/.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://apscmdspkitpwzhizgkq.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY env var');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Read the SQL migration file
const sqlPath = path.join(__dirname, '..', 'supabase', 'rbac-tables.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');
console.log(`📄 Read migration file (${sqlContent.length} chars)`);

async function main() {
  console.log('🚀 Attempting to execute RBAC migration via exec_sql RPC...');
  
  const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });

  if (error) {
    console.error('❌ exec_sql RPC failed:', error.message);
    console.log('\nTrying alternative approach: split SQL into batches...');
    
    // Split by semicolons and execute each statement
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.length < 5) continue;
      
      try {
        const { error: stmtErr } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
        if (stmtErr) {
          console.log(`  ⚠️  Statement ${i + 1} failed:`, stmtErr.message.substring(0, 100));
          console.log(`     SQL: ${stmt.substring(0, 80)}...`);
          failCount++;
        } else {
          console.log(`  ✅ Statement ${i + 1}: OK`);
          successCount++;
        }
      } catch (e) {
        console.log(`  ❌ Statement ${i + 1} exception:`, e.message.substring(0, 100));
        failCount++;
      }
    }
    
    console.log(`\n📊 Results: ${successCount} succeeded, ${failCount} failed`);
    if (failCount > 0) {
      console.log('\n⚠️  Some statements failed. You may need to run the SQL manually in Supabase Dashboard.');
      console.log('   See: supabase/rbac-tables.sql');
    }
    return;
  }
  
  console.log('✅ RBAC migration executed successfully!');
}

main().catch(e => {
  console.error('💥 Fatal error:', e.message);
  process.exit(1);
});
