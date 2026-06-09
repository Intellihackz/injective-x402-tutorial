import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const STORAGE_DIR = path.join(process.cwd(), ".storage");

// Public metadata endpoint — returns file info without requiring payment.
// The download page uses this to render the price, filename, and asset info.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const metadataPath = path.join(STORAGE_DIR, `${id}.json`);

  try {
    const raw = await fs.readFile(metadataPath, "utf-8");
    const metadata = JSON.parse(raw);

    // Only expose what the buyer needs to see — never the encryption details
    return NextResponse.json({
      id: metadata.id,
      filename: metadata.filename,
      mimeType: metadata.mimeType,
      size: metadata.size,
      price: metadata.price,
      assetAddress: metadata.assetAddress,
      recipientAddress: metadata.recipientAddress,
      network: metadata.network ?? "eip155:1776",
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
