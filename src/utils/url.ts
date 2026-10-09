/**
 * Returns true only for well-formed http(s) URLs (rejects javascript:, data:, etc.).
 */
export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
