import assert from 'node:assert/strict';
import test from 'node:test';
import { parseMailingInput } from '../src/validation.js';

test('normalizes a valid mailing payload', () => {
  const result = parseMailingInput({
    text: 'Hello',
    recipients: [{ telegramId: 123456789 }],
    sendAt: '2026-08-01T12:00:00Z',
  });

  assert.equal(result.type, 'text');
  assert.equal(result.recipients[0].telegramId, '123456789');
  assert.ok(result.sendAt instanceof Date);
});

test('requires media for photo mailings', () => {
  assert.throws(() => parseMailingInput({ text: 'Hello', type: 'photo', recipients: [{ telegramId: '1' }] }));
});
