# Building a Pay-to-Unlock Content Platform with Injective x402

Welcome! In this tutorial, we're going to build a fully functional token-gated content platform on Injective EVM. By the end, you'll have written a Next.js application, built a sleek React frontend, and connected everything together into a production-ready DApp where creators can upload encrypted files and sell them directly for USDC—all while fully supporting autonomous AI agents.

Don't worry if you've never worked with the x402 protocol or Injective before - I'll walk you through every step and explain not just *what* we're doing, but *why* we're doing it. Think of this as us coding together!

## Table of Contents

* [Prerequisites](#prerequisites)
* [Complete Code Repository](#complete-code-repository)
* [What We're Building](#what-were-building)
* [Understanding the x402 Protocol & EIP-3009](#understanding-the-x402-protocol--eip-3009)
* [Project Setup](#project-setup)
* [Step 1: Building the Base Upload UI](#step-1-building-the-base-upload-ui)
* [Step 2: Adding State & Interactivity](#step-2-adding-state--interactivity)
* [Step 3: The Upload API (Encryption)](#step-3-the-upload-api-encryption)
* [Step 4: The Download API (Facilitator)](#step-4-the-download-api-facilitator)
* [Step 5: Building the Download UI (Human Pay)](#step-5-building-the-download-ui-human-pay)
* [Step 6: Testing the Agent Flow](#step-6-testing-the-agent-flow)
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

## Step 1: Building the Base Upload UI

Let's start by building the visual foundation of our creator upload page. We won't worry about making it work just yet—we just want it to look good.

Open `app/page.tsx` and replace its contents with our base UI structure:

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

If you run `npm run dev` now, you'll see a sleek, static upload interface!

---

## Step 2: Adding State & Interactivity

Now that we have our base UI, let's make it interactive. We need React state to track the selected file, the price, the recipient address, and whether we're currently uploading.

Update `app/page.tsx` to include our hooks and the network constants:

<details>
<summary>Click to view the full <code>app/page.tsx</code> code</summary>

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

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

  const handleReset = () => {
    setFile(null); setPrice(""); setHumanUrl(""); setAgentUrl(""); setCopied(null);
  };

  function copyUrl(type: "human" | "agent") {
    const url = type === "human" ? humanUrl : agentUrl;
    navigator.clipboard.writeText(url);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4 selection:bg-black selection:text-white">
      <main className="w-full max-w-2xl flex flex-col items-center">
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-neutral-200 text-xs font-medium shadow-sm">
            <Coins size={14} className="text-black" />
            <span>x402 on Injective</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black">Pay-to-Unlock Content</h1>
        </div>

        <div className="w-full bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden">
          {!humanUrl ? (
            <div className="p-6 space-y-5">
              <div 
                className={`relative border-2 border-dashed rounded-xl p-6 text-center ${isDragging ? "border-black bg-neutral-50" : "border-neutral-200"}`}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              >
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
                <div className="flex flex-col items-center gap-3 pointer-events-none">
                  {file ? (
                    <>
                      <div className="p-2 bg-black rounded-full text-white"><FileCheck2 size={24} /></div>
                      <p className="text-sm font-medium">{file.name}</p>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-neutral-100 rounded-full text-neutral-600"><UploadCloud size={24} /></div>
                      <p className="text-sm font-medium">Click or drag file here</p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Price (USDC)</label>
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Recipient Address</label>
                  <input type="text" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="0x..." />
                </div>
              </div>

              <button onClick={handleCreateLink} disabled={!file || !price || !recipientAddress || isUploading} className="w-full flex justify-center gap-2 bg-black text-white py-3 rounded-lg font-semibold disabled:opacity-50">
                {isUploading ? "Encrypting..." : <><LinkIcon size={16} /> Create Gated Link</>}
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-4 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white"><FileCheck2 size={24} /></div>
              <h2 className="text-xl font-bold">Links Created!</h2>
              
              <div className="w-full space-y-1.5">
                <div className="flex justify-between px-1"><span className="text-xs font-semibold">🧑 Human Pay</span></div>
                <div className="relative">
                  <input type="text" readOnly value={humanUrl} className="w-full bg-neutral-50 border py-2.5 pl-3 pr-16 text-xs" />
                  <button onClick={() => copyUrl("human")} className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black text-white text-[10px] px-2.5 py-1.5 rounded-md">Copy</button>
                </div>
              </div>

              <div className="w-full space-y-1.5">
                <div className="flex justify-between px-1"><span className="text-xs font-semibold">🤖 Agent Pay</span></div>
                <div className="relative">
                  <input type="text" readOnly value={agentUrl} className="w-full bg-neutral-50 border py-2.5 pl-3 pr-16 text-xs" />
                  <button onClick={() => copyUrl("agent")} className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black text-white text-[10px] px-2.5 py-1.5 rounded-md">Copy</button>
                </div>
              </div>

              <button onClick={handleReset} className="text-neutral-500 hover:text-black text-xs font-medium pt-2">Upload another file</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
```
</details>

We now have the data ready to be sent to our server.

---

## Step 3: The Upload API (Encryption)

When the frontend sends the file, we need to encrypt it server-side so nobody can read it without paying. We also need to save metadata so the server knows what to charge later.

Create `app/api/upload/route.ts`:

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

At this point, if you upload a file, you'll see it securely saved inside the `.storage/` directory in your project!

---

## Step 4: The Download API (Facilitator)

This is the core of the x402 protocol. Let's build the API that handles the 402 challenge and settles the blockchain transaction.

Create `app/api/download/[id]/route.ts`:

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

---

## Step 5: Building the Download UI (Human Pay)

Since web browsers don't understand HTTP 402, we need a frontend page that asks the user to connect their wallet and sign the EIP-3009 message. 

Create `app/download/[id]/page.tsx` and start with the core logic:

<details>
<summary>Click to view the full <code>app/download/[id]/page.tsx</code> code</summary>

```tsx
// filepath: app/download/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { createWalletClient, createPublicClient, custom, http, parseUnits, type Chain } from "viem";
import { createNonce, signAuthorization, encodePaymentSignatureHeader, createPaymentPayload, getViemChain, TOKENS } from "@injectivelabs/x402";
import { FileText, Wallet, Lock, CheckCircle, Loader2, AlertCircle } from "lucide-react";

const INJECTIVE_NETWORKS: Record<string, { chainId: number; chain: Chain; rpcUrl: string }> = {
  "eip155:1439": { chainId: 1439, chain: getViemChain("eip155:1439"), rpcUrl: "https://k8s.testnet.json-rpc.injective.network" },
};

type Step = "idle" | "switching" | "connecting" | "signing" | "verifying" | "done" | "error";

interface FileMeta {
  id: string; filename: string; mimeType: string; size: number; price: string; assetAddress: `0x${string}`; recipientAddress: `0x${string}`; network: string;
}

export default function DownloadPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [account, setAccount] = useState<`0x${string}` | null>(null);

  useEffect(() => { params.then(({ id }) => setId(id)); }, [params]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/download/${id}/info`).then((r) => r.json()).then((data) => {
      if (data.error) setError("File not found."); else setMeta(data);
    }).catch(() => setError("File not found."));
  }, [id]);

  async function connectWallet() {
    if (!(window as any).ethereum) return setError("No wallet detected. Install MetaMask.");
    if (!meta) return;
    setError("");

    try {
      setStep("switching");
      const hexChainId = `0x${INJECTIVE_NETWORKS[meta.network].chainId.toString(16)}`;
      
      try {
        await (window as any).ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId }] });
      } catch (err: any) {
        if (err.code === 4902 || err.code === -32603) {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{ chainId: hexChainId, chainName: "Injective Testnet", rpcUrls: [INJECTIVE_NETWORKS[meta.network].rpcUrl], nativeCurrency: { name: "INJ", symbol: "INJ", decimals: 18 } }],
          });
        } else throw err;
      }

      setStep("connecting");
      const [addr] = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
      setAccount(addr as `0x${string}`);
      setStep("idle");
    } catch (e: any) {
      setError(e.message || "Wallet connection failed");
      setStep("error");
    }
  }

  async function payAndDownload() {
    if (!meta || !account || !id) return;
    setError("");
    const networkCfg = INJECTIVE_NETWORKS[meta.network];

    try {
      setStep("signing");
      const walletClient = createWalletClient({ account, chain: networkCfg.chain, transport: custom((window as any).ethereum) });
      const publicClient = createPublicClient({ chain: networkCfg.chain, transport: http(networkCfg.rpcUrl) });

      const networkTokens = TOKENS[meta.network as keyof typeof TOKENS] ?? {};
      const tokenEntry = Object.values(networkTokens).find((t: any) => t.address.toLowerCase() === meta.assetAddress.toLowerCase()) as any;
      const tokenName = tokenEntry?.name ?? "USDC";
      const tokenVersion = tokenEntry?.eip712Version ?? "2";

      const now = BigInt(Math.floor(Date.now() / 1000));
      const auth = {
        from: account, to: meta.recipientAddress, value: parseUnits(meta.price, 6),
        validAfter: now - 60n, validBefore: now + 300n, nonce: createNonce(),
      };

      const signature = await signAuthorization(walletClient, meta.assetAddress, tokenName, networkCfg.chainId, auth, tokenVersion);

      setStep("verifying");
      const requirements = { scheme: "exact" as const, network: meta.network, asset: meta.assetAddress, amount: Math.floor(parseFloat(meta.price) * 1_000_000).toString(), payTo: meta.recipientAddress, maxTimeoutSeconds: 60, extra: {} };

      const paymentPayload = createPaymentPayload(requirements, { signature, authorization: { from: auth.from, to: auth.to, value: auth.value.toString(), validAfter: auth.validAfter.toString(), validBefore: auth.validBefore.toString(), nonce: auth.nonce } });
      const paymentHeader = encodePaymentSignatureHeader(paymentPayload);

      const response = await fetch(`/api/download/${id}`, { headers: { "PAYMENT-SIGNATURE": paymentHeader } });
      if (!response.ok) throw new Error(`Server error ${response.status}`);

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

  if (!meta) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

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

        {step === "done" ? (
          <div className="flex justify-center gap-2 text-sm font-semibold py-3"><CheckCircle size={18} /> File downloaded!</div>
        ) : (
          <button onClick={account ? payAndDownload : connectWallet} disabled={step !== "idle"} className="w-full flex justify-center gap-2 bg-black text-white font-semibold py-3 rounded-lg disabled:opacity-60">
            {step === "idle" ? (account ? <><Lock size={16}/> Pay & Download</> : <><Wallet size={16}/> Connect Wallet</>) : <><Loader2 size={16} className="animate-spin" /> Processing...</>}
          </button>
        )}
      </div>
    </div>
  );
}
```
</details>

The buyer is not sending a transaction themselves—they are just signing a message.

---

## Step 6: Testing the Agent Flow

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
