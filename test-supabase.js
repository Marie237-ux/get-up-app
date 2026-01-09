// test-supabase.js
// Script pour tester la connexion à Supabase
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Test de connexion Supabase');
console.log('URL:', supabaseUrl ? '✅ Configurée' : '❌ Manquante');
console.log('Anon Key:', supabaseAnonKey ? '✅ Configurée' : '❌ Manquante');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  const startTime = Date.now();
  
  try {
    console.log('\n📡 Test de connexion à Supabase...');
    
    // Test 1: Connexion simple
    const { data, error } = await supabase.from('user_roles').select('count').limit(1);
    
    if (error) {
      console.error('❌ Erreur de connexion:', error.message);
      return;
    }
    
    console.log(`✅ Connexion réussie en ${Date.now() - startTime}ms`);
    
    // Test 2: Test de timeout
    console.log('\n⏱️ Test de timeout (5 secondes)...');
    const timeoutTest = await Promise.race([
      supabase.from('user_roles').select('*').limit(1),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 5000)
      )
    ]);
    
    console.log('✅ Test timeout réussi');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    
    if (error.message === 'Timeout') {
      console.error('⚠️ La connexion à Supabase est très lente ou timeout');
    }
  }
}

testConnection().then(() => {
  console.log('\n🏁 Test terminé');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Erreur fatale:', error);
  process.exit(1);
});
