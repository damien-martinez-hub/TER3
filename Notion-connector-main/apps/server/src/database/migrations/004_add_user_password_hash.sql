-- Migration: 004_add_user_password_hash
-- Description: Store password hashes for email/password accounts

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT;