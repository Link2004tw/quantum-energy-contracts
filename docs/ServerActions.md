# Server Actions Documentation for EnergyContract Integration

This document provides detailed documentation for the server-side actions used to interact with the `EnergyContract` smart contract and associated backend operations. These actions are implemented in a Next.js application using server-side code ("use server") to handle energy transactions, gas estimations, user authorization, and data storage. Each action is described with its purpose, parameters, return values, error conditions, and usage examples.

## Table of Contents

- [saveEnergy](https://grok.com/project/49f4b484-99b6-4f3c-8a43-d14c40da2356?chat=66dc7307-9f9e-432b-bcdf-7027017da275#saveenergy)
- [saveRequest](https://grok.com/project/49f4b484-99b6-4f3c-8a43-d14c40da2356?chat=66dc7307-9f9e-432b-bcdf-7027017da275#saverequest)
- [estimateGasCostForCommitment](https://grok.com/project/49f4b484-99b6-4f3c-8a43-d14c40da2356?chat=66dc7307-9f9e-432b-bcdf-7027017da275#estimategascostforcommitment)
- [estimateCommitmentGas](https://grok.com/project/49f4b484-99b6-4f3c-8a43-d14c40da2356?chat=66dc7307-9f9e-432b-bcdf-7027017da275#estimatecommitmentgas)
- [estimateGasCostForRevealPurchase](https://grok.com/project/49f4b484-99b6-4f3c-8a43-d14c40da2356?chat=66dc7307-9f9e-432b-bcdf-7027017da275#estimategascostforrevealpurchase)
- [estimateRevealGas](https://grok.com/project/49f4b484-99b6-4f3c-8a43-d14c40da2356?chat=66dc7307-9f9e-432b-bcdf-7027017da275#estimaterevealgas)
- [generateCsrfToken](https://grok.com/project/49f4b484-99b6-4f3c-8a43-d14c40da2356?chat=66dc7307-9f9e-432b-bcdf-7027017da275#generatecsrftoken)
- [saveOrderToFirebase](https://grok.com/project/49f4b484-99b6-4f3c-8a43-d14c40da2356?chat=66dc7307-9f9e-432b-bcdf-7027017da275#saveordertofirebase)
- [checkIfAuthorizedAction](https://grok.com/project/49f4b484-99b6-4f3c-8a43-d14c40da2356?chat=66dc7307-9f9e-432b-bcdf-7027017da275#checkifauthorizedaction)
- [convertEthToUsdAction](https://grok.com/project/49f4b484-99b6-4f3c-8a43-d14c40da2356?chat=66dc7307-9f9e-432b-bcdf-7027017da275#convertethtousdaction)
- [updateUser](https://grok.com/project/49f4b484-99b6-4f3c-8a43-d14c40da2356?chat=66dc7307-9f9e-432b-bcdf-7027017da275#updateuser)

## saveEnergy

### Purpose and Use Cases

Saves an energy transaction to the database, storing details such as the energy amount (kWh) and associated transaction hashes. Used to record energy additions after `requestAddEnergy` and `confirmAddEnergy` calls to the smart contract.

### Parameters

- `kwh` (`string | number`): The amount of energy in kWh (1–1000).
- `requestTxHash` (`string`): Transaction hash from `requestAddEnergy`.
- `confirmTxHash` (`string`): Transaction hash from `confirmAddEnergy`.

### Return Values

- `Object`: `{ success: boolean, message: string }` indicating success or failure.

### Error Conditions

- Throws `Error` if `kwh` is invalid (not a number, ≤ 0, or > 1000).
- Throws `Error` if saving to the database fails.

### Usage Example

```javascript
// Save an energy transaction
const result = await saveEnergy(500, "0x123...", "0x456...");
console.log(result); // { success: true, message: "Energy transaction saved successfully!" }
```

## saveRequest

### Purpose and Use Cases

Saves an authorization request to the database for a user requesting access to purchase energy. Used to track pending authorization requests before calling `authorizeParty` on the smart contract.

### Parameters

- `authRequest` (`Object`): The authorization request object containing `userId` and other details.
- `csrfToken` (`string`): CSRF token for security validation.

### Return Values

- `Object`: `{ success: boolean, message: string }` indicating success or failure.

### Error Conditions

- Throws `Error` if the CSRF token is invalid or missing.
- Throws `Error` if saving to the database fails.

### Usage Example

```javascript
// Save an authorization request
const authRequest = { userId: "user123", /* other details */ };
const csrfToken = await generateCsrfToken();
const result = await saveRequest(authRequest, csrfToken);
console.log(result); // { success: true, message: "Request saved successfully!" }
```

## estimateGasCostForCommitment

### Purpose and Use Cases

Estimates the gas cost for submitting a commitment to purchase energy via `commitPurchase` on the smart contract. Used to provide users with cost estimates before initiating a purchase.

### Parameters

- `amount` (`number`): Amount of energy to commit (in kWh, 1–1000).
- `user` (`Object`): User object containing `_uid` and `_ethereumAddress`.
- `csrfToken` (`string`): CSRF token for security validation.

### Return Values

- `Object`:
    - On success: `{ success: true, data: { gasCostInEth, energyCostInEth, totalCostInEth, gasEstimate, walletAddress } }`
    - On failure: `{ success: false, error: string }`

### Error Conditions

- Throws `Error` if `amount` exceeds 1000 kWh.
- Throws `Error` if the CSRF token is invalid or missing.
- Throws `Error` if the contract initialization fails (e.g., missing private key).
- Throws `Error` if the network chain ID is incorrect.
- Throws `Error` if gas estimation or contract interaction fails.

### Usage Example

```javascript
// Estimate gas for committing a purchase
const user = { _uid: "user123", _ethereumAddress: "0x123..." };
const csrfToken = await generateCsrfToken();
const result = await estimateGasCostForCommitment(100, user, csrfToken);
console.log(result.data); // { gasCostInEth: "0.001", energyCostInEth: "0.05", totalCostInEth: "0.051", gasEstimate: "30000", walletAddress: "0x456..." }
```

## estimateCommitmentGas

### Purpose and Use Cases

A server action wrapper for `estimateGasCostForCommitment`, designed to be called directly from Next.js components via form submissions. Parses form data and delegates to `estimateGasCostForCommitment`.

### Parameters

- `formData` (`FormData`): Form data containing `amount`, `userUid`, `userEthereumAddress`, and `csrfToken`.

### Return Values

- `Object`:
    - On success: Same as `estimateGasCostForCommitment`.
    - On failure: `{ success: false, error: string }`

### Error Conditions

- Throws `Error` if required form fields (`amount`, `userUid`, `userEthereumAddress`) are missing.
- Inherits errors from `estimateGasCostForCommitment`.

### Usage Example

```javascript
// Form submission in a Next.js component
const formData = new FormData();
formData.append("amount", "100");
formData.append("userUid", "user123");
formData.append("userEthereumAddress", "0x123...");
formData.append("csrfToken", await generateCsrfToken());
const result = await estimateCommitmentGas(formData);
console.log(result); // { success: true, data: { ... } }
```

## estimateGasCostForRevealPurchase

### Purpose and Use Cases

Estimates the gas cost for revealing and executing a purchase via `revealPurchase` on the smart contract. Used to provide users with cost estimates for completing a purchase.

### Parameters

- `amount` (`number`): Amount of energy to purchase (in kWh, 1–1000).
- `user` (`Object`): User object containing `_uid` and `_ethereumAddress`.
- `csrfToken` (`string`): CSRF token for security validation.

### Return Values

- `Object`:
    - On success: `{ success: true, data: { gasCostInEth, energyCostInEth, totalCostInEth, gasEstimate, walletAddress, ethPrice, totalCostWei } }`
    - On failure: `{ success: false, error: string }`

### Error Conditions

- Throws `Error` if `amount` is invalid (≤ 0 or > 1000).
- Throws `Error` if `user._ethereumAddress` is missing.
- Throws `Error` if the CSRF token is invalid or missing.
- Throws `Error` if contract initialization fails (e.g., missing private key).
- Throws `Error` if the network chain ID is incorrect.
- Throws `Error` if gas estimation, price feed, or contract interaction fails.

### Usage Example

```javascript
// Estimate gas for revealing a purchase
const user = { _uid: "user123", _ethereumAddress: "0x123..." };
const csrfToken = await generateCsrfToken();
const result = await estimateGasCostForRevealPurchase(100, user, csrfToken);
console.log(result.data); // { gasCostInEth: "0.002", energyCostInEth: "0.05", totalCostInEth: "0.052", gasEstimate: "150000", walletAddress: "0x456...", ethPrice: 2000, totalCostWei: "52000000000000000" }
```

## estimateRevealGas

### Purpose and Use Cases

A server action wrapper for `estimateGasCostForRevealPurchase`, designed to be called directly from Next.js components via form submissions. Parses form data and delegates to `estimateGasCostForRevealPurchase`.

### Parameters

- `formData` (`FormData`): Form data containing `amount`, `userUid`, `userEthereumAddress`, and `csrfToken`.

### Return Values

- `Object`:
    - On success: Same as `estimateGasCostForRevealPurchase`.
    - On failure: `{ success: false, error: string }`

### Error Conditions

- Throws `Error` if required form fields (`amount`, `userUid`, `userEthereumAddress`) are missing.
- Inherits errors from `estimateGasCostForRevealPurchase`.

### Usage Example

```javascript
// Form submission in a Next.js component
const formData = new FormData();
formData.append("amount", "100");
formData.append("userUid", "user123");
formData.append("userEthereumAddress", "0x123...");
formData.append("csrfToken", await generateCsrfToken());
const result = await estimateRevealGas(formData);
console.log(result); // { success: true, data: { ... } }
```

## generateCsrfToken

### Purpose and Use Cases

Generates and stores a CSRF token in cookies for securing server actions. Used to protect against cross-site request forgery attacks.

### Return Values

- `string`: A 32-byte hexadecimal CSRF token.

### Error Conditions

- None (assumes cookie storage is available).

### Usage Example

```javascript
// Generate a CSRF token
const token = await generateCsrfToken();
console.log(token); // "a1b2c3d4e5f6..."
```

## saveOrderToFirebase

### Purpose and Use Cases

Saves a committed energy purchase order to Firebase, associating it with a user. Used to record `commitPurchase` details for later reference during `revealPurchase`.

### Parameters

- `order` (`Object`): The order object containing `transactionHash` and other details.
- `user` (`Object`): User object containing `_uid`.
- `csrfToken` (`string`): CSRF token for security validation.

### Error Conditions

- Throws `Error` if the CSRF token is invalid or missing.
- Throws `Error` if saving to Firebase fails.

### Usage Example

```javascript
// Save a committed order
const order = { transactionHash: "0x123...", /* other details */ };
const user = { _uid: "user123" };
const csrfToken = await generateCsrfToken();
await saveOrderToFirebase(order, user, csrfToken);
```

## checkIfAuthorizedAction

### Purpose and Use Cases

Checks if a user is authorized to interact with the `EnergyContract` by calling `checkIfAuthorized`. Used to verify user permissions before allowing purchase-related actions.

### Parameters

- `user` (`Object`): User object containing `_uid` and other details.
- `csrfToken` (`string`): CSRF token for security validation.

### Return Values

- `boolean`: True if the user is authorized, false otherwise.

### Error Conditions

- Throws `Error` if the CSRF token is invalid or missing.
- Throws `Error` if the authorization check fails.

### Usage Example

```javascript
// Check if user is authorized
const user = { _uid: "user123" };
const csrfToken = await generateCsrfToken();
const isAuthorized = await checkIfAuthorizedAction(user, csrfToken);
console.log(isAuthorized); // true or false
```

## convertEthToUsdAction

### Purpose and Use Cases

Converts an ETH amount to USD using the current ETH/USD price. Used to provide users with cost estimates in USD.

### Parameters

- `eth` (`string | number`): Amount of ETH to convert.

### Return Values

- `Object`: `{ ethAmount, usdAmount, ethPriceInUsd }`

### Error Conditions

- Throws `Error` if the ETH price fetch or conversion fails.

### Usage Example

```javascript
// Convert ETH to USD
const result = await convertEthToUsdAction("0.05");
console.log(result); // { ethAmount: "0.05", usdAmount: "100", ethPriceInUsd: 2000 }
```

## updateUser

### Purpose and Use Cases

Updates user data in the database. Used to modify user details, such as Ethereum address or authorization status.

### Parameters

- `updatedUser` (`Object`): Updated user object containing `_uid` and other fields.
- `csrfToken` (`string`): CSRF token for security validation.

### Error Conditions

- Throws `Error` if the CSRF token is invalid or missing.
- Throws `Error` if saving to the database fails.

### Usage Example

```javascript
// Update user data
const updatedUser = { _uid: "user123", _ethereumAddress: "0x123..." };
const csrfToken = await generateCsrfToken();
await updateUser(updatedUser, csrfToken);
```