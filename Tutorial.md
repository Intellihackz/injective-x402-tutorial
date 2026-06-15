# Building a Pay-to-Unlock Content Platform with Injective x402

Welcome! In this tutorial, we're going to build a fully functional token-gated content platform on Injective EVM. By the end, you'll have written an Express backend, built a sleek React frontend using Vite, and connected everything together into a production-ready DApp where creators can upload encrypted files and sell them directly for tokens—all while fully supporting autonomous AI agents.

## The Tutorial Series

This tutorial is split into manageable sections:

1. **[Part 1: Building the Server](Tutorial-Server.md)** - Setting up Express, the Encryption Utility, and the x402 Facilitator.
2. **[Part 2: Building the Frontend](Tutorial-Frontend.md)** - Building the Vite+React Upload UI and the gasless Download UI.

---

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

Before we write code, it's important to understand *why* we are using the x402 protocol and what makes it so powerful.

### What is x402?
x402 is a decentralized protocol built on top of the classic **HTTP 402 Payment Required** status code. Traditionally, when you hit a paywall on the internet, you are redirected to a credit card form. x402 replaces that form with a standardized, machine-readable crypto payment challenge.

### Built for AI Agents and Machines
Because x402 is an API standard, it's not just for humans clicking buttons in a browser. **Autonomous AI Agents** can natively understand x402. When an agent hits an x402-protected endpoint, it reads the required token and price from the JSON response, uses its wallet to sign the payment authorization, and programmatically unlocks the file—all without any human intervention.

### Gasless EIP-3009 Payments
To make the payment flow frictionless, x402 utilizes **EIP-3009 (Transfer With Authorization)**. 
Instead of the user initiating an on-chain transaction (which costs INJ gas and requires waiting for blocks), the user simply *signs a message* off-chain granting permission to move the tokens. 

Our Express Server (acting as the **Facilitator**) takes this signature, verifies it off-chain, and then executes the transaction on Injective itself. This means your users don't need INJ gas to buy content—they just need the purchase token (like USDC)!

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
