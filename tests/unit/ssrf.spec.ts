import { describe, it, expect } from 'vitest'
import { isPrivateAddress, assertPublicHost } from '../../server/ssrf.mjs'

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254',
    '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1',
    '::ffff:7f00:1', 'not-an-ip',
  ])('refuses %s', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true)
  })

  it.each(['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '93.184.216.34', '2606:4700:4700::1111'])(
    'accepts %s',
    (ip) => {
      expect(isPrivateAddress(ip)).toBe(false)
    },
  )
})

describe('assertPublicHost', () => {
  it('rejects private IP literals, including bracketed IPv6', async () => {
    await expect(assertPublicHost('127.0.0.1')).rejects.toThrow()
    await expect(assertPublicHost('[::1]')).rejects.toThrow()
  })
  it('lets everything through when allowPrivate is set', async () => {
    await expect(assertPublicHost('127.0.0.1', { allowPrivate: true })).resolves.toBeUndefined()
  })
})
