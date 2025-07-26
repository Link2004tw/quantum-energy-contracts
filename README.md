EnergyContract
Project Overview and Goals
EnergyContract is a Solidity smart contract designed to facilitate secure and transparent energy trading between a solar farm and authorized buyers on the Ethereum blockchain. The contract enables buyers to purchase energy (in kWh) using a commit-reveal scheme to ensure fairness and security. The accompanying Next.js frontend (solarfarm_ui) provides a user-friendly interface for buyers and admins to interact with the contract, integrated with Firebase for authentication and data storage. Key features include:

Energy Management: Allows the solar farm owner to add energy to the available pool with a delay (ADD_ENERGY_DELAY) for security, via addEnergy.
Commit-Reveal Purchases: Buyers commit to purchases with a hashed commitment (commitPurchase) and reveal details (revealPurchase) within a time window (COMMIT_REVEAL_WINDOW), preventing front-running.
Price Oracle Integration: Uses Chainlink’s ETH/USD price feed (AggregatorV3Interface) with a cached fallback (cachedEthPrice) to handle price feed failures and ensure accurate payment calculations.
Security Features: Incorporates OpenZeppelin’s Ownable, Pausable, and ReentrancyGuard to protect against unauthorized access, reentrancy attacks, and emergency pauses.
Refund Mechanism: Supports overpayment refunds via withdrawRefunds, secured by nonReentrant.
Frontend Interface: Provides a Next.js application (solarfarm_ui) with pages for login, purchasing energy, viewing orders, and admin actions (e.g., adding energy, updating prices).
Visual Documentation: Includes Mermaid diagrams (docs/diagrams/) to visualize contract flows, state transitions, and frontend user flows.

Goals

Provide a secure, gas-efficient platform for energy trading.
Ensure transparency through event emissions (EnergyPurchased, RefundWithdrawn, etc.).
Mitigate risks using security best practices (e.g., commit-reveal, reentrancy guards, price feed validation).
Facilitate development, testing, and user interaction with Hardhat, Remix, Next.js, Firebase, and AI-driven tools (e.g., Grok for component design).

Quick Start Guide
Prerequisites

Node.js: v18.x (LTS, e.g., v18.20.4). Install via nodejs.org or nvm:nvm install 18
nvm use 18


npm: v9.x or later (bundled with Node.js).
MetaMask: For Sepolia testnet deployment and frontend interaction (optional).
Infura/Alchemy: For Sepolia RPC URL (optional).
Firebase Account: For solarfarm_ui authentication and database.
VS Code: Recommended for Hardhat, Next.js, and Mermaid diagram rendering. Install extensions:
Solidity (juanblanco.solidity)
Prettier (esbenp.prettier-vscode)
ESLint (dbaeumer.vscode-eslint)
Hardhat (nomicfoundation.hardhat-vscode)
DotENV (mikestead.dotenv)
Mermaid Preview (bierner.markdown-mermaid)
Tailwind CSS IntelliSense (bradlc.vscode-tailwindcss)


Remix: Access at remix.ethereum.org for browser-based contract development.

Setup

Clone the Repository:

git clone <repository-url>
cd energy-contract


Install Backend Dependencies (Hardhat users):

npm install

  This installs hardhat@2.22.10, @nomicfoundation/hardhat-toolbox@5.0.0, @openzeppelin/contracts@5.0.2, @chainlink/contracts@0.8.0, dotenv@16.4.5, and chai@4.5.0.

Configure Backend Environment (Hardhat users):  Create a .env file in the project root:

SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here


Replace placeholders with your Infura/Alchemy URL, wallet private key, and Etherscan API key.
Ensure .env is in .gitignore.


Install Frontend Dependencies (solarfarm_ui):

cd solarfarm_ui
npm install

  This installs next@15.0.1, firebase@10.14.1, firebase-admin@12.5.0, tailwindcss@3.4.14, and other dependencies per solarfarm_ui/package.json.

Configure Frontend Environment (solarfarm_ui):  Create solarfarm_ui/.env:

NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-auth-domain.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your-database-name.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-storage-bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address
NEXT_PUBLIC_PRICE_FEED_ADDRESS=your_price_feed_address


Obtain Firebase credentials from console.firebase.google.com.
Update .gitignore to include solarfarm_ui/.env and solarfarm_ui/*.json.


Remix Setup:


Open remix.ethereum.org.
Upload contracts/EnergyContract.sol, contracts/MockV3Aggregator.sol, contracts/MaliciousContract.sol, and docs/diagrams/*.mmd.
Set Solidity compiler to 0.8.30 in the "Solidity Compiler" plugin.


Visualize Diagrams:


Open docs/diagrams/*.mmd in VS Code with the Mermaid Preview extension or paste into mermaid.live to render flowcharts and sequence diagrams.

Frontend Integration (solarfarm_ui)
The solarfarm_ui directory contains a Next.js application (v15.0.1) that serves as the frontend for EnergyContract, integrated with Firebase for authentication and Realtime Database, and Ethereum for contract interactions. It uses Tailwind CSS for styling and includes AI-generated components (e.g., via Grok).
Directory Structure
solarfarm_ui/
├── app/
│   ├── admin/
│   │   ├── add-energy/
│   │   │   ├── page.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   └── progress.module.css
│   │   ├── update-price/
│   │   │   └── page.jsx
│   │   ├── page.jsx
│   │   ├── TransactionItem.jsx
│   │   ├── TransactionList.jsx
│   ├── api/
│   │   ├── login/
│   │   │   └── route.js
│   │   ├── verify-role/
│   │   │   └── route.js
│   ├── buySolar/
│   │   └── page.jsx
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Card.jsx
│   │   │   ├── Model.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── SigningForm.jsx
│   │   ├── UI/
│   │   │   ├── NavLink.jsx
│   │   │   ├── PrimaryButton.jsx
│   │   │   ├── UnderlineButton.jsx
│   ├── login/
│   │   └── page.jsx
│   ├── orders/
│   │   ├── OrderItem.jsx
│   │   ├── OrdersList.jsx
│   │   └── page.jsx
│   ├── profile/
│   │   └── page.jsx
│   ├── signup/
│   │   └── page.jsx
│   ├── store/
│   │   └── index.jsx
│   ├── unauthorized/
│   │   └── page.jsx
│   ├── updateProfile/
│   │   └── page.jsx
│   ├── layout.jsx
│   ├── page.jsx
├── config/
│   ├── adminfirebase.js
│   ├── firebase.js
│   ├── MockPriceABI.json
│   ├── SolarFarmABI.json
├── models/
│   ├── commitedOrders.js
│   ├── transaction.js
│   ├── user.js
├── utils/
│   ├── contract.js
│   ├── databaseUtils.js
│   ├── tools.js
├── public/
│   ├── *.svg
│   ├── homeimage.jpeg
├── .env
├── firebase.json
├── tailwind.config.mjs
├── package.json

Key Features

User Flows: Supports login (/login), signup (/signup), purchasing energy (/buySolar), viewing orders (/orders), and profile updates (/updateProfile).
Admin Flows: Allows admins to add energy (/admin/add-energy), update prices (/admin/update-price), and view transactions (/admin with TransactionList.jsx).
Components: Reusable components like PrimaryButton.jsx, Navbar.jsx, and OrderItem.jsx enhance UI consistency.
Integration: Connects to EnergyContract via utils/contract.js and SolarFarmABI.json, and uses Firebase for authentication (config/firebase.js) and data storage (models/commitedOrders.js, models/transaction.js).
AI Assistance: Components and styles were designed with AI tools (e.g., Grok), ensuring rapid development with Tailwind CSS.

Setup Instructions

Firebase Configuration:


Create a Firebase project at console.firebase.google.com.
Enable Email/Password and Google authentication in Build > Authentication.
Create a Realtime Database in Build > Realtime Database with test mode rules:{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}


Download the service account key and save as solarfarm_ui/solarfarmsystem-firebase-adminsdk-fbsvc-b3714a635d.json, ensuring it’s in .gitignore.
Update solarfarm_ui/.env with Firebase credentials.


Run Frontend:

cd solarfarm_ui
npm run dev

  Access at http://localhost:3000.

Test Integration:


Verify login at /login and order submission at /buySolar.
Test admin actions at /admin/add-energy and /admin/update-price with an admin account.
Check Firebase Console for data in commitedOrders and transactions.

Testing Instructions
Directory Structure
project-root/
├── contracts/
│   ├── EnergyContract.sol
│   ├── MockV3Aggregator.sol
│   └── MaliciousContract.sol
├── scripts/
│   └── deploy.js
├── test/
│   ├── integration/
│   │   └── FullFlow.test.js
│   ├── security/
│   │   └── SecurityTests.test.js
│   ├── unit/
│   │   └── EnergyContract.test.js
├── docs/
│   └── diagrams/
│       ├── contract-flow.mmd
│       ├── contract-flow-security.mmd
│       ├── commit-reveal-state.mmd
│       ├── login-flow.mmd
│       ├── purchase-energy-flow.mmd
│       ├── add-energy-flow.mmd
│       ├── update-price-flow.mmd
├── solarfarm_ui/
│   ├── app/
│   ├── config/
│   ├── models/
│   ├── utils/
│   ├── public/
├── .env
├── hardhat.config.js
├── package.json

Test Suites

Unit Tests (test/unit/EnergyContract.test.js): Tests individual functions (authorizeParty, commitPurchase, revealPurchase, withdrawRefunds, addEnergy, updatePrice) and edge cases (e.g., invalid commitments, price feed failures).
Integration Tests (test/integration/FullFlow.test.js): Tests the full flow (requestAddEnergy → confirmAddEnergy → commitPurchase → revealPurchase) and pause functionality.
Security Tests (test/security/SecurityTests.test.js): Tests reentrancy attacks (via MaliciousContract.sol), unauthorized access, and price manipulation.
Frontend Tests: Not explicitly defined in solarfarm_ui, but manual testing via npm run dev verifies UI flows (login, purchase, admin actions).

Running Tests

Hardhat:


Compile contracts:npx hardhat compile


Run all tests:npx hardhat test


Run specific suites:npx hardhat test test/unit/EnergyContract.test.js
npx hardhat test test/integration/FullFlow.test.js
npx hardhat test test/security/SecurityTests.test.js




Remix:


Use the "Solidity Unit Testing" plugin to write and run tests.
Deploy contracts to the JavaScript VM or Hardhat node (http://127.0.0.1:8545).
Run "Solidity Static Analysis" and AI-driven analysis (via "Code Analysis" plugin) to detect vulnerabilities (e.g., reentrancy, access control issues).


Frontend:


Run npm run dev in solarfarm_ui and manually test flows:
Login: /login → /profile.
Purchase: /buySolar → /orders.
Admin: /admin/add-energy, /admin/update-price.


Use browser developer tools to inspect API calls (/api/login, /api/verify-role) and Firebase data.

Notes

Use hardhat-network-helpers for time manipulation (evm_increaseTime) in tests for ADD_ENERGY_DELAY and COMMIT_REVEAL_WINDOW.
Address the maxEthPriceUSD discrepancy in revealPurchase tests by updating EnergyContract.sol or tests.
Cross-reference security findings with Remix’s AI analysis and static analysis reports.
Validate frontend flows against sequence diagrams in docs/diagrams/.

Deployment Guide
Local Deployment

Start Hardhat Node (Hardhat users):

npx hardhat node


Deploy Contracts:


Hardhat:npx hardhat run scripts/deploy.js --network hardhat

Deploys MockV3Aggregator, EnergyContract, and optionally MaliciousContract.
Remix: Deploy to JavaScript VM or Hardhat node via "Deploy & Run Transactions" plugin, using 0.8.30 compiler.


Deploy Frontend:

cd solarfarm_ui
npm run build
npm run start

  Update solarfarm_ui/.env with local contract addresses from scripts/deploy.js.

Verify Deployment:


Check console output for contract addresses.
Test contract interactions via Hardhat console or Remix.
Access frontend at http://localhost:3000 and verify flows.

Sepolia Testnet Deployment

Configure Environment (Hardhat users):


Update .env with SEPOLIA_RPC_URL, PRIVATE_KEY, and ETHERSCAN_API_KEY.
Modify scripts/deploy.js to use Sepolia’s Chainlink ETH/USD price feed (0x694AA1769357215DE4FAC081bf1f309aDC325306).


Deploy Contracts:


Hardhat:npx hardhat run scripts/deploy.js --network sepolia


Remix: Use "Injected Web3" with MetaMask (Sepolia-funded account) and the correct price feed address.


Deploy Frontend:


Update solarfarm_ui/.env with Sepolia contract addresses.
Deploy to a hosting service (e.g., Vercel):cd solarfarm_ui
npm run build
vercel --prod




Verify on Etherscan:


Hardhat:npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <PRICE_FEED_ADDRESS> <SOLAR_FARM_ADDRESS>


Remix: Use the "Contract Verification" plugin with constructor arguments.

Visual Documentation
The docs/diagrams/ directory contains Mermaid diagrams to visualize contract and frontend flows:

Backend Diagrams:

contract-flow.mmd: Flowchart of the main contract functions (requestAddEnergy, commitPurchase, revealPurchase, etc.).
contract-flow-security.mmd: Flowchart highlighting security features (reentrancy guards, access controls).
commit-reveal-state.mmd: State diagram of the commit-reveal purchase process.


Frontend Diagrams:

login-flow.mmd: Sequence diagram for user login via /login with Firebase authentication (config/firebase.js, app/api/login/route.js).
purchase-energy-flow.mmd: Sequence diagram for purchasing energy via /buySolar, interacting with EnergyContract (utils/contract.js) and Firebase (models/commitedOrders.js).
add-energy-flow.mmd: Sequence diagram for admin adding energy via /admin/add-energy, using ProgressBar.jsx and EnergyContract.
update-price-flow.mmd: Sequence diagram for admin updating prices via /admin/update-price, updating EnergyContract and logging in Firebase (models/transaction.js).



Rendering Diagrams

Open *.mmd files in VS Code with the Mermaid Preview extension.
Paste into mermaid.live for online rendering.
Include in Markdown files (e.g., docs/ARCHITECTURE.md) with:```mermaid
<diagram-code>





Contributing Guidelines
How to Contribute

Fork the Repository:

git clone <your-forked-repo-url>
cd energy-contract


Create a Branch:

git checkout -b feature/your-feature-name


Make Changes:


Update contracts (contracts/), tests (test/), scripts (scripts/), frontend (solarfarm_ui/), or diagrams (docs/diagrams/).
Follow Solidity and JavaScript style guidelines, formatting with Prettier.
Update tests to cover new functionality or bug fixes.
Update Mermaid diagrams for contract or frontend changes.
Use AI tools (e.g., Grok) for component design or refactoring, ensuring manual validation.


Test Changes:


Run backend tests: npx hardhat test.
Test frontend flows: cd solarfarm_ui && npm run dev.
Use Remix’s AI and static analysis for contract security.
Validate diagrams render correctly using mermaid.live.


Commit and Push:

git commit -m "Add feature: your-feature-name"
git push origin feature/your-feature-name


Submit a Pull Request:


Open a PR against the main branch.
Include a clear description, referencing issues and updated diagrams.
Ensure tests pass and diagrams are current.

Code Standards

Use Solidity 0.8.30 and OpenZeppelin best practices for contracts.
Write modular tests with Mocha/Chai for backend.
Use React/Next.js conventions and Tailwind CSS for frontend.
Include custom errors in Solidity for gas efficiency (e.g., InvalidCommitmentHash).
Update diagrams (contract-flow.mmd, login-flow.mmd, etc.) for changes.

Issues and Bugs

Report issues via GitHub Issues with steps to reproduce and logs.
For security vulnerabilities, use Remix’s AI analysis or Slither before submitting.
Test frontend issues by inspecting API calls and Firebase data.

Community

Join discussions on the project’s GitHub Discussions page.
Contact maintainers for guidance on complex contributions.

Security Considerations

Backend:
Protect .env and solarfarm_ui/*.json with .gitignore.
Validate SolarFarmABI.json against EnergyContract.sol.
Test reentrancy, access control, and price feed edge cases (test/security/).


Frontend:
Secure Firebase credentials in solarfarm_ui/.env.
Enforce authentication rules in Firebase Console.
Validate admin actions via app/api/verify-role/route.js.


AI Usage: Manually review AI-generated code (e.g., OrderItem.jsx, ProgressBar.jsx) for consistency and security.
