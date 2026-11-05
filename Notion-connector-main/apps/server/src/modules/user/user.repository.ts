import { query } from "../../database/client";

// ─── Row type ───────────────────────────────────────────────────────
export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

// ─── Queries ────────────────────────────────────────────────────────

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    "SELECT * FROM users WHERE id = $1",
    [id]
  );
  return result.rows[0] ?? null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await query<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] ?? null;
}

export async function createUser(
  email: string,
  name?: string
): Promise<UserRow> {
  const result = await query<UserRow>(
    `INSERT INTO users (email, name) VALUES ($1, $2) RETURNING *`,
    [email, name ?? null]
  );
  return result.rows[0];
}

/**
 * Find a user by email — if not found, create one atomically.
 * Uses INSERT … ON CONFLICT to avoid race conditions.
 */
export async function findOrCreateUser(
  email: string,
  name?: string
): Promise<UserRow> {
  const result = await query<UserRow>(
    `INSERT INTO users (email, name)
     VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
     RETURNING *`,
    [email, name ?? null]
  );
  return result.rows[0];
}

export interface UserCredentialsRow extends UserRow {
  password_hash: string | null;
}

export async function findUserCredentialsByEmail(
  email: string
): Promise<UserCredentialsRow | null> {
  const result = await query<UserCredentialsRow>(
    "SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
    [email]
  );
  return result.rows[0] ?? null;
}

export async function createUserWithPassword(
  email: string,
  passwordHash: string,
  name?: string
): Promise<UserRow | null> {
  const result = await query<UserRow>(
    `INSERT INTO users (email, password_hash, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id, email, name, created_at, updated_at`,
    [email, passwordHash, name ?? null]
  );
  return result.rows[0] ?? null;
}