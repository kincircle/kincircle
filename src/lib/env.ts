function readOptionalServerEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function readRequiredServerEnv(name: string, purpose: string): string {
  const value = readOptionalServerEnv(name);
  if (!value) {
    throw new Error(`${name} is required for ${purpose}.`);
  }
  return value;
}

export function getBetterAuthSecret(): string {
  return readRequiredServerEnv("BETTER_AUTH_SECRET", "auth session signing");
}

export function getBetterAuthUrl(): string {
  return readRequiredServerEnv("BETTER_AUTH_URL", "auth callbacks and redirects");
}

export function getDatabaseUrl(): string {
  return readRequiredServerEnv("DATABASE_URL", "database access");
}

export function getResendApiKey(): string {
  return readRequiredServerEnv("RESEND_API_KEY", "transactional email delivery");
}

export function getEmailFrom(): string {
  return readRequiredServerEnv("EMAIL_FROM", "transactional email delivery");
}

export function getMapboxAccessToken(): string | undefined {
  return readOptionalServerEnv("MAPBOX_ACCESS_TOKEN");
}

export function getGoogleOAuthConfig():
  | {
      clientId: string;
      clientSecret: string;
    }
  | undefined {
  const clientId = readOptionalServerEnv("GOOGLE_CLIENT_ID");
  const clientSecret = readOptionalServerEnv("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    return undefined;
  }

  return {
    clientId,
    clientSecret,
  };
}

export const isGoogleAuthEnabled = Boolean(getGoogleOAuthConfig());
