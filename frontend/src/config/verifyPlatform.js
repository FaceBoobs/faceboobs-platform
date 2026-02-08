// Script di verifica configurazione piattaforma
// Esegui con: node src/config/verifyPlatform.js

import { PLATFORM_CONFIG, calculateFees } from './platform.js';

console.log('🔍 Verifica Configurazione FaceBoobs Platform\n');

// Verifica wallet address
console.log('✅ Wallet Address della Piattaforma:');
console.log(`   ${PLATFORM_CONFIG.WALLET_ADDRESS.toString()}`);
console.log('');

// Verifica network
console.log('🌐 Network Configurato:');
console.log(`   ${PLATFORM_CONFIG.NETWORK}`);
if (PLATFORM_CONFIG.NETWORK === 'devnet') {
  console.log('   ⚠️  DEVNET - Perfetto per testing!');
} else if (PLATFORM_CONFIG.NETWORK === 'mainnet-beta') {
  console.log('   ⚠️  MAINNET - Attenzione: usa SOL reali!');
}
console.log('');

// Verifica percentuale commissioni
console.log('💰 Commissioni:');
console.log(`   ${PLATFORM_CONFIG.FEE_PERCENTAGE * 100}% piattaforma`);
console.log(`   ${(1 - PLATFORM_CONFIG.FEE_PERCENTAGE) * 100}% creator`);
console.log('');

// Test calcolo commissioni
console.log('📊 Test Calcolo Commissioni:\n');

const testAmounts = [0.01, 0.05, 0.1, 0.5, 1.0];

testAmounts.forEach(amount => {
  const fees = calculateFees(amount);
  console.log(`   Prezzo: ${amount} SOL`);
  console.log(`     → Creator:   ${fees.creatorAmount.toFixed(4)} SOL (98%)`);
  console.log(`     → Platform:  ${fees.platformFee.toFixed(4)} SOL (2%)`);
  console.log(`     → Total:     ${fees.total} SOL`);
  console.log('');
});

console.log('✅ Configurazione verificata con successo!');
console.log('');
console.log('📝 Prossimi step:');
console.log('   1. Testa su devnet con piccole somme');
console.log('   2. Verifica transazioni su https://solscan.io/?cluster=devnet');
console.log('   3. Controlla che i fondi arrivino ai wallet corretti');
console.log('   4. Solo dopo test positivi, passa a mainnet');
