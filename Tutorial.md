# Building a Pay-to-Unlock Content Platform with Injective x402

Welcome! In this tutorial, we're going to build a fully functional token-gated content platform on Injective EVM. By the end, you'll have written an Express backend, built a sleek React frontend using Vite, and connected everything together into a production-ready DApp where creators can upload encrypted files and sell them directly for tokens—all while fully supporting autonomous AI agents.

## Table of Contents

* [Prerequisites](#prerequisites)
* [What We're Building](#what-were-building)
* [Project Setup](#project-setup)
* [Building the Server](#building-the-server)
* [Building the Frontend](#building-the-frontend)
* [Testing the Agent Flow](#testing-the-agent-flow)

---

## Prerequisites

Before we dive in, let's make sure you have everything you need:

* **Node.js 18+**
* **MetaMask wallet**
* **Some testnet INJ & USDC**

## What We're Building

We are building an application with two parts:
1. **Express Server:** Handles secure file uploads, encrypts files dynamically with a per-file salt, and serves as the x402 Facilitator to settle EIP-3009 transactions.
2. **Vite + React Frontend:** Provides a beautiful UI for humans to upload files, generate links, and sign EIP-3009 authorizations to download content gaslessly.

---

## Project Setup

We'll use a monorepo-style structure with `server/` and `client/` directories.

```bash
mkdir injective-x402-app
cd injective-x402-app
```

### Server Initialization

```bash
mkdir server
cd server
npm init -y
npm install express cors dotenv multer @injectivelabs/x402
npm install -D typescript @types/express @types/cors @types/multer @types/node ts-node
```

### Frontend Initialization

Open a new terminal in the root `injective-x402-app` folder:

```bash
npx create-vite@latest client --template react-ts
cd client
npm install
npm install lucide-react viem @injectivelabs/x402 react-router-dom
```

---

## Building the Server

### Environment Variables

Create a `.env` file in the `server` directory:

```env
# Secret used to derive encryption keys
ENCRYPTION_SECRET=super_secret_tutorial_key_123

# The Facilitator Wallet
PRIVATE_KEY=0xYOUR_FACILITATOR_PRIVATE_KEY
```

> ⚠️ **SECURITY WARNING:** Using a `.env` file for secrets like `PRIVATE_KEY` or `ENCRYPTION_SECRET` is insecure for production environments. This is done here merely for tutorial and learning purposes. In a real-world scenario, you should use secure secret managers like AWS Secrets Manager or HashiCorp Vault.

### The Encryption Utility

We don't want a single global salt for encryption because it's less secure. Instead, we generate a random 16-byte salt for *every single file uploaded*, and use that alongside the `ENCRYPTION_SECRET` to derive a unique key. 

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

### The Facilitator Singleton

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

### The Express API

Now, let's wire up our `POST /api/upload` and `GET /api/download/:id` routes in `server/index.ts`.

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
import { encryptFile, decryptFile } from "./utils/encryption";
import { getFacilitator } from "./utils/facilitator";

dotenv.config();

const app = express();
const port = 3000;
const upload = multer({ storage: multer.memoryStorage() });

const STORAGE_DIR = path.join(process.cwd(), ".storage");

app.use(cors());
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
    res.status(500).json({ error: "Upload failed" });
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
      amount: Math.floor(parseFloat(metadata.price) * 1_000_000).toString(), payTo: metadata.recipientAddress,
      maxTimeoutSeconds: 60, extra: {},
    };

    const facilitator = getFacilitator();
    const signatureHeader = req.headers["payment-signature"] as string;
    
    if (!signatureHeader) {
      return res.status(402).json({ x402Version: 2, accepts: [requirements] });
    }

    const paymentPayload = decodePaymentSignatureHeader(signatureHeader);
    const verifyResult = await facilitator.verify(paymentPayload, requirements);

    if (!verifyResult.success) return res.status(402).json({ error: "Payment invalid" });

    await facilitator.settle({ paymentPayload, paymentRequirements: requirements });

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

## Building the Frontend

Now let's move over to the `client/` directory and build our Vite + React frontend.

### App Routing

Replace the contents of `src/App.tsx` with the following:

```tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import Download from "./Download";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/download/:id" element={<Download />} />
      </Routes>
    </Router>
  );
}

export default App;
```

### The Upload Interface (`Home.tsx`)

This interface handles selecting a file and posting the data (with the consistent `TOKEN_ADDRESS`) to our Express server. 

Create `src/Home.tsx`:

<details>
<summary>Click to view <code>src/Home.tsx</code></summary>

```tsx
import { useState } from "react";
import { UploadCloud, Link as LinkIcon, FileCheck2, ShieldCheck, Coins } from "lucide-react";

const TOKEN_ADDRESS = "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d" as `0x${string}`;
const NETWORK = "eip155:1439";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [price, setPrice] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [humanUrl, setHumanUrl] = useState("");
  const [agentUrl, setAgentUrl] = useState("");

  const handleCreateLink = async () => {
    if (!file || !price || !recipientAddress) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("price", price);
      formData.append("recipientAddress", recipientAddress);
      formData.append("assetAddress", TOKEN_ADDRESS);
      formData.append("network", NETWORK);

      const res = await fetch("http://localhost:3000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      
      setHumanUrl(`${window.location.origin}/download/${data.fileId}`);
      setAgentUrl(`http://localhost:3000/api/download/${data.fileId}`);
    } catch (error) {
      alert("Failed to upload and encrypt file.");
    } finally {
      setIsUploading(false);
    }
  };

  // ... (Full UI rendering logic, drag and drop handlers, etc.)
  return <div>{/* Base Upload UI Here */}</div>;
}
```
</details>

### The Download Interface (`Download.tsx`)

This component connects to MetaMask, queries the file metadata using our `/info` endpoint, and signs an EIP-3009 message for the Express Server.

Create `src/Download.tsx`:

<details>
<summary>Click to view <code>src/Download.tsx</code></summary>

```tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createWalletClient, createPublicClient, custom, http, parseUnits } from "viem";
import { createNonce, signAuthorization, encodePaymentSignatureHeader, createPaymentPayload } from "@injectivelabs/x402";

// ... (Network configuration constants)

export default function Download() {
  const { id } = useParams<{ id: string }>();
  const [meta, setMeta] = useState<any>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`http://localhost:3000/api/download/${id}/info`)
      .then((r) => r.json())
      .then((data) => setMeta(data));
  }, [id]);

  async function payAndDownload() {
    if (!meta || !account || !id) return;

    try {
      // 1. Prepare Authorization
      const now = BigInt(Math.floor(Date.now() / 1000));
      const auth = {
        from: account, to: meta.recipientAddress, value: parseUnits(meta.price, 6),
        validAfter: now - 60n, validBefore: now + 300n, nonce: createNonce(),
      };

      // 2. Gasless Sign via Wallet
      const walletClient = createWalletClient({ account, transport: custom((window as any).ethereum) });
      const signature = await signAuthorization(walletClient, meta.assetAddress, "USDC", 1439, auth, "2");

      // 3. Build x402 Header
      const requirements = {
        scheme: "exact" as const, network: meta.network, asset: meta.assetAddress,
        amount: Math.floor(parseFloat(meta.price) * 1_000_000).toString(), payTo: meta.recipientAddress,
        maxTimeoutSeconds: 60, extra: {},
      };
      const paymentPayload = createPaymentPayload(requirements, {
        signature, authorization: { ...auth, value: auth.value.toString(), validAfter: auth.validAfter.toString(), validBefore: auth.validBefore.toString() }
      });
      const paymentHeader = encodePaymentSignatureHeader(paymentPayload);

      // 4. Download File
      const response = await fetch(`http://localhost:3000/api/download/${id}`, {
        headers: { "PAYMENT-SIGNATURE": paymentHeader },
      });

      if (!response.ok) throw new Error("Server error");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = meta.filename; a.click();
    } catch (e: any) {
      alert("Download failed.");
    }
  }

  // ... (Full UI rendering logic)
  return <div>{/* Checkout Card UI */}</div>;
}
```
</details>

---

## Testing the Agent Flow

The best part about x402 is that it's natively machine-readable. We can test the programmatic AI Agent flow using a simple Node.js script.

Run the test client against a generated agent URL (`http://localhost:3000/api/download/<file-id>`):
```bash
npx tsx scripts/test-download.ts http://localhost:3000/api/download/<file-id>
```

The script will hit the 402, parse the JSON requirements, sign the transaction using `TEST_CLIENT_PRIVATE_KEY` from `.env`, resubmit the signature, and save the decrypted file automatically!

## Conclusion

Congratulations! 🎉 You've successfully built a Pay-to-Unlock platform using Express, Vite, and the Injective x402 protocol.
