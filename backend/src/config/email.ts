const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) return defaultValue;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export const loadEmailConfig = (): EmailConfig | null => {
  const enabled = parseBoolean(process.env.SMTP_ENABLED, true);

  if (!enabled) {
    return null;
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    console.warn(
      'SMTP configuration incomplete. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to enable email notifications.'
    );
    return null;
  }

  return {
    enabled: true,
    host,
    port: Number(port),
    secure: parseBoolean(process.env.SMTP_SECURE, true),
    user,
    pass,
    fromName: process.env.SMTP_FROM_NAME ?? 'Property UAE Notifications',
    fromEmail: process.env.SMTP_FROM_EMAIL ?? user,
  };
};

