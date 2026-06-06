// A TypeScript service that talks to Stripe and Postgres.

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export function databaseUrl(): string {
  return process.env.DATABASE_URL ?? "";
}

export function verifyWebhook(signature: string): boolean {
  return signature.length > 0 && webhookSecret.length > 0;
}
