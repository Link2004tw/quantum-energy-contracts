# Development Setup Guide for EnergyContract

This guide provides a comprehensive setup for developing, testing, and deploying the `EnergyContract` smart contract using Hardhat with the `@nomicfoundation/hardhat-toolbox` plugin and the Remix Solidity IDE with AI-powered security features. It also covers setting up a Next.js frontend in the `solarfarm_ui` directory with Firebase for authentication and Realtime Database, along with a detailed contract deployment guide. The guide includes IDE configuration, dependencies, local blockchain setup, testing environment, Firebase and Next.js setup, contract deployment guide, deployment process, professional QA process, and common troubleshooting issues to ensure developers can get productive quickly. The instructions are tailored to the provided project structure, ensuring secure handling of sensitive data (e.g., `.env`, `solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json`).

## IDE Configuration

### Recommended IDEs

- **Visual Studio Code (VS Code)**: A lightweight, extensible IDE for Solidity, JavaScript, and TypeScript development, ideal for Hardhat, Next.js, and Firebase integration.
- **Remix Solidity IDE**: A web-based IDE for Solidity development, offering AI-powered security analysis, static analysis, and easy contract compilation and deployment. Access at [remix.ethereum.org](https://remix.ethereum.org/).

### VS Code Extensions

For developers using VS Code, install the following extensions:

- **Solidity by Juan Blanco** (`juanblanco.solidity`): Provides syntax highlighting, code completion, and linting for Solidity.
- **Prettier** (`esbenp.prettier-vscode`): Formats code for consistency (supports Solidity with a plugin).
- **ESLint** (`dbaeumer.vscode-eslint`): Lints JavaScript/TypeScript files used in Hardhat scripts, tests, and Next.js.
- **Hardhat** (`nomicfoundation.hardhat-vscode`): Integrates Hardhat tasks and debugging, leveraging `hardhat-toolbox`.
- **DotENV** (`mikestead.dotenv`): Supports `.env` file syntax for environment variables.
- **Next.js** (`unvs.next-js`): Optional, provides Next.js-specific snippets and support.

### VS Code Settings

Add the following to your VS Code `settings.json` (accessed via `File > Preferences > Settings` or `Ctrl+,`):

```json
{
  "solidity.compileUsingRemoteVersion": "v0.8.30",
  "solidity.defaultCompiler": "remote",
  "editor.formatOnSave": true,
  "prettier.requireConfig": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[solidity]": {
    "editor.defaultFormatter": "juanblanco.solidity"
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[jsx]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "files.associations": {
    "*.sol": "solidity"
  }
}
```

- Ensures Solidity compiler version matches the contract (`^0.8.30`).
- Enables auto-formatting with Prettier for Solidity, JavaScript, TypeScript, and JSX files.
- Associates `.sol` files with Solidity.

### Remix Setup and AI Features

Remix is a browser-based IDE that simplifies Solidity development and provides powerful security analysis tools. To set up Remix for `EnergyContract`:

1. **Access Remix**:
   - Open [remix.ethereum.org](https://remix.ethereum.org/) in a modern browser (e.g., Chrome, Firefox).
   - Create a new workspace or import files from your local project (e.g., `contracts/EnergyContract.sol`, `contracts/MockV3Aggregator.sol`, `contracts/MaliciousContract.sol`).
2. **Configure Remix**:
   - **Solidity Compiler**: In the "Solidity Compiler" plugin, select version `0.8.30` to match the contract’s `pragma solidity ^0.8.30`.
   - **Environment**: Use the "JavaScript VM" for quick testing or connect to a Hardhat node (`http://localhost:9545`) via the "Web3 Provider" for local blockchain testing.
   - **File Explorer**: Upload or create `EnergyContract.sol`, `MockV3Aggregator.sol`, and `MaliciousContract.sol`.
3. **AI-Powered Security Analysis**:
   - **Remix Static Analysis**: Activate the "Solidity Static Analysis" plugin to detect vulnerabilities (e.g., reentrancy in `revealPurchase`, `withdrawRefunds`, unchecked external calls).
   - **AI Features**: Use Remix’s experimental AI-driven code analysis (via plugins like "Code Analysis" or third-party integrations) to:
     - Identify security threats (e.g., reentrancy, access control issues, arithmetic overflows).
     - Suggest gas optimizations for functions like `calculateRequiredPayment`.
     - Detect logical errors in the commit-reveal process.
   - **Usage**: Run AI analysis on `EnergyContract.sol` and review reports for warnings about reentrancy, access control, or price feed issues. Cross-reference with `test/security/SecurityTests.test.js`.
   - **Limitations**: AI features are experimental and may miss edge cases. Combine with static analysis and Hardhat tests for comprehensive coverage.
4. **Testing in Remix**:
   - Use the "Solidity Unit Testing" plugin to write and run simple tests, complementing Hardhat tests.
   - Deploy contracts to the JavaScript VM or Hardhat node to test interactions (e.g., `Authorize`, `commitPurchase`).

## Required Dependencies and Versions

Based on the project structure, the following dependencies are required:

### Node.js and npm

- **Node.js**: v18.x (LTS recommended, e.g., v18.20.5).
- **npm**: v8.x or later (bundled with Node.js).
- Install via [Node.js official site](https://nodejs.org/) or a version manager like `nvm`:

```bash
nvm install 18
nvm use 18
```

### Hardhat and Hardhat Toolbox

- **Hardhat**: v2.22.0 (based on project structure and typical `hardhat` dependency).
- **@nomicfoundation/hardhat-toolbox**: v5.0.0. This plugin bundles essential Hardhat plugins (`hardhat-ethers`, `hardhat-waffle`, `hardhat-chai-matchers`, `hardhat-network-helpers`, `hardhat-verify`) for streamlined development.
- Install:

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

### Solidity Compiler

- **Solc**: v0.8.30 (matches `pragma solidity ^0.8.30` in contracts).
- Installed automatically by Hardhat or Remix when compiling.

### OpenZeppelin Contracts

- **@openzeppelin/contracts**: v5.0.2 (used for `Ownable`, `Pausable`, `ReentrancyGuard` in `artifacts/@openzeppelin`).
- Install:

```bash
npm install  --save-dev @openzeppelin/contracts
```

### Chainlink Contracts

- **@chainlink/contracts**: v4.0.0 (based on `artifacts/@chainlink/contracts` for `AggregatorV3Interface` and `MockV3Aggregator`).
- Install:

```bash
npm install --save-dev @chainlink/contracts
```

### Uniswap Dependencies

- **@uniswap/**: Present in `.deps/npm/@uniswap`, likely for token or swap-related functionality (version not specified in structure, assume latest compatible).
- Install (example for Uniswap V3 SDK):

```bash
npm install --save-dev @uniswap/v3-sdk
```

### Frontend Dependencies (solarfarm_ui)

- **Next.js**: v15.0.1 (based on `solarfarm_ui/package.json` and build artifacts).
- **Firebase**: v10.14.1 (based on `solarfarm_ui/config/firebase.js`).
- **Firebase Admin**: v12.5.0 (for `solarfarm_ui/config/adminfirebase.js`).
- Install:

```bash
cd solarfarm_ui
npm install next firebase firebase-admin
```

### Other Dependencies

- **dotenv**: v16.4.5 (for managing environment variables in `.env`).

```bash
npm install --save-dev dotenv
```

- **chai**: v4.5.0 (for testing assertions, included via `hardhat-toolbox`).

```bash
npm install --save-dev chai
```

- **Tailwind CSS**: v3.x (based on `solarfarm_ui/tailwind.config.mjs`).

```bash
cd solarfarm_ui
npm install --save-dev tailwindcss
```

### Alternatively

You can clone the repo and use

```bash
npm install
```

and it will install all the packages from packages.json

### Project Setup

For Hardhat users, initialize a Hardhat project if not already set up:

```bash
npx hardhat init
```

Choose "Create a JavaScript project" and select the option to include `hardhat-toolbox`. Update `package.json`:

```json
{
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "@openzeppelin/contracts": "^5.0.2",
    "@chainlink/contracts": "^4.0.0",
    "@uniswap/v3-sdk": "^3.10.0",
    "hardhat": "^2.22.1",
    "dotenv": "^16.4.5",
    "chai": "^4.5.0"
  }
}
```

Run `npm install` in the project root. For `solarfarm_ui`, ensure `package.json` includes:

```json
{
  "dependencies": {
    "next": "15.0.1",
    "react": "^18",
    "react-dom": "^18",
    "firebase": "^10.14.1",
    "firebase-admin": "^12.5.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.10",
    "eslint": "^8",
    "eslint-config-next": "15.0.1",
    "postcss": "^8",
    "dotenv": "^16.4.5"
  }
}
```

Run `npm install` in `solarfarm_ui`. For Remix users, dependencies are not required as Remix handles compilation and deployment in-browser.

## Local Blockchain Setup (Hardhat Configuration)

### Hardhat Configuration File

Update `hardhat.config.js` in the project root:

```javascript
require("@nomicfoundation/hardhat-toolbox");

require("dotenv").config();

module.exports = {
  solidity: "0.8.30",
  networks: {
    hardhat: {
      hainId: 31337,
    },

    sepholia: {
      url:
        process.env.SEPOLIA_RPC_URL ||
        "https://sepolia.infura.io/v3/YOUR_PROJECT_ID",
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111,
    },

    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
  },
};
```

- **Solidity Version**: Matches `^0.8.30` for contract compatibility.
- **Optimizer**: Enabled with 200 runs for gas-efficient bytecode.
- **Hardhat Network**: Configured for local testing with generous gas limits and accounts.
- **Sepolia Network**: Configured for testnet deployment with automatic gas pricing.
- **Etherscan**: For contract verification via `hardhat-verify`.
- **Paths**: Matches project structure (`contracts/`, `test/`, `artifacts/`, `cache/`).

### Environment Variables

Create `.env` in the project root:

```plaintext
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

- Replace placeholders with your Infura/Alchemy URL, wallet private key, and Etherscan API key.
- Ensure `.gitignore` includes:

```plaintext
node_modules/
.env
cache/
artifacts/
solarfarm_ui/.env
solarfarm_ui/*.json
```

Remix users configure network settings in the "Deploy & Run Transactions" plugin.

### Starting the Local Blockchain

Run the Hardhat node:

```bash
npx hardhat node
```

This starts a local Ethereum blockchain at `http://127.0.0.1:8545` with 20 pre-funded accounts. Remix users connect to this via "Web3 Provider" or use the JavaScript VM.

## Firebase Setup

Firebase powers the `solarfarm_ui` frontend for authentication and Realtime Database. This section sets up Firebase, secures credentials (e.g., `solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json`), and integrates with Next.js.

### 1. Install Firebase Dependencies

In `solarfarm_ui`:

```bash
cd solarfarm_ui
npm install firebase firebase-admin
```

Update `solarfarm_ui/package.json`:

```json
{
  "dependencies": {
    "firebase": "^10.14.1",
    "firebase-admin": "^12.5.0"
  }
}
```

### 2. Create a Firebase Project

1. **Go to Firebase Console**:
   - Open [console.firebase.google.com](https://console.firebase.google.com/), sign in, and create a project (e.g., `solarfarmsystem`).
2. **Get Configuration**:
   - In **Project settings > General**, register a web app (`solarfarm-ui`).
   - Copy the `firebaseConfig` object (e.g., `apiKey`, `authDomain`).
3. **Add to Frontend**:
   - Update `solarfarm_ui/config/firebase.js`:
     ```javascript
     import { initializeApp } from "firebase/app";
     import { getAuth } from "firebase/auth";
     import { getDatabase } from "firebase/database";

     const firebaseConfig = {
       apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
       authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
       databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
       projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
       storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
       messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
       appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
     };

     const app = initializeApp(firebaseConfig);
     const auth = getAuth(app);
     const database = getDatabase(app);
     export { app, auth, database };
     ```
   - Create `solarfarm_ui/.env`:
     ```plaintext
     NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-database-name.firebaseio.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket.appspot.com
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
     NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
     ```

### 3. Enable Authentication

1. In Firebase Console, go to **Build > Authentication**, enable Email/Password and Google sign-in.
2. Integrate in `solarfarm_ui/app/login/page.jsx` and `solarfarm_ui/app/signup/page.jsx` using `signInWithEmailAndPassword` and `createUserWithEmailAndPassword`.

### 4. Enable Realtime Database

1. In Firebase Console, go to **Build > Realtime Database**, create a database in test mode.
2. Update security rules:

   ```json
   {
     "rules": {
       ".read": "auth != null",
       ".write": "auth != null"
     }
   }
   ```

3. Integrate in `solarfarm_ui/utils/databaseUtils.js` using `getDatabase` from `solarfarm_ui/config/firebase.js`.

### 5. Secure Service Account Credentials

The `solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json` file is sensitive. Secure it:

1.  **Download Key**:
    - In Firebase Console, go to **Project settings > Service accounts**, generate a new key.
2.  **Add to `.gitignore`**:

    ```plaintext
    solarfarm_ui/*.json
    ```

3.  **Use in Admin SDK**: - Update `solarfarm_ui/config/adminfirebase.js`:
    `plaintext
        FIREBASE_PROJECT_ID=your-project-id
        FIREBASE_PRIVATE_KEY=your-private-key
        FIREBASE_CLIENT_EMAIL=your-client-email
        FIREBASE_DATABASE_URL=https://your-database-name.firebaseio.com
        `
            ```javascript
    import { initializeApp, cert, getApps} from "firebase-admin/app";
    import { getAuth } from "firebase-admin/auth";
    import { configDotenv } from "dotenv";
    configDotenv();

if (!getApps().length) {
initializeApp({
credential: cert({
projectId: process.env.FIREBASE_PROJECT_ID,
clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
privateKey:
process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
}),
databaseURL: "https://solarfarmsystem-default-rtdb.firebaseio.com",
});
}

export const adminAuth = getAuth();

````
### 6. Test Firebase Integration

- Test authentication in `solarfarm_ui/app/login/page.jsx` and database access in `solarfarm_ui/app/orders/page.jsx`.
- Run:

```bash
cd solarfarm_ui
npm run dev
````

- Access `http://localhost:3000/login` and `http://localhost:3000/orders`.

## Next.js Setup for Frontend

The `solarfarm_ui` directory uses Next.js for the frontend, integrated with Firebase and the `EnergyContract` via `SolarFarmABI.json`.

### 1. Initialize Next.js

The project is already initialized. Verify `solarfarm_ui/package.json`:

```json
{
  "dependencies": {
    "next": "15.0.1",
    "react": "^18",
    "react-dom": "^18",
    "firebase": "^10.14.1",
    "firebase-admin": "^12.5.0"
  },
  "devDependencies": {
    "tailwindcss": "^3.4.10",
    "eslint": "^8",
    "eslint-config-next": "15.0.1",
    "postcss": "^8"
  }
}
```

### 2. Configure Contract Integration

1.  **Use ABIs**: - Go to remix ide and get the ABI for each contract - `solarfarm_ui/config/SolarFarmABI.json` and `MockPriceABI.json` are used for contract interactions. - Update `solarfarm_ui/utils/contract.js`: - update the contract addresses with the ones you get for when you deploy and get the network details from `hardhat.config.js`
            ```javascript
    import { ethers } from "ethers";
    import CONTRACT_ABI from "../config/SolarFarmABI.json";
    import MOCKPRICE_ABI from "../config/MockPriceABI.json";
    import { Transaction } from "@/models/transaction";

// Contract ABI and address (replace with your deployed address)
const CONTRACT_ADDRESS = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
// Update with your deployed EnergyContract address

const MOCKP_RICE_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
// Network configuration

const NETWORK_CONFIG = {

    hardhat: {
    	chainId: "31337",
    	rpcUrl: "http://127.0.0.1:8545",
    	chainName: "Hardhat",
    	currency: { name: "ETH", symbol: "ETH", decimals: 18 },
    	blockExplorerUrls: [],
    },

    sepolia: {

    	chainId: "11155111",
    	rpcUrl:
    	process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
    	"https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_ACCESS_KEY",
    	chainName: "Sepolia",
    	currency: { name: "ETH", symbol: "ETH", decimals: 18 },
    	blockExplorerUrls: ["https://sepolia.etherscan.io"],
    },

};

// Initialize contract

const getContract = async (
networkName = "hardhat",
address,
abi,
useSigner = false
) => {

    try {
    	let provider;
    	let signer;


    	if (useSigner && typeof window.ethereum !== "undefined") {
    	// MetaMask provider

    	provider = new ethers.BrowserProvider(window.ethereum);



    	await window.ethereum.request({ method: "eth_requestAccounts" });

    	signer = await provider.getSigner();

    	// Switch to the correct network

    	const network = await provider.getNetwork();

    	const targetConfig = NETWORK_CONFIG[networkName];

    	//console.log("Current network:", NETWORK_CONFIG);

    	if (network.chainId.toString() !== targetConfig.chainId) {

    	try {

    	await window.ethereum.request({

    	method: "wallet_switchEthereumChain",

    	params: [

    	{

    	chainId: `0x${parseInt(targetConfig.chainId, 10).toString(16)}`,

    	},

    	],

    	});

    	} catch (switchError) {

    	if (switchError.code === 4902) {

    	await window.ethereum.request({

    	method: "wallet_addEthereumChain",

    	params: [

    	{

    	chainId: `0x${parseInt(targetConfig.chainId, 10).toString(

    	16

    	)}`,

    	chainName: targetConfig.chainName,

    	rpcUrls: [targetConfig.rpcUrl],

    	nativeCurrency: targetConfig.currency,

    	blockExplorerUrls: targetConfig.blockExplorerUrls,

    	},

    	],

    	});

    	} else {

    	throw switchError;

    	}

    	}

    }

    return new ethers.Contract(address, abi, signer);

    } else {

    // RPC provider for read-only

    const targetConfig = NETWORK_CONFIG[networkName];

    provider = new ethers.JsonRpcProvider(targetConfig.rpcUrl);

    return new ethers.Contract(address, abi, provider);

    }

} catch (error) {

throw new Error(`Failed to initialize contract: ${error.message}`);

}

};

// Check if contract connection is successful

export const checkContractConnection = async (networkName = "hardhat") => {

try {

const contract = await getContract(

networkName,

CONTRACT_ADDRESS,

CONTRACT_ABI,

false

);

const provider = contract.runner.provider;

// Check provider connection

const network = await provider.getNetwork();

const targetConfig = NETWORK_CONFIG[networkName];

if (network.chainId.toString() !== targetConfig.chainId) {

throw new Error(

`Wrong network: expected chainId ${targetConfig.chainId}, got ${network.chainId}`

);

}

// Check if contract is deployed (has code at address)

const code = await provider.getCode(CONTRACT_ADDRESS);

if (code === "0x") {

throw new Error(`No contract deployed at address ${CONTRACT_ADDRESS}`);

}

// Test a simple read call to solarFarm()

const solarFarmAddress = await contract.solarFarm();

if (!ethers.isAddress(solarFarmAddress)) {

throw new Error(

`Invalid solarFarm address returned: ${solarFarmAddress}`

);

}

return {

isConnected: true,

message: `Successfully connected to EnergyContract at ${CONTRACT_ADDRESS} on ${targetConfig.chainName}`,

chainId: network.chainId.toString(),

solarFarmAddress,

};

} catch (error) {

return {

isConnected: false,

message: `Connection failed: ${error.message}`,

chainId: null,

solarFarmAddress: null,

};

}

};

// Call solarFarm()

export const getSolarFarm = async (networkName = "hardhat") => {

try {

const contract = await getContract(

networkName,

CONTRACT_ADDRESS,

CONTRACT_ABI,

false

);

const solarFarmAddress = await contract.solarFarm();

return solarFarmAddress;

} catch (error) {

throw new Error(`Error calling solarFarm: ${error.message}`);

}

};

// Call getLatestEthPrice()

export const getLatestEthPrice = async (networkName = "hardhat") => {

try {

// Use signer to call getLatestEthPrice as it updates the cache

const contract = await getContract(

networkName,

CONTRACT_ADDRESS,

CONTRACT_ABI,

true

);

//const tx =

await contract.getLatestEthPrice();

//await tx.wait(); // Wait for transaction to mine and update cache

const price = await contract.getCachedEthPrice();

return price.toString(); // Return as string to avoid BigInt issues

} catch (error) {

console.error("Error calling getLatestEthPrice:", error);

if (error.data) {

try {

const iface = new ethers.Interface(CONTRACT_ABI);

const decodedError = iface.parseError(error.data);

console.log(decodedError.args);

// throw new Error(

// `Contract error: ${decodedError.name} ${JSON.stringify(decodedError.args)}`

// );

} catch (decodeError) {

console.error("Could not decode revert reason:", decodeError);

}

}

throw new Error(`Error calling getLatestEthPrice: ${error.message}`);

}

};

export const getCost = async (amount, networkName = "hardhat") => {

try {

const contract = await getContract(

networkName,

CONTRACT_ADDRESS,

CONTRACT_ABI,

false

);

//console.log("Calculating cost for amount:", amount);

if (amount <= 0) {

throw new Error("Amount must be greater than zero");

}

const ethPrice = BigInt(parseInt(await getLatestEthPrice(networkName)));

const price = await contract.calculateRequiredPayment(

amount,

ethPrice / BigInt(1e10)

);

//console.log("Price in wei:", price.toString());

return ethers.formatUnits(price, 18); // Convert to ETH

} catch (error) {

throw new Error(`Error calculating cost: ${error.message}`);

}

};

export const getAvailableEnergy = async (networkName = "hardhat") => {

try {

const contract = await getContract(

networkName,

CONTRACT_ADDRESS,

CONTRACT_ABI,

false

);

//console.log("Fetching available energy...");

const energy = await contract.availableKWh();

return energy;

} catch (error) {

throw new Error(`Error fetching available energy: ${error.message}`);

}

};

const getHashedCommitment = (kWh, nonce, sender) => {

return ethers.keccak256(

ethers.solidityPacked(

["uint256", "uint256", "address"],

[kWh, nonce, sender]

)

);

};

// Derive a numeric nonce from Firebase UID

export const getNonceFromUid = (uid) => {

if (typeof uid !== "string" || uid.length === 0) {

throw new Error("Invalid Firebase UID");

}

// Hash the UID to a bytes32 value

const hash = ethers.keccak256(ethers.toUtf8Bytes(uid));

// Convert first 4 bytes of hash to a number

const hashNumber = Number(BigInt(hash.slice(0, 10)) & BigInt(0xffffffff));

// Scale to 5-digit range (10000 to 99999)

const nonce = 10000 + (hashNumber % 90000);

//console.log("Derived nonce from UID:", nonce);

return nonce.toString(); // Return as string

};

// grok fixed this function

export const commitPurchase = async (networkName = "hardhat", amount, user) => {

try {

if (amount > 1000) {

throw new Error("Amount cannot be bigger than 1000 kWh");

}

const contract = await getContract(

networkName,

CONTRACT_ADDRESS,

CONTRACT_ABI,

true

); // Use signer for transactions

//console.log("uid is ", user.\_uid, typeof user.\_uid);

const nonce = getNonceFromUid(user.\_uid); // Use \_uid for nonce

const hash = getHashedCommitment(amount, nonce, user.\_ethereumAddress); // Use uid instead of \_id

//console.log(hash);

const tx = await contract.commitPurchase(hash);

await tx.wait(); // Wait for transaction confirmation

//console.log(`Purchase committed: ${tx.hash}`);

return tx.hash;

} catch (error) {

throw new Error(`Error committing purchase: ${error.message}`);

}

};

export const getEthBalance = async (address, networkName = "hardhat") => {

try {

if (!ethers.isAddress(address)) {

throw new Error("Invalid Ethereum address");

}

const targetConfig = NETWORK_CONFIG[networkName];

const provider = new ethers.JsonRpcProvider(targetConfig.rpcUrl);

const balanceWei = await provider.getBalance(address);

const balanceEth = ethers.formatEther(balanceWei);

console.log(`ETH Balance for ${address}: ${balanceEth} ETH`);

return balanceEth;

} catch (error) {

console.error(`Error fetching ETH balance for ${address}:`, error.message);

throw new Error(`Failed to fetch ETH balance: ${error.message}`);

}

};

export const revealPurchase = async (networkName = "hardhat", amount, user) => {

try {

if (!amount || amount <= 0 || amount > 1000) {

throw new Error("Amount must be between 1 and 1000 kWh");

}

if (!user || !user.\_ethereumAddress) {

throw new Error("User Ethereum address is required");

}

console.log("error is not before here");

const contract = await getContract(

networkName,

CONTRACT_ADDRESS,

CONTRACT_ABI,

true

); // Use signer

const signer = await contract.runner.provider.getSigner();

const signerAddress = await signer.getAddress();

if (signerAddress.toLowerCase() !== user.\_ethereumAddress.toLowerCase()) {

throw new Error(

"Signer address does not match provided Ethereum address"

);

}

// Calculate required payment

await contract.getLatestEthPrice(); // Ensure the contract is ready

const ethPrice = await contract.getCachedEthPrice();

console.log("eth price in reveal purchase: ", ethPrice / BigInt(10e10));

const totalCostWei = await contract.calculateRequiredPayment(

amount,

ethPrice / BigInt(10e10)

);

// Call revealPurchase

const revealTx = await contract.revealPurchase(

amount,

getNonceFromUid(user.\_uid),

{

value: totalCostWei,

}

);

const receipt = await revealTx.wait();

return receipt.hash;

} catch (error) {

console.error("Error in revealPurchase:", error);

throw new Error(

error.reason || error.message || "Failed to reveal purchase"

);

}

};

// utils/contract.js

export const getTransactions = async (networkName = "hardhat") => {

try {

const contract = await getContract(

networkName,

CONTRACT_ADDRESS,

CONTRACT_ABI,

false // Read-only, no signer needed

);

// Get the total number of transactions

const transactionCount = await contract.transactionCount();

const transactionCountNum = Number(transactionCount); // Convert BigNumber to number

// Array to store transactions

const transactions = [];

// Loop through each transaction index

for (let i = 0; i < transactionCountNum; i++) {

try {

const tx = await contract.transactions(i);

transactions.push(

new Transaction({

index: i,

buyer: tx.buyer,

seller: tx.seller,

kWh: tx.kWh.toString(),

pricePerKWhUSD: tx.pricePerKWhUSD.toString(),

ethPriceUSD: tx.ethPriceUSD.toString(),

timestamp: Number(tx.timestamp),

})

);

} catch (error) {

console.error(`Error fetching transaction at index ${i}:`, error);

transactions.push(

new Transaction({

index: i,

error: `Failed to fetch transaction ${i}`,

})

);

}

}

return transactions;

} catch (error) {

console.error("Error fetching transactions:", error);

throw new Error(`Failed to fetch transactions: ${error.message}`);

}

};

export const checkIfAuthorized = async (user) => {

console.log("Checking if user is authorized:", user);

if (!user || !user.\_ethereumAddress) {

throw new Error(

"User is not authenticated or does not have an Ethereum address."

);

}

const contract = await getContract(

"hardhat",

CONTRACT_ADDRESS,

CONTRACT_ABI,

true

);

return await contract.authorizedParties(user.\_ethereumAddress);

};

// this is for testing purposes only. for admin use

export const getMockPrice = async () => {

const mockPriceContract = await getContract(

"hardhat",

MOCKP_RICE_ADDRESS,

MOCKPRICE_ABI,

false

);

return await mockPriceContract.latestRoundData();

};

export const updateAnswer = async (price, networkName = "hardhat") => {

const mockPriceContract = await getContract(

networkName,

MOCKP_RICE_ADDRESS,

MOCKPRICE_ABI,

true

);

const solarFarmContract = await getContract(

networkName,

CONTRACT_ADDRESS,

CONTRACT_ABI,

false

);

//const ethprice = await solarFarmContract.getCachedEthPrice();

await mockPriceContract.updateAnswer(price);

};

export const addEnergy = async (kwh, networkName = "hardhat") => {

try {

if (!kwh || kwh <= 0 || kwh > 1000) {

alert("kWh must be between 1 and 1000");

throw new Error("kWh must be between 1 and 1000");

}

const contract = await getContract(

networkName,

CONTRACT_ADDRESS,

CONTRACT_ABI,

true

);

const signer = await contract.runner.provider.getSigner();

const signerAddress = await signer.getAddress();

console.log(signerAddress);

const ownerAddress = await getSolarFarm();

console.log(ownerAddress);

if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {

alert("Only the contract owner (solar farm) can add energy");

throw new Error("Only the contract owner can add energy");

}

// Step 1: Request to add energy

const requestTx = await contract.requestAddEnergy(kwh);

await requestTx.wait();

console.log(`Energy add request submitted: ${requestTx.hash}`);

// Step 2: Wait for ADD_ENERGY_DELAY (2 minutes = 120,000 ms)

const ADD_ENERGY_DELAY = 2 _ 60 _ 1000; // 2 minutes in milliseconds

alert(

`Please wait 2 minutes before confirming the energy addition. Transaction hash: ${requestTx.hash}`

);

await new Promise((resolve) => setTimeout(resolve, ADD_ENERGY_DELAY));

// Step 3: Confirm adding energy

const confirmTx = await contract.confirmAddEnergy(kwh);

await confirmTx.wait();

console.log(`Energy added successfully: ${confirmTx.hash}`);

alert(

`Energy added successfully! ${kwh} kWh added to the pool. Transaction hash: ${confirmTx.hash}`

);

return {

requestTxHash: requestTx.hash,

confirmTxHash: confirmTx.hash,

};

} catch (error) {

console.error("Error adding energy:", error);

let errorMessage = error.reason || error.message || "Failed to add energy";

if (error.data) {

try {

const iface = new ethers.Interface(CONTRACT_ABI);

const decodedError = iface.parseError(error.data);

errorMessage = `${decodedError.name}: ${JSON.stringify(

decodedError.args

)}`;

} catch (decodeError) {

console.error("Could not decode revert reason:", decodeError);

}

}

alert(`Error adding energy: ${errorMessage}`);

throw new Error(`Error adding energy: ${errorMessage}`);

}

};
```

2. **Add Environment Variables**:
   - Update `solarfarm_ui/.env`:
     ```plaintext
     NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
     NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address
     NEXT_PUBLIC_PRICE_FEED_ADDRESS=your_price_feed_address
     ```

### 3. Run the Frontend

```bash
cd solarfarm_ui
npm run dev
```

Access `http://localhost:3000`.

## Testing Environment Setup

### Directory Structure

The project structure is:

```
solidity/
├── contracts/
│   ├── EnergyContract.sol
│   ├── MockV3Aggregator.sol
│   ├── MaliciousContract.sol
├── scripts/
│   ├── deploy.js
├── test/
│   ├── integration/
│   │   ├── FullFlow.test.js
│   ├── security/
│   │   ├── SecurityTests.test.js
│   ├── unit/
│   │   ├── EnergyContract.test.js
├── solarfarm_ui/
│   ├── app/
│   ├── config/
│   ├── public/
│   ├── utils/
│   ├── .env
├── .env
├── hardhat.config.js
├── package.json
```

### Running Tests

Compile and run tests:

```bash
npx hardhat compile
npx hardhat test
```

Run specific tests:

```bash
npx hardhat test test/unit/EnergyContract.test.js
```

## Deployment Process Step-by-Step

### 1. Compile Contracts

```bash
npx hardhat compile
```

### 2. Deploy Locally

Use `scripts/deploy.js`:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### 4. Verify on Sepolia

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Contract Deployment Guide

This section provides a detailed setup for deploying the `EnergyContract` smart contract to local and Sepolia networks, tailored to the project structure. It covers wallet setup, obtaining testnet ETH, configuring deployment scripts, and setting up a deployment pipeline.

### 1. Set Up a Wallet

1. **Create a Wallet**:
   - Use MetaMask or generate a wallet via Hardhat:
     ```bash
     npx hardhat accounts
     ```
   - Export the private key securely.
2. **Add to `.env`**:

   ```plaintext
   PRIVATE_KEY=your_private_key_here
   ```

   - Ensure `.gitignore` includes `.env`.

## Add them to MetaMask

You can add a custom network to MetaMask with the url of you current network and you can add the users by logging in using their private keys

### 2. Obtain Testnet ETH

1. **Use a Sepolia Faucet**:
   - [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
   - [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
   - Request 0.5–1 ETH.
2. **Verify Funds**:
   - Check on [Sepolia Etherscan](https://sepolia.etherscan.io/).

### 3. Configure RPC Providers

1. **Get RPC URL**:
   - Sign up at Infura/Alchemy for a Sepolia RPC URL.
2. **Add to `.env`**:

   ```plaintext
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   ```

### 4. Configure Etherscan API Key

1. **Get API Key**:
   - Register at [Etherscan](https://etherscan.io/register).
2. **Add to `.env`**:

   ```plaintext
   ETHERSCAN_API_KEY=your_etherscan_api_key_here
   ```

### 5. Create Deployment Scripts

1. **Update `deploy.js`**:

   ```javascript
   const { ethers } = require("hardhat");
   ```

const addEnergy = async (energyContract, signer, energy) => {

// Use the signer to connect to the contract

const contractWithSigner = energyContract.connect(signer);

// Request energy addition

await contractWithSigner.requestAddEnergy(energy);

// Advance blockchain time

const requestBlock = await ethers.provider.getBlock("latest");

const confirmTimestamp = requestBlock.timestamp + 120 + 1; // 2 minutes + 1 second

await ethers.provider.send("evm_setNextBlockTimestamp", [confirmTimestamp]);

await ethers.provider.send("evm_mine");

// Confirm energy addition

await contractWithSigner.confirmAddEnergy(energy);

};

async function main() {

const [deployer] = await ethers.getSigners();

console.log("Deploying contracts with account:", deployer.address);

// Deploy MockV3Aggregator for local testing

let priceFeedAddress;

const network = await ethers.provider.getNetwork();

console.log("Network chainId:", network.chainId);

// Hardhat local network

const MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");

const mockPriceFeed = await MockV3Aggregator.deploy(8, 2000 \* 10 \*\* 8); // 8 decimals, 2000 USD/ETH

await mockPriceFeed.waitForDeployment();

priceFeedAddress = await mockPriceFeed.getAddress();

console.log("MockV3Aggregator deployed to:", priceFeedAddress);

// Deploy EnergyContract

const EnergyContract = await ethers.getContractFactory("EnergyContract");

console.log("Deploying EnergyContract...");

const energyContract = await EnergyContract.deploy(

priceFeedAddress,

deployer.address,

{

gasLimit: 7000000,

}

);

await energyContract.waitForDeployment();

const contractAddress = await energyContract.getAddress();

console.log("EnergyContract deployed to:", contractAddress);

// Test solarFarm state variable

const solarFarm = await energyContract.solarFarm();

console.log("solarFarm address:", solarFarm);

console.log(deployer.address, "is the solarFarm address:", solarFarm === deployer.address);

await addEnergy(energyContract, deployer, 1000);

await addEnergy(energyContract, deployer, 1000);

console.log("EnergyContract deployed successfully!");

//console.log(await mockPriceFeed.latestRoundData());

// Test getLatestEthPrice

try {

//console.log(await energyContract.getLatestEthPrice2());

await energyContract.getLatestEthPrice();

const ethPrice = await energyContract.getCachedEthPrice();

console.log("ETH/USD price:", ethers.formatUnits(ethPrice, 8));

} catch (error) {

console.error("Error calling getLatestEthPrice:", error);

if (error.reason) {

console.error("Revert reason:", error.reason);

}

}

await energyContract.getLatestEthPrice();

const newPrice = await energyContract.getCachedEthPrice();

console.log("New ETH/USD price:", ethers.formatUnits(newPrice, 8));

//test cost calculation

const cost = await energyContract.calculateRequiredPayment(

12,

2000 \* 10 \*\* 8

);

console.log("Cost for 12 kWh at $2000/ETH:", ethers.formatUnits(cost, 18));

console.log("available energy:", await energyContract.availableKWh());

await energyContract.connect(deployer).authorizeParty("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");

console.log("Party authorized successfully");

console.log("Authorized parties count:", await energyContract.authorizedParties("0x70997970C51812dc3A010C7d01b50e0d17dc79C8"));

}

main()

.then(() => process.exit(0))

.catch((error) => {

console.error(error);

process.exit(1);

});
```

1. **Add Scripts to `package.json`**:

   ```json
   {
     "scripts": {
       "deploy:local": "npx hardhat run scripts/deploy.js --network hardhat",
       "deploy:sepolia": "npx hardhat run scripts/deploy-sepolia.js --network sepolia"
     }
   }
   ```

2. **Configure GitHub Actions**:
   - Create `.github/workflows/deploy.yml`:
     ```yaml
     name: Deploy to Sepolia

     on:
       push:
         branches: [main]

     jobs:
       deploy:
         runs-on: ubuntu-latest
         steps:
           - uses: actions/checkout@v3
           - name: Set up Node.js
             uses: actions/setup-node@v3
             with:
               node-version: 18
           - name: Install dependencies
             run: npm install
           - name: Compile contracts
             run: npx hardhat compile
           - name: Deploy to Sepolia
             run: npm run deploy:sepolia
             env:
               SEPOLIA_RPC_URL: ${{ secrets.SEPOLIA_RPC_URL }}
               PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
               ETHERSCAN_API_KEY: ${{ secrets.ETHERSCAN_API_KEY }}
     ```
   - Add secrets in GitHub repository settings.

### 7. Test Deployment

1. **Local**:

   ```bash
   npx hardhat node
   npm run deploy --network localhost
   ```

   - Check `solarfarm_ui/config/addresses.json`.

2. **Sepolia**:

   ```bash
   npm run deploy:sepolia
   ```

   - Verify on [Sepolia Etherscan](https://sepolia.etherscan.io/).

### 8. Troubleshooting

- **Invalid Private Key**: Verify `PRIVATE_KEY` in `.env`.
- **Insufficient Funds**: Request ETH from a faucet.
- **Verification Fails**: Check `ETHERSCAN_API_KEY` and constructor arguments.

## Professional QA Process

### 1. Critical Function

Test `revealPurchase` first due to its role in payment processing and Chainlink integration.

### 2. Attack Vector

Test reentrancy attacks on `revealPurchase` and `withdrawRefunds` using `MaliciousContract.sol`.

### 3. Price Feed Reliability

Use `MockV3Aggregator` to test valid/stale prices and verify `cachedEthPrice` fallback.

### 4. Network Congestion

Simulate delays with `evm_increaseTime` and test `COMMIT_REVEAL_WINDOW` expiration.

### 5. Payment Handling

Test partial/overpayments in `revealPurchase`, ensuring `pendingRefunds` updates and `withdrawRefunds` works.

## Common Troubleshooting Issues

- **Compilation Errors**: Ensure `solc` v0.8.30 and dependencies are installed.
- **Test Failures**: Verify `MockV3Aggregator` setup and gas limits.
- **Deployment Errors**: Check `.env` variables and wallet funds.
- **Firebase Issues**: Secure `solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json` and test authentication.
