# Building a Pay-to-Unlock Content Platform with Injective x402

Welcome! In this tutorial, we're going to build a fully functional Pay-to-Unlock platform from scratch. By the end, you'll have a Next.js application where creators can upload encrypted files and sell them directly for USDC on Injective EVM. 

Don't worry if you've never worked with the x402 protocol or Injective before - I'll walk you through every step and explain not just *what* we're doing, but *why* we're doing it. Think of this as us coding together!

## Table of Contents

- [Prerequisites](#prerequisites)
- [Complete Code Repository](#complete-code-repository)
- [What We're Building](#what-were-building)
- [How This Will Work](#how-this-will-work)
- [Step 1: Setting Up Our Project](#step-1-setting-up-our-project)
- [Step 2: The Upload API (Encryption & Metadata)](#step-2-the-upload-api-encryption--metadata)
- [Step 3: The Download API (x402 Facilitator)](#step-3-the-download-api-x402-facilitator)
- [Step 4: Building the Download UI (Human Pay)](#step-4-building-the-download-ui-human-pay)
- [Step 5: Testing the Agent Flow](#step-5-testing-the-agent-flow)
- [Conclusion](#conclusion)

## Prerequisites

Before we jump in, let's make sure you have everything you need. Don't worry - we won't need anything too fancy:

- **Node.js 18+** - We'll be using modern Next.js features
- **MetaMask wallet** - Install it if you haven't already, and make sure it's configured
- **Basic React & Next.js knowledge** - You should be comfortable with App Router and API routes
- **Some Testnet INJ** - For the facilitator wallet to pay gas fees
- **Some Testnet USDC** - For the buyer wallet to purchase files

If you're missing any of these, no worries! You can pick them up as we go along.

## Complete Code Repository

📁 **[View the complete source code on GitHub](https://github.com/Intellihackz/injective-x402-tutorial)**

### 📖 How to Use This Tutorial

This tutorial can be used in two ways:

1. **Learning Mode** - Follow along step-by-step and build everything from scratch to understand how each piece works
2. **Reference Mode** - If you've already cloned the completed repository, use this tutorial to understand the implementation details of each feature

## What We're Building

Here's what your platform will be able to do by the end of this tutorial:

- **Upload & Encrypt** - Creators can upload files and price them in USDC. Files are encrypted server-side via AES-256-CBC.
- **Dual Payment Flows** - Generate a browser link for humans and a raw API link for AI Agents.
- **EIP-3009 Gasless Payments** - Buyers just sign a message; the server pays the gas to settle the transaction on-chain.
- **Automated Decryption** - Files are automatically decrypted and downloaded once the on-chain payment clears.

Pretty cool, right? And we'll build it all from scratch so you understand every piece.

## How This Will Work

Let me quickly explain the architecture so you know what we're building:

**Frontend**: We'll use Next.js 15 (App Router) and Tailwind CSS v4.
**Blockchain**: All payments happen on Injective EVM using USDC.
**Protocol**: We're using the x402 protocol—a Web3 evolution of HTTP 402 Payment Required.
**Storage**: We'll use local `.storage` files for simplicity, but you can swap this for AWS S3.

The main tools we'll use are:
- `@injectivelabs/x402` - Injective's SDK for handling 402 challenges and settlement
- `viem` - For wallet connections and EIP-712 typed data signing

Alright, let's start building!

---

## Step 1: Setting Up Our Project

The first thing we need to do is create a new Next.js project and install our dependencies.

### Creating Our App

Open your terminal and run:

```bash
npx create-next-app@latest injective-x402-app
cd injective-x402-app
```

Choose TypeScript, Tailwind CSS, and the App Router during setup.

### Installing Dependencies

Now we need to install the x402 SDK and viem:

```bash
npm install @injectivelabs/x402 viem lucide-react
```

### Environment Variables

Create a `.env.local` file in your root directory. This is where we'll store our encryption secret and the server's facilitator wallet.

```env
# filepath: .env.local

# Secret used to encrypt files at rest (min 32 chars)
ENCRYPTION_SECRET=super_secret_tutorial_key_123

# The Facilitator Wallet
# This wallet pays INJ gas to settle the USDC transfer on-chain.
# It MUST be funded with INJ on Injective EVM Testnet.
PRIVATE_KEY=0xYOUR_FACILITATOR_PRIVATE_KEY
```

> **💡 Tip**: The `PRIVATE_KEY` above does *not* receive the USDC. It simply pays the INJ gas fee to broadcast the buyer's signed message to the blockchain.

---

## Step 2: The Upload API (Encryption & Metadata)

When a creator uploads a file, we need to encrypt it so that nobody can read it without paying. We also need to save metadata (price, asset, recipient) so the server knows what to charge later.

Let's create our upload route:

```typescript
// filepath: app/api/upload/route.ts
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

  // Ensure storage dir exists and save Encrypted File
  await fs.mkdir(STORAGE_DIR, { recursive: true });
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

Let me break down what's happening here:
- We generate a random `fileId` and a random Initialization Vector (`iv`).
- We encrypt the file using `aes-256-cbc` and prepend the `iv` to the file so we can decrypt it later.
- We save the metadata JSON right next to it. This metadata acts as our "price tag".

---

## Step 3: The Download API (x402 Facilitator)

This is the core of the x402 protocol. When someone tries to download the file:
1. If there's no payment attached, we return a `402 Payment Required` challenge.
2. If there is a `PAYMENT-SIGNATURE` header, we verify it.
3. If valid, we settle the transaction on-chain.
4. Finally, we decrypt and return the file.

```typescript
// filepath: app/api/download/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { decodePaymentSignatureHeader, InjectiveFacilitator } from "@injectivelabs/x402";

// ... (Encryption setup same as upload) ...

const FACILITATOR_PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params;
  
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

  const facilitator = new InjectiveFacilitator({ privateKey: FACILITATOR_PRIVATE_KEY });

  // 3. Check for Payment Header
  const signatureHeader = req.headers.get("PAYMENT-SIGNATURE");
  if (!signatureHeader) {
    // No payment? Send the 402 challenge!
    return NextResponse.json({ x402Version: 2, accepts: [requirements] }, { status: 402 });
  }

  // 4. Verify & Settle
  const paymentPayload = decodePaymentSignatureHeader(signatureHeader);
  const verifyResult = await facilitator.verify(paymentPayload, requirements);
  
  if (!verifyResult.success) {
    return NextResponse.json({ error: "Payment invalid" }, { status: 402 });
  }

  // Broadcast to blockchain
  await facilitator.settle({ paymentPayload, paymentRequirements: requirements });

  // 5. Decrypt and Stream File
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

This is where the magic happens. By returning HTTP 402, AI Agents instantly know how much to pay, where to pay it, and what token to use!

---

## Step 4: Building the Download UI (Human Pay)

Since standard web browsers don't understand HTTP 402, we need a frontend page that connects a user's wallet, requests an EIP-3009 signature, and sends it to our API.

```typescript
// filepath: app/download/[id]/page.tsx
import { createWalletClient, custom, parseUnits } from "viem";
import { signAuthorization, encodePaymentSignatureHeader, createPaymentPayload } from "@injectivelabs/x402";

// ... (UI Component Setup) ...

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
    walletClient, meta.assetAddress, "USDC", CHAIN_ID, auth, "2"
  );

  // 4. Build x402 Header
  const paymentPayload = createPaymentPayload(requirements, { signature, authorization: auth });
  const paymentHeader = encodePaymentSignatureHeader(paymentPayload);

  // 5. Fetch File with Payment Attached
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

Notice how we use `signAuthorization`. The buyer is not sending a transaction themselves—they are just signing a message cryptographically authorizing the transfer of their USDC. The server executes it.

---

## Step 5: Testing the Agent Flow

The best part about x402 is that it's machine-readable. We can test the programmatic AI Agent flow using the included test script.

Add a buyer wallet to your `.env.local`:
```env
TEST_CLIENT_PRIVATE_KEY=0xYOUR_TEST_PAYER_PRIVATE_KEY
```

Then run the test client against a generated agent URL:
```bash
npx tsx scripts/test-download.ts http://localhost:3000/api/download/<file-id>
```

The script will hit the 402, parse the JSON, sign the transaction, resubmit, and save the decrypted file automatically!

---

## Conclusion

Congratulations! 🎉 You've successfully built a Pay-to-Unlock platform using Injective EVM and the x402 protocol.

You now have an application that:
- Encrypts content securely at rest.
- Leverages Injective EVM for low-cost, lightning-fast transactions.
- Implements EIP-3009 for seamless UX (users just sign; the server pays gas).
- Fully supports machine-to-machine commerce, bridging the gap between human users and autonomous AI Agents.

Happy building!
