import { strict as assert } from 'node:assert';
import { randomBytes } from 'node:crypto';
import { describe, it } from 'node:test';

const keyA = randomBytes(32).toString('hex');
process.env.ENCRYPTION_KEY = keyA;
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

const { encrypt, decrypt } = require('./encryption.service') as typeof import('./encryption.service');
const envModulePath = require.resolve('../config/env');
const serviceModulePath = require.resolve('./encryption.service');

describe('AES-256-GCM encryption service', () => {
  it('roundtrips credential strings, including empty and unicode values', () => {
    for (const value of ['', 'api-token-123', '密碼 🔐']) {
      assert.equal(decrypt(encrypt(value)), value);
    }
  });

  it('uses a fresh random IV so encrypting the same plaintext yields different payloads', () => {
    const first = encrypt('same credential');
    const second = encrypt('same credential');
    assert.notEqual(first, second);
    assert.equal(first.split(':')[1].length, 24);
    assert.equal(second.split(':')[1].length, 24);
  });

  it('produces different payloads for different plaintexts', () => {
    assert.notEqual(encrypt('credential A'), encrypt('credential B'));
  });

  it('rejects tampered ciphertext', () => {
    const payload = encrypt('secret value');
    const parts = payload.split(':');
    const cipher = parts[3];
    parts[3] = (cipher[0] === '0' ? '1' : '0') + cipher.slice(1);
    assert.throws(() => decrypt(parts.join(':')), /authentication failed/);
  });

  it('rejects a payload encrypted with a different key', () => {
    const payload = encrypt('secret value');
    const keyB = randomBytes(32).toString('hex');

    // env.ts is intentionally evaluated once at startup, so reload both modules
    // to exercise decryption with an independently loaded key.
    process.env.ENCRYPTION_KEY = keyB;
    delete require.cache[serviceModulePath];
    delete require.cache[envModulePath];

    try {
      const wrongKeyService = require('./encryption.service') as typeof import('./encryption.service');
      assert.throws(() => wrongKeyService.decrypt(payload), /authentication failed/);
    } finally {
      process.env.ENCRYPTION_KEY = keyA;
      delete require.cache[serviceModulePath];
      delete require.cache[envModulePath];
      require('../config/env');
    }
  });

  it('rejects unsupported versions and malformed formats clearly', () => {
    assert.throws(() => decrypt('not-an-encrypted-payload'), /Invalid encrypted payload format/);
    assert.throws(() => decrypt('v2:000000000000000000000000:00000000000000000000000000000000:'), /Unsupported encrypted payload version/);
    assert.throws(() => decrypt('v1:abc:bad-tag:00'), /Invalid encrypted payload format/);
  });

  it('fails during env module loading when ENCRYPTION_KEY is absent or malformed', () => {
    for (const invalidKey of [undefined, 'abcd', 'z'.repeat(64)]) {
      if (invalidKey === undefined) {
        delete process.env.ENCRYPTION_KEY;
      } else {
        process.env.ENCRYPTION_KEY = invalidKey;
      }
      delete require.cache[envModulePath];

      try {
        assert.throws(() => require('../config/env'), /ENCRYPTION_KEY/);
      } finally {
        process.env.ENCRYPTION_KEY = keyA;
        delete require.cache[envModulePath];
        require('../config/env');
      }
    }
  });
});
