import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

function deriveKey(password: string, salt: Buffer | string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
      } else {
        resolve(derivedKey);
      }
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  encodedHash: string
): Promise<boolean> {
  const [algorithm, saltHex, keyHex, ...extra] = encodedHash.split("$");
  if (
    algorithm !== "scrypt" ||
    !/^[a-f0-9]{32}$/i.test(saltHex ?? "") ||
    !/^[a-f0-9]{128}$/i.test(keyHex ?? "") ||
    extra.length > 0
  ) {
    return false;
  }

  const expectedKey = Buffer.from(keyHex, "hex");
  const actualKey = await deriveKey(password, Buffer.from(saltHex, "hex"));
  return timingSafeEqual(actualKey, expectedKey);
}