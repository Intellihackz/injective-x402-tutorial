/**
 * x402 Upload Test Script
 *
 * This script uploads a local file to the Express server, testing the
 * encryption and metadata generation logic programmatically.
 *
 * Usage:
 *   npx tsx scripts/test-upload.ts <path-to-file>
 *
 * Example:
 *   npx tsx scripts/test-upload.ts ./package.json
 */

import fs from "fs";
import path from "path";

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error("❌  Usage: npx tsx scripts/test-upload.ts <path-to-file>");
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`❌  File not found: ${absolutePath}`);
    process.exit(1);
  }

  console.log("🔗  Uploading file:", absolutePath);
  console.log("─".repeat(60));

  const buffer = fs.readFileSync(absolutePath);
  
  // Use Blob since Node 18+ fetch supports it natively for FormData
  const blob = new Blob([buffer]);

  const formData = new FormData();
  formData.append("file", blob, path.basename(absolutePath));
  formData.append("price", "0.5"); // Hardcoded $0.50 test price
  // Hardcoded Testnet recipient address (same as tutorial)
  formData.append("recipientAddress", "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d");
  // Hardcoded Testnet USDC token
  formData.append("assetAddress", "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d");
  formData.append("network", "eip155:1439");

  let response: Response;
  try {
    response = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      body: formData,
    });
  } catch (err: any) {
    console.error("❌  Request failed:", err.message);
    process.exit(1);
  }

  if (!response.ok) {
    const text = await response.text();
    console.error("❌  Upload failed:", response.status, text);
    process.exit(1);
  }

  const data = await response.json();

  console.log("─".repeat(60));
  console.log(`✅  Upload successful!`);
  console.log("    File ID:", data.fileId);
  console.log("");
  console.log("🧑  Human Pay (Browser):  http://localhost:5173/download/" + data.fileId);
  console.log("🤖  Agent Pay (Raw API):  http://localhost:3000/api/download/" + data.fileId);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
