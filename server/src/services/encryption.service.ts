import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PAYLOAD_VERSION = 'v1';

function getEncryptionKey(): Buffer {
  // env.ts validates the key at module load time; retain a defensive check here.
  const key = Buffer.from(env.ENCRYPTION_KEY, 'hex');
  if (key.length !== 32) {
    throw new Error('Invalid encryption configuration: ENCRYPTION_KEY must be 32 bytes.');
  }
  return key;
}

/**
 * Encrypts a credential string using AES-256-GCM.
 * The returned payload is safe to persist, but must never be logged.
 */
export function encrypt(plaintext: string): string {
  if (typeof plaintext !== 'string') {
    throw new TypeError('Encryption input must be a string.');
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    PAYLOAD_VERSION,
    iv.toString('hex'),
    authTag.toString('hex'),
    ciphertext.toString('hex'),
  ].join(':');
}

/**
 * Decrypts a versioned AES-256-GCM payload.
 * Authentication failures are surfaced without exposing cryptographic details.
 */
export function decrypt(encryptedPayload: string): string {
  if (typeof encryptedPayload !== 'string') {
    throw new TypeError('Encrypted payload must be a string.');
  }

  const parts = encryptedPayload.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted payload format.');
  }

  const [version, ivHex, authTagHex, ciphertextHex] = parts;
  if (version !== PAYLOAD_VERSION) {
    throw new Error(`Unsupported encrypted payload version: ${version || '(empty)'}.`);
  }

  if (
    !new RegExp(`^[0-9a-fA-F]{${IV_LENGTH * 2}}$`).test(ivHex) ||
    !new RegExp(`^[0-9a-fA-F]{${AUTH_TAG_LENGTH * 2}}$`).test(authTagHex) ||
    !/^(?:[0-9a-fA-F]{2})*$/.test(ciphertextHex)
  ) {
    throw new Error('Invalid encrypted payload format.');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  try {
    const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    throw new Error('Unable to decrypt payload: authentication failed or encryption key is incorrect.');
  }
}
