const assert = require('assert');

// Test Suite: Store Integrity, Data Migration, Backup & Demo Mode
console.log('====================================================');
console.log('🛡️ STORE DATA INTEGRITY & MIGRATION TEST SUITE');
console.log('====================================================\n');

// 1. Test Mock Environment setup
const mockStorage = {};
global.window = {
  document: {},
  location: { href: 'https://second-brain-ai-system.vercel.app/' },
  localStorage: {
    getItem: (k) => mockStorage[k] || null,
    setItem: (k, v) => { mockStorage[k] = String(v); },
    removeItem: (k) => { delete mockStorage[k]; }
  },
  dispatchEvent: () => {}
};

// Clear module cache to test fresh store
delete require.cache[require.resolve('../js/store')];
const Store = require('../js/store');

// Test 1: First-time browser user gets clean empty vault
console.log('Test 1: First-Time Browser User Initialization');
Store.init();
assert.strictEqual(Store.notes.length, 0, 'First-time user in browser must start with an empty vault');
console.log('  ✅ [PASS] Real browser first-time user starts with clean empty vault (0 notes)');

// Test 2: User creates legitimate personal notes
console.log('\nTest 2: Genuine User Note Creation');
const userNote = Store.addNote({
  title: 'My Custom Project Roadmap',
  content: 'Quarterly OKRs for the autonomous agent infrastructure project.',
  sourceType: 'typing'
});
assert.ok(userNote && userNote.id, 'User note must be created');
assert.strictEqual(userNote.isSample, undefined, 'User note must not be marked as sample');
assert.strictEqual(Store.notes.length, 1, 'Store must contain exactly 1 user note');
console.log('  ✅ [PASS] Genuine user note created without sample pollution');

// Test 3: Existing user migration prunes legacy fabricated resume seeds safely
console.log('\nTest 3: Backward-Compatible Legacy Seed Migration');
// Inject a legacy seed alongside the genuine user note
const legacySeed = {
  id: 'note-seed-123456',
  title: '📄 Ankita Priyadarshini Pallai - 1-Page Google Authentic PDF Resume (ANKITA_PRIYADARSHINI_RESUME.pdf)',
  content: 'Official Google-Shortlist Verified 1-Page PDF Resume for Ankita Priyadarshini Pallai...',
  sourceUrl: 'file:///C:/Users/ankit/Downloads/ANKITA_PRIYADARSHINI_RESUME.pdf',
  pinned: true
};
Store.notes.push(legacySeed);
Store.saveNotes();
assert.strictEqual(Store.notes.length, 2, 'Store has 2 notes before migration');

// Re-initialize to trigger migration
Store.init();
assert.strictEqual(Store.notes.length, 1, 'Legacy fabricated seed must be pruned');
assert.strictEqual(Store.notes[0].title, 'My Custom Project Roadmap', 'Genuine user note must be preserved');

// Verify backup was created
const backupStr = mockStorage['second_brain_vault_backup_latest'];
assert.ok(backupStr, 'Vault backup must be saved prior to pruning');
const backupObj = JSON.parse(backupStr);
assert.strictEqual(backupObj.notesCount, 2, 'Backup must contain all notes before pruning');
console.log('  ✅ [PASS] Legacy seed pruned, genuine note preserved, and safety backup created');

// Test 4: Explicit Demo Mode toggle
console.log('\nTest 4: Explicit Demo Mode Activation');
Store.loadDemoNotes();
assert.strictEqual(Store.notes.length, 100, 'Demo mode must load 100 sample notes');
for (const n of Store.notes) {
  assert.strictEqual(n.isSample, true, 'All demo notes must be flagged isSample: true');
  assert.ok(!n.title.toLowerCase().includes('ankita priyadarshini'), 'Demo notes must not contain personal resume claims');
}
console.log('  ✅ [PASS] Demo mode loads 100 clean, generic sample notes labeled isSample: true');

// Test 5: Clear Demo Notes
console.log('\nTest 5: Clear Demo Notes');
// Add a user note during demo mode
Store.notes.push({ id: 'user_keep', title: 'Note To Keep', content: 'Important note' });
Store.clearDemoNotes();
assert.strictEqual(Store.notes.length, 1, 'Clearing demo notes leaves user notes intact');
assert.strictEqual(Store.notes[0].title, 'Note To Keep');
console.log('  ✅ [PASS] Clear demo notes removes only sample notes, preserving user data');

// Test 6: Export and Restore
console.log('\nTest 6: Vault JSON Export & Restore');
const exportedJson = Store.exportVaultJSON();
const exportedObj = JSON.parse(exportedJson);
assert.strictEqual(exportedObj.version, '1.0.0');
assert.strictEqual(exportedObj.notesCount, 1);

// Test restore
Store.notes = [];
Store.saveNotes();
assert.strictEqual(Store.notes.length, 0);
const restoreRes = Store.restoreVaultBackup(exportedJson);
assert.strictEqual(restoreRes.success, true);
assert.strictEqual(Store.notes.length, 1);
assert.strictEqual(Store.notes[0].title, 'Note To Keep');
console.log('  ✅ [PASS] Vault JSON export and restore works with complete fidelity');

console.log('\n====================================================');
console.log('SUMMARY: ALL STORE INTEGRITY TESTS PASSED CLEANLY.');
console.log('====================================================\n');
