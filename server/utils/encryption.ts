import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), ".storage");

export async function encryptFile(
  fileBuffer: Buffer,
  fileId: string,
  secret: string
) {
  // Generate a random salt for this specific file
  const salt = crypto.randomBytes(16);
  // Derive key using the per-file salt
  const key = crypto.scryptSync(secret, salt, 32);
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  
  // Prepend salt and IV to the file so we can derive the key and decrypt later
  const finalFileContent = Buffer.concat([salt, iv, encrypted]);

  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(path.join(STORAGE_DIR, fileId), finalFileContent);
}

export async function decryptFile(fileId: string, secret: string): Promise<Buffer> {
  const encryptedFile = await fs.readFile(path.join(STORAGE_DIR, fileId));
  
  const salt = encryptedFile.subarray(0, 16);
  const iv = encryptedFile.subarray(16, 32);
  const cipherText = encryptedFile.subarray(32);
  
  const key = crypto.scryptSync(secret, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  
  return Buffer.concat([decipher.update(cipherText), decipher.final()]);
}
