import test from 'node:test';
import assert from 'node:assert/strict';
import { computeModuleSync, normalizeUserDataRecords } from '../js/import-utils.js';

test('computeModuleSync identifies modules to upsert and delete', () => {
  const existing = ['basics', 'travel', 'food'];
  const imported = [
    { id: 'basics', title: 'Basics', phrases: [{ id: 1 }] },
    { id: 'culture', title: 'Culture', phrases: [] },
  ];

  const result = computeModuleSync(existing, imported);
  assert.deepEqual(
    result.toUpsert.map((m) => m.id).sort(),
    ['basics', 'culture']
  );
  assert.deepEqual(result.toDelete.sort(), ['food', 'travel']);
});

test('computeModuleSync sanitizes module structure and rejects duplicates', () => {
  const existing = [];
  const imported = [
    { id: ' greetings ', title: 'Greetings', phrases: 'not-an-array' },
  ];

  const result = computeModuleSync(existing, imported);
  assert.equal(result.toUpsert.length, 1);
  assert.equal(result.toUpsert[0].id, 'greetings');
  assert.deepEqual(result.toUpsert[0].phrases, []);

  assert.throws(
    () =>
      computeModuleSync(existing, [
        { id: 'dup', title: 'First' },
        { id: 'dup', title: 'Second' },
      ]),
    /Duplicate module id/
  );
});

test('computeModuleSync validates input types', () => {
  assert.throws(() => computeModuleSync([], null), /modules\" must be an array/);
  assert.throws(
    () => computeModuleSync([], [{}]),
    /missing a valid "id"/
  );
});

test('normalizeUserDataRecords returns sanitized records', () => {
  const single = normalizeUserDataRecords({ key: ' profile ', name: 'Cara' });
  assert.deepEqual(single, [{ key: 'profile', name: 'Cara' }]);

  const multiple = normalizeUserDataRecords([
    { key: 'profile', name: 'Cara' },
    { key: 'settings', theme: 'dark' },
  ]);
  assert.equal(multiple.length, 2);

  assert.deepEqual(normalizeUserDataRecords(undefined), []);

  assert.throws(() => normalizeUserDataRecords([{ name: 'Missing key' }]), /missing a valid "key"/);
});
