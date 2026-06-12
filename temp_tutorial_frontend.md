# Part 2: Frontend Development

Welcome to the frontend development section! Your environment is already set up from the main tutorial, so we can jump straight into building the UI.

## Table of Contents

* [Building the Base UI](#building-the-base-ui)
* [Connecting to MetaMask](#connecting-to-metamask)
* [Creating Tokens](#creating-tokens)
* [Adding Tokens to MetaMask](#adding-tokens-to-metamask)

---

## Building the Base UI

We'll start by building the complete user interface with mock data and state management. This lets us see how everything will look before adding blockchain complexity.

### Project Structure

Your frontend folder should have this structure:

```
mts-frontend/
├── src/
│   ├── App.tsx         # Main app component (we'll build this)
│   ├── App.css         # Styling
│   └── main.tsx        # Entry point
├── public/
│   └── assets/
│       └── logo.png    # inject.fun logo
└── package.json
```

### Installing Dependencies

Make sure you have ethers.js installed:

```bash
cd mts-frontend
npm install ethers
```

### Setting Up TypeScript Interfaces

Open `src/App.tsx` and start with the imports and TypeScript setup:

```typescript
import { useState } from 'react'
import './App.css'
import logo from './assets/logo.png'

declare global {
  interface Window {
    ethereum?: any
  }
}
```

The `declare global` block tells TypeScript that `window.ethereum` exists (added by MetaMask).

### Creating State Variables

Now let's set up all the state we'll need:

```typescript
function App() {
  // Wallet connection state
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletBalance, setWalletBalance] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)

  // Token creation state
  const [tokenName, setTokenName] = useState('')
  const [ticker, setTicker] = useState('')
  const [supply, setSupply] = useState('1000000')
  const [decimal, setDecimal] = useState('18')
  const [isCreatingToken, setIsCreatingToken] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<{ type: 'success' | 'error' | 'pending' | ''; message: string }>({ 
    type: '', 
    message: '' 
  })

  // Verification data for manual verification
  const [verifyData, setVerifyData] = useState<{ contractAddress: string; constructorArgs: any[] } | null>(null)

  // Token modal state
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [createdToken, setCreatedToken] = useState<{
    address: string
    name: string
    symbol: string
    decimals: number
    supply: string
  } | null>(null)
```

### Helper Functions

Add utility functions for formatting:

```typescript
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance)
    return num.toFixed(4)
  }
```

### Mock Event Handlers

For now, let's create placeholder functions that just log to the console:

```typescript
  const handleWalletClick = async () => {
    if (isWalletConnected) {
      // Disconnect wallet
      setIsWalletConnected(false)
      setWalletAddress('')
      setWalletBalance('0.0000')
      console.log('Wallet disconnected')
    } else {
      // Mock wallet connection
      console.log('Connect wallet clicked')
      setIsWalletConnected(true)
      setWalletAddress('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb')
      setWalletBalance('5.2500')
    }
  }

  const handleCreateToken = async () => {
    console.log('Create token:', { tokenName, ticker, supply, decimal })
    setTokenStatus({ type: 'success', message: 'Token creation will be implemented next!' })
  }

  const closeModal = () => {
    setShowTokenModal(false)
    setCreatedToken(null)
  }
```

### Building the UI Structure

Now let's create the complete JSX for our app:

<details>
<summary>Click to view complete UI JSX</summary>

```typescript
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <img src={logo} alt="Inject logo" className="logo-img" />
          <span className="logo-text">inject.fun</span>
        </div>
        <span
          className={`wallet-address ${isWalletConnected ? 'connected' : ''} ${isConnecting ? 'connecting' : ''}`}
          onClick={isConnecting ? undefined : handleWalletClick}
          title={isConnecting ? 'Connecting...' : (isWalletConnected ? 'Click to disconnect' : 'Click to connect wallet')}
          style={{ cursor: isConnecting ? 'not-allowed' : 'pointer', opacity: isConnecting ? 0.6 : 1 }}
        >
          {isConnecting
            ? 'Connecting...'
            : (isWalletConnected
              ? `${walletBalance} INJ | ${walletAddress}`
              : 'Connect Wallet')}
        </span>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Create Token Card */}
        <section className="create-token-card">
          <div className="form-group">
            <label>name</label>
            <input
              type="text"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              placeholder=""
            />
          </div>

          <div className="form-group">
            <label>ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder=""
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>supply</label>
              <input
                type="text"
                value={supply}
                onChange={(e) => setSupply(e.target.value)}
              />
            </div>
            <div className="form-group decimal">
              <label>decimal</label>
              <input
                type="text"
                value={decimal}
                onChange={(e) => setDecimal(e.target.value)}
              />
            </div>
          </div>

          <button className="create-token-btn" onClick={handleCreateToken} disabled={isCreatingToken}>
            {isCreatingToken ? 'Creating...' : 'create token'}
          </button>
          <div className="fee-notice">
            <span className="fee-text">payment of 2 INJ is required for token creation</span>
          </div>

          {tokenStatus.message && (
            <div className={`status-message ${tokenStatus.type}`} style={{ marginTop: '16px' }}>
              {tokenStatus.message}
            </div>
          )}
        </section>
      </main>

      {/* Token Created Modal */}
      {showTokenModal && createdToken && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Token Created!</h2>

            <div className="modal-content">
              <div className="token-info">
                <div className="info-row">
                  <span className="label">Name:</span>
                  <span className="value">{createdToken.name}</span>
                </div>
                <div className="info-row">
                  <span className="label">Symbol:</span>
                  <span className="value">{createdToken.symbol}</span>
                </div>
                <div className="info-row">
                  <span className="label">Decimals:</span>
                  <span className="value">{createdToken.decimals}</span>
                </div>
                <div className="info-row">
                  <span className="label">Supply:</span>
                  <span className="value">{createdToken.supply}</span>
                </div>
                <div className="info-row address-row">
                  <span className="label">Address:</span>
                  <span className="value address">{createdToken.address}</span>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  className="modal-btn copy-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(createdToken.address)
                  }}
                >
                  Copy Address
                </button>
                <button className="modal-btn add-wallet-btn">
                  Add to MetaMask
                </button>
              </div>

              <button className="modal-close-btn" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
```

</details>

### Understanding the UI Components

Let's break down what we've built:

**Header Section**
- App logo and branding
- Wallet connection button
- Shows INJ balance when connected (mock data for now)

**Token Creation Form**
- Name input
- Ticker/symbol input
- Supply and decimals (in a row)
- Create button
- Fee notice (2 INJ)
- Status message area

**Token Modal**
- Displays created token details
- Copy address button
- Add to MetaMask button
- Close button

### Adding the CSS

Copy the complete CSS from your repository to `src/App.css`. The CSS provides:

- Black & white minimalist theme
- Responsive grid layout
- Form styling
- Button hover effects
- Modal styling
- Status message colors

### Testing the Base UI

Start the development server:

```bash
npm run dev
```

You should see:

✅ A working UI with all components visible  
✅ Clickable connect/disconnect (with mock data)  
✅ Form inputs that update state  
✅ Buttons that log to console  

Everything works visually, but nothing connects to the blockchain yet!

---

## Connecting to MetaMask

Now let's replace our mock wallet connection with real MetaMask integration.

### Adding Ethers.js

Update your imports to include ethers:

```typescript
import { BrowserProvider, formatEther, MaxUint256, Contract } from 'ethers'
```

### Network Configuration

Add the Injective EVM network configuration:

```typescript
const INJECTIVE_EVM_PARAMS = {
  chainId: '0x59f', // 1439 in hexadecimal
  chainName: 'Injective EVM',
  rpcUrls: ['https://k8s.testnet.json-rpc.injective.network/'],
  nativeCurrency: {
    name: 'Injective',
    symbol: 'INJ',
    decimals: 18,
  },
  blockExplorerUrls: ['https://testnet.blockscout.injective.network/blocks'],
}
```

This tells MetaMask how to connect to Injective EVM.

### Contract Addresses

Add this constant above your component:

```typescript
// Token Factory Contract Address (use your deployed address)
const TOKEN_FACTORY_ADDRESS = '0x715513b13Aa8118827167Dc5B51E3d6DE492417E'
```

### Getting Contract ABIs

Before we implement the connection, we need the contract ABI.

**Create `src/abis/TOKENFACTORY.json`:**

From your compiled contracts:
```bash
cd mts-token/artifacts/contracts/TokenFactory.sol/
# Copy the "abi" array from TokenFactory.json
```

### Importing ABI

Add to your imports:

```typescript
import TOKEN_FACTORY_ABI from './abis/TOKENFACTORY.json'
```

### Implementing Real Wallet Connection

Now replace the mock `handleWalletClick` with the real implementation:

<details>
<summary>Click to view complete handleWalletClick function</summary>

```typescript
const handleWalletClick = async () => {
  if (isWalletConnected) {
    // Disconnect wallet
    setIsWalletConnected(false)
    setWalletAddress('')
    setWalletBalance('0.0000')
    console.log('Wallet disconnected')
  } else {
    // Connect wallet using MetaMask with ethers v6
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask not installed!')
      return
    }

    try {
      setIsConnecting(true)
      const provider = new BrowserProvider(window.ethereum)

      // Add/Switch to Injective EVM network
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [INJECTIVE_EVM_PARAMS],
      })

      // Request account access
      await provider.send('eth_requestAccounts', [])
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      // Fetch native INJ balance
      const balance = await provider.getBalance(address)
      const formattedBalance = formatEther(balance)

      setWalletAddress(shortenAddress(address))
      setWalletBalance(formatBalance(formattedBalance))
      setIsWalletConnected(true)
      console.log('Connected address:', address)
      console.log('INJ Balance:', formattedBalance)
    } catch (err) {
      console.error('MetaMask connection failed:', err)
    } finally {
      setIsConnecting(false)
    }
  }
}
```

</details>

### Understanding the Connection Flow

**1. Check MetaMask**
```typescript
if (typeof window.ethereum === 'undefined') {
  alert('MetaMask not installed!')
  return
}
```

**2. Add/Switch Network**
```typescript
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [INJECTIVE_EVM_PARAMS],
})
```
Automatically adds Injective EVM to MetaMask or switches to it.

**3. Request Accounts**
```typescript
await provider.send('eth_requestAccounts', [])
const signer = await provider.getSigner()
const address = await signer.getAddress()
```
Prompts user to connect and gets their address.

**4. Get INJ Balance**
```typescript
const balance = await provider.getBalance(address)
const formattedBalance = formatEther(balance)
```

### Testing the Connection

Save and test:

1. Click "Connect Wallet"
2. MetaMask should pop up
3. If not on Injective EVM, it asks to add/switch
4. Approve connection
5. See real INJ balance in header

You now have a real wallet connection!

---

## Creating Tokens

Now for the main feature - let's implement the token creation!

### Implementing Token Creation

Replace the mock `handleCreateToken` with the real implementation:

<details>
<summary>Click to view complete handleCreateToken function</summary>

```typescript
const handleCreateToken = async () => {
  if (!isWalletConnected) {
    setTokenStatus({ type: 'error', message: 'Please connect your wallet first!' })
    return
  }

  if (!tokenName.trim()) {
    setTokenStatus({ type: 'error', message: 'Please enter a token name!' })
    return
  }

  if (!ticker.trim()) {
    setTokenStatus({ type: 'error', message: 'Please enter a ticker symbol!' })
    return
  }

  const decimalsNum = parseInt(decimal)
  if (isNaN(decimalsNum) || decimalsNum < 0 || decimalsNum > 18) {
    setTokenStatus({ type: 'error', message: 'Decimals must be between 0 and 18!' })
    return
  }

  const supplyNum = parseFloat(supply)
  if (isNaN(supplyNum) || supplyNum <= 0) {
    setTokenStatus({ type: 'error', message: 'Please enter a valid supply!' })
    return
  }

  try {
    setIsCreatingToken(true)
    setTokenStatus({ type: 'pending', message: 'Preparing token creation...' })

    const provider = new BrowserProvider(window.ethereum)
    const signer = await provider.getSigner()
    const tokenFactory = new Contract(TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, signer)

    // Get total creation fee (2 INJ total: 1 INJ platform fee + 1 INJ bank module fee)
    const totalFee = await tokenFactory.TOTAL_FEE()
    console.log('Total creation fee (INJ):', formatEther(totalFee))

    setTokenStatus({ type: 'pending', message: `Creating token (${formatEther(totalFee)} INJ)...` })

    // Calculate initial supply with token decimals
    const initialSupply = BigInt(supply) * BigInt(10 ** decimalsNum)
    console.log('Initial supply (with decimals):', initialSupply.toString())

    // Create token - send 2 INJ as msg.value
    console.log('Calling createToken with:', { tokenName, ticker, decimalsNum, initialSupply: initialSupply.toString(), nativeValue: totalFee.toString() })
    const tx = await tokenFactory.createToken(
      tokenName,
      ticker,
      decimalsNum,
      initialSupply,
      { value: totalFee }
    )

    setTokenStatus({ type: 'pending', message: 'Transaction sent, waiting for confirmation...' })
    const receipt = await tx.wait()

    // Get the token address from the transaction receipt
    const tokenAddress = receipt.logs[0]?.address || ''
    console.log('Token created! Address:', tokenAddress, 'Receipt:', receipt)

    // Store the created token info for the modal
    const createdTokenInfo = {
      address: tokenAddress,
      name: tokenName,
      symbol: ticker,
      decimals: decimalsNum,
      supply: supply
    }
    setCreatedToken(createdTokenInfo)
    // Store verification data for manual verify button
    setVerifyData({
      contractAddress: tokenAddress,
      constructorArgs: [tokenName, ticker, decimalsNum, initialSupply.toString(), await signer.getAddress()]
    })
    setShowTokenModal(true)
    setTokenStatus({ type: 'success', message: `Token "${tokenName}" (${ticker}) created successfully!` })

    // Refresh wallet balance after token creation
    const updatedBalance = await provider.getBalance(await signer.getAddress())
    const formattedBalance = formatEther(updatedBalance)
    setWalletBalance(formatBalance(formattedBalance))
    console.log('Updated INJ Balance:', formattedBalance)

    // Clear form
    setTokenName('')
    setTicker('')
    setSupply('1000000')
    setDecimal('18')

  } catch (err: any) {
    console.error('Token creation failed:', err)
    setTokenStatus({ type: 'error', message: `Token creation failed: ${err.message || 'Unknown error'}` })
  } finally {
    setIsCreatingToken(false)
  }
}
```

</details>

### Understanding the Fee Structure

```typescript
const totalFee = await tokenFactory.TOTAL_FEE() // 2 INJ total
```

One simple fee:
- **2 INJ** - Total fee (1 INJ platform fee + 1 INJ bank module registration)

### Understanding the Supply Calculation

```typescript
const initialSupply = BigInt(supply) * BigInt(10 ** decimalsNum)
```

If user enters supply of `1000000` with `18` decimals:
- Actual minted amount = 1000000 × 10^18
- This gives the user 1,000,000.000000000000000000 tokens

### Testing Token Creation

1. Connect wallet
2. Fill in token details:
   - Name: "My Test Token"
   - Ticker: "MTT"
   - Supply: 1000000
   - Decimal: 18
3. Click "create token"
4. Approve transaction (2 INJ)
5. Wait for confirmation
6. Modal appears with token details!

---

## Adding Tokens to MetaMask

The final piece - let users add their created tokens to MetaMask with one click.

### Implementing Add to MetaMask

Add this function:

```typescript
const addToMetaMask = async () => {
  if (!createdToken) return

  try {
    await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: {
          address: createdToken.address,
          symbol: createdToken.symbol,
          decimals: createdToken.decimals,
        },
      },
    })
    console.log('Token added to MetaMask!')
  } catch (err) {
    console.error('Failed to add token to MetaMask:', err)
  }
}
```

### Connecting to the Button

Update the "Add to MetaMask" button in your modal to call this function:

```typescript
<button
  className="modal-btn add-wallet-btn"
  onClick={addToMetaMask}
>
  Add to MetaMask
</button>
```

### Testing the Complete Flow

1. Create a token
2. Modal appears
3. Click "Add to MetaMask"
4. MetaMask prompts to add token
5. Approve
6. Token now visible in MetaMask!

---

## Post-Creation Actions

After a token is created, two additional action buttons appear:

### View on Explorer

Opens the token's page on the Injective Blockscout explorer:

```typescript
const viewOnExplorer = () => {
  if (!createdToken) return;
  const url = `https://testnet.blockscout.injective.network/token/${createdToken.address}`;
  window.open(url, '_blank');
};
```

### Verify Contract

 contract verification via your local verification server:

```typescript
const verifyContract = async () => {
  if (!verifyData) return;
  setTokenStatus({ type: 'pending', message: 'Verifying contract...' });
  try {
    const resp = await fetch('http://localhost:3001/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(verifyData),
    });
    const result = await resp.json();
    if (result.success) {
      setTokenStatus({ type: 'success', message: 'Contract verified!' });
    } else {
      setTokenStatus({ type: 'error', message: `Verification failed: ${result.error}` });
    }
  } catch (e) {
    setTokenStatus({ type: 'error', message: `Verification request error: ${e}` });
  }
};
```

Add a state variable to store the verification data after token creation:

```typescript
const [verifyData, setVerifyData] = useState<{ contractAddress: string; constructorArgs: any[] } | null>(null);
```

After the token is created, store the verification data:

```typescript
setVerifyData({
  contractAddress: tokenAddress,
  constructorArgs: [tokenName, ticker, decimalsNum, initialSupply.toString(), await signer.getAddress()]
});
```

### Adding the Buttons to the UI

In your token creation card (after the status message), add the post-creation actions:

```tsx
{createdToken && (
  <div className="post-create-actions" style={{ marginTop: '16px' }}>
    <button className="action-btn" onClick={viewOnExplorer}>View on Explorer</button>
    <button className="action-btn" onClick={verifyContract}>Verify Contract</button>
  </div>
)}
```

---

## Congratulations! 🎉

You've built a complete Token Launcher DApp on Injective EVM!

### What You've Built

✅ Modern React + TypeScript interface  
✅ MetaMask integration with auto-network switching  
✅ Token creation with bank module integration  
✅ One-click MetaMask token addition  
✅ Real-time balance updates  
✅ Transaction status feedback  

### Testing Your Complete App

Run through the full flow:

1. **Connect** → Auto-switches network
2. **Create Token** → Deploy your ERC20 (costs 2 INJ)
3. **Add to MetaMask** → Track your new token
4. **See Balances** → All tokens visible in MetaMask

### Production Deployment

Build for production:

```bash
npm run build
```

Deploy the `dist` folder to Vercel, Netlify, or any static hosting.

### Next Steps

- Add token management UI (mint/burn)
- Build token explorer page
- Add analytics dashboard
- Implement token search
- Create token marketplace

Happy building! 🚀
