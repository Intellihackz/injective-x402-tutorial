/**
 * x402 Download Test Script
 *
 * This script acts as an x402-aware client (like an AI agent would).
 * It hits a gated download URL, automatically handles the 402 Payment Required
 * response, signs and settles a USDC payment on Injective EVM, and saves
 * the decrypted file to disk.
 *
 * Usage:
 *   npx tsx scripts/test-download.ts <gated-url>
 *
 * Example:
 *   npx tsx scripts/test-download.ts http://localhost:3000/api/download/abc-123
 *
 * Requirements:
 *   - TEST_CLIENT_PRIVATE_KEY in .env (the wallet paying USDC)
 *   - That wallet must have USDC on Injective EVM
 *   - Your dev server must be running (npm run dev)
 */

import fs from "fs";
import path from "path";
import { createInjectiveClient } from "@injectivelabs/x402/client";

// Manually load .env (tsx doesn't auto-load it like Next.js does)
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    process.env[key.trim()] = rest.join("=").trim();
  }
}

async function main() {
  const url = process.argv[2];

  if (!url) {
    console.error("❌  Usage: npx tsx scripts/test-download.ts <gated-url>");
    process.exit(1);
  }

  const privateKey = process.env.TEST_CLIENT_PRIVATE_KEY;
  if (!privateKey || privateKey === "0xYOUR_PAYER_PRIVATE_KEY_HERE") {
    console.error("❌  Set TEST_CLIENT_PRIVATE_KEY in your .env file");
    process.exit(1);
  }

  console.log("🔗  Requesting:", url);
  console.log("─".repeat(60));

  // Create an x402-aware fetch client.
  // This client automatically:
  //   1. Sends the initial request
  //   2. Receives the 402 and reads the PaymentRequirements
  //   3. Signs a USDC transferWithAuthorization (EIP-3009)
  //   4. Retries the request with the PAYMENT-SIGNATURE header
  const client = createInjectiveClient({
    privateKey: privateKey as `0x${string}`,
  });

  console.log("💳  Sending request (will auto-pay if 402 received)...");

  let response: Response;
  try {
    response = await client.fetch(url);
  } catch (err: any) {
    console.error("❌  Request failed:", err.message);
    process.exit(1);
  }

  console.log("📡  Response status:", response.status);

  if (!response.ok) {
    const text = await response.text();
    console.error("❌  Download failed:", text);
    process.exit(1);
  }

  // Extract filename from Content-Disposition header
  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `download-${Date.now()}`;
  const outputPath = path.join(process.cwd(), filename);

  // Save the decrypted file to disk
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);

  console.log("─".repeat(60));
  console.log(`✅  Payment settled & file saved to: ${outputPath}`);

  // Show the payment receipt if the server returned one
  const receipt = response.headers.get("PAYMENT-RESPONSE");
  if (receipt) {
    const decoded = JSON.parse(Buffer.from(receipt, "base64").toString("utf-8"));
    console.log("🧾  Payment receipt:");
    console.log("    tx hash :", decoded.transaction);
    console.log("    payer   :", decoded.payer);
    console.log("    network :", decoded.network);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
