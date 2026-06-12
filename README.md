# Pay-to-Unlock Content with x402 on Injective

This repository demonstrates how to build a fully functional **Pay-to-Unlock (Gated Content)** platform using the [x402 Protocol](https://docs.injective.com) on Injective EVM.

It was built to accompany the comprehensive step-by-step developer tutorial: **[Building a Pay-to-Unlock Content Platform with Injective x402](Tutorial.md)**.

## How it works

1. **Upload (Creator):** A creator uploads a file and sets a price in USDC. The file is encrypted AES-256-CBC server-side.
2. **Share:** The creator gets two links to share:
   - **🧑 Human Pay:** A beautiful UI for standard users with browser wallets (MetaMask/Rabby).
   - **🤖 Agent Pay:** A raw API endpoint that returns a `402 Payment Required` challenge, perfect for autonomous AI agents.
3. **Pay & Download (Buyer):**
   - The buyer signs an EIP-3009 `transferWithAuthorization` message in their wallet.
   - The signed payload is sent to the server in a `PAYMENT-SIGNATURE` HTTP header.
   - The server verifies the signature, settles the transfer on-chain using a facilitator wallet (paying INJ gas), and then decrypts and streams the file to the buyer.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS v4
- **Web3 / Protocol:** `@injectivelabs/x402`, `viem`
- **Icons:** `lucide-react`
- **Storage:** Local `.storage` directory (can be easily swapped for AWS S3)

## Quickstart

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up your environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   # Secret used to encrypt files at rest (min 32 chars)
   ENCRYPTION_SECRET=super_secret_tutorial_key_123

   # The Facilitator Wallet (pays INJ gas to settle the USDC transfer on-chain)
   # Must be funded with a small amount of INJ on Injective EVM.
   PRIVATE_KEY=0xYOUR_FACILITATOR_PRIVATE_KEY
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing the Agent Flow

You can test the programmatic / AI Agent flow using the included test script:

```bash
# Add a funded testpayer wallet to your .env.local
TEST_CLIENT_PRIVATE_KEY=0xYOUR_TEST_PAYER_PRIVATE_KEY

# Run the test client against an agent URL
npx tsx scripts/test-download.ts http://localhost:3000/api/download/<file-id>
```
