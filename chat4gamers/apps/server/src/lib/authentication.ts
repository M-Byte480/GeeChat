export function authenticate<T>(c:T) : T{
  return c;
}

export function checkUserCanAccessMedia<T>(userPublicKey:string, mediaRecord:T) : boolean{

  return true;
}

export function verifyToken(token: string): { publicKey: string } | null {
  // Placeholder implementation — in a real app, verify the token properly
  return null;
}