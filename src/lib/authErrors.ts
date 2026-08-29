export function ownerAuthErrorCopy(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '')
  const lower = raw.toLowerCase()
  if (
    lower.includes('rate limit') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('email rate limit exceeded')
  ) {
    return 'You already requested a link. Check your inbox, wait a few minutes, then try again.'
  }
  if (lower.includes('invalid login') || lower.includes('invalid email')) {
    return 'Check the email address and try again.'
  }
  return 'Could not send a sign-in link. Wait a moment and try again.'
}
