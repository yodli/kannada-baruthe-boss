/**
 * Determine which modules should be upserted and which should be deleted when importing data.
 * @param {Iterable<string>} existingModuleIds - IDs currently stored in Firestore.
 * @param {unknown} importedModules - Raw modules payload from the JSON file.
 * @returns {{ toUpsert: Array<object>, toDelete: Array<string> }}
 */
export function computeModuleSync(existingModuleIds, importedModules) {
  if (!Array.isArray(importedModules)) {
    throw new Error('Invalid JSON format: "modules" must be an array.');
  }

  const sanitizedExistingIds = Array.from(existingModuleIds || [], (id) => `${id}`.trim()).filter(Boolean);
  const existingIdsSet = new Set(sanitizedExistingIds);
  const seenIds = new Set();
  const toUpsert = [];

  importedModules.forEach((module, index) => {
    if (!module || typeof module !== 'object') {
      throw new Error(`Invalid module entry at index ${index}: expected an object.`);
    }

    const rawId = module.id;
    if (typeof rawId !== 'string' || rawId.trim() === '') {
      throw new Error(`Invalid module entry at index ${index}: missing a valid "id".`);
    }

    const trimmedId = rawId.trim();
    if (seenIds.has(trimmedId)) {
      throw new Error(`Duplicate module id detected in import: ${trimmedId}`);
    }

    seenIds.add(trimmedId);

    const sanitizedModule = {
      ...module,
      id: trimmedId,
      phrases: Array.isArray(module.phrases) ? module.phrases : [],
    };

    toUpsert.push(sanitizedModule);
  });

  const toDelete = [];
  existingIdsSet.forEach((id) => {
    if (!seenIds.has(id)) {
      toDelete.push(id);
    }
  });

  return { toUpsert, toDelete };
}

/**
 * Normalize the user data payload from the JSON file into an array of IndexedDB records.
 * @param {unknown} rawUserData
 * @returns {Array<object>}
 */
export function normalizeUserDataRecords(rawUserData) {
  if (rawUserData === undefined || rawUserData === null) {
    return [];
  }

  const records = Array.isArray(rawUserData) ? rawUserData : [rawUserData];

  return records.map((record, index) => {
    if (!record || typeof record !== 'object') {
      throw new Error(`Invalid userData entry at index ${index}: expected an object.`);
    }

    if (typeof record.key !== 'string' || record.key.trim() === '') {
      throw new Error(`Invalid userData entry at index ${index}: missing a valid "key".`);
    }

    return { ...record, key: record.key.trim() };
  });
}
