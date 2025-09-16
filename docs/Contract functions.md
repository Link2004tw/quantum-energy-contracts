# Contract Functions Documentation for EnergyContract Application

This document provides comprehensive documentation for the contract-related functions in the EnergyContract application, implemented in `adminContract.js`, `userContract.js`, and `contractUtils.js`. These functions interact with the `EnergyContract` smart contract deployed on the Sepolia testnet (or Hardhat for local testing) and are designed to be used server-side within API routes or server actions in a Next.js application. The functions enable functionalities such as adding uranium, managing party authorizations, controlling contract state, processing uranium purchases, retrieving blockchain data, and managing uranium price updates. Each function is described with its purpose, parameters, return values, error conditions, and usage examples, tailored for frontend developers integrating these functions into server-side logic.

## Table of Contents

- [[#addUranium]]
- [[#authorizeParty]]
- [[#unauthorizeParty]]
- [[#pauseContract]]
- [[#unpauseContract]]
- [[#getTransactions]]
- [[#commitPurchase]]
- [[#revealPurchase]]
- [[#checkContractConnection]]
- [[#getSolarFarm]]
- [[#getLatestEthPriceWC]]
- [[#getAvailableUranium]]
- [[#checkIfAuthorized]]
- [[#getEthBalance]]
- [[#convertEthToUsd]]
- [[#getCost]]
- [[#getHashedCommitment]]
- [[#getNonceFromUid]]
- [[#requestUraniumPriceUpdate]]
- [[#updateUraniumPrice]]
- [[#getUraniumPriceInfo]]
- [[#setUraniumPriceConsumer]]

## addUranium

### Purpose and Use Cases

Allows the contract owner (solar farm address) to add uranium to the `EnergyContract` smart contract by calling `requestAddUranium` and `confirmAddUranium` with a 2-minute delay. Used by admins to increase the available uranium (pounds) in the contract for purchase. Requires a signed transaction and ownership verification.

### Parameters

- `pounds` (`number`): Amount of uranium to add (1–100 pounds).

### Return Values

- **Success**:
    
    ```json
    {
      requestTxHash: string,
      confirmTxHash: string
    }
    ```
    
- **Error**: Throws `Error` with a message describing the failure (e.g., "Pounds must be between 1 and 100", "Only the contract owner can add uranium", or custom contract errors).
    

### Error Conditions

- Throws `Error` if `pounds` is not a number, ≤ 0, or > 100 (`MAX_URANIUM_POUNDS_PER_PURCHASE`).
- Throws `Error` if the signer address does not match the contract’s `solarFarm` address.
- Throws custom errors from `handleContractError`, such as:
    - `InsufficientUraniumAvailable`: If `pounds` is zero or exceeds 100.
    - `DelayNotElapsed`: If the 2-minute delay (`ADD_ENERGY_DELAY`) is not respected.
    - `NoPendingRequest`: If no prior request exists.
    - `OwnableUnauthorizedAccount`: If the caller is not the contract owner.
    - `EnforcedPause`: If the contract is paused.
- Throws `Error` for transaction failures (e.g., insufficient funds, network issues).

### Usage Example

```javascript
// Server-side: Add uranium to the contract
import { addUranium } from './adminContract';

async function handleAddUranium(pounds) {
  try {
    const result = await addUranium(pounds);
    console.log(result); // { requestTxHash: "0x123...", confirmTxHash: "0x456..." }
    return result;
  } catch (error) {
    console.error('Error adding uranium:', error.message);
    throw error;
  }
}
```

## authorizeParty

### Purpose and Use Cases

Authorizes an Ethereum address to interact with the `EnergyContract` by calling `authorizeParty`. Used by admins to grant users permission to purchase uranium. Requires a signed transaction and admin privileges.

### Parameters

- `address` (`string`): Ethereum address to authorize.

### Return Values

- **Success**: `string` (transaction hash).
- **Error**: Throws `Error` with a message describing the failure (e.g., "Invalid Ethereum address", or custom contract errors).

### Error Conditions

- Throws `Error` if `address` is not a valid Ethereum address (checked via `ethers.isAddress`).
- Throws custom errors from `handleContractError`, such as:
    - `InvalidPartyAddress`: If `address` is the zero address.
    - `PartyAlreadyAuthorized`: If the address is already authorized.
    - `MaxAuthorizedPartiesReached`: If the maximum number of authorized parties (100) is reached.
    - `OwnableUnauthorizedAccount`: If the caller is not the contract owner.
    - `EnforcedPause`: If the contract is paused.
- Throws `Error` for transaction failures (e.g., insufficient funds).

### Usage Example

```javascript
// Server-side: Authorize a party
import { authorizeParty } from './adminContract';

async function handleAuthorizeParty(address) {
  try {
    const txHash = await authorizeParty(address);
    console.log(txHash); // "0x123..."
    return txHash;
  } catch (error) {
    console.error('Error authorizing party:', error.message);
    throw error;
  }
}
```

## unauthorizeParty

### Purpose and Use Cases

Revokes authorization for an Ethereum address to interact with the `EnergyContract` by calling `unAuthorizeParty`. Used by admins to remove user permissions. Requires a signed transaction and admin privileges.

### Parameters

- `address` (`string`): Ethereum address to unauthorize.

### Return Values

- **Success**: `string` (transaction hash).
- **Error**: Throws `Error` with a message describing the failure (e.g., "Invalid Ethereum address", or custom contract errors).

### Error Conditions

- Throws `Error` if `address` is not a valid Ethereum address.
- Throws custom errors from `handleContractError`, such as:
    - `PartyNotAuthorized`: If the address is not authorized.
    - `PartyNotFoundInList`: If the address is not in the authorized list.
    - `OwnableUnauthorizedAccount`: If the caller is not the contract owner.
    - `EnforcedPause`: If the contract is paused.
- Throws `Error` for transaction failures (e.g., insufficient funds).

### Usage Example

```javascript
// Server-side: Unauthorize a party
import { unauthorizeParty } from './adminContract';

async function handleUnauthorizeParty(address) {
  try {
    const txHash = await unauthorizeParty(address);
    console.log(txHash); // "0x123..."
    return txHash;
  } catch (error) {
    console.error('Error unauthorizing party:', error.message);
    throw error;
  }
}
```

## pauseContract

### Purpose and Use Cases

Pauses the `EnergyContract` smart contract by calling `pause`, preventing most interactions (e.g., purchases, uranium additions). Used by admins to temporarily halt contract operations for maintenance or emergency purposes. Requires a signed transaction and admin privileges.

### Parameters

- None.

### Return Values

- **Success**: `string` (transaction hash).
- **Error**: Throws `Error` with a message describing the failure (e.g., custom contract errors).

### Error Conditions

- Throws custom errors from `handleContractError`, such as:
    - `OwnableUnauthorizedAccount`: If the caller is not the contract owner.
    - `EnforcedPause`: If the contract is already paused.
- Throws `Error` for transaction failures (e.g., insufficient funds).

### Usage Example

```javascript
// Server-side: Pause the contract
import { pauseContract } from './adminContract';

async function handlePauseContract() {
  try {
    const txHash = await pauseContract();
    console.log(txHash); // "0x123..."
    return txHash;
  } catch (error) {
    console.error('Error pausing contract:', error.message);
    throw error;
  }
}
```

## unpauseContract

### Purpose and Use Cases

Unpauses the `EnergyContract` smart contract by calling `unpause`, restoring normal operations. Used by admins to resume contract interactions after a pause. Requires a signed transaction and admin privileges.

### Parameters

- None.

### Return Values

- **Success**: `string` (transaction hash).
- **Error**: Throws `Error` with a message describing the failure (e.g., custom contract errors).

### Error Conditions

- Throws custom errors from `handleContractError`, such as:
    - `ExpectedPause`: If the contract is not paused.
    - `OwnableUnauthorizedAccount`: If the caller is not the contract owner.
- Throws `Error` for transaction failures (e.g., insufficient funds).

### Usage Example

```javascript
// Server-side: Unpause the contract
import { unpauseContract } from './adminContract';

async function handleUnpauseContract() {
  try {
    const txHash = await unpauseContract();
    console.log(txHash); // "0x123..."
    return txHash;
  } catch (error) {
    console.error('Error unpausing contract:', error.message);
    throw error;
  }
}
```

## getTransactions

### Purpose and Use Cases

Fetches all uranium purchase transactions recorded in the `EnergyContract` smart contract. Used by admins to audit or retrieve transaction history, including details like buyer address, uranium pounds, price per pound, ETH price, and timestamp. Requires admin privileges.

### Parameters

- None.

### Return Values

- **Success**:
    
    ```json
    [
      {
        index: number,
        buyer: string,
        uraniumPounds: string,
        pricePerPoundUSD: string,
        ethPriceUSD: string,
        uraniumPriceUSD: string,
        timestamp: number
      }
    ]
    ```
    
- **Error**: Throws `Error` with a message describing the failure (e.g., custom contract errors).
    

### Error Conditions

- Throws custom errors from `handleContractError`, such as `InvalidTransactionID` for invalid transaction indices.
- Throws `Error` if the contract query fails (e.g., network issues, invalid contract address).

### Usage Example

```javascript
// Server-side: Fetch all transactions
import { getTransactions } from './adminContract';

async function handleGetTransactions() {
  try {
    const transactions = await getTransactions();
    console.log(transactions);
    // Example output:
    // [
    //   {
    //     index: 0,
    //     buyer: "0x123...",
    //     uraniumPounds: "50",
    //     pricePerPoundUSD: "1200",
    //     ethPriceUSD: "2000",
    //     uraniumPriceUSD: "1200",
    //     timestamp: 1698768000000
    //   }
    // ]
    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error.message);
    throw error;
  }
}
```

## commitPurchase

### Purpose and Use Cases

Initiates a commitment to purchase uranium from the `EnergyContract` by calling `commitPurchase` with a hashed commitment generated using `getHashedCommitment`. Used by authorized users to lock in a purchase intent. Requires a signed transaction and user authorization.

### Parameters

- `amount` (`number`): Amount of uranium to commit (1–100 pounds).
- `user` (`object`): User object with `_uid` (string) and `_ethereumAddress` (string).
- `secret` (`string`): Secret string used in the commitment hash.

### Return Values

- **Success**: `string` (transaction hash).
- **Error**: Throws `Error` with a message describing the failure (e.g., "Amount cannot be bigger than 100 pounds", or custom contract errors).

### Error Conditions

- Throws `Error` if `amount` is not a number, ≤ 0, or > 100.
- Throws `Error` if `user._uid`, `user._ethereumAddress`, or `secret` is missing or invalid.
- Throws custom errors from `handleContractError`, such as:
    - `PartyNotAuthorized`: If the user’s address is not authorized.
    - `CommitmentCooldownActive`: If a cooldown is active from a previous commitment.
    - `InvalidCommitmentHash`: If the generated hash is invalid.
    - `EnforcedPause`: If the contract is paused.
- Throws `Error` for transaction failures (e.g., insufficient funds).

### Usage Example

```javascript
// Server-side: Commit to a uranium purchase
import { commitPurchase } from './userContract';

async function handleCommitPurchase(amount, user, secret) {
  try {
    const txHash = await commitPurchase(amount, user, secret);
    console.log(txHash); // "0x123..."
    return txHash;
  } catch (error) {
    console.error('Error committing purchase:', error.message);
    throw error;
  }
}
```

## revealPurchase

### Purpose and Use Cases

Completes a uranium purchase by revealing the commitment details and sending payment via `revealPurchase`. Attempts to withdraw any pending refunds using `withdrawRefunds`. Used by authorized users to finalize uranium purchases. Requires a signed transaction with sufficient ETH and user authorization.

### Parameters

- `amount` (`number`): Amount of uranium to purchase (1–100 pounds).
- `user` (`object`): User object with `_uid` (string) and `_ethereumAddress` (string).
- `secret` (`string`): Secret string used in the commitment hash.

### Return Values

- **Success**:
    
    ```json
    {
      txHash: string,
      nonce: number
    }
    ```
    
- **Error**: Throws `Error` with a message describing the failure (e.g., "Amount must be between 1 and 100 pounds", or custom contract errors).
    

### Error Conditions

- Throws `Error` if `amount` is not a number, ≤ 0, or > 100.
- Throws `Error` if `user._uid`, `user._ethereumAddress`, or `secret` is missing or invalid.
- Throws `Error` if the signer address does not match `user._ethereumAddress`.
- Throws custom errors from `handleContractError`, such as:
    - `InsufficientUraniumAvailable`: If requested pounds exceed available uranium.
    - `PaymentAmountTooSmall`: If sent ETH is insufficient.
    - `CommitmentExpired`: If the commitment has expired.
    - `InvalidCommitment`: If commitment parameters don’t match the hash.
    - `PartyNotAuthorized`: If the user’s address is not authorized.
    - `PriceFeedStale`: If the ETH price feed is stale.
    - `InvalidEthPrice`: If no valid ETH price is available.
    - `EnforcedPause`: If the contract is paused.
    - `NoRefundsAvailable`: If no refunds are available during `withdrawRefunds`.
- Throws `Error` for transaction failures (e.g., insufficient funds).

### Usage Example

```javascript
// Server-side: Reveal and complete a uranium purchase
import { revealPurchase } from './userContract';

async function handleRevealPurchase(amount, user, secret) {
  try {
    const result = await revealPurchase(amount, user, secret);
    console.log(result); // { txHash: "0x123...", nonce: 12345 }
    return result;
  } catch (error) {
    console.error('Error revealing purchase:', error.message);
    throw error;
  }
}
```

## checkContractConnection

### Purpose and Use Cases

Verifies the connection to the `EnergyContract` smart contract, checking network compatibility (Sepolia or Hardhat), contract deployment, and the validity of the `solarFarm` address. Used to ensure the contract is accessible before performing operations.

### Parameters

- None.

### Return Values

- **Success**:
    
    ```json
    {
      isConnected: boolean,
      message: string,
      chainId: string | null,
      solarFarmAddress: string | null
    }
    ```
    
- **Error**: Throws `Error` with a message describing the failure (e.g., "Wrong network", "No contract deployed").
    

### Error Conditions

- Throws `Error` if the network chain ID does not match the expected chain ID (Sepolia: 11155111, Hardhat: 31337).
- Throws `Error` if no contract is deployed at `CONTRACT_ADDRESS` (0x5699F43e635C35A33051e64ecbB5c8245241Bc2F).
- Throws `Error` if the `solarFarm` address returned by the contract is invalid (checked via `ethers.isAddress`).

### Usage Example

```javascript
// Server-side: Check contract connection
import { checkContractConnection } from './contractUtils';

async function handleCheckContractConnection() {
  try {
    const result = await checkContractConnection();
    console.log(result);
    // Example output:
    // {
    //   isConnected: true,
    //   message: "Successfully connected to EnergyContract at 0x5699... on Sepolia",
    //   chainId: "11155111",
    //   solarFarmAddress: "0x789..."
    // }
    return result;
  } catch (error) {
    console.error('Error checking contract connection:', error.message);
    throw error;
  }
}
```

## getSolarFarm

### Purpose and Use Cases

Retrieves the `solarFarm` address (contract owner) from the `EnergyContract` by calling `solarFarm`. Used to verify the owner address for admin operations, such as checking eligibility to add uranium.

### Parameters

- None.

### Return Values

- **Success**: `string` (the solar farm address).
- **Error**: Throws `Error` with a message describing the failure (e.g., "Invalid solarFarm address returned").

### Error Conditions

- Throws `Error` if the contract query fails.
- Throws `Error` if the returned `solarFarm` address is invalid (checked via `ethers.isAddress`).

### Usage Example

```javascript
// Server-side: Fetch the solar farm address
import { getSolarFarm } from './contractUtils';

async function handleGetSolarFarm() {
  try {
    const address = await getSolarFarm();
    console.log(address); // "0x789..."
    return address;
  } catch (error) {
    console.error('Error fetching solar farm address:', error.message);
    throw error;
  }
}
```

## getLatestEthPriceWC

### Purpose and Use Cases

Fetches the latest ETH/USD price from the `EnergyContract` using `getLatestEthPriceWithoutCaching`. Used to display current ETH prices for cost calculations, such as estimating purchase costs.

### Parameters

- None.

### Return Values

- **Success**: `number` (ETH price in USD).
- **Error**: Throws `Error` with a message describing the failure (e.g., custom contract errors).

### Error Conditions

- Throws custom errors from `handleContractError`, such as:
    - `PriceFeedStale`: If the price feed is outdated.
    - `InvalidEthPrice`: If the price data is invalid.
- Throws `Error` if the contract query fails (e.g., network issues, invalid contract address).

### Usage Example

```javascript
// Server-side: Fetch the latest ETH price
import { getLatestEthPriceWC } from './contractUtils';

async function handleGetLatestEthPriceWC() {
  try {
    const price = await getLatestEthPriceWC();
    console.log(price); // 2000
    return price;
  } catch (error) {
    console.error('Error fetching ETH price:', error.message);
    throw error;
  }
}
```

## getAvailableUranium

### Purpose and Use Cases

Fetches the available uranium (pounds) in the `EnergyContract` using `getAvailableUranium`. Used to display the current uranium pool, helping users determine how much uranium is available for purchase.

### Parameters

- None.

### Return Values

- **Success**: `string` (available pounds).
- **Error**: Throws `Error` with a message describing the failure.

### Error Conditions

- Throws `Error` if the contract query fails (e.g., network issues, invalid contract address).

### Usage Example

```javascript
// Server-side: Fetch available uranium
import { getAvailableUranium } from './contractUtils';

async function handleGetAvailableUranium() {
  try {
    const availablePounds = await getAvailableUranium();
    console.log(availablePounds); // "100"
    return availablePounds;
  } catch (error) {
    console.error('Error fetching available uranium:', error.message);
    throw error;
  }
}
```

## checkIfAuthorized

### Purpose and Use Cases

Checks if a user’s Ethereum address is authorized to interact with the `EnergyContract` by calling `checkAuthState`. Used to verify user permissions before allowing purchase-related actions.

### Parameters

- `user` (`object`): User object with `_uid` (string) and `_ethereumAddress` (string).

### Return Values

- **Success**: `boolean` (true if authorized, false otherwise).
- **Error**: Throws `Error` with a message describing the failure (e.g., "User is not authenticated or does not have an Ethereum address").

### Error Conditions

- Throws `Error` if `user._uid` or `user._ethereumAddress` is missing or invalid.
- Throws custom errors from `handleContractError`, such as `InvalidPartyAddress`.
- Throws `Error` if the contract query fails.

### Usage Example

```javascript
// Server-side: Check if user is authorized
import { checkIfAuthorized } from './contractUtils';

async function handleCheckIfAuthorized(user) {
  try {
    const isAuthorized = await checkIfAuthorized(user);
    console.log(isAuthorized); // true
    return isAuthorized;
  } catch (error) {
    console.error('Error checking authorization:', error.message);
    throw error;
  }
}
```

## getEthBalance

### Purpose and Use Cases

Fetches the Ethereum balance of a specified address using the provider’s `getBalance` method. Used to display a user’s ETH balance, ensuring they have sufficient funds for transactions like uranium purchases.

### Parameters

- `address` (`string`): Ethereum address to check the balance for.

### Return Values

- **Success**: `string` (balance in ETH).
- **Error**: Throws `Error` with a message describing the failure (e.g., "Invalid Ethereum address").

### Error Conditions

- Throws `Error` if `address` is not a valid Ethereum address (checked via `ethers.isAddress`).
- Throws `Error` if the balance query fails (e.g., network issues).

### Usage Example

```javascript
// Server-side: Fetch ETH balance
import { getEthBalance } from './contractUtils';

async function handleGetEthBalance(address) {
  try {
    const balance = await getEthBalance(address);
    console.log(balance); // "1.23456"
    return balance;
  } catch (error) {
    console.error('Error fetching ETH balance:', error.message);
    throw error;
  }
}
```

## convertEthToUsd

### Purpose and Use Cases

Converts an ETH amount to USD using the current ETH/USD price from `getLatestEthPriceWC`. Used to display transaction costs in USD for user purchases, enhancing user experience by providing fiat-based cost context.

### Parameters

- `amount` (`string | number`): Amount of ETH to convert (e.g., "0.05").

### Return Values

- **Success**:
    
    ```json
    {
      ethAmount: string,
      usdAmount: string,
      ethPriceInUsd: string
    }
    ```
    
- **Error**: Throws `Error` with a message describing the failure (e.g., "ETH amount must be a valid number greater than zero").
    

### Error Conditions

- Throws `Error` if `amount` is not a number or ≤ 0.
- Throws custom errors from `handleContractError`, such as `PriceFeedStale` or `InvalidEthPrice`.
- Throws `Error` if the price fetch fails.

### Usage Example

```javascript
// Server-side: Convert ETH to USD
import { convertEthToUsd } from './contractUtils';

async function handleConvertEthToUsd(amount) {
  try {
    const result = await convertEthToUsd(amount);
    console.log(result); // { ethAmount: "0.05", usdAmount: "100.00", ethPriceInUsd: "2000.00" }
    return result;
  } catch (error) {
    console.error('Error converting ETH to USD:', error.message);
    throw error;
  }
}
```

## getCost

### Purpose and Use Cases

Calculates the required payment in ETH for purchasing a specified amount of uranium using `calculateRequiredPayment`. Used to display the cost of a uranium purchase before committing, helping users plan transactions.

### Parameters

- `amount` (`number`): Amount of uranium to purchase (1–100 pounds).

### Return Values

- **Success**: `string` (cost in ETH, formatted to 6 decimal places).
- **Error**: Throws `Error` with a message describing the failure (e.g., "Uranium amount must be a valid number greater than zero").

### Error Conditions

- Throws `Error` if `amount` is not a number, ≤ 0, or > 100.
- Throws custom errors from `handleContractError`, such as:
    - `InsufficientUraniumAvailable`: If `amount` exceeds the maximum (100 pounds).
    - `InvalidPriceBounds`: If the ETH price is outside 100–10,000 USD.
- Throws `Error` if the cost calculation fails (e.g., network issues).

### Usage Example

```javascript
// Server-side: Calculate purchase cost
import { getCost } from './contractUtils';

async function handleGetCost(amount) {
  try {
    const cost = await getCost(amount);
    console.log(cost); // "0.05"
    return cost;
  } catch (error) {
    console.error('Error calculating cost:', error.message);
    throw error;
  }
}
```

## isPaused

### Purpose and Use Cases

Checks if the `EnergyContract` is paused using `paused`. Used to determine if contract interactions (e.g., purchases, uranium additions) are disabled, informing users before attempting actions.

### Parameters

- None.

### Return Values

- **Success**: `boolean` (true if paused, false otherwise).
- **Error**: Throws `Error` with a message describing the failure.

### Error Conditions

- Throws `Error` if the contract query fails (e.g., network issues, invalid contract address).

### Usage Example

```javascript
// Server-side: Check if contract is paused
import { isPaused } from './contractUtils';

async function handleIsPaused() {
  try {
    const paused = await isPaused();
    console.log(paused); // false
    return paused;
  } catch (error) {
    console.error('Error checking pause status:', error.message);
    throw error;
  }
}
```

## getHashedCommitment

### Purpose and Use Cases

Generates a hashed commitment for a purchase using `keccak256(abi.encodePacked(msg.sender, pounds, nonce, secret))`. Used within `commitPurchase` to create a commitment hash. Typically called server-side to ensure security.

### Parameters

- `pounds` (`number`): Amount of uranium to commit.
- `nonce` (`number`): Unique nonce for the commitment.
- `sender` (`string`): Ethereum address of the sender.
- `secret` (`string`): Secret string for the commitment.

### Return Values

- **Success**: `string` (the hashed commitment, e.g., "0xabcdef...").
- **Error**: Throws `Error` with a message describing the failure (e.g., "Invalid sender address").

### Error Conditions

- Throws `Error` if `sender` is not a valid Ethereum address (checked via `ethers.isAddress`).
- Throws `Error` if `pounds` is not a positive integer.
- Throws `Error` if `nonce` is not an integer.
- Throws `Error` if `secret` is not a valid string.

### Usage Example

```javascript
// Server-side: Generate a commitment hash
import { getHashedCommitment } from './contractUtils';

function handleGetHashedCommitment(pounds, nonce, sender, secret) {
  try {
    const hash = getHashedCommitment(pounds, nonce, sender, secret);
    console.log(hash); // "0xabcdef..."
    return hash;
  } catch (error) {
    console.error('Error generating commitment hash:', error.message);
    throw error;
  }
}
```

## getNonceFromUid

### Purpose and Use Cases

Generates a deterministic nonce from a user’s Firebase UID using a hash function. Used within `commitPurchase` and `revealPurchase` to create a unique nonce for purchase commitments. Typically called server-side for consistency.

### Parameters

- `uid` (`string`): User’s Firebase UID.

### Return Values

- **Success**: `number` (a nonce between 10000 and 99999).
- **Error**: Throws `Error` with a message describing the failure (e.g., "Invalid Firebase UID").

### Error Conditions

- Throws `Error` if `uid` is not a non-empty string.

### Usage Example

```javascript
// Server-side: Generate a nonce from UID
import { getNonceFromUid } from './contractUtils';

function handleGetNonceFromUid(uid) {
  try {
    const nonce = getNonceFromUid(uid);
    console.log(nonce); // 12345
    return nonce;
  } catch (error) {
    console.error('Error generating nonce:', error.message);
    throw error;
  }
}
```

## requestUraniumPriceUpdate

### Purpose and Use Cases

Requests an update to the uranium price from the `uraniumPriceConsumer` oracle by calling `requestUraniumPriceUpdate`. Used by admins to refresh the uranium price feed. Requires a signed transaction and admin privileges.

### Parameters

- None.

### Return Values

- **Success**: `string` (transaction hash).
- **Error**: Throws `Error` with a message describing the failure (e.g., custom contract errors).

### Error Conditions

- Throws custom errors from `handleContractError`, such as:
    - `UraniumPriceConsumerNotSet`: If the uranium price consumer address is not set.
    - `OwnableUnauthorizedAccount`: If the caller is not the contract owner.
    - `EnforcedPause`: If the contract is paused.
- Throws `Error` for transaction failures (e.g., insufficient funds).

### Usage Example

```javascript
// Server-side: Request uranium price update
import { requestUraniumPriceUpdate } from './adminContract';

async function handleRequestUraniumPriceUpdate() {
  try {
    const txHash = await requestUraniumPriceUpdate();
    console.log(txHash); // "0x123..."
    return txHash;
  } catch (error) {
    console.error('Error requesting uranium price update:', error.message);
    throw error;
  }
}
```

## updateUraniumPrice

### Purpose and Use Cases

Updates the stored uranium price in the `EnergyContract` by calling `updateUraniumPrice`. Used by admins to finalize a price update after a request. Requires a signed transaction.

### Parameters

- None.

### Return Values

- **Success**: `string` (transaction hash).
- **Error**: Throws `Error` with a message describing the failure (e.g., custom contract errors).

### Error Conditions

- Throws `Error` if the new price is zero or unchanged (contract logic).
- Throws custom errors from `handleContractError`, such as `EnforcedPause` if the contract is paused.
- Throws `Error` for transaction failures (e.g., network issues).

### Usage Example

```javascript
// Server-side: Update uranium price
import { updateUraniumPrice } from './adminContract';

async function handleUpdateUraniumPrice() {
  try {
    const txHash = await updateUraniumPrice();
    console.log(txHash); // "0x123..."
    return txHash;
  } catch (error) {
    console.error('Error updating uranium price:', error.message);
    throw error;
  }
}
```

## getUraniumPriceInfo

### Purpose and Use Cases

Fetches the current uranium price and its last update timestamp from the `EnergyContract` using `getUraniumPriceInfo`. Used to display the uranium price (USD cents per pound) and its freshness to users or admins.

### Parameters

- None.

### Return Values

- **Success**:
    
    ```json
    {
      price: string,
      lastUpdated: number
    }
    ```
    
- **Error**: Throws `Error` with a message describing the failure.
    

### Error Conditions

- Throws `Error` if the contract query fails (e.g., network issues, invalid contract address).

### Usage Example

```javascript
// Server-side: Fetch uranium price info
import { getUraniumPriceInfo } from './contractUtils';

async function handleGetUraniumPriceInfo() {
  try {
    const info = await getUraniumPriceInfo();
    console.log(info); // { price: "1200", lastUpdated: 1698768000000 }
    return info;
  } catch (error) {
    console.error('Error fetching uranium price info:', error.message);
    throw error;
  }
}
```

## setUraniumPriceConsumer

### Purpose and Use Cases

Sets the uranium price consumer contract address and Chainlink parameters by calling `setUraniumPriceConsumer`. Used by admins to configure or update the uranium price oracle. Requires a signed transaction and admin privileges.

### Parameters

- `consumerAddress` (`string`): Address of the uranium price consumer contract.
- `subscriptionId` (`number`): Chainlink subscription ID.
- `donId` (`string`): Chainlink DON ID (as a hex string).

### Return Values

- **Success**: `string` (transaction hash).
- **Error**: Throws `Error` with a message describing the failure (e.g., "Invalid consumer address", or custom contract errors).

### Error Conditions

- Throws `Error` if `consumerAddress` is not a valid Ethereum address.
- Throws `Error` if `subscriptionId` is not a number or `donId` is not a valid hex string.
- Throws custom errors from `handleContractError`, such as:
    - `InvalidPartyAddress`: If `consumerAddress` is the zero address.
    - `OwnableUnauthorizedAccount`: If the caller is not the contract owner.
- Throws `Error` for transaction failures (e.g., insufficient funds).

### Usage Example

```javascript
// Server-side: Set uranium price consumer
import { setUraniumPriceConsumer } from './adminContract';

async function handleSetUraniumPriceConsumer(consumerAddress, subscriptionId, donId) {
  try {
    const txHash = await setUraniumPriceConsumer(consumerAddress, subscriptionId, donId);
    console.log(txHash); // "0x123..."
    return txHash;
  } catch (error) {
    console.error('Error setting uranium price consumer:', error.message);
    throw error;
  }
}
```