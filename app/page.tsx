"use client";

import { useState } from "react";
import { UploadCloud, Link as LinkIcon, FileCheck2, ShieldCheck, Coins } from "lucide-react";

// USDC on Injective EVM
// Mainnet (eip155:1776): 0xa00C59fF5a080D2b954d0c75e46E22a0c371235a
// Testnet (eip155:1439): 0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d
const USDC_ADDRESS = "0x0C382e685bbeeFE5d3d9C29e29E341fEE8E84C5d" as `0x${string}`;
const NETWORK = "eip155:1439"; // Switch to eip155:1776 for mainnet

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
      formData.append("assetAddress", USDC_ADDRESS);
      formData.append("network", NETWORK);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      
      setHumanUrl(`${window.location.origin}/download/${data.fileId}`);
      setAgentUrl(`${window.location.origin}/api/download/${data.fileId}`);
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
