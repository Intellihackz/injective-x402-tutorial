# Building a Pay-to-Unlock Content Platform with Injective x402

Welcome! In this tutorial, we're going to build a fully functional token-gated content platform on Injective EVM. By the end, you'll have written a Next.js application, built a sleek React frontend, and connected everything together into a production-ready DApp where creators can upload encrypted files and sell them directly for USDC—all while fully supporting autonomous AI agents.

Don't worry if you've never worked with the x402 protocol or Injective before - I'll walk you through every step and explain not just *what* we're doing, but *why* we're doing it. Think of this as us coding together!

## Table of Contents

* [Prerequisites](#prerequisites)
* [Complete Code Repository](#complete-code-repository)
* [What We're Building](#what-were-building)
* [Understanding the x402 Protocol & EIP-3009](#understanding-the-x402-protocol--eip-3009)
* [Project Setup](#project-setup)
* [Building the Upload UI](#building-the-upload-ui)
* [Adding Upload Interactivity](#adding-upload-interactivity)
* [Creating the Upload API (Encryption)](#creating-the-upload-api-encryption)
* [Creating the Download API (Facilitator)](#creating-the-download-api-facilitator)
* [Building the Download UI](#building-the-download-ui)
* [Wiring the Download Logic](#wiring-the-download-logic)
* [Testing the Agent Flow](#testing-the-agent-flow)
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

First, create a new Next.js project:

```bash
npx create-next-app@latest injective-x402-app
cd injective-x402-app
```

Choose **TypeScript**, **Tailwind CSS**, and the **App Router** during setup.

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

## Building the Upload UI

Let's start by building the visual foundation of our creator upload page. We won't worry about making it work just yet—we just want it to look good.

Open `app/page.tsx` and replace its contents with our base UI structure:

<details>
<summary>Click to view the base <code>app/page.tsx</code> UI code</summary>

```tsx
// filepath: app/page.tsx
import { UploadCloud, Link as LinkIcon, ShieldCheck, Coins } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <main className="w-full max-w-2xl flex flex-col items-center">
        
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border">
            <Coins size={14} className="text-black" />
            <span className="text-xs font-medium">x402 on Injective</span>
          </div>
          <h1 className="text-4xl font-bold text-black">Pay-to-Unlock Content</h1>
        </div>

        {/* Main Card */}
        <div className="w-full bg-white border border-neutral-200 rounded-2xl shadow-xl p-6 space-y-5">
          
          {/* Upload Zone */}
          <div className="border-2 border-dashed border-neutral-200 rounded-xl p-8 text-center bg-neutral-50/50">
            <UploadCloud className="mx-auto mb-3 text-neutral-400" size={32} />
            <p className="text-sm font-medium text-black">Click to upload or drag and drop</p>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Price</label>
              <input type="number" placeholder="0.00" className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Recipient Address</label>
              <input type="text" placeholder="0x..." className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          {/* Footer & Submit */}
          <div className="flex items-center gap-2 p-2.5 bg-neutral-50 rounded-lg text-xs text-neutral-600">
            <ShieldCheck size={16} className="text-black" />
            <p>Files are encrypted at rest and unlocked only upon payment.</p>
          </div>
          
          <button className="w-full flex justify-center gap-2 bg-black text-white py-3 rounded-lg font-semibold">
            <LinkIcon size={16} /> Create Gated Link
          </button>
        </div>
      </main>
    </div>
  );
}
```
</details>

If you run `npm run dev` now, you'll see a sleek, static upload interface!

---

## Adding Upload Interactivity

Now that we have our base UI, let's make it interactive. We need React state to track the selected file, the price, the recipient address, and whether we're currently uploading.

Update `app/page.tsx` to include our hooks and the network constants:

<details>
<summary>Click to view the <code>app/page.tsx</code> state update</summary>

```tsx
// filepath: app/page.tsx
"use client";

import { useState } from "react";
import { UploadCloud, Link as LinkIcon, FileCheck2, ShieldCheck, Coins } from "lucide-react";

const USDC_ADDRESS = "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d" as `0x${string}`;
const NETWORK = "eip155:1439"; 

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [price, setPrice] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [humanUrl, setHumanUrl] = useState("");
  const [agentUrl, setAgentUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState<"human" | "agent" | null>(null);

  // ... (Keep the drag and drop handlers) ...

  const handleCreateLink = async () => {
    if (!file || !price || !recipientAddress) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("price", price);
      formData.append("recipientAddress", recipientAddress);
      formData.append("assetAddress", USDC_ADDRESS);
      formData.append("network", NETWORK);

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      
      setHumanUrl(`${window.location.origin}/download/${data.fileId}`);
      setAgentUrl(`${window.location.origin}/api/download/${data.fileId}`);
    } catch (error) {
      alert("Failed to upload and encrypt file.");
    } finally {
      setIsUploading(false);
    }
  };

  function copyUrl(type: "human" | "agent") {
    const url = type === "human" ? humanUrl : agentUrl;
    navigator.clipboard.writeText(url);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  // ... (Keep the JSX return statement from Step 1, but wire the state to the inputs and button) ...
}
```
</details>

Let me break down what's happening here:

* **State Management**: We use `useState` to track everything from the selected file to the generated links.
* **Network Constants**: We define `USDC_ADDRESS` (the token users will pay with) and `NETWORK` (`eip155:1439` is Injective Testnet).
* **The Upload Function**: Inside `handleCreateLink`, we pack all our data into a `FormData` object and send it to our `/api/upload` endpoint. When the server responds with a `fileId`, we generate two distinct links: one for human users (the UI) and one for AI agents (the raw API).

We now have the data ready to be sent to our server.

---

## Creating the Upload API (Encryption)

When the frontend sends the file, we need to encrypt it server-side so nobody can read it without paying. We also need to save metadata so the server knows what to charge later.

Create `app/api/upload/route.ts`:

<details>
<summary>Click to view the <code>app/api/upload/route.ts</code> code</summary>

```typescript
// filepath: app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const STORAGE_DIR = path.join(process.cwd(), ".storage");
const ENCRYPTION_KEY = crypto.scryptSync(process.env.ENCRYPTION_SECRET!, "salt", 32);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const price = formData.get("price") as string;
  const recipientAddress = formData.get("recipientAddress") as string;
  const assetAddress = formData.get("assetAddress") as string;
  const network = formData.get("network") as string;

  // 1. Setup Encryption
  const fileId = crypto.randomUUID();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  
  // 2. Encrypt the file
  const buffer = Buffer.from(await file.arrayBuffer());
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const finalFileContent = Buffer.concat([iv, encrypted]);

  // 3. Save to disk
  await fs.mkdir(STORAGE_DIR, { recursive: true });
  await fs.writeFile(path.join(STORAGE_DIR, fileId), finalFileContent);

  // 4. Save metadata "price tag"
  const metadata = {
    id: fileId, filename: file.name, size: file.size,
    mimeType: file.type || "application/octet-stream",
    price, network, recipientAddress, assetAddress
  };
  
  await fs.writeFile(path.join(STORAGE_DIR, `${fileId}.json`), JSON.stringify(metadata, null, 2));

  return NextResponse.json({ fileId });
}
```
</details>

At this point, if you upload a file, you'll see it securely saved inside the `.storage/` directory in your project!

---

## Creating the Download API (Facilitator)

This is the core of the x402 protocol. Let's build the API that handles the 402 challenge and settles the blockchain transaction.

Create `app/api/download/[id]/route.ts`:

<details>
<summary>Click to view the <code>app/api/download/[id]/route.ts</code> code</summary>

```typescript
// filepath: app/api/download/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { decodePaymentSignatureHeader, InjectiveFacilitator } from "@injectivelabs/x402";

// ... (Encryption setup same as upload) ...

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params;
  
  // 1. Load Metadata
  const metadata = JSON.parse(await fs.readFile(path.join(STORAGE_DIR, `${id}.json`), "utf-8"));

  // 2. Define Payment Requirements
  const requirements = {
    scheme: "exact",
    network: metadata.network,
    asset: metadata.assetAddress,
    amount: Math.floor(parseFloat(metadata.price) * 1_000_000).toString(),
    payTo: metadata.recipientAddress,
    maxTimeoutSeconds: 60,
    extra: {},
  };

  const facilitator = new InjectiveFacilitator({ 
    privateKey: process.env.PRIVATE_KEY as `0x${string}` 
  });

  // 3. Check for Payment Header
  const signatureHeader = req.headers.get("PAYMENT-SIGNATURE");
  if (!signatureHeader) {
    // No payment? Send the 402 challenge!
    return NextResponse.json({ x402Version: 2, accepts: [requirements] }, { status: 402 });
  }

  // 4. Verify & Settle On-Chain
  const paymentPayload = decodePaymentSignatureHeader(signatureHeader);
  const verifyResult = await facilitator.verify(paymentPayload, requirements);
  
  if (!verifyResult.success) {
    return NextResponse.json({ error: "Payment invalid" }, { status: 402 });
  }

  await facilitator.settle({ paymentPayload, paymentRequirements: requirements });

  // 5. Decrypt and Stream File
  const encryptedFile = await fs.readFile(path.join(STORAGE_DIR, id));
  const iv = encryptedFile.subarray(0, 16);
  const cipherText = encryptedFile.subarray(16);
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  
  return new NextResponse(Buffer.concat([decipher.update(cipherText), decipher.final()]), {
    headers: {
      "Content-Type": metadata.mimeType,
      "Content-Disposition": `attachment; filename="${metadata.filename}"`,
    },
  });
}
```
</details>

Let's break down the magic happening in this endpoint:

1. **The 402 Challenge**: If the user (or AI agent) hits this endpoint without a `PAYMENT-SIGNATURE` header, we block the request and return an HTTP `402 Payment Required` status. We also include the `requirements` JSON, which tells the agent exactly how much USDC it costs and where to send it.
2. **The Facilitator**: The `InjectiveFacilitator` is a server-side wallet initialized with your `PRIVATE_KEY`. It doesn't receive the payment; it simply pays the INJ gas fee to broadcast the transaction.
3. **Verification & Settlement**: When the request *does* have a signature, we verify that it's cryptographically valid and matches our requirements. If it passes, we call `facilitator.settle()`, which actually executes the transfer on the blockchain!
4. **Atomic Delivery**: Notice how we *only* decrypt the file after `settle()` finishes successfully. This guarantees you get paid before the content is unlocked.

---

## Building the Download UI

Since standard web browsers don't understand HTTP 402, we need a frontend page where humans can see the price and pay. Just like the upload page, let's start with the base UI layout.

Create `app/download/[id]/page.tsx` and paste the base layout:

<details>
<summary>Click to view the base <code>app/download/[id]/page.tsx</code> UI code</summary>

```tsx
// filepath: app/download/[id]/page.tsx
"use client";

import { FileText, Wallet, Lock, CheckCircle, Loader2 } from "lucide-react";

export default function DownloadPage() {
  // We'll wire up real state in the next step!
  const meta = { filename: "tutorial_video.mp4", size: 10485760, price: "5.00", network: "eip155:1439", recipientAddress: "0x123..." };
  const step = "idle";
  const account = null;

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden p-6 space-y-6">
        
        <div className="text-center">
          <h1 className="text-2xl font-bold">Pay to Download</h1>
        </div>

        <div className="flex items-start gap-4 p-4 bg-neutral-50 rounded-xl">
          <FileText size={24} className="text-neutral-600" />
          <div>
            <p className="text-sm font-semibold">{meta.filename}</p>
            <p className="text-xs text-neutral-500">{(meta.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>

        <div className="flex justify-between items-center px-2">
          <span className="text-sm text-neutral-500">Price</span>
          <span className="text-2xl font-bold">${meta.price} <span className="text-sm font-normal text-neutral-500">USDC</span></span>
        </div>

        <button className="w-full flex justify-center gap-2 bg-black text-white font-semibold py-3 rounded-lg">
          <Wallet size={16}/> Connect Wallet
        </button>

      </div>
    </div>
  );
}
```
</details>

This creates a clean, minimal "Checkout" card showing the file details and a Connect Wallet button.

---

## Wiring the Download Logic

Now let's wire that UI up to the blockchain! We need to connect the user's wallet, request an EIP-3009 signature, and send it to our API.

Update `app/download/[id]/page.tsx` with the core signing logic:

<details>
<summary>Click to view the <code>payAndDownload</code> integration</summary>

```tsx
// filepath: app/download/[id]/page.tsx
"use client";

import { createWalletClient, custom, parseUnits } from "viem";
import { signAuthorization, encodePaymentSignatureHeader, createPaymentPayload, getViemChain } from "@injectivelabs/x402";

// ... (UI state hooks and network config) ...

  async function payAndDownload() {
    if (!meta || !account || !id) return;
    setError("");
    const networkCfg = INJECTIVE_NETWORKS[meta.network];

    try {
      setStep("signing");
      const walletClient = createWalletClient({ account, chain: networkCfg.chain, transport: custom((window as any).ethereum) });
      const publicClient = createPublicClient({ chain: networkCfg.chain, transport: http(networkCfg.rpcUrl) });

      // 1. Prepare Authorization Parameters
      const now = BigInt(Math.floor(Date.now() / 1000));
      const auth = {
        from: account, 
        to: meta.recipientAddress, 
        value: parseUnits(meta.price, 6),
        validAfter: now - 60n, 
        validBefore: now + 300n, 
        nonce: createNonce(),
      };

      // 2. Request EIP-3009 Signature from Wallet
      const signature = await signAuthorization(walletClient, meta.assetAddress, "USDC", networkCfg.chainId, auth, "2");

      setStep("verifying");
      const requirements = { 
        scheme: "exact" as const, network: meta.network, asset: meta.assetAddress, 
        amount: Math.floor(parseFloat(meta.price) * 1_000_000).toString(), payTo: meta.recipientAddress, 
        maxTimeoutSeconds: 60, extra: {} 
      };

      // 3. Build and Encode x402 Header
      const paymentPayload = createPaymentPayload(requirements, { 
        signature, 
        authorization: { 
          from: auth.from, to: auth.to, value: auth.value.toString(), 
          validAfter: auth.validAfter.toString(), validBefore: auth.validBefore.toString(), nonce: auth.nonce 
        } 
      });
      const paymentHeader = encodePaymentSignatureHeader(paymentPayload);

      // 4. Fetch the Encrypted File
      const response = await fetch(`/api/download/${id}`, { headers: { "PAYMENT-SIGNATURE": paymentHeader } });
      if (!response.ok) throw new Error(`Server error ${response.status}`);

      // 5. Trigger Browser Download
      setStep("done");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = meta.filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setStep("error");
    }
  }

  // ... (JSX render) ...
```
</details>

This is the most important part of the frontend! Let's understand what this function is doing:

* **Authorization Parameters**: We define the `auth` object. Notice `parseUnits(meta.price, 6)`—this converts the dollar price into raw USDC units (USDC has 6 decimal places). We also define a `validAfter` and `validBefore` window (5 minutes) so the signature expires if it's not used quickly.
* **Gasless Signing**: The `signAuthorization` function prompts MetaMask. The user is *not* sending a transaction; they are just signing a typed data message (EIP-712) authorizing the transfer of their USDC. They don't pay any gas fees!
* **Building the Header**: We pack that signature into a `PAYMENT-SIGNATURE` header using `createPaymentPayload`.
* **Fetching the File**: We hit the download API again, but this time we attach the signature header. The server verifies it, settles it on-chain, and streams the decrypted file back to us!

For the full, runnable code of this page with all the UI components and wallet connection logic, you can view the complete file in the GitHub repository.

---

## Testing the Agent Flow

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
