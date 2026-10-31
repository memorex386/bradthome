import { describe, expect, test } from 'vitest'
import { isAllowedIdentity, isAllowedTrailer, maskAddress } from '../../../scripts/lib/addresses.ts'

const IDENTITIES = [
  '350475588+bradthome-agent@users.noreply.github.com',
  'bradthome-agent@users.noreply.github.com',
  '49699333+dependabot[bot]@users.noreply.github.com',
  'dependabot[bot]@users.noreply.github.com',
  'noreply@github.com',
  'brad@bradthome.com',
]

const NOT_ALLOWED = [
  'jo.example@example.com',
  'ka.example@example.com',
  'someone@noreply.github.com',
  '@users.noreply.github.com',
  '12345+@users.noreply.github.com',
  'bradthome-agent@users.noreply.github.com.example.com',
  'brad@bradthome.com.example.com',
  'not-brad@bradthome.com',
  '',
]

describe('author and committer addresses', () => {
  test('FR-008 allows GitHub noreply addresses and brad@bradthome.com', () => {
    for (const address of IDENTITIES) expect(isAllowedIdentity(address), address).toBe(true)
  })

  test('FR-008 rejects every other address, noreply@anthropic.com included', () => {
    for (const address of [...NOT_ALLOWED, 'noreply@anthropic.com']) {
      expect(isAllowedIdentity(address), address).toBe(false)
    }
  })
})

describe('trailer addresses', () => {
  test('FR-008 allows the same addresses, and noreply@anthropic.com', () => {
    for (const address of [...IDENTITIES, 'noreply@anthropic.com']) {
      expect(isAllowedTrailer(address), address).toBe(true)
    }
  })

  test('FR-008 rejects every other address in a trailer', () => {
    for (const address of [...NOT_ALLOWED, 'noreply@anthropic.com.example.com']) {
      expect(isAllowedTrailer(address), address).toBe(false)
    }
  })
})

describe('masking', () => {
  test('FR-008 keeps an address to its first two letters and its domain', () => {
    expect(maskAddress('jo.example@example.com')).toBe('jo***@example.com')
    expect(maskAddress('ka.example@example.com')).toBe('ka***@example.com')
    expect(maskAddress('someone.private@mail.example.org')).toBe('so***@mail.example.org')
  })

  test('FR-008 a masked address never shows the rest of its local part', () => {
    const masked = maskAddress('jonathan.private@example.com')
    expect(masked).not.toContain('nathan')
    expect(masked).not.toContain('private')
    expect(masked.startsWith('jo')).toBe(true)
  })
})
