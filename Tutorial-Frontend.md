# Part 2: Building the Frontend

In this section, we'll build the Vite + React frontend to provide a beautiful UI for humans to upload files, generate links, and sign EIP-3009 authorizations to download content gaslessly.

If you haven't built the server yet, check out [Part 1: Building the Server](Tutorial-Server.md).

## Table of Contents

* [Styling (index.css)](#styling-indexcss)
* [App Routing](#app-routing)
* [The Upload Interface](#the-upload-interface)
* [The Download Interface](#the-download-interface)
* [Testing the Agent Flow](#testing-the-agent-flow)

---

## Styling (`index.css`)

Before we build the components, let's establish our clean, monochrome design system. 

In `client/src/index.css`, replace the contents with the following:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --bg: #fafafa;
  --surface: #ffffff;
  --text: #111111;
  --text-muted: #666666;
  --border: #e0e0e0;
  --accent: #000000;
  --accent-text: #ffffff;
  --radius: 12px;
  --shadow: 0 10px 40px -10px rgba(0,0,0,0.08);
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Consolas, monospace;
}

* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--font-sans);
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* Base Layout */
.app-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.main-wrapper {
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Header */
.header { text-align: center; margin-bottom: 3rem; }
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background: var(--surface);
  border: 1px solid var(--border);
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: 1.5rem;
  color: var(--text-muted);
}
.title { font-size: 2.5rem; font-weight: 700; margin: 0 0 1rem; letter-spacing: -0.03em; }
.subtitle { color: var(--text-muted); max-width: 480px; margin: 0 auto; }

/* Card */
.card {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

/* Upload Zone */
.card-content { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
.upload-zone {
  border: 2px dashed var(--border);
  border-radius: 10px;
  padding: 3rem 2rem;
  text-align: center;
  transition: all 0.2s ease;
  position: relative;
  background: var(--bg);
  cursor: pointer;
}
.upload-zone:hover, .upload-zone.drag-active { border-color: var(--accent); background: var(--surface); }
.upload-input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
.upload-icon { display: inline-flex; padding: 1rem; background: var(--bg); border-radius: 50%; color: var(--text-muted); margin-bottom: 1rem; transition: background 0.2s; }
.upload-zone:hover .upload-icon { background: #f0f0f0; color: var(--accent); }
.upload-zone.has-file .upload-icon { background: var(--accent); color: var(--surface); }
.file-name { font-weight: 600; font-size: 0.9rem; margin: 0; color: var(--text); }
.file-size { font-size: 0.75rem; color: var(--text-muted); margin: 0; }
.upload-prompt { font-weight: 600; font-size: 0.9rem; margin: 0; color: var(--text); }
.upload-subprompt { font-size: 0.75rem; color: var(--text-muted); margin: 0; margin-top: 0.25rem; }

/* Forms */
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.input-group { display: flex; flex-direction: column; gap: 0.5rem; }
.label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
.input-wrapper { position: relative; display: flex; align-items: center; }
.input-prefix { position: absolute; left: 1rem; color: var(--text-muted); font-size: 0.875rem; pointer-events: none; }
.input-suffix { position: absolute; right: 1rem; color: var(--text-muted); font-size: 0.75rem; pointer-events: none; }
.input {
  width: 100%; padding: 0.75rem 1rem; background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; font-family: var(--font-mono); font-size: 0.875rem;
  transition: all 0.2s ease; outline: none; color: var(--text); box-sizing: border-box;
}
.input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,0,0,0.05); }
.input.with-prefix { padding-left: 2rem; }
.input.with-suffix { padding-right: 3rem; }

/* Notice */
.notice {
  display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: var(--bg);
  border: 1px solid var(--border); border-radius: 8px; font-size: 0.75rem; color: var(--text-muted);
}
.notice-icon { color: var(--accent); flex-shrink: 0; }

/* Button */
.button {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.75rem;
  background: var(--accent); color: var(--accent-text); border: none; border-radius: 8px;
  padding: 1rem; font-size: 0.875rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
}
.button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
.button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }

/* Spinners */
@keyframes spin { to { transform: rotate(360deg); } }
.spinner { width: 1.25rem; height: 1.25rem; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
.spinner.dark { border-color: rgba(0,0,0,0.1); border-top-color: var(--accent); }

/* Results */
.result-view { padding: 3rem 2rem; text-align: center; display: flex; flex-direction: column; align-items: center; }
.success-icon { width: 4rem; height: 4rem; background: var(--accent); color: var(--surface); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
.result-title { font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem; }
.result-subtitle { color: var(--text-muted); font-size: 0.875rem; margin: 0 0 2rem; max-width: 280px; }

.link-box { width: 100%; text-align: left; margin-bottom: 1.5rem; }
.link-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; padding: 0 0.25rem; }
.link-title { font-size: 0.75rem; font-weight: 600; color: var(--text); }
.link-desc { font-size: 0.65rem; color: var(--text-muted); }
.link-input-wrapper { position: relative; display: flex; }
.link-input { width: 100%; background: var(--bg); border: 1px solid var(--border); padding: 0.75rem; padding-right: 4.5rem; border-radius: 8px; font-family: var(--font-mono); font-size: 0.75rem; color: var(--text); outline: none; box-sizing: border-box; }
.copy-btn { position: absolute; right: 0.25rem; top: 0.25rem; bottom: 0.25rem; padding: 0 0.75rem; background: var(--accent); color: var(--surface); border: none; border-radius: 4px; font-size: 0.65rem; font-weight: 600; cursor: pointer; transition: opacity 0.2s; }
.copy-btn:hover { opacity: 0.8; }
.reset-btn { background: none; border: none; color: var(--text-muted); font-size: 0.75rem; font-weight: 500; cursor: pointer; text-decoration: underline; margin-top: 1rem; transition: color 0.2s; }
.reset-btn:hover { color: var(--accent); }

/* Download specific */
.meta-header { padding: 1.5rem; border-bottom: 1px solid var(--border); display: flex; gap: 1rem; align-items: center; }
.file-icon { background: var(--bg); padding: 1rem; border-radius: 12px; color: var(--text-muted); display: flex; align-items: center; justify-content: center; }
.meta-details { text-align: left; }
.meta-filename { font-weight: 600; font-size: 1.1rem; margin: 0 0 0.25rem; }
.meta-size { color: var(--text-muted); font-size: 0.875rem; margin: 0; }
.price-row { padding: 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
.price-label { color: var(--text-muted); font-size: 0.875rem; font-weight: 500; }
.price-value { font-size: 2rem; font-weight: 700; color: var(--text); }
.price-currency { font-size: 0.875rem; color: var(--text-muted); font-weight: 500; margin-left: 0.25rem; }
.info-list { padding: 1.5rem; background: var(--bg); border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 0.75rem; }
.info-row { display: flex; justify-content: space-between; font-size: 0.75rem; }
.info-label { color: var(--text-muted); }
.info-value { font-weight: 500; color: var(--text); }
.info-mono { font-family: var(--font-mono); }
.action-box { padding: 1.5rem; }
.footer-note { text-align: center; font-size: 0.65rem; color: var(--text-muted); margin-top: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.25rem; }
.error-msg { text-align: center; font-size: 0.75rem; color: #d32f2f; background: #ffebee; border: 1px solid #ffcdd2; padding: 0.75rem; border-radius: 8px; margin-bottom: 1rem; }

.download-success { display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-weight: 600; font-size: 1rem; padding: 0.5rem 0; color: var(--text); }
.full-page-center { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg); padding: 2rem; text-align: center; }
.error-card { background: var(--surface); padding: 3rem; border-radius: var(--radius); border: 1px solid var(--border); text-align: center; box-shadow: var(--shadow); max-width: 400px; width: 100%; }
.error-icon { color: var(--text-muted); margin-bottom: 1rem; display: inline-block; }
.title-sm { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; }
```

---

## Buffer Polyfill

Because x402 uses cryptography that relies on the Node.js `Buffer` object (which Vite does not polyfill automatically), we need to add it to the window.

Install the `buffer` package:
```bash
npm install buffer
```

Then, inject it in your `src/main.tsx` file before rendering the App:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Buffer } from 'buffer'
import './index.css'
import App from './App.tsx'

if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

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

// Testnet USDC address and Chain ID
const TOKEN_ADDRESS = "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d" as `0x${string}`;
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

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

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
      console.error(error);
      alert("Failed to upload and encrypt file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPrice("");
    setHumanUrl("");
    setAgentUrl("");
    setCopied(null);
  };

  function copyUrl(type: "human" | "agent") {
    const url = type === "human" ? humanUrl : agentUrl;
    navigator.clipboard.writeText(url);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="app-container">
      <main className="main-wrapper">
        <div className="header">
          <div className="badge">
            <Coins size={14} />
            <span>x402 on Injective</span>
          </div>
          <h1 className="title">Pay-to-Unlock Content</h1>
          <p className="subtitle">
            Upload any file, set a price, and get a gated download URL. 
            When users pay, the file stream unlocks instantly.
          </p>
        </div>

        <div className="card">
          {!humanUrl ? (
            <div className="card-content">
              <div 
                className={`upload-zone ${isDragging ? "drag-active" : ""} ${file ? "has-file" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  className="upload-input"
                  onChange={handleFileChange}
                />
                {file ? (
                  <>
                    <div className="upload-icon"><FileCheck2 size={24} /></div>
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <div className="upload-icon"><UploadCloud size={24} /></div>
                    <p className="upload-prompt">Click or drag file here</p>
                    <p className="upload-subprompt">Any file up to 50MB</p>
                  </>
                )}
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label className="label">Price</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="input with-prefix with-suffix"
                      placeholder="0.00"
                    />
                    <span className="input-suffix">USDC</span>
                  </div>
                </div>

                <div className="input-group">
                  <label className="label">Recipient Address</label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="input"
                    placeholder="0x..."
                  />
                </div>
              </div>

              <div className="notice">
                <ShieldCheck size={16} className="notice-icon" />
                <p>Files are encrypted at rest and unlocked only upon payment.</p>
              </div>

              <button
                onClick={handleCreateLink}
                disabled={!file || !price || !recipientAddress || isUploading}
                className="button"
              >
                {isUploading ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    <LinkIcon size={16} />
                    Create Gated Link
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="result-view">
              <div className="success-icon">
                <FileCheck2 size={28} />
              </div>
              <h2 className="result-title">Links Created!</h2>
              <p className="result-subtitle">
                Share either link. One is for humans, one is for AI agents.
              </p>

              <div className="link-box">
                <div className="link-header">
                  <span className="link-title">🧑 Human Pay</span>
                  <span className="link-desc">Browser + wallet</span>
                </div>
                <div className="link-input-wrapper">
                  <input type="text" readOnly value={humanUrl} className="link-input" />
                  <button onClick={() => copyUrl("human")} className="copy-btn">
                    {copied === "human" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="link-box">
                <div className="link-header">
                  <span className="link-title">🤖 Agent Pay</span>
                  <span className="link-desc">x402 raw endpoint</span>
                </div>
                <div className="link-input-wrapper">
                  <input type="text" readOnly value={agentUrl} className="link-input" />
                  <button onClick={() => copyUrl("agent")} className="copy-btn">
                    {copied === "agent" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <button onClick={handleReset} className="reset-btn">
                Upload another file
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
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
import {
  createWalletClient,
  createPublicClient,
  custom,
  http,
  parseUnits,
  type Chain,
} from "viem";
import {
  createNonce,
  signAuthorization,
  encodePaymentSignatureHeader,
  createPaymentPayload,
  getViemChain,
  TOKENS,
} from "@injectivelabs/x402";
import {
  FileText,
  Wallet,
  Lock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const INJECTIVE_NETWORKS: Record<
  string,
  { chainId: number; chain: Chain; rpcUrl: string }
> = {
  "eip155:1776": {
    chainId: 1776,
    chain: getViemChain("eip155:1776"),
    rpcUrl: "https://sentry.evm-rpc.injective.network",
  },
  "eip155:1439": {
    chainId: 1439,
    chain: getViemChain("eip155:1439"),
    rpcUrl: "https://k8s.testnet.json-rpc.injective.network",
  },
};

type Step = "idle" | "switching" | "connecting" | "signing" | "verifying" | "done" | "error";

interface FileMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  price: string;
  assetAddress: `0x${string}`;
  recipientAddress: `0x${string}`;
  network: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function switchToInjectiveChain(network: string) {
  const cfg = INJECTIVE_NETWORKS[network];
  if (!cfg) throw new Error(`Unsupported network: ${network}`);

  const hexChainId = `0x${cfg.chainId.toString(16)}`;

  try {
    await (window as any).ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
  } catch (err: any) {
    if (err.code === 4902 || err.code === -32603) {
      await (window as any).ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexChainId,
            chainName: cfg.chain.name,
            rpcUrls: [cfg.rpcUrl],
            nativeCurrency: { name: "Injective", symbol: "INJ", decimals: 18 },
            blockExplorerUrls: [cfg.chain.blockExplorers?.default?.url ?? ""],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export default function Download() {
  const { id } = useParams<{ id: string }>();
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [account, setAccount] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`http://localhost:3000/api/download/${id}/info`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError("File not found.");
        else setMeta(data);
      })
      .catch(() => setError("File not found."));
  }, [id]);

  async function connectWallet() {
    if (!(window as any).ethereum) {
      setError("No wallet detected. Install MetaMask or Rabby.");
      return;
    }
    if (!meta) return;
    setError("");

    try {
      setStep("switching");
      await switchToInjectiveChain(meta.network);

      setStep("connecting");
      const [addr] = await (window as any).ethereum.request({
        method: "eth_requestAccounts",
      });
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
    if (!networkCfg) {
      setError("Unsupported network in file metadata.");
      return;
    }

    try {
      setStep("signing");

      const walletClient = createWalletClient({
        account,
        chain: networkCfg.chain,
        transport: custom((window as any).ethereum),
      });

      const publicClient = createPublicClient({
        chain: networkCfg.chain,
        transport: http(networkCfg.rpcUrl),
      });

      const networkTokens = TOKENS[meta.network as keyof typeof TOKENS] ?? {};
      const tokenEntry = Object.values(networkTokens).find(
        (t: any) => t.address.toLowerCase() === meta.assetAddress.toLowerCase()
      ) as any;
      const tokenName: string = tokenEntry?.name ?? "USDC";
      const tokenVersion: string = tokenEntry?.eip712Version ?? "2";

      const now = BigInt(Math.floor(Date.now() / 1000));
      const auth = {
        from: account,
        to: meta.recipientAddress,
        value: parseUnits(meta.price, 6), // Assuming USDC 6 decimals
        validAfter: now - 60n,
        validBefore: now + 300n,
        nonce: createNonce(),
      };

      const signature = await signAuthorization(
        walletClient,
        meta.assetAddress,
        tokenName,
        networkCfg.chainId,
        auth,
        tokenVersion
      );

      setStep("verifying");

      const requirements = {
        scheme: "exact" as const,
        network: meta.network,
        asset: meta.assetAddress,
        amount: Math.floor(parseFloat(meta.price) * 1_000_000).toString(),
        payTo: meta.recipientAddress,
        maxTimeoutSeconds: 60,
        extra: {},
      };

      const paymentPayload = createPaymentPayload(requirements, {
        signature,
        authorization: {
          from: auth.from,
          to: auth.to,
          value: auth.value.toString(),
          validAfter: auth.validAfter.toString(),
          validBefore: auth.validBefore.toString(),
          nonce: auth.nonce,
        },
      });

      const paymentHeader = encodePaymentSignatureHeader(paymentPayload);

      const response = await fetch(`http://localhost:3000/api/download/${id}`, {
        headers: { "PAYMENT-SIGNATURE": paymentHeader },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.reason || err.error || `Server error ${response.status}`);
      }

      setStep("done");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = meta.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setStep("error");
    }
  }

  if (error && !meta) {
    return (
      <div className="full-page-center">
        <div className="error-card">
          <AlertCircle size={40} className="error-icon" />
          <h2 className="title-sm">File Not Found</h2>
          <p className="subtitle">{error}</p>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="full-page-center">
        <div className="spinner dark"></div>
      </div>
    );
  }

  const networkCfg = INJECTIVE_NETWORKS[meta.network];
  const networkName = networkCfg?.chain.name ?? meta.network;
  const isLoading = ["switching", "connecting", "signing", "verifying"].includes(step);
  const isDone = step === "done";

  const stepLabel: Record<Step, string> = {
    idle: account ? "Pay & Download" : "Connect Wallet",
    switching: "Switching to Injective...",
    connecting: "Connecting wallet...",
    signing: "Sign payment in wallet...",
    verifying: "Settling on Injective...",
    done: "Download started!",
    error: account ? "Try again" : "Connect Wallet",
  };

  return (
    <div className="app-container">
      <main className="main-wrapper">
        <div className="header">
          <h1 className="title">Pay to Download</h1>
          <p className="subtitle">Powered by x402 on Injective</p>
        </div>

        <div className="card">
          <div className="meta-header">
            <div className="file-icon">
              <FileText size={24} />
            </div>
            <div className="meta-details">
              <p className="meta-filename">{meta.filename}</p>
              <p className="meta-size">{formatBytes(meta.size)}</p>
            </div>
          </div>

          <div className="price-row">
            <span className="price-label">Price</span>
            <div>
              <span className="price-value">${meta.price}</span>
              <span className="price-currency">USDC</span>
            </div>
          </div>

          <div className="info-list">
            <div className="info-row">
              <span className="info-label">Network</span>
              <span className="info-value">{networkName}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Token</span>
              <span className="info-value">USDC</span>
            </div>
            <div className="info-row">
              <span className="info-label">Recipient</span>
              <span className="info-value info-mono">
                {meta.recipientAddress.slice(0, 6)}…{meta.recipientAddress.slice(-4)}
              </span>
            </div>
            {account && (
              <div className="info-row">
                <span className="info-label">Your wallet</span>
                <span className="info-value info-mono">
                  {account.slice(0, 6)}…{account.slice(-4)}
                </span>
              </div>
            )}
          </div>

          <div className="action-box">
            {isDone ? (
              <div className="download-success">
                <CheckCircle size={18} />
                File downloaded!
              </div>
            ) : (
              <button
                onClick={account ? payAndDownload : connectWallet}
                disabled={isLoading}
                className="button"
              >
                {isLoading ? (
                  <div className="spinner"></div>
                ) : account ? (
                  <Lock size={16} />
                ) : (
                  <Wallet size={16} />
                )}
                {stepLabel[step]}
              </button>
            )}

            {error && <p className="error-msg">{error}</p>}

            <p className="footer-note">
              <Lock size={10} />
              File decrypts server-side only after payment confirms on-chain.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
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
