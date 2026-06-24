# Part 1: Building the Server

In this section, we'll build the robust Express API that handles file uploads, per-file encryption, and acts as the x402 Facilitator.

If you haven't set up your environment yet, return to the [Main Tutorial](Tutorial.md).

## Table of Contents

* [Environment Variables](#environment-variables)
* [The Encryption Utility](#the-encryption-utility)
* [The Facilitator Singleton](#the-facilitator-singleton)
* [The Express API](#the-express-api)

---

## Environment Variables

Create a `.env` file in the `server` directory:

```env
# Secret used to derive encryption keys
ENCRYPTION_SECRET=super_secret_tutorial_key_123

# The Facilitator Wallet
PRIVATE_KEY=0xYOUR_FACILITATOR_PRIVATE_KEY
```

> ⚠️ **SECURITY WARNING:** Using a `.env` file for secrets like `PRIVATE_KEY` or `ENCRYPTION_SECRET` is insecure for production environments. This is done here merely for tutorial and learning purposes. In a real-world scenario, you should use secure secret managers like AWS Secrets Manager or HashiCorp Vault.

## The Encryption Utility

We don't want a single global salt for encryption because it's less secure. Instead, we generate a random 16-byte salt for *every single file uploaded*, and use that alongside the `ENCRYPTION_SECRET` to derive a unique key. 

> 💡 **Note on Secrets vs. Salts**: 
> - **Secret**: The `secret` parameter passed to our utility is derived from the `ENCRYPTION_SECRET` in our server's `.env` file. It is highly confidential.
> - **Salt**: The `salt` does not need to be passed in by the user or hidden. It is unique per file, generated and stored alongside the file upon upload, and simply read from the file when downloaded.

Create `server/utils/encryption.ts`:

<details>
<summary>Click to view <code>server/utils/encryption.ts</code></summary>

```typescript
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
```
</details>

## The Facilitator Singleton

Initializing `InjectiveFacilitator` on every route invocation is inefficient for a hot path. Instead, we use the singleton pattern so it's initialized only upon first use, and we reuse the same instance thereafter.

Create `server/utils/facilitator.ts`:

<details>
<summary>Click to view <code>server/utils/facilitator.ts</code></summary>

```typescript
import { InjectiveFacilitator } from "@injectivelabs/x402";

let instance: InjectiveFacilitator | null = null;

export function getFacilitator(): InjectiveFacilitator {
  if (!instance) {
    if (!process.env.PRIVATE_KEY) {
      throw new Error("PRIVATE_KEY environment variable is required");
    }
    instance = new InjectiveFacilitator({
      privateKey: process.env.PRIVATE_KEY as `0x${string}`,
    });
  }
  return instance;
}
```
</details>

## The Express API

Now, let's wire up our `POST /api/upload` and `GET /api/download/:id` routes in `server/index.ts`.

> ⚠️ **PRODUCTION WARNING**: In this tutorial, we use `multer.memoryStorage()` which stores all uploaded files directly in the server's RAM. This is perfectly fine for a demo, but in production, all files are lost when the server restarts. You must configure [multer](https://github.com/expressjs/multer#storage) to use local disk storage (`multer.diskStorage()`) or a cloud service like AWS S3 via [multer-s3](https://github.com/anacronw/multer-s3) so your files are persistently stored.

<details>
<summary>Click to view <code>server/index.ts</code></summary>

```typescript
import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { decodePaymentSignatureHeader } from "@injectivelabs/x402";
import { encryptFile, decryptFile } from "./utils/encryption.js";
import { getFacilitator } from "./utils/facilitator.js";

dotenv.config();

const app = express();
const port = 3000;
const upload = multer({ storage: multer.memoryStorage() });

const STORAGE_DIR = path.join(process.cwd(), ".storage");

app.use(cors({
  exposedHeaders: ['x-transaction-hash', 'x402-version']
}));
app.use(express.json());

// UPLOAD API
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const { price, recipientAddress, assetAddress, network } = req.body;
    const fileId = crypto.randomUUID();
    
    await encryptFile(file.buffer, fileId, process.env.ENCRYPTION_SECRET!);

    const metadata = {
      id: fileId, filename: file.originalname, size: file.size,
      mimeType: file.mimetype || "application/octet-stream",
      price, network, recipientAddress, assetAddress,
    };

    await fs.writeFile(
      path.join(STORAGE_DIR, `${fileId}.json`),
      JSON.stringify(metadata, null, 2)
    );

    res.json({ fileId });
  } catch (error) {
    console.error("Error during upload:", error);
    res.status(500).json({ error: "Upload failed. Please check server logs." });
  }
});

// METADATA INFO API
app.get("/api/download/:id/info", async (req, res) => {
  try {
    const { id } = req.params;
    const metadata = JSON.parse(await fs.readFile(path.join(STORAGE_DIR, `${id}.json`), "utf-8"));
    res.json(metadata);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

// DOWNLOAD API (Facilitator)
app.get("/api/download/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const metadata = JSON.parse(await fs.readFile(path.join(STORAGE_DIR, `${id}.json`), "utf-8"));

    const requirements = {
      scheme: "exact" as const, network: metadata.network, asset: metadata.assetAddress,
      // We multiply the price by 1,000,000 because USDC uses 6 decimal places (1 USDC = 1,000,000 micro-USDC)
      amount: Math.floor(parseFloat(metadata.price) * 1_000_000).toString(), payTo: metadata.recipientAddress,
      maxTimeoutSeconds: 60, extra: {},
    };

    const facilitator = getFacilitator();
    const signatureHeader = req.headers["payment-signature"] as string;
    
    if (!signatureHeader) {
      return res.status(402).json({ x402Version: 2, accepts: [requirements] });
    }

    const paymentPayload = decodePaymentSignatureHeader(signatureHeader);
    const verifyResult = await facilitator.verify({ paymentPayload, paymentRequirements: requirements });

    if (!verifyResult.isValid) return res.status(402).json({ error: "Payment invalid" });

    const settleResult = await facilitator.settle({ paymentPayload, paymentRequirements: requirements });
    
    const txHash = settleResult.transaction || "unknown";
    console.log(`Payment settled successfully! TX Hash: ${txHash}`);
    res.setHeader("x-transaction-hash", txHash);

    const decryptedBuffer = await decryptFile(id, process.env.ENCRYPTION_SECRET!);
    res.setHeader("Content-Type", metadata.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${metadata.filename}"`);
    res.send(decryptedBuffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Server error" });
  }
});

app.listen(port, () => console.log(`Server listening on port ${port}`));
```
</details>

---

[Next: Part 2 - Building the Frontend →](Tutorial-Frontend.md)
