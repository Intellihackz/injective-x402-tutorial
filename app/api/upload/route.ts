import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

// Ensure the storage directory exists
const STORAGE_DIR = path.join(process.cwd(), ".storage");

// For a production app, use process.env.ENCRYPTION_SECRET.
// We use a hardcoded secret here for the tutorial to keep it simple.
const SECRET = process.env.ENCRYPTION_SECRET || "super_secret_tutorial_key_123";
const ENCRYPTION_KEY = crypto.scryptSync(SECRET, "salt", 32);

async function ensureStorageDir() {
  try {
    await fs.access(STORAGE_DIR);
  } catch {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureStorageDir();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const price = formData.get("price") as string | null;
    const recipientAddress = formData.get("recipientAddress") as string | null;
    const assetAddress = formData.get("assetAddress") as string | null;
    const network = (formData.get("network") as string | null) ?? "eip155:1776";

    if (!file || !price || !recipientAddress || !assetAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const fileId = uuidv4();
    const encryptedFilePath = path.join(STORAGE_DIR, `${fileId}.enc`);
    const metadataPath = path.join(STORAGE_DIR, `${fileId}.json`);

    // 1. Encrypt the file using AES-256-CBC
    // We generate a random IV for each file to ensure encryption is secure
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    
    // Read the uploaded file into a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Encrypt the buffer
    const encryptedBuffer = Buffer.concat([cipher.update(buffer), cipher.final()]);

    // We prepend the IV to the encrypted file so we can read it back during decryption
    const finalFileContent = Buffer.concat([iv, encryptedBuffer]);
    await fs.writeFile(encryptedFilePath, finalFileContent);

    // 2. Save the metadata
    // This tells us how much to charge when someone tries to download this file ID
    const metadata = {
      id: fileId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      price,
      network,
      recipientAddress,
      assetAddress,
      createdAt: new Date().toISOString(),
    };
    
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

    // Return the generated ID to the frontend
    return NextResponse.json({ fileId });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
