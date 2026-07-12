import { createHash, createHmac } from 'crypto';

const SECRET = process.env.SESSION_SECRET || 'ecosphere-super-secret-key-998877';

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function signToken(employeeId: string): string {
  const hmac = createHmac('sha256', SECRET).update(employeeId).digest('hex');
  return `${employeeId}.${hmac}`;
}

export function verifyToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [employeeId, signature] = parts;
  const expectedHmac = createHmac('sha256', SECRET).update(employeeId).digest('hex');
  if (signature === expectedHmac) {
    return employeeId;
  }
  return null;
}
