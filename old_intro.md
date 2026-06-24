# Building a Token Launcher DApp on Injective EVM

Welcome! In this tutorial, we're going to build a fully functional token creation platform on Injective EVM. By the end, you'll have written and deployed your own smart contracts, built a sleek React frontend, and connected everything together into a production-ready DApp where users can create custom ERC20 tokens, wrap/unwrap INJ, and manage their tokens - all through their MetaMask wallet.

## Table of Contents

* [Prerequisites](#prerequisites)
* [Complete Code Repository](#complete-code-repository)
* [What We're Building](#what-were-building)
* [Understanding Injective's Bank Precompile](#understanding-injectivess-bank-precompile)
* [Project Setup](#project-setup)
* [Next Steps](#next-steps)

## Prerequisites

Before we dive in, let's make sure you have everything you need. Don't worry - we'll keep things practical and I'll explain everything along the way:

### Required Tools

* **Node.js 16+** - We'll be using modern JavaScript features
* **MetaMask wallet** - Install the browser extension if you haven't already
* **Code editor** - VS Code is great and has excellent Solidity support
* **Git** - For version control and cloning repositories
* **Some testnet INJ** - We'll show you how to get this from the faucet (at least 2 INJ for token creation)

### Required Knowledge

* **Basic Solidity** - You should understand variables, functions, and modifiers
* **React fundamentals** - Comfortable with hooks, state, and components
* **TypeScript basics** - Helpful but not required; we'll explain as we go

## Complete Code Repository

**View the complete source code on GitHub:** [https://github.com/Intellihackz/injective-mts-token-launcher]

### How to Use This Tutorial

This tutorial can be used in two ways:

1. **Learning Mode** - Follow along step-by-step and build everything from scratch to deeply understand how each piece works
2. **Reference Mode** - If you've cloned the completed repository, use this tutorial to understand the implementation details and design decisions

## What We're Building

Here's what our Token Launcher DApp will be able to do by the end of this tutorial:

### Smart Contract Features

* **TokenFactory Contract** - Deploys new ERC20 tokens on demand
* **Mintable Token Contract** - Custom ERC20 tokens
* **Bank Module Integration** - Automatic registration with Injective's bank module
* **Simple Fee System** - Charges 2 INJ for token creation

### Frontend Features

* **Modern UI Design** - Clean, minimalist black & white theme
* **MetaMask Connection** - Seamless wallet integration with network switching
* **Token Creation Interface** - Simple form to create custom ERC20 tokens (name, ticker, supply, decimals)
* **Real-time Balance** - Live updates of INJ balance
* **Token Modal** - Display created token details with MetaMask integration
* **Transaction Status** - Real-time feedback on all operations
* **One-Click Add to MetaMask** - Automatically add newly created tokens to wallet
* **View on Explorer** - Open the created token's page on Blockscout explorer
* **Contract Verification** - Verify your token contract on the explorer with one click

## Understanding Injective's Bank Precompile

One of the most unique features of Injective EVM is the **bank precompile** - a special system contract that fundamentally changes how tokens work compared to other EVM chains.

### What is the Bank Precompile?

The bank precompile is a special contract deployed at a fixed address:

```
0x0000000000000000000000000000000000000064
```

Unlike regular smart contracts that you deploy, this is a **precompiled contract** built directly into the Injective blockchain. Think of it as a native module that's always available.

### How It's Different from Standard ERC20

On most EVM chains (like Ethereum, BSC, Polygon), ERC20 tokens:
- Store balances in the token contract's storage
- Can only be transferred via smart contract calls
- Are isolated to the EVM environment

On Injective EVM, tokens using the bank precompile:
- **Store balances in the native bank module** (not in contract storage!)
- **Can be transferred natively** (without smart contract calls)
- **Are visible across the entire Injective ecosystem** (Cosmos SDK, IBC, native wallets)
- **Support IBC transfers** to other Cosmos chains

### Why This Matters for Your Tokens

When you create a token through our Token Launcher, it automatically integrates with the bank precompile through the `BankERC20` base contract. This means your tokens get superpowers:

1. **Native Token Status**: Your ERC20 token becomes a first-class citizen in Injective's native ecosystem
2. **IBC Compatibility**: Tokens can be transferred to other Cosmos chains via IBC
3. **Gas Efficiency**: Balance queries are cheaper since they read from native state
4. **Cross-Module Access**: The same token works in both EVM (smart contracts) and native Injective apps

### How It Works in Practice

When your `MintableToken` inherits from `BankERC20`:

```solidity
contract MintableToken is BankERC20 {
    // Your token automatically uses the bank module for storage
}
```

The `BankERC20` contract overrides standard ERC20 functions:

- `balanceOf()` → Queries the bank precompile instead of a mapping
- `transfer()` → Calls the bank module's native transfer
- `totalSupply()` → Reads from bank module state

This happens transparently - users interact with your token like any normal ERC20, but under the hood it's using Injective's native infrastructure.

### The Registration Fee

When creating a token, you pay **2 INJ** total. This one-time fee:
- Covers token deployment gas costs
- Registers your token's metadata (name, symbol, decimals) in the bank module
- Enables native transfers and IBC compatibility

This is why our TokenFactory requires `2 INJ` sent as the native value with the transaction.

### Key Takeaway

Injective's bank precompile is what makes this Token Launcher special. You're not just creating isolated ERC20 contracts - you're creating **native Injective tokens** that work seamlessly across the entire ecosystem while maintaining full EVM compatibility.

---

## Project Setup


Before we dive into coding, let's set up our complete project structure. We'll create both the contract and frontend folders right now, so when you start the actual development tutorials, you can jump straight into coding without any setup friction.

### Creating the Project Structure

First, create a new directory for the entire project:

```bash
mkdir injective-token-launcher
cd injective-token-launcher
```

### Setting Up the Contract Folder

Now let's set up the contract folder using Injective's Hardhat template:

```bash
git clone https://github.com/injective-dev/hardhat-inj mts-token
cd mts-token
npm install
```

This gives us a pre-configured Hardhat setup optimized for Injective EVM, including:

* Hardhat configuration for Injective networks
* Sample contract structure
* Testing setup
* Deployment scripts

### Understanding the Hardhat Configuration

The cloned template already comes with a configured `hardhat.config.js` file. Let's understand what each part does:

<details>
<summary>Click to view hardhat.config.js</summary>

```javascript
require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: '0.8.20',
  networks: {
    inj_testnet: {
      url: process.env.INJECTIVE_RPC || 'https://k8s.testnet.json-rpc.injective.network/',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1439,
      gas: 10000000,
      gasPrice: 50000000000,
    },
  },
  etherscan: {
    apiKey: {
      inj_testnet: 'nil',
    },
    customChains: [
      {
        network: 'inj_testnet',
        chainId: 1439,
        urls: {
          apiURL: 'https://testnet.blockscout-api.injective.network/api',
          browserURL: 'https://testnet.blockscout.injective.network/',
        },
      },
    ],
  },
  sourcify: {
    enabled: false,
  },
};
```

</details>

### Configuration Breakdown

#### Solidity Version

```javascript
solidity: '0.8.20',
```

The Solidity compiler version we'll use for our contracts.

#### Network Configuration

```javascript
networks: {
  inj_testnet: {
    url: process.env.INJECTIVE_RPC || 'https://k8s.testnet.json-rpc.injective.network/',
    accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    chainId: 1439,
    gas: 10000000,
    gasPrice: 50000000000,
  },
}
```

* **url**: The RPC endpoint for Injective EVM testnet
* **accounts**: Your wallet's private key (loaded from .env)
* **chainId**: Injective EVM testnet chain ID (1439)
* **gas**: Gas limit for transactions
* **gasPrice**: Gas price in wei

#### Contract Verification

```javascript
etherscan: {
  apiKey: {
    inj_testnet: 'nil',
  },
  customChains: [
    {
      network: 'inj_testnet',
      chainId: 1439,
      urls: {
        apiURL: 'https://testnet.blockscout-api.injective.network/api',
        browserURL: 'https://testnet.blockscout.injective.network/',
      },
    },
  ],
},
```

This configuration allows us to verify our contracts on BlockScout (Injective's block explorer) after deployment.

### Setting Up Environment Variables

Create a `.env` file in the `mts-token` folder:

Add your private key and RPC URL:

```env
PRIVATE_KEY=your_private_key_here
INJECTIVE_RPC=https://k8s.testnet.json-rpc.injective.network/
```

**Important Security Notes:**

1. **Never commit your `.env` file to git!** The template's `.gitignore` already excludes it
2. **Use a testnet-only wallet** - Never use your mainnet wallet's private key
3. **Get your private key from MetaMask**:
   * Open MetaMask
   * Click the three dots → Account Details → Export Private Key
   * Enter your password and copy the key

### Getting Testnet Tokens

Before you can deploy and test, you'll need testnet tokens:

1. **Get testnet INJ**: Visit the [Injective testnet faucet](https://testnet.faucet.injective.network/)
2. **You'll need at least 2 INJ** for token creation plus additional INJ for gas fees

### Setting Up the Frontend Folder

Now let's set up the React frontend. Navigate back to the root folder and create the frontend:

```bash
cd ..  # Go back to injective-token-launcher folder
npm create vite@latest mts-frontend
```

When prompted by Vite:

* **Select a framework:** Choose `React`
* **Select a variant:** Choose `TypeScript`

Now install dependencies:

```bash
cd mts-frontend
npm install
npm install ethers
```

This creates a new React app with TypeScript support and installs ethers.js for blockchain interactions.

### Final Project Structure

Your complete project structure should now look like this:

```bash
injective-token-launcher/
├── mts-token/                 # Smart contract development
│   ├── contracts/             # Solidity contracts
│   │   ├── TokenFactory.sol   # Factory for creating tokens
│   │   ├── MintableToken.sol  # ERC20 token template
│   │   ├── BankERC20.sol      # Bank module integration
│   │   └── Bank.sol           # Bank module interface
│   ├── script/                # Deployment scripts
│   │   └── deploy.js          # Main deployment script
│   ├── server.js              # Verification server
│   ├── hardhat.config.js      # Hardhat configuration
│   ├── .env                   # Environment variables (private keys)
│   └── package.json
│
└── mts-frontend/              # React frontend
    ├── src/
    │   ├── App.tsx            # Main app component
    │   ├── App.css            # Modern black & white styling
    │   └── abis/              # Contract ABIs
    │       └── TOKENFACTORY.json  # TokenFactory ABI
    ├── public/
    └── package.json
```

## Next Steps

Congratulations! Your development environment is now completely set up. You have:

✅ Both contract and frontend folders created  
✅ All dependencies installed  
✅ Hardhat configured for Injective EVM  
✅ Environment variables ready  
✅ Project structure organized

Now you can jump straight into development without any setup interruptions!


**[Start with Smart Contract Development →](TUTORIAL-contract.md)**

* Write the TokenFactory contract
* Write MintableToken with mint/burn
* Deploy to Injective EVM testnet
* Verify your contracts
* Create a Verification Server

tutorials assume your environment is already set up, so you can focus purely on coding!
Let's build something awesome!
