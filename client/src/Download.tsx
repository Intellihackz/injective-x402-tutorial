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
  const [txHash, setTxHash] = useState("");

  useEffect(() => {
    if (!id) return;
    // Fix: point to localhost:3000 where our Express server runs
    fetch(`http://localhost:3000/api/download/${id}`)
      .then((r) => {
        // The API returns 402 with the 'requirements' and 'accepts' payload
        // But wait, the info endpoint? I forgot to create the /info endpoint in the express server!
        // The user's code expects a separate `/info` endpoint, or we can just fetch the `402` response and parse it.
        // Actually, the easiest is to add a `/api/download/:id/info` route to Express.
        return fetch(`http://localhost:3000/api/download/${id}/info`);
      })
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
      
      const returnedTxHash = response.headers.get("x-transaction-hash");
      if (returnedTxHash) {
        setTxHash(returnedTxHash);
      }
      
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
              <div className="download-success" style={{ flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <CheckCircle size={18} />
                  File downloaded!
                </div>
                {txHash && (
                  <div style={{ fontSize: "0.75rem", background: "var(--bg)", padding: "0.75rem", borderRadius: "8px", width: "100%" }}>
                    <div style={{ color: "var(--text-muted)", marginBottom: "0.25rem" }}>Transaction Hash:</div>
                    <a 
                      href={`https://testnet.explorer.injective.network/transaction/${txHash}`} 
                      target="_blank" 
                      rel="noreferrer"
                      style={{ color: "var(--text)", textDecoration: "underline", wordBreak: "break-all", fontFamily: "var(--font-mono)" }}
                    >
                      {txHash}
                    </a>
                  </div>
                )}
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
