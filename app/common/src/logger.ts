/**
 * Dev-only logging: when ENVIRONMENT=dev, logs JSON to stdout (CloudWatch).
 * Shared by jobs and identity Lambdas.
 */
const isDev = process.env.ENVIRONMENT === 'dev';

export function devLog(message: string, data?: Record<string, unknown>): void {
  if (isDev) console.log(JSON.stringify({ level: 'DEBUG', message, ...data }));
}

export { isDev };
