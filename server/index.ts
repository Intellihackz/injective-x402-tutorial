import express from "express";
import cors from "cors";
import multer from "multer";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import { decodePaymentSignatureHeader } from "@injectivelabs/x402";
import { encryptFile, decryptFile } from "./utils/encryption.js";
import { getFacilitator } from "./utils/facilitator.js";

dotenv.config();

const app = express();
const port = 3000;
const upload = multer({ storage: multer.memoryStorage() });

const STORAGE_DIR = path.join(process.cwd(), ".storage");

app.use(cors({
  exposedHeaders: ['x-transaction-hash', 'x402-version']
}));
app.use(express.json());

// ----------------------------------------------------
// UPLOAD API
// ----------------------------------------------------
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const { price, recipientAddress, assetAddress, network } = req.body;

    const fileId = crypto.randomUUID();
    
    // 1. Encrypt file with per-file salt (abstracted to utility)
    await encryptFile(file.buffer, fileId, process.env.ENCRYPTION_SECRET!);

    // 2. Save metadata "price tag"
    const metadata = {
      id: fileId,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype || "application/octet-stream",
      price,
      network,
      recipientAddress,
      assetAddress,
    };

    await fs.writeFile(
      path.join(STORAGE_DIR, `${fileId}.json`),
      JSON.stringify(metadata, null, 2)
    );

    res.json({ fileId });
  } catch (error) {
    console.error("Error during upload:", error);
    res.status(500).json({ error: "Upload failed. Please check server logs." });
  }
});

// ----------------------------------------------------
// DOWNLOAD API (Facilitator)
// ----------------------------------------------------
app.get("/api/download/:id/info", async (req, res) => {
  try {
    const { id } = req.params;
    const metadataPath = path.join(STORAGE_DIR, `${id}.json`);
    const metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
    res.json(metadata);
  } catch {
    res.status(404).json({ error: "File not found" });
  }
});

app.get("/api/download/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Load Metadata
    const metadataPath = path.join(STORAGE_DIR, `${id}.json`);
    let metadata;
    try {
      metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
    } catch {
      return res.status(404).json({ error: "File not found" });
    }

    // 2. Define Payment Requirements
    const requirements = {
      scheme: "exact" as const,
      network: metadata.network,
      asset: metadata.assetAddress,
      amount: Math.floor(parseFloat(metadata.price) * 1_000_000).toString(),
      payTo: metadata.recipientAddress,
      maxTimeoutSeconds: 60,
      extra: {},
    };

    const facilitator = getFacilitator();

    // 3. Check for Payment Header
    const signatureHeader = req.headers["payment-signature"] as string;
    if (!signatureHeader) {
      // No payment? Send the 402 challenge!
      return res.status(402).json({ x402Version: 2, accepts: [requirements] });
    }

    // 4. Verify & Settle On-Chain
    const paymentPayload = decodePaymentSignatureHeader(signatureHeader);
    const verifyResult = await facilitator.verify({
      paymentPayload,
      paymentRequirements: requirements
    });

    if (!verifyResult.isValid) return res.status(402).json({ error: "Payment invalid" });

    const settleResult = await facilitator.settle({
      paymentPayload,
      paymentRequirements: requirements,
    });
    
    console.log("Settle result:", settleResult);
    if (!settleResult.success) {
      return res.status(500).json({ error: `Settlement failed: ${settleResult.errorReason} - ${settleResult.errorMessage}` });
    }
    
    const txHash = settleResult.transaction || "unknown";
    console.log(`Payment settled successfully! TX Hash: ${txHash}`);
    res.setHeader("x-transaction-hash", txHash);

    // 5. Decrypt and Stream File (abstracted to utility)
    const decryptedBuffer = await decryptFile(id, process.env.ENCRYPTION_SECRET!);

    res.setHeader("Content-Type", metadata.mimeType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${metadata.filename}"`
    );
    res.send(decryptedBuffer);
  } catch (error: any) {
    console.error(error);
    const msg = error.message || "Server error";
    res.status(500).json({ error: msg });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
