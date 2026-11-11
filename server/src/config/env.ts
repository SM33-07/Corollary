interface EnvConfig {
  PORT: number;
  DATABASE_URL: string;
  ENCRYPTION_KEY: string;
  NODE_ENV: string;
}

function loadEnv(): EnvConfig {
  const missingKeys: string[] = [];

  const rawPort = process.env.PORT || '3001';
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT specified in environment: "${process.env.PORT}"`);
  }

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    missingKeys.push('DATABASE_URL');
  }

  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    missingKeys.push('ENCRYPTION_KEY');
  } else if (!/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY)) {
    throw new Error(
      'Invalid ENCRYPTION_KEY: expected exactly 64 hexadecimal characters (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missingKeys.join(', ')}. Please check your .env file.`
    );
  }

  return {
    PORT: port,
    DATABASE_URL: DATABASE_URL as string,
    ENCRYPTION_KEY: ENCRYPTION_KEY as string,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

export const env = loadEnv();
