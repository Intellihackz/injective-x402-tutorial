import crypto from "crypto";

export async function encryptFile(
  fileBuffer: Buffer,
  secret: string
): Promise<Buffer> {
  // Generate a random salt for this specific file
  const salt = crypto.randomBytes(16);
  // Derive key using the per-file salt
  const key = crypto.scryptSync(secret, salt, 32);
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  
  const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
  
  // Prepend salt and IV to the file so we can derive the key and decrypt later
  return Buffer.concat([salt, iv, encrypted]);
}

export async function decryptFile(encryptedFileBuffer: Buffer, secret: string): Promise<Buffer> {
  const salt = encryptedFileBuffer.subarray(0, 16);
  const iv = encryptedFileBuffer.subarray(16, 32);
  const cipherText = encryptedFileBuffer.subarray(32);
  
  const key = crypto.scryptSync(secret, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  
  return Buffer.concat([decipher.update(cipherText), decipher.final()]);
}
