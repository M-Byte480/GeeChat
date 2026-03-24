export type Server = {
  id: string
  name: string
  url: string // e.g. "https://chat.milan.ie" or "http://192.168.1.100:4000"
}

export type Identity = {
  publicKey: string // base64url, 32-byte Ed25519 public key
  username: string
  pfp?: string // data URL, optional
  privateKeyBytes: Uint8Array // PKCS8 bytes, in-memory only
  servers: Server[]
  sessionTokens: { [serverId: string]: string | undefined }
}

export type IdentityFile = {
  version: 1
  publicKey: string
  username: string
  pfp?: string
  encryptedPrivateKey: string // base64, AES-256-GCM ciphertext
  salt: string // base64, 16-byte PBKDF2 salt
  iv: string // base64, 12-byte AES-GCM IV
  servers?: Server[] // optional for backwards compat with v1 files
  sessionTokens?: { [serverId: string]: string } // optional for backwards compat with v1 files
}

// Payload stored in safeStorage (JSON string)
export type StoredIdentity = {
  publicKey: string
  username: string
  pfp?: string
  privateKeyB64: string // btoa(String.fromCharCode(...privateKeyBytes))
  servers?: Server[]
}
