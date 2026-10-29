import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Ajv2020 from '../../../../packages/npc-contracts/node_modules/ajv/dist/2020.js';
import addFormats from '../../../../packages/npc-contracts/node_modules/ajv-formats/dist/index.js';

// Offline contract fixtures only: no server, socket, timer or runtime authority.
const read = relative => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
const ajv = new Ajv2020({ strict: true, allErrors: true, coerceTypes: false, removeAdditional: false, useDefaults: false });
addFormats(ajv);
for (const name of ['common', 'envelope', 'event']) {
  ajv.addSchema(read(`../../../../packages/npc-contracts/schemas/${name}.schema.json`));
}
const schema = read('./schema/contract.schema.json');
ajv.addSchema(schema);
const manifest = read('./examples/manifest.json');
const rows = [];
for (const fixture of manifest) {
  // Given: a checked-in payload and its explicitly selected contract variant.
  const payload = read(`./${fixture.path}`);
  const validate = ajv.compile({ $ref: `${schema.$id}#/$defs/${fixture.definition}` });
  // When
  const valid = validate(payload);
  // Then
  assert.equal(valid, fixture.valid, `${fixture.path}: ${ajv.errorsText(validate.errors)}`);
  if (valid) {
    const top = ajv.getSchema(schema.$id);
    assert(top?.(payload), `${fixture.path}: root union rejects its valid branch`);
  }
  rows.push({ ...fixture, actualValid: valid });
}
assert.equal(new Set(rows.map(row => row.path)).size, rows.length);
console.log(JSON.stringify({ status: 'passed', networkStarted: false, cases: rows.length,
  valid: rows.filter(row => row.valid).length, invalid: rows.filter(row => !row.valid).length,
  rows }, null, 2));
