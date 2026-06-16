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
    <div className="app-container">
      <main className="main-wrapper">
        <div className="header">
          <div className="badge">
            <Coins size={14} />
            <span>x402 on Injective</span>
          </div>
          <h1 className="title">Pay-to-Unlock Content</h1>
          <p className="subtitle">
            Upload any file, set a price, and get a gated download URL. 
            When users pay, the file stream unlocks instantly.
          </p>
        </div>

        <div className="card">
          {!humanUrl ? (
            <div className="card-content">
              <div 
                className={`upload-zone ${isDragging ? "drag-active" : ""} ${file ? "has-file" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  className="upload-input"
                  onChange={handleFileChange}
                />
                {file ? (
                  <>
                    <div className="upload-icon"><FileCheck2 size={24} /></div>
                    <p className="file-name">{file.name}</p>
                    <p className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </>
                ) : (
                  <>
                    <div className="upload-icon"><UploadCloud size={24} /></div>
                    <p className="upload-prompt">Click or drag file here</p>
                    <p className="upload-subprompt">Any file up to 50MB</p>
                  </>
                )}
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label className="label">Price</label>
                  <div className="input-wrapper">
                    <span className="input-prefix">$</span>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="input with-prefix with-suffix"
                      placeholder="0.00"
                    />
                    <span className="input-suffix">USDC</span>
                  </div>
                </div>

                <div className="input-group">
                  <label className="label">Recipient Address</label>
                  <input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    className="input"
                    placeholder="0x..."
                  />
                </div>
              </div>

              <div className="notice">
                <ShieldCheck size={16} className="notice-icon" />
                <p>Files are encrypted at rest and unlocked only upon payment.</p>
              </div>

              <button
                onClick={handleCreateLink}
                disabled={!file || !price || !recipientAddress || isUploading}
                className="button"
              >
                {isUploading ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    <LinkIcon size={16} />
                    Create Gated Link
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="result-view">
              <div className="success-icon">
                <FileCheck2 size={28} />
              </div>
              <h2 className="result-title">Links Created!</h2>
              <p className="result-subtitle">
                Share either link. One is for humans, one is for AI agents.
              </p>

              <div className="link-box">
                <div className="link-header">
                  <span className="link-title">🧑 Human Pay</span>
                  <span className="link-desc">Browser + wallet</span>
                </div>
                <div className="link-input-wrapper">
                  <input type="text" readOnly value={humanUrl} className="link-input" />
                  <button onClick={() => copyUrl("human")} className="copy-btn">
                    {copied === "human" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="link-box">
                <div className="link-header">
                  <span className="link-title">🤖 Agent Pay</span>
                  <span className="link-desc">x402 raw endpoint</span>
                </div>
                <div className="link-input-wrapper">
                  <input type="text" readOnly value={agentUrl} className="link-input" />
                  <button onClick={() => copyUrl("agent")} className="copy-btn">
                    {copied === "agent" ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>

              <button onClick={handleReset} className="reset-btn">
                Upload another file
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
