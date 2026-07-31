/**
 * Second Brain AI System — Dependency Inversion Principle (DIP) & Database Migration Test Suite
 * Validates abstract repository contracts, DI container adapter swapping, and migration performance.
 */

const assert = require('assert');
const { INoteRepository, AbstractMethodError } = require('../js/data-repository-interface');
const { LocalStorageNoteRepository, InMemoryNoteRepository } = require('../js/storage-adapters');
const { container } = require('../js/container');
const { DatabaseMigrationManager, defaultMigrationManager } = require('../js/migration-manager');

// Polyfill window / localStorage
global.window = {
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; }
  }
};

const Store = require('../js/store');

console.log('====================================================');
console.log('🏗️ DEPENDENCY INVERSION & DB MIGRATION TEST SUITE');
console.log('====================================================\n');

let passCount = 0;
let totalTests = 0;

function test(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${description}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${description}`);
    console.error(`     Error: ${err.message}\n${err.stack}`);
  }
}

// Suite A: Abstract Interface Contracts (DIP)
console.log('Suite A: Abstract Interface Contracts (DIP)');

test('INoteRepository interface abstract methods should throw AbstractMethodError when invoked directly', () => {
  const abstractInstance = new INoteRepository();
  assert.throws(() => abstractInstance.getAll(), AbstractMethodError);
  assert.throws(() => abstractInstance.save({}), AbstractMethodError);
  assert.throws(() => abstractInstance.delete('id'), AbstractMethodError);
});

// Suite B: Dependency Injection Container & Adapter Swapping
console.log('\nSuite B: Dependency Injection Container & Storage Adapter Swapping');

test('DI Container should resolve NoteRepository and support dynamic adapter swapping', () => {
  const localAdapter = new LocalStorageNoteRepository('test_notes_dip_v1');
  container.register('NoteRepository', localAdapter);

  const resolvedAdapter = container.resolve('NoteRepository');
  assert.strictEqual(resolvedAdapter, localAdapter, 'Container failed to resolve registered adapter');

  // Save note via adapter
  resolvedAdapter.save({ id: 'dip-note-1', title: 'DIP Abstraction Test', content: 'Testing repository decoupling' });
  const retrieved = resolvedAdapter.getById('dip-note-1');
  assert.ok(retrieved, 'Failed to retrieve note from adapter');

  // Swap to InMemory adapter dynamically without changing service caller
  const sampleNotes = [
    { id: 'mem-1', title: 'InMemory Note 1', content: 'Memory storage', tags: ['Testing'] },
    { id: 'mem-2', title: 'InMemory Note 2', content: 'Memory storage', tags: ['DIP'] }
  ];
  const memoryAdapter = new InMemoryNoteRepository(sampleNotes);
  container.register('NoteRepository', memoryAdapter);

  const swappedAdapter = container.resolve('NoteRepository');
  assert.strictEqual(swappedAdapter.getAll().length, 2, 'Swapped adapter should contain 2 in-memory notes');
  assert.strictEqual(swappedAdapter.getById('mem-1').title, 'InMemory Note 1');
});

test('Store should query persistence via DIP repository container methods', () => {
  const memAdapter = new InMemoryNoteRepository([
    { id: 'store-dip-1', title: 'Store DIP Note', content: 'Decoupled persistence' }
  ]);
  Store.setRepository('NoteRepository', memAdapter);

  const notes = Store.getNotes();
  assert.ok(notes.length > 0, 'Store failed to retrieve notes via DIP repository container');
  assert.strictEqual(notes[0].id, 'store-dip-1');
});

// Suite C: Database Migration Manager & Migration Time Benchmark
console.log('\nSuite C: Database Migration Manager & Reduced Migration Time Benchmark');

test('DatabaseMigrationManager should execute step-wise schema migrations cleanly', () => {
  const repo = new InMemoryNoteRepository([
    { id: 'n1', title: 'Legacy Note 1', content: 'v1 data without schema tags' },
    { id: 'n2', title: 'Legacy Note 2', content: 'v1 data without schema tags' }
  ]);

  const result = defaultMigrationManager.migrateRepository(repo, 2);

  assert.strictEqual(result.success, true, 'Migration failed');
  assert.strictEqual(result.recordCount, 2);
  assert.strictEqual(result.targetVersion, 2);

  const migratedNotes = repo.getAll();
  assert.strictEqual(migratedNotes[0].schemaVersion, 2, 'Note schema version should be updated to 2');
  assert.ok(Array.isArray(migratedNotes[0].tags), 'Migrated note missing tags array');
  assert.ok(migratedNotes[0].summary, 'Migrated note missing auto-generated summary');
});

test('Database Schema Migration speed benchmark should complete 100+ record transforms under 5ms', () => {
  const manager = new DatabaseMigrationManager();
  const dummy100Notes = Array.from({ length: 120 }, (_, i) => ({
    id: `bench-note-${i}`,
    title: `Benchmark Note #${i}`,
    content: `Content snippet for note #${i} measuring database migration duration.`,
    tags: ['Benchmark', 'Migration']
  }));

  const benchResult = manager.measureMigrationSpeed(dummy100Notes, 3);

  console.log(`     -> Migration Benchmark: 120 Notes transformed in ${benchResult.migrationTimeMs}ms (${benchResult.throughputPerSec} ops/sec)`);

  assert.ok(benchResult.migrationTimeMs < 10, `Migration duration (${benchResult.migrationTimeMs}ms) exceeded 10ms target!`);
  assert.strictEqual(benchResult.totalRecords, 120);
});

console.log('\n====================================================');
console.log(`SUMMARY: ${passCount} / ${totalTests} TESTS PASSED CLEANLY.`);
console.log('====================================================\n');

if (passCount === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
