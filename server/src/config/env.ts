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
  if (isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT specified in environment: "${process.env.PORT}"`);
  }

  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    missingKeys.push('DATABASE_URL');
  }

  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    missingKeys.push('ENCRYPTION_KEY');
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
