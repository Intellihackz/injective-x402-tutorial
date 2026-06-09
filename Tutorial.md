# Building a Pay-to-Unlock Content Platform with Injective x402

Welcome! In this tutorial, we're going to build a fully functional token-gated content platform on Injective EVM. By the end, you'll have written a Next.js application, built a sleek React frontend, and connected everything together into a production-ready DApp where creators can upload encrypted files and sell them directly for USDC—all while fully supporting autonomous AI agents.

Don't worry if you've never worked with the x402 protocol or Injective before - I'll walk you through every step and explain not just *what* we're doing, but *why* we're doing it. Think of this as us coding together!

## Table of Contents

* [Prerequisites](#prerequisites)
* [Complete Code Repository](#complete-code-repository)
* [What We're Building](#what-were-building)
* [Understanding the x402 Protocol & EIP-3009](#understanding-the-x402-protocol--eip-3009)
* [Project Setup](#project-setup)
* [Step 1: The Upload API (Encryption)](#step-1-the-upload-api-encryption)
* [Step 2: The Download API (Facilitator)](#step-2-the-download-api-facilitator)
* [Step 3: Building the UI (Human Pay)](#step-3-building-the-ui-human-pay)
* [Step 4: Testing the Agent Flow](#step-4-testing-the-agent-flow)
* [Conclusion](#conclusion)

## Prerequisites

Before we dive in, let's make sure you have everything you need. Don't worry - we'll keep things practical and I'll explain everything along the way:

### Required Tools

* **Node.js 18+** - We'll be using modern Next.js App Router features
* **MetaMask wallet** - Install the browser extension if you haven't already
* **Code editor** - VS Code is great
* **Git** - For version control and cloning repositories
* **Some testnet INJ & USDC** - We'll need INJ for gas and USDC to pay for files

### Required Knowledge

* **React & Next.js fundamentals** - Comfortable with hooks, state, and API routes
* **TypeScript basics** - Helpful but not required; we'll explain as we go
* **Basic Web3 concepts** - Knowing what a wallet address and gas fees are

## Complete Code Repository

**View the complete source code on GitHub:** [https://github.com/Intellihackz/injective-x402-tutorial](https://github.com/Intellihackz/injective-x402-tutorial)

### How to Use This Tutorial

This tutorial can be used in two ways:

1. **Learning Mode** - Follow along step-by-step and build everything from scratch to deeply understand how each piece works
2. **Reference Mode** - If you've cloned the completed repository, use this tutorial to understand the implementation details and design decisions

## What We're Building

Here's what our Pay-to-Unlock platform will be able to do by the end of this tutorial:

### Backend Features

* **Server-side Encryption** - Files are encrypted at rest using AES-256-CBC
* **x402 Facilitator Integration** - Automatic parsing and verification of EIP-3009 signatures
* **On-Chain Settlement** - The server broadcasts the transfer on Injective EVM
* **Agent-Ready Endpoints** - Returns HTTP 402 Payment Required JSON challenges

### Frontend Features

* **Modern UI Design** - Clean, minimalist black & white theme
* **MetaMask Connection** - Seamless wallet integration with automatic network switching
* **EIP-3009 Signing** - Users just sign a message instead of paying gas fees
* **Dual Link Generation** - Generates both "Human Pay" (UI) and "Agent Pay" (API) links
* **One-Click Download** - Automatically triggers the file download once payment settles

## Understanding the x402 Protocol & EIP-3009

One of the most unique features of this platform is how payments are handled. We are combining two powerful standards: **x402** and **EIP-3009**.

### What is x402?

When the internet was built, HTTP status code `404` meant "Not Found", and `402` was reserved for "Payment Required". The x402 protocol finally makes this a reality for Web3.

When an AI Agent or a script tries to download a file from our API, the server responds with a `402 Payment Required` code and a JSON payload outlining exactly how much USDC it costs, what network to use, and where to send it. The agent can then automatically make the payment, sign it, and request the file again.

### What is EIP-3009?

On most EVM chains, if you want to pay for something with an ERC20 token, you have to pay the native gas token (like ETH or INJ) to broadcast the transaction.

EIP-3009 (`transferWithAuthorization`) changes this. Instead of submitting a transaction, the buyer just **cryptographically signs a message** saying "I authorize the transfer of 5 USDC to Bob". 

### Why This Matters

When we combine these two:
1. **Gasless UX**: The buyer (human or AI) never needs INJ for gas. They just sign the message.
2. **The Facilitator**: Our server (the "Facilitator") takes that signature, pays a fraction of a cent in INJ gas, and broadcasts the transaction to the blockchain.
3. **Atomic Delivery**: The server only decrypts and hands over the file *after* it successfully settles the transaction on-chain.

This gives your application superpowers: seamless UX for humans, and native API compatibility for AI agents!

---

## Project Setup

Before we dive into coding, let's set up our complete project structure.

### Creating the Project Structure

First, create a new Next.js project using Vite:

```bash
npx create-next-app@latest injective-x402-app
cd injective-x402-app
```

Choose **TypeScript**, **Tailwind CSS**, and the **App Router** during setup.

### Installing Dependencies

Now let's install the Injective x402 SDK and viem:

```bash
npm install @injectivelabs/x402 viem lucide-react
```

### Understanding the Environment Configuration

We need a `.env.local` file to store our server's keys.

<details>
<summary>Click to view .env.local</summary>

```env
# Secret used to encrypt files at rest (min 32 chars)
ENCRYPTION_SECRET=super_secret_tutorial_key_123

# The Facilitator Wallet
# This wallet pays INJ gas to settle the USDC transfer on-chain.
# It MUST be funded with INJ on Injective EVM Testnet.
PRIVATE_KEY=0xYOUR_FACILITATOR_PRIVATE_KEY
```
</details>

> **💡 Tip**: The `PRIVATE_KEY` above does *not* receive the USDC. It simply pays the INJ gas fee to broadcast the buyer's signed message to the blockchain.

---

## Step 1: The Upload API (Encryption)

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

## Step 2: The Download API (Facilitator)

This is the core of the x402 protocol. Let's see how our server acts as a Facilitator.

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

When a request comes in:
1. If there's no payment, we return a `402 Payment Required` challenge.
2. If there is a `PAYMENT-SIGNATURE` header, we verify it.
3. If valid, we settle the transaction on-chain.
4. Finally, we decrypt and return the file.

---

## Step 3: Building the UI (Human Pay)

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

Notice how we use `signAuthorization`. The buyer is not sending a transaction themselves—they are just signing a message.

---

## Step 4: Testing the Agent Flow

The best part about x402 is that it's machine-readable. We can test the programmatic AI Agent flow using a simple script.

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
- Implements EIP-3009 for seamless UX.
- Fully supports machine-to-machine commerce, bridging the gap between human users and autonomous AI Agents.

Happy building!
