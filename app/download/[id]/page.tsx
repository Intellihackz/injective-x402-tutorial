"use client";

import { useEffect, useState } from "react";
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
  getTokenName,
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

// ─── Supported Injective EVM Networks ────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Switch/Add chain in wallet ───────────────────────────────────────────────

async function switchToInjectiveChain(network: string) {
  const cfg = INJECTIVE_NETWORKS[network];
  if (!cfg) throw new Error(`Unsupported network: ${network}`);

  const hexChainId = `0x${cfg.chainId.toString(16)}`;

  try {
    // Try switching first — works if the chain is already in the wallet
    await (window as any).ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hexChainId }],
    });
  } catch (err: any) {
    // Error 4902 = chain not yet added to wallet — add it
    if (err.code === 4902 || err.code === -32603) {
      await (window as any).ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexChainId,
            chainName: cfg.chain.name,
            rpcUrls: [cfg.rpcUrl],
            nativeCurrency: { name: "Injective", symbol: "INJ", decimals: 18 },
            blockExplorerUrls: [
              cfg.chain.blockExplorers?.default?.url ?? "",
            ],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DownloadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [id, setId] = useState<string | null>(null);
  const [meta, setMeta] = useState<FileMeta | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [error, setError] = useState("");
  const [account, setAccount] = useState<`0x${string}` | null>(null);

  // Resolve async params (Next.js 15+)
  useEffect(() => {
    params.then(({ id }) => setId(id));
  }, [params]);

  // Load file metadata
  useEffect(() => {
    if (!id) return;
    fetch(`/api/download/${id}/info`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError("File not found.");
        else setMeta(data);
      })
      .catch(() => setError("File not found."));
  }, [id]);

  // ── Connect wallet + switch to Injective chain ────────────────────────────

  async function connectWallet() {
    if (!(window as any).ethereum) {
      setError("No wallet detected. Install MetaMask or Rabby.");
      return;
    }
    if (!meta) return;
    setError("");

    try {
      // 1. Switch / add the Injective chain
      setStep("switching");
      await switchToInjectiveChain(meta.network);

      // 2. Request account access
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

  // ── Sign EIP-3009 → build x402 payload → fetch file ──────────────────────

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

      // Look up the token name from the SDK's built-in registry instead of
      // calling name() on-chain — some testnet contracts don't expose it.
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
        value: parseUnits(meta.price, 6), // USDC = 6 decimals
        validAfter: now - 60n,            // allow 60s of clock skew
        validBefore: now + 300n,          // 5 minute window
        nonce: createNonce(),
      };

      // Ask the wallet to sign the EIP-712 typed data — this is what MetaMask/Rabby will show the user
      const signature = await signAuthorization(
        walletClient,
        meta.assetAddress,
        tokenName,
        networkCfg.chainId,
        auth,
        tokenVersion
      );

      // ── Build the x402 payment payload ──────────────────────────────────
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

      // ── Retry download with payment header ───────────────────────────────
      const response = await fetch(`/api/download/${id}`, {
        headers: { "PAYMENT-SIGNATURE": paymentHeader },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.reason || err.error || `Server error ${response.status}`);
      }

      // ── Trigger browser file download ────────────────────────────────────
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

  // ─── Render ──────────────────────────────────────────────────────────────

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
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-black tracking-tight">Pay to Download</h1>
          <p className="text-sm text-neutral-500 mt-1">Powered by x402 on Injective</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl overflow-hidden">
          {/* File info */}
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

          {/* Price */}
          <div className="px-6 py-5 flex items-center justify-between border-b border-neutral-100">
            <span className="text-sm text-neutral-500">Price</span>
            <div className="text-right">
              <span className="text-2xl font-bold text-black">${meta.price}</span>
              <span className="text-sm text-neutral-500 ml-1.5">USDC</span>
            </div>
          </div>

          {/* Payment details */}
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

          {/* Action */}
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
