# ADR-006: Credential Encryption at Rest

## Context

Corollary stores connection credentials so the connection service can authenticate to configured data sources. NFR-4 requires credentials to be encrypted at rest and prohibits logging secrets in plaintext. Encryption must be in place before connection creation endpoints write their first credential; introducing it after CRUD implementation would leave an avoidable period in which newly stored credentials are plaintext.

The backend runs on Node.js with TypeScript. Node's built-in `crypto` module provides AES-256-GCM without adding a third-party cryptography dependency. The encryption key must remain outside the repository and database, supplied through the server environment.

## Decision

Use AES-256-GCM with a 256-bit key (32 bytes) read from `ENCRYPTION_KEY`. The centralized environment module validates the value at module load: it must consist of exactly 64 hexadecimal characters. Missing or malformed values fail startup with an actionable configuration error.

Generate a new cryptographically secure 96-bit (12-byte) IV with `randomBytes` for every encryption operation. Store the output as a versioned string:

`v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>`

The authentication tag is 128 bits (16 bytes). The service exports pure `encrypt(plaintext: string): string` and `decrypt(encryptedPayload: string): string` utilities and has no database dependency. Decryption validates the payload structure and version before attempting authenticated decryption; authentication failures (including a wrong key or modified data) are reported as decryption failures.

The encryption key, plaintext credentials, and ciphertext must not be written to application logs. Generate a deployment key with:

`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Store it in the deployment's secret/environment configuration and in a local, ignored `.env` file only. Never commit a real key.

## Alternatives Considered

- **AES-256-CBC:** Provides confidentiality but not built-in authentication. It would require a separate message authentication mechanism and careful composition to detect tampering. GCM provides authenticated encryption in one standard mode.
- **A third-party encryption package:** Adds a dependency without providing a necessary capability that Node's built-in `crypto` lacks for this use case.
- **External KMS/envelope encryption:** Strong option for managed key lifecycle, access control, and rotation at larger scale, but adds infrastructure and operational complexity not required for this sprint. The versioned envelope leaves room for a future migration.
- **Store credentials in plaintext and encrypt later:** Rejected because the first credential write must already satisfy NFR-4.

## Consequences

- Credentials are confidential and tamper-evident when stored as encrypted payloads.
- Every encryption call uses an independently generated IV; IV reuse with the same key must never be introduced.
- Deployments must provision the same encryption key to every server instance that needs to decrypt existing records. Losing or replacing the key without a migration makes existing ciphertext unrecoverable.
- Key rotation is not automatic. A future rotation process should support decrypting older versioned payloads and re-encrypting them under a new key, potentially using a KMS.
- The version prefix enables future algorithms or key-management schemes to coexist during migration.
- The connection service must call `encrypt` before persisting credentials and `decrypt` only when credentials are required. Neither plaintext nor ciphertext should be logged.
