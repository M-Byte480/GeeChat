import { createPublicKey, verify as cryptoVerify } from 'node:crypto'

// SEQUENCE { SEQUENCE { OID 1.3.101.112 } BIT STRING { 0x00 + 32-byte key } }
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

function base64urlToBuffer(str: string): Buffer {
  const padded = str
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), '=')
  return Buffer.from(padded, 'base64')
}

export function verifyEd25519(
  publicKeyB64url: string,
  message: Buffer,
  signatureB64url: string
): boolean {
  try {
    const keyBytes = base64urlToBuffer(publicKeyB64url)
    if (keyBytes.length !== 32) return false
    const spkiDer = Buffer.concat([ED25519_SPKI_PREFIX, keyBytes])
    const publicKey = createPublicKey({
      key: spkiDer,
      format: 'der',
      type: 'spki',
    })
    const sigBuf = base64urlToBuffer(signatureB64url)
    return cryptoVerify(null, message, publicKey, sigBuf)
  } catch {
    return false
  }
}
