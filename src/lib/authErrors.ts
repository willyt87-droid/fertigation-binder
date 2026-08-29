function authErrorBits(err: unknown) {
  const record = err && typeof err === 'object' ? (err as { message?: string; code?: string }) : null
  const message = record?.message || (err instanceof Error ? err.message : String(err ?? ''))
  const code = String(record?.code ?? '').toLowerCase()
  return { message, lower: message.toLowerCase(), code }
}

const UNDELIVERABLE_TLDS = ['.demo', '.test', '.example', '.invalid', '.localhost']

export function cannotReceiveMagicLink(email: string) {
  const lower = email.trim().toLowerCase()
  return UNDELIVERABLE_TLDS.some((tld) => lower.endsWith(tld))
}

export function ownerAuthErrorCopy(err: unknown): string {
  const { lower, code } = authErrorBits(err)
  if (
    lower.includes('rate limit') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('email rate limit exceeded') ||
    code === 'over_email_send_rate_limit'
  ) {
    return 'You already requested a link. Check your inbox, wait a few minutes, then try again.'
  }
  if (
    lower.includes('is invalid') ||
    lower.includes('invalid email') ||
    lower.includes('email_address_invalid') ||
    code === 'email_address_invalid' ||
    code === 'validation_failed'
  ) {
    return 'That address cannot receive a sign-in link. Use an inbox that can.'
  }
  return 'Could not send a sign-in link. Wait a moment and try again.'
}
