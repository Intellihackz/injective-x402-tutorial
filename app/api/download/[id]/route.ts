import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import {
  decodePaymentSignatureHeader,
  InjectiveFacilitator,
} from "@injectivelabs/x402";
import type { PaymentRequired, PaymentRequirements } from "@injectivelabs/x402";

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_DIR = path.join(process.cwd(), ".storage");
const SECRET = process.env.ENCRYPTION_SECRET || "super_secret_tutorial_key_123";
const ENCRYPTION_KEY = crypto.scryptSync(SECRET, "salt", 32);

// The facilitator wallet is the server-side wallet that pays INJ gas to submit
// the USDC transfer on-chain. It does NOT receive the funds — the `payTo`
// address in the metadata does. In production, use process.env.PRIVATE_KEY.
const rawKey = process.env.PRIVATE_KEY;
const isDummy = !rawKey || rawKey.includes("YOUR_FACILITATOR");
const FACILITATOR_PRIVATE_KEY = (isDummy ? "0x0000000000000000000000000000000000000000000000000000000000000001" : rawKey) as `0x${string}`;

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // ── Step 1: Load the file metadata ─────────────────────────────────────────
  // Every uploaded file has a companion JSON file that stores the price,
  // recipient address, asset contract, and original filename.
  const metadataPath = path.join(STORAGE_DIR, `${id}.json`);
  const encryptedFilePath = path.join(STORAGE_DIR, `${id}.enc`);

  let metadata: {
    filename: string;
    mimeType: string;
    price: string;
    network: string;
    recipientAddress: `0x${string}`;
    assetAddress: `0x${string}`;
  };

  try {
    metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  // ── Step 2: Build the PaymentRequirements for this file ─────────────────────
  // This is the x402 "price tag" — it tells any x402-aware client exactly what
  // asset, network, amount, and wallet address it needs to pay.
  const requirements: PaymentRequirements = {
    scheme: "exact",
    network: metadata.network ?? "eip155:1776",
    asset: metadata.assetAddress,
    amount: Math.floor(parseFloat(metadata.price) * 1_000_000).toString(), // USDC → 6 decimals
    payTo: metadata.recipientAddress,
    maxTimeoutSeconds: 60,
    extra: {},
  };

  const paymentRequired: PaymentRequired = {
    x402Version: 2,
    resource: {
      url: req.url,
      description: `Download: ${metadata.filename}`,
      mimeType: metadata.mimeType,
    },
    accepts: [requirements],
  };

  // ── Step 3: Check for a payment header ─────────────────────────────────────
  // x402 clients (human wallets or AI agents) attach their signed payment
  // receipt in the `PAYMENT-SIGNATURE` header after receiving a 402 response.
  const paymentHeader =
    req.headers.get("PAYMENT-SIGNATURE") ?? req.headers.get("X-PAYMENT");

  if (!paymentHeader) {
    // No payment — respond with 402 and the requirements so the client knows
    // exactly what to pay, to whom, and on which network.
    return NextResponse.json(paymentRequired, {
      status: 402,
      headers: {
        "PAYMENT-REQUIRED": Buffer.from(
          JSON.stringify(paymentRequired)
        ).toString("base64"),
        "Content-Type": "application/json",
      },
    });
  }

  // ── Step 4: Decode and verify the payment ───────────────────────────────────
  // The facilitator decodes the base64 payment header, checks the EIP-3009
  // signature, verifies the payer has sufficient balance, confirms the nonce
  // hasn't been used before (replay protection), and validates the time window.
  let paymentPayload;
  try {
    paymentPayload = decodePaymentSignatureHeader(paymentHeader);
  } catch {
    return NextResponse.json({ error: "Malformed payment header" }, { status: 402 });
  }

  const facilitator = new InjectiveFacilitator({ privateKey: FACILITATOR_PRIVATE_KEY });

  const verifyResult = await facilitator.verify({
    paymentPayload,
    paymentRequirements: requirements,
  });

  if (!verifyResult.isValid) {
    return NextResponse.json(
      { error: "Payment invalid", reason: verifyResult.invalidReason },
      { status: 402 }
    );
  }

  // ── Step 5: Settle the payment on-chain ─────────────────────────────────────
  // Now that the payment is verified, the facilitator submits the
  // transferWithAuthorization transaction to Injective EVM. This moves the USDC
  // from the payer's wallet to the `payTo` (recipient) address atomically.
  // The server waits for on-chain confirmation before releasing the file.
  
  if (isDummy) {
    return NextResponse.json(
      { error: "Server Configuration Error", reason: "The server is using a dummy PRIVATE_KEY and cannot pay INJ gas to settle the transaction. Please configure a real funded private key in .env.local." },
      { status: 500 }
    );
  }

  const settleResult = await facilitator.settle({
    paymentPayload,
    paymentRequirements: requirements,
  });

  if (!settleResult.success) {
    return NextResponse.json(
      { error: "Payment settlement failed", reason: settleResult.errorReason },
      { status: 402 }
    );
  }

  // ── Step 6: Decrypt the file and stream it to the client ────────────────────
  // Only now — after the on-chain settlement is confirmed — do we decrypt the
  // file in memory and send it. The plaintext never touches the disk.
  try {
    const fileContent = await fs.readFile(encryptedFilePath);

    // The first 16 bytes are the IV prepended during upload
    const iv = fileContent.subarray(0, 16);
    const encryptedData = fileContent.subarray(16);

    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    const decryptedData = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final(),
    ]);

    return new NextResponse(decryptedData, {
      status: 200,
      headers: {
        "Content-Type": metadata.mimeType,
        "Content-Disposition": `attachment; filename="${metadata.filename}"`,
        // Return the settlement receipt so the client has the tx hash
        "PAYMENT-RESPONSE": Buffer.from(JSON.stringify(settleResult)).toString("base64"),
      },
    });
  } catch (error) {
    console.error("Decryption error:", error);
    return NextResponse.json({ error: "Failed to decrypt file" }, { status: 500 });
  }
}
