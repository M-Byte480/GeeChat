export function authenticate<T>(c: T): T {
  return c
}

export function checkUserCanAccessMedia<T>(
  _userPublicKey: string,
  _mediaRecord: T
): boolean {
  return true
}

export function verifyToken(_token: string): { publicKey: string } | null {
  // Placeholder implementation — in a real app, verify the token properly
  return null
}

export function challengeUser(_publicKey: string): string {
  return ''
}
