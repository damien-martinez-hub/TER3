import {
  createUserWithPassword,
  findUserById,
  findUserCredentialsByEmail,
  findOrCreateUser,
  type UserRow,
} from "./user.repository";
import { hashPassword, verifyPassword } from "./password.service";

const DUMMY_PASSWORD_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;

/** Get an existing user by primary key. */
export async function getUserById(id: string): Promise<UserRow | null> {
  return findUserById(id);
}

/**
 * Guarantee a user row exists for the given email.
 * Creates one atomically if it doesn't exist (ON CONFLICT).
 * Used during session bootstrap / dev auto-login.
 */
export async function ensureUser(
  email: string,
  name?: string
): Promise<UserRow> {
  return findOrCreateUser(email, name);
}

export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<UserRow | null> {
  const passwordHash = await hashPassword(password);
  return createUserWithPassword(email, passwordHash, name);
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<UserRow | null> {
  const user = await findUserCredentialsByEmail(email);
  const passwordHash = user?.password_hash ?? DUMMY_PASSWORD_HASH;
  const validPassword = await verifyPassword(password, passwordHash);

  if (!user || !user.password_hash || !validPassword) {
    return null;
  }

  const { password_hash: _passwordHash, ...safeUser } = user;
  return safeUser;
}