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
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans selection:bg-black selection:text-white flex items-center justify-center p-4">
      <main className="w-full max-w-2xl flex flex-col items-center">
        {/* Header */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-neutral-200 text-neutral-600 text-xs font-medium shadow-sm">
            <Coins size={14} className="text-black" />
            <span>x402 on Injective</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black">
            Pay-to-Unlock Content
          </h1>
          <p className="text-sm text-neutral-500 max-w-lg mx-auto leading-relaxed">
            Upload any file, set a price, and get a gated download URL. 
            When users pay, the file stream unlocks instantly.
          </p>
        </div>

        {/* Main Card */}
        <div className="w-full bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden">
          {!humanUrl ? (
            <div className="p-6 space-y-5">
              {/* Upload Zone */}
              <div 
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ease-in-out ${
                  isDragging 
                    ? "border-black bg-neutral-50" 
                    : file 
                      ? "border-neutral-300 bg-neutral-50/50" 
                      : "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                <div className="flex flex-col items-center gap-3 pointer-events-none">
                  {file ? (
                    <>
                      <div className="p-2 bg-black rounded-full text-white">
                        <FileCheck2 size={24} />
                      </div>
                      <div>
                        <p className="text-black text-sm font-medium">{file.name}</p>
                        <p className="text-xs text-neutral-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-3 bg-neutral-100 rounded-full text-neutral-600">
                        <UploadCloud size={24} />
                      </div>
                      <div>
                        <p className="text-black text-sm font-medium">Click or drag file here</p>
                        <p className="text-xs text-neutral-500 mt-0.5">Any file up to 50MB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Price</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-neutral-400 text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="block w-full pl-7 pr-16 py-2 bg-white border border-neutral-200 rounded-lg text-black placeholder-neutral-400 focus:ring-1 focus:ring-black focus:border-black transition-colors outline-none shadow-sm text-sm font-mono"
                        placeholder="0.00"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-neutral-400 text-xs font-sans">USDC</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Recipient Address</label>
                    <input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      className="block w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-black placeholder-neutral-400 focus:ring-1 focus:ring-black focus:border-black transition-colors outline-none shadow-sm font-mono text-sm"
                      placeholder="0x..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-600 bg-neutral-50 p-2.5 rounded-lg border border-neutral-100">
                  <ShieldCheck size={16} className="text-black flex-shrink-0" />
                  <p>Files are encrypted at rest and unlocked only upon payment.</p>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={handleCreateLink}
                disabled={!file || !price || !recipientAddress || isUploading}
                className="w-full flex items-center justify-center gap-2 bg-black text-white text-sm font-semibold py-2.5 px-4 rounded-lg hover:bg-neutral-800 transition-colors shadow-md shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LinkIcon size={16} />
                    Create Gated Link
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="p-6 space-y-4 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white shadow-lg shadow-black/10">
                <FileCheck2 size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-black mb-1">Links Created!</h2>
                <p className="text-neutral-500 text-xs max-w-[260px] mx-auto">
                  Share either link. One is for humans, one is for AI agents.
                </p>
              </div>

              {/* Human Pay */}
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-black">🧑 Human Pay</span>
                  <span className="text-[10px] text-neutral-400">Browser + wallet</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={humanUrl}
                    className="w-full bg-neutral-50 border border-neutral-200 text-black rounded-lg py-2.5 pl-3 pr-16 outline-none font-mono text-xs shadow-inner"
                  />
                  <button
                    onClick={() => copyUrl("human")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black hover:bg-neutral-800 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    {copied === "human" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              {/* Agent Pay */}
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-semibold text-black">🤖 Agent Pay</span>
                  <span className="text-[10px] text-neutral-400">x402 raw endpoint</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={agentUrl}
                    className="w-full bg-neutral-50 border border-neutral-200 text-black rounded-lg py-2.5 pl-3 pr-16 outline-none font-mono text-xs shadow-inner"
                  />
                  <button
                    onClick={() => copyUrl("agent")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black hover:bg-neutral-800 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    {copied === "agent" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="text-neutral-500 hover:text-black text-xs font-medium transition-colors"
              >
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
  Loader2,
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
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center shadow-xl max-w-sm w-full">
          <AlertCircle className="mx-auto mb-4 text-neutral-400" size={40} />
          <h2 className="text-lg font-bold text-black mb-2">File Not Found</h2>
          <p className="text-sm text-neutral-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-neutral-400" size={32} />
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
    <div className="min-h-screen bg-neutral-50 font-sans flex items-center justify-center p-4 selection:bg-black selection:text-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-black tracking-tight">Pay to Download</h1>
          <p className="text-sm text-neutral-500 mt-1">Powered by x402 on Injective</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-neutral-100">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-neutral-100 rounded-xl flex-shrink-0">
                <FileText size={24} className="text-neutral-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-black truncate">{meta.filename}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{formatBytes(meta.size)}</p>
              </div>
            </div>
          </div>

          <div className="px-6 py-5 flex items-center justify-between border-b border-neutral-100">
            <span className="text-sm text-neutral-500">Price</span>
            <div className="text-right">
              <span className="text-2xl font-bold text-black">${meta.price}</span>
              <span className="text-sm text-neutral-500 ml-1.5">USDC</span>
            </div>
          </div>

          <div className="px-6 py-4 space-y-2 border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Network</span>
              <span className="font-medium text-black">{networkName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Token</span>
              <span className="font-medium text-black">USDC</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Recipient</span>
              <span className="font-mono text-black">
                {meta.recipientAddress.slice(0, 6)}…{meta.recipientAddress.slice(-4)}
              </span>
            </div>
            {account && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-500">Your wallet</span>
                <span className="font-mono text-black">
                  {account.slice(0, 6)}…{account.slice(-4)}
                </span>
              </div>
            )}
          </div>

          <div className="p-6 space-y-3">
            {isDone ? (
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-black py-2.5">
                <CheckCircle size={18} />
                File downloaded!
              </div>
            ) : (
              <button
                onClick={account ? payAndDownload : connectWallet}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-black text-white text-sm font-semibold py-3 px-4 rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : account ? (
                  <Lock size={16} />
                ) : (
                  <Wallet size={16} />
                )}
                {stepLabel[step]}
              </button>
            )}

            {error && (
              <p className="text-xs text-center text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <p className="text-center text-[10px] text-neutral-400">
              <Lock size={10} className="inline mr-1" />
              File decrypts server-side only after payment confirms on-chain.
            </p>
          </div>
        </div>
      </div>
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
