import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ENCODING: BufferEncoding = "hex";

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || "milaap-default-secret-key-change-me";
  return scryptSync(secret, "milaap-salt", 32);
}

export function encrypt(text: string): string {
  if (!text) return text;
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", ENCODING);
  encrypted += cipher.final(ENCODING);
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText || !encryptedText.includes(":")) return encryptedText;
  
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(":");
    if (parts.length !== 3) return encryptedText;
    
    const iv = Buffer.from(parts[0], ENCODING);
    const authTag = Buffer.from(parts[1], ENCODING);
    const encrypted = parts[2];
    
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, ENCODING, "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch {
    return encryptedText;
  }
}

export function encryptProfile(profile: any) {
  return {
    ...profile,
    name: profile.name ? encrypt(profile.name) : profile.name,
    bio: profile.bio ? encrypt(profile.bio) : profile.bio,
    partner2Name: profile.partner2Name ? encrypt(profile.partner2Name) : profile.partner2Name,
  };
}

export function decryptProfile(profile: any) {
  if (!profile) return profile;
  return {
    ...profile,
    name: profile.name ? decrypt(profile.name) : profile.name,
    bio: profile.bio ? decrypt(profile.bio) : profile.bio,
    partner2Name: profile.partner2Name ? decrypt(profile.partner2Name) : profile.partner2Name,
  };
}

export function encryptMessage(content: string): string {
  return encrypt(content);
}

export function decryptMessage(content: string): string {
  return decrypt(content);
}
