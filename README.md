# Uranium Purchase DApp

## Overview

The Uranium Purchase DApp is a decentralized application built on Ethereum that enables authorized users to purchase uranium using a secure commit-reveal mechanism. The smart contract (`EnergyContract.sol`) integrates with Chainlink price feeds for ETH/USD and a custom uranium price oracle, ensuring accurate pricing. The frontend, built with Next.js and React, provides a user-friendly interface for submitting purchase commitments and revealing them within a time window. The system includes features like authorization management, refund handling, and transaction logging.

## Features

- **Commit-Reveal Purchase Mechanism**: Users commit to a purchase with a hashed commitment and reveal it within a 5-minute window to prevent front-running.
- **Price Oracles**: Uses Chainlink for ETH/USD prices and a custom `IUraniumPriceConsumer` for uranium prices (USD cents per pound).
- **Authorization System**: Only authorized parties (e.g., `solarFarm`, `testingAddress`) can purchase uranium.
- **Refund Management**: Handles overpayments with refund withdrawal functionality.
- **Frontend Interface**: A Next.js-based UI (`BuyUraniumPage.jsx`) for user interaction, including unit conversion (lbs/kg) and transaction confirmation modals.
- **Security**: Utilizes OpenZeppelin's `Pausable`, `Ownable`, and `ReentrancyGuard` for secure contract operations.

## Prerequisites

- **Node.js**: v16 or higher
- **MetaMask**: Browser extension for Ethereum wallet integration
- **Hardhat**: For contract compilation and deployment
- **Firebase**: For user authentication and order storage
- **Chainlink**: Access to ETH/USD price feed and uranium price oracle
- **Ethereum Network**: Access to a testnet (e.g., Sepolia) or mainnet
- **Dependencies**:
    - `@openzeppelin/contracts`: v4.x
    - `@chainlink/contracts`: v0.8
    - `ethers.js`: v5.x
    - `next`: v13.x
    - `react`: v18.x
    - `firebase`: v9.x

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-repo/uranium-purchase-dapp.git
cd uranium-purchase-dapp
```

### 2. Install Dependencies

#### Backend (Smart Contract)

```bash
cd contracts
npm install
```

#### Frontend

```bash
cd ../frontend
npm install
```

### 3. Configure Environment Variables

#### Smart Contract

Create a `.env` file in the `contracts` directory:

```
PRIVATE_KEY=your_wallet_private_key
RPC_URL=https://your.ethereum.node.url
PRICE_FEED_ADDRESS=chainlink_eth_usd_price_feed_address
URANIUM_PRICE_CONSUMER_ADDRESS=uranium_price_consumer_address
SOLAR_FARM_ADDRESS=solar_farm_address
TESTING_ADDRESS=testing_address
SUBSCRIPTION_ID=chainlink_subscription_id
DON_ID=chainlink_don_id
```

#### Frontend

Create a `.env.local` file in the `frontend` directory:

```
NEXT_PUBLIC_CONTRACT_ADDRESS=deployed_contract_address
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
```

### 4. Compile and Deploy Smart Contract

```bash
cd contracts
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
```

- Update `frontend/utils/contractConfig.js` with the deployed contract address and ABI.

### 5. Start the Frontend

```bash
cd ../frontend
npm run dev
```

- Open `http://localhost:3000` in a browser with MetaMask installed.

## Usage

1. **Connect Wallet**:
    
    - Connect MetaMask to the correct network (e.g., Sepolia).
    - Ensure the wallet address is authorized in the contract.
2. **Purchase Uranium**:
    
    - Navigate to the "Buy Uranium" page.
    - Enter the amount (in lbs or kg) and select the unit.
    - Click "Buy Uranium" to initiate a commitment.
    - Confirm the commitment in the modal (displays ETH and USD costs).
    - Within 5 minutes, confirm the reveal to finalize the purchase.
    - View transaction details in the success modal.
3. **Admin Functions** (Owner/Solar Farm):
    
    - Authorize/un-authorize parties using `authorizeParty`/`unAuthorizeParty`.
    - Update uranium price via `requestUraniumPriceUpdate` and `updateUraniumPrice`.
    - Add uranium to the contract with `requestAddUranium` and `confirmAddUranium`.
    - Withdraw funds using `withdrawFunds`.
4. **Error Handling**:
    
    - Ensure sufficient ETH for gas and uranium cost.
    - Check for authorization and commitment window (5 minutes).
    - Handle refunds via `withdrawRefunds` if overpaid.

## Smart Contract Details (`EnergyContract.sol`)

- **Path**: `contracts/EnergyContract.sol`
- **Key Functions**:
    - `commitPurchase(bytes32 _commitmentHash)`: Stores a hashed commitment for a purchase.
    - `revealPurchase(uint256 _uraniumPounds, uint256 _nonce, bytes32 _secret)`: Validates the commitment and processes the purchase.
    - `calculateRequiredPayment(uint256 _uraniumPounds, uint256 _ethPriceUSD)`: Computes the required ETH payment based on uranium and ETH prices.
    - `withdrawRefunds()`: Allows users to withdraw overpaid ETH.
    - `getAvailableUranium()`: Returns available uranium pounds.
- **Security Features**:
    - Uses `ReentrancyGuard` to prevent reentrancy attacks.
    - Enforces a 5-minute commit-reveal window and cooldown.
    - Validates uranium price staleness (1 hour) and ETH price staleness (15 minutes).
    - Restricts purchases to 100 pounds max per transaction.

## Frontend Details (`BuyUraniumPage.jsx`)

- **Path**: `frontend/pages/BuyUraniumPage.jsx`
- **Features**:
    - Unit conversion between lbs and kg (1 kg = 2.20462 lbs).
    - Modal-based confirmation for commit and reveal phases.
    - Integration with Firebase for user authentication and order storage.
    - Displays ETH/USD price and estimated costs using `ethers.formatEther`.
- **Key Functions**:
    - `commitPurchaseHandler`: Initiates the commit phase, calling `commitPurchase`.
    - `handleConfirmPurchase`: Handles the reveal phase, calling `revealPurchase`.
    - `convertUnit`: Converts between lbs and kg, rounding to integers for contract compatibility.

## Project Structure

```
uranium-purchase-dapp/
├── contracts/
│   ├── EnergyContract.sol
│   ├── scripts/
│   │   └── deploy.js
│   └── .env
├── frontend/
│   ├── pages/
│   │   └── BuyUraniumPage.jsx
│   ├── utils/
│   │   ├── userContract.js
│   │   ├── tools.js
│   │   └── contractConfig.js
│   ├── components/
│   │   ├── UI/PrimaryButton.jsx
│   │   ├── Layout/Card.jsx
│   │   └── Layout/Model.jsx
│   ├── config/
│   │   └── firebase.js
│   └── .env.local
└── README.md
```

## Testing

1. **Smart Contract**:
    
    - Use Hardhat to run tests:
        
        ```bash
        npx hardhat test
        ```
        
    - Test cases:
        - Commit-reveal flow with valid/invalid parameters.
        - Price staleness handling (ETH and uranium).
        - Authorization and refund functionality.
2. **Frontend**:
    
    - Test with MetaMask on Sepolia.
    - Verify unit conversion and modal displays.
    - Check error handling for unauthorized users, expired commitments, and insufficient funds.

## Known Issues

- **Price Staleness**: If Chainlink or uranium price feeds are stale, the contract uses a fallback price (1200 USD cents/lb).
- **Commitment Expiry**: Users must reveal within 5 minutes, or the commitment expires.
- **Precision**: ETH calculations use 18-decimal precision; ensure frontend displays match using `ethers.formatEther`.

## Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/your-feature`).
3. Commit changes (`git commit -m "Add your feature"`).
4. Push to the branch (`git push origin feature/your-feature`).
5. Open a pull request.

## License

MIT License. See `LICENSE` for details.