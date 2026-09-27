import { promisify } from 'node:util';
import {
  createHmac,
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';

const scrypt = promisify(scryptCallback);
export const SESSION_COOKIE = 'quizmaster_session';
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function authSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    throw new Error('AUTH_SECRET must be set to at least 32 characters.');
  }
  return secret;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(password, passwordHash) {
  const [algorithm, salt, storedHex] = (passwordHash || '').split(':');
  if (algorithm !== 'scrypt' || !salt || !storedHex) return false;
  const stored = Buffer.from(storedHex, 'hex');
  const derived = await scrypt(password, salt, stored.length);
  return stored.length === derived.length && timingSafeEqual(stored, derived);
}

export function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function createSessionToken(user) {
  const payload = Buffer.from(JSON.stringify({
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    expiresAt: Date.now() + SESSION_SECONDS * 1000,
  })).toString('base64url');
  const signature = createHmac('sha256', authSecret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function readSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return null;
    const expected = createHmac('sha256', authSecret()).update(payload).digest();
    const provided = Buffer.from(signature, 'base64url');
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (!session.userId || !['student', 'admin'].includes(session.role) || session.expiresAt <= Date.now()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function setSessionCookie(response, user) {
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}

export function publicUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
}

export function safeSecretMatches(candidate, expected) {
  if (!candidate || !expected) return false;
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}
