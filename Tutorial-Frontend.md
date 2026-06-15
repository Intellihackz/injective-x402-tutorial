# Part 2: Building the Frontend

In this section, we'll build the Vite + React frontend to provide a beautiful UI for humans to upload files, generate links, and sign EIP-3009 authorizations to download content gaslessly.

If you haven't built the server yet, check out [Part 1: Building the Server](Tutorial-Server.md).

## Table of Contents

* [App Routing](#app-routing)
* [The Upload Interface](#the-upload-interface)
* [The Download Interface](#the-download-interface)
* [Testing the Agent Flow](#testing-the-agent-flow)

---

## App Routing

In the `client/` directory, replace the contents of `src/App.tsx` with the following:

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

## The Upload Interface (`Home.tsx`)

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

## The Download Interface (`Download.tsx`)

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

---
[← Back to Main Tutorial](Tutorial.md)
