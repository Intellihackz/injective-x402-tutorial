# Building a Pay-to-Unlock Content Platform with Injective x402

Welcome! In this tutorial, we're going to build a fully functional token-gated content platform on Injective EVM. By the end, you'll have written an Express backend, built a sleek React frontend using Vite, and connected everything together into a production-ready DApp where creators can upload encrypted files and sell them directly for tokens—all while fully supporting autonomous AI agents.

## Prerequisites

Before we dive in, let's make sure you have everything you need:

* **Node.js 18+**
* **MetaMask wallet**
* **Some testnet INJ & USDC**

## What We're Building

We are building an application with two parts:
1. **Express Server:** Handles secure file uploads, encrypts files dynamically with a per-file salt, and serves as the x402 Facilitator to settle EIP-3009 transactions.
2. **Vite + React Frontend:** Provides a beautiful UI for humans to upload files, generate links, and sign EIP-3009 authorizations to download content gaslessly.

---

## Understanding Injective x402

### What is x402?
x402 embeds payment into the HTTP protocol, where the server demands and collects payment as part of the API response cycle, before returning data.

### What happens in an x402 interaction?
When a client calls an x402-gated HTTP endpoint, the exchange follows these steps:
1. Client sends a normal HTTP request to the API endpoint.
2. Server responds with `402 Payment Required` and a price quote.
3. Client signs a USDC transfer transaction, but the transaction is not yet broadcast to the network.
4. An x402 facilitator submits the signed payment to the blockchain and awaits confirmation.
5. Client retries the original request, this time including the details of the completed payment.
6. Server verifies the receipt via the facilitator and returns the requested data.

![x402 interaction steps](https://mintcdn.com/injectivelabs/QW0WWCmSlMi8lO1R/img/x402-demo-interaction-steps.png?w=1100&fit=max&auto=format&n=QW0WWCmSlMi8lO1R&q=85&s=26ae8c109f5388904a950c5c397b1086)

### What does x402 avoid?
Prior registration, API key management, subscriptions, or credit cards; none of these are needed. This means that a server can quote, verify payment, and deliver in a single HTTP conversation.

The facilitator handles all blockchain interaction, keeping your API server web native:

| Facilitator responsibility | What it abstracts away |
| -------------------------- | ---------------------- |
| Verifying payment signatures | Cryptographic validation code in your server |
| Submitting transactions to the chain | RPC endpoint management |
| Gas estimation and fees | Gas calculation logic |
| Awaiting on-chain confirmation | Block polling: You receive a yes/no |

### Is x402 only for Ethereum?
x402 is network-neutral: The open standard supports EVM-compatible networks, SVM-compatible networks, and others. This tutorial shows you how to use x402 on Injective.

### Why use x402 on Injective?
Injective has a very high throughput and low latency, as it has a block time of approximately 650ms, and deterministic single-block finality. This means that x402 payments can settle about as fast as credit card payments, but at a fraction of the cost. This opens up new use cases, including pay-per-use, and micro-transactions. Since x402 transactions are fully programmatic as well, they are a natural fit for AI agents.

---

## Project Setup

We'll use a monorepo-style structure with `server/` and `client/` directories.

```bash
mkdir injective-x402-app
cd injective-x402-app
```

### Server Initialization

```bash
mkdir server
cd server
npm init -y
npm install express cors dotenv multer @injectivelabs/x402
npm install -D typescript @types/express @types/cors @types/multer @types/node ts-node
```

### Frontend Initialization

Open a new terminal in the root `injective-x402-app` folder:

```bash
npx create-vite@latest client --template react-ts
cd client
npm install
npm install lucide-react viem @injectivelabs/x402 react-router-dom
```

---

## Ready to Start?

Head over to **[Part 1: Building the Server](Tutorial-Server.md)** to begin writing the backend infrastructure!
