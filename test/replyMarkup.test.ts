import assert from 'node:assert/strict';
import test from 'node:test';
import { createReplyMarkup } from '../src/utils/replyMarkup.js';

test('creates one Telegram keyboard row per button', () => {
  const result = createReplyMarkup([
    { text: 'Site', url: 'https://example.com' },
    { text: 'App', url: 'https://example.com/app', type: 'web_app' },
  ]);

  assert.deepEqual(result, {
    inline_keyboard: [
      [{ text: 'Site', url: 'https://example.com' }],
      [{ text: 'App', web_app: { url: 'https://example.com/app' } }],
    ],
  });
});

test('does not send an empty keyboard', () => {
  assert.equal(createReplyMarkup([]), undefined);
});
