import { type Chain } from "viem";
import { getViemChain } from "@injectivelabs/x402";

export const INJECTIVE_NETWORKS: Record<
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

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export async function switchToInjectiveChain(network: string) {
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
