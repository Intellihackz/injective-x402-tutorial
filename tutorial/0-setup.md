# Building a Pay-to-Unlock Content Platform with Injective x402

Welcome! In this tutorial, we're going to build a fully functional token-gated content platform on Injective EVM. By the end, you'll have written an Express backend, built a sleek React frontend using Vite, and connected everything together into a production-ready DApp where creators can upload encrypted files and sell them directly for tokens, all while fully supporting autonomous AI agents.

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

Before diving into the code, let's briefly look at how x402 works under the hood.

### The x402 Flow
x402 embeds crypto payments natively into the HTTP protocol. Instead of managing API keys, prior registrations, or credit card subscriptions, a server can simply demand payment on the fly:

1. A client requests an API endpoint.
2. The server responds with an HTTP `402 Payment Required` status and a price quote.
3. The client signs a USDC transfer transaction, but the transaction is not yet broadcast to the network.
4. An **x402 facilitator** submits the signed payment to the blockchain and awaits confirmation.
5. The client retries the request with the payment receipt, and the server delivers the data.

![x402 interaction steps](https://mintcdn.com/injectivelabs/QW0WWCmSlMi8lO1R/img/x402-demo-interaction-steps.png?w=1100&fit=max&auto=format&n=QW0WWCmSlMi8lO1R&q=85&s=26ae8c109f5388904a950c5c397b1086)

### The Magic of the Facilitator
The beauty of the x402 facilitator is that it keeps your API server entirely web-native. The Facilitator handles all the blockchain complexity (including cryptographic validation, RPC endpoint management, gas estimation, and block polling), abstracting it entirely away from the core server logic.

### Why Injective?
While x402 is an open standard that supports many networks, it is especially powerful on Injective. With ~650ms block times and deterministic single-block finality, x402 payments settle faster than credit cards but at a fraction of the cost. This makes it the perfect fit for micro-transactions, pay-per-use APIs, and autonomous AI agents.

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

Head over to **[Part 1: Building the Server](1-server.md)** to begin writing the backend infrastructure!
