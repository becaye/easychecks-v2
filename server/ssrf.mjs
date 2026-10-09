import { lookup } from 'node:dns/promises'
import net from 'node:net'

/**
 * True for addresses a scan must never reach: loopback, private, link-local,
 * CGNAT, multicast/reserved and their IPv6 equivalents (incl. IPv4-mapped).
 */
export function isPrivateAddress(ip) {
  const version = net.isIP(ip)
  if (version === 4) {
    const [a, b, c] = ip.split('.').map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 0 && c === 0) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    )
  }
  if (version === 6) {
    const v6 = ip.toLowerCase()
    const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateAddress(mapped[1])
    const mappedHex = v6.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
    if (mappedHex) {
      const hi = parseInt(mappedHex[1], 16)
      const lo = parseInt(mappedHex[2], 16)
      return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
    }
    return (
      v6 === '::' ||
      v6 === '::1' ||
      /^f[cd]/.test(v6) || // fc00::/7 unique local
      /^fe[89ab]/.test(v6) || // fe80::/10 link-local
      v6.startsWith('ff') // multicast
    )
  }
  return true // not an IP: refuse
}

/**
 * Throws if `hostname` is, or resolves to, a non-public address.
 * `allowPrivate` is for local development only.
 */
export async function assertPublicHost(hostname, { allowPrivate = false } = {}) {
  if (allowPrivate) return
  const host = hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('Adresse non autorisée (réseau privé ou local).')
    return
  }
  let addresses
  try {
    addresses = await lookup(host, { all: true })
  } catch {
    throw new Error(`Nom de domaine introuvable : ${host}`)
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('Adresse non autorisée (réseau privé ou local).')
  }
}
