# Building a Pay-to-Unlock Content Platform with Injective x402

In this tutorial, we will build a platform that allows creators to upload encrypted files and sell them directly for USDC on the Injective EVM network. We will use the **x402 protocol**—a Web3 evolution of the HTTP 402 Payment Required standard. 

By the end, you'll have a Next.js application that supports both **Human** (browser wallet) and **AI Agent** (programmatic) payment flows.

---

## 1. Project Setup

First, create a new Next.js project using the App Router and Tailwind CSS:

```bash
npx create-next-app@latest injective-x402-app
cd injective-x402-app
```

Install the required Web3 and UI dependencies:

```bash
npm install @injectivelabs/x402 viem lucide-react
```

Create a `.storage` directory in the root of your project to hold the encrypted files and metadata locally:
```bash
mkdir .storage
```
*(In a production app, you would swap this local storage out for AWS S3 or IPFS).*

---

## 2. Environment Variables

Create a `.env.local` file in your project root.

```env
# Secret used to encrypt files at rest (min 32 chars)
ENCRYPTION_SECRET=super_secret_tutorial_key_123

# The Facilitator Wallet
# This wallet pays INJ gas to settle the USDC transfer on-chain.
# It MUST be funded with INJ on Injective EVM Testnet.
PRIVATE_KEY=0xYOUR_FACILITATOR_PRIVATE_KEY
```

---

## 3. The Upload API (Encryption & Metadata)

When a creator uploads a file, we need to encrypt it so that nobody (not even the server admin) can read it without paying. We also need to save metadata (price, asset, recipient) so the server knows what to charge later.

Create `app/api/upload/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const STORAGE_DIR = path.join(process.cwd(), ".storage");
const SECRET = process.env.ENCRYPTION_SECRET!;
const ENCRYPTION_KEY = crypto.scryptSync(SECRET, "salt", 32);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const price = formData.get("price") as string;
  const recipientAddress = formData.get("recipientAddress") as string;
  const assetAddress = formData.get("assetAddress") as string;
  const network = formData.get("network") as string;

  const fileId = crypto.randomUUID();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  
  const buffer = Buffer.from(await file.arrayBuffer());
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const finalFileContent = Buffer.concat([iv, encrypted]);

  // Save Encrypted File
  await fs.writeFile(path.join(STORAGE_DIR, fileId), finalFileContent);

  // Save Metadata
  const metadata = {
    id: fileId, filename: file.name, size: file.size,
    mimeType: file.type || "application/octet-stream",
    price, network, recipientAddress, assetAddress
  };
  
  await fs.writeFile(
    path.join(STORAGE_DIR, `${fileId}.json`), 
    JSON.stringify(metadata, null, 2)
  );

  return NextResponse.json({ fileId });
}
```

---

## 4. The Download API (x402 Facilitator)

This is the core of the x402 protocol. When a request comes in:
1. If there's no payment, return a `402 Payment Required` challenge.
2. If there is a `PAYMENT-SIGNATURE` header, verify it.
3. If valid, settle the transaction on-chain.
4. Finally, decrypt and return the file.

Create `app/api/download/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { decodePaymentSignatureHeader, InjectiveFacilitator } from "@injectivelabs/x402";

// Setup keys and storage... (same as upload)

const FACILITATOR_PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  
  // 1. Load Metadata
  const metadata = JSON.parse(await fs.readFile(path.join(STORAGE_DIR, `${id}.json`), "utf-8"));

  // 2. Define Payment Requirements
  const requirements = {
    scheme: "exact",
    network: metadata.network,
    asset: metadata.assetAddress,
    amount: Math.floor(parseFloat(metadata.price) * 1_000_000).toString(), // USDC has 6 decimals
    payTo: metadata.recipientAddress,
    maxTimeoutSeconds: 60,
    extra: {},
  };

  // 3. Initialize Facilitator
  const facilitator = new InjectiveFacilitator({ privateKey: FACILITATOR_PRIVATE_KEY });

  // 4. Check for Payment Header
  const signatureHeader = req.headers.get("PAYMENT-SIGNATURE");
  if (!signatureHeader) {
    return NextResponse.json({ x402Version: 2, accepts: [requirements] }, { status: 402 });
  }

  // 5. Verify & Settle
  const paymentPayload = decodePaymentSignatureHeader(signatureHeader);
  const verifyResult = await facilitator.verify(paymentHeader, requirements);
  
  if (!verifyResult.success) {
    return NextResponse.json({ error: "Payment invalid" }, { status: 402 });
  }

  await facilitator.settle({ paymentPayload, paymentRequirements: requirements });

  // 6. Decrypt and Stream File
  const encryptedFile = await fs.readFile(path.join(STORAGE_DIR, id));
  const iv = encryptedFile.subarray(0, 16);
  const cipherText = encryptedFile.subarray(16);
  
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  const decrypted = Buffer.concat([decipher.update(cipherText), decipher.final()]);

  return new NextResponse(decrypted, {
    headers: {
      "Content-Type": metadata.mimeType,
      "Content-Disposition": `attachment; filename="${metadata.filename}"`,
    },
  });
}
```

---

## 5. The Download UI (Human Pay)

To allow standard users to pay, we need a frontend page that connects their wallet, requests an EIP-3009 signature, and sends it to our API.

Create `app/download/[id]/page.tsx` (Summary of key logic):

```typescript
import { createWalletClient, custom, parseUnits } from "viem";
import { signAuthorization, encodePaymentSignatureHeader, createPaymentPayload } from "@injectivelabs/x402";

// ... UI Component Setup ...

async function payAndDownload() {
  // 1. Setup Viem Wallet Client
  const walletClient = createWalletClient({
    account,
    chain: INJECTIVE_CHAIN,
    transport: custom((window as any).ethereum),
  });

  // 2. Build the EIP-3009 Authorization
  const auth = {
    from: account,
    to: meta.recipientAddress,
    value: parseUnits(meta.price, 6),
    validAfter: now - 60n,
    validBefore: now + 300n,
    nonce: createNonce(),
  };

  // 3. Request Signature from Wallet (MetaMask)
  const signature = await signAuthorization(
    walletClient, meta.assetAddress, "USD Coin", CHAIN_ID, auth, "2"
  );

  // 4. Build x402 Header
  const paymentPayload = createPaymentPayload(requirements, { signature, authorization: auth });
  const paymentHeader = encodePaymentSignatureHeader(paymentPayload);

  // 5. Fetch File
  const response = await fetch(`/api/download/${id}`, {
    headers: { "PAYMENT-SIGNATURE": paymentHeader },
  });

  // 6. Trigger Browser Download
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = meta.filename;
  a.click();
}
```

---

## Conclusion

You now have a fully functional web application that:
- Encrypts content at rest.
- Leverages Injective EVM for low-cost, fast transactions.
- Implements EIP-3009 for seamless UX (the user just signs a message; the server pays the gas).
- Fully supports the x402 protocol, making your data monetization natively compatible with AI Agents.
