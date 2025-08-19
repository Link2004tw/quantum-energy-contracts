# CSRF Token and Testing Wallet API Documentation for EnergyContract Application

This document provides comprehensive documentation for the CSRF token generation and testing wallet APIs in the EnergyContract application. These APIs are designed to be called from the frontend of a Next.js application to facilitate secure operations and testing within the blockchain environment. The CSRF token generation API ensures protection against cross-site request forgery attacks, while the testing wallet API provides a mechanism to retrieve or generate a test wallet address for development and testing purposes on the Hardhat or Sepolia testnet. Each API is described with its purpose, endpoint, method, parameters, return values, error conditions, and usage examples. The APIs leverage server-side actions for secure operations and integrate with Firebase for authentication and ethers.js for blockchain interactions.

## Table of Contents

- [GET /api/generate-token](https://grok.com/project/49f4b484-99b6-4f3c-8a43-d14c40da2356?chat=66dc7307-9f9e-432b-bcdf-7027017da275#get-apigenerate-token)
- [GET /api/testing-wallet](https://grok.com/project/49f4b484-99b6-4f3c-8a43-d14c40da2356?chat=66dc7307-9f9e-432b-bcdf-7027017da275#get-apitesting-wallet)

## GET /api/generate-token

### Purpose and Use Cases

Generates and stores a CSRF token in an httpOnly cookie and returns it to the client for securing subsequent API calls. Used by the frontend to obtain a token for protecting server actions against cross-site request forgery attacks. Requires authentication via a valid Firebase ID token to ensure only authenticated users can generate tokens. This API is critical for securing endpoints that modify state or perform sensitive operations, such as energy transactions or user updates.

### Endpoint

`GET /api/generate-token`

### Parameters

- **Headers**:
    - `Authorization` (`string`): Bearer token for Firebase authentication (e.g., Firebase ID token).

### Return Values

- **Success (200)**:
    
    ```json
    {
      "token": string
    }
    ```
    
    - `token`: A 32-byte hexadecimal CSRF token stored in an httpOnly cookie named `__csrf_token`.
- **Error (401)**: `{ "error": "Unauthorized: Invalid or expired token" }` if the authentication token is missing, invalid, or expired.
- **Error (500)**: `{ "error": "Failed to generate CSRF token" }` if token generation or cookie storage fails.

### Error Conditions

- Throws `Error` if the `Authorization` header is missing or the token is invalid/expired, as verified by Firebase Authentication.
- Throws `Error` if the CSRF token generation (e.g., using a cryptographic random generator) or cookie storage fails due to server misconfiguration or runtime issues.

### Usage Example

```javascript
// Generate a CSRF token from the frontend
async function getCsrfToken() {
  try {
    const response = await fetch('/api/generate-token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });
    const data = await response.json();
    console.log(data.token); // Example output: "a1b2c3d4e5f607890123456789abcdef"
    return data.token;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
  }
}
```

## GET /api/testing-wallet

### Purpose and Use Cases

Provides a test Ethereum wallet address for development and testing purposes on the Hardhat or Sepolia testnet. Used by the frontend during development to simulate wallet interactions without requiring a real MetaMask wallet or funded account. The API either retrieves a pre-funded test account from the Hardhat node (chainId 31337) or generates a random test wallet for Sepolia (chainId 11155111) with instructions for funding via a faucet. This facilitates testing of blockchain interactions, such as energy purchases or authorization checks, in a controlled environment.

### Endpoint

`GET /api/testing-wallet`

### Parameters

- **Headers**:
    - `Authorization` (`string`): Bearer token for Firebase authentication (e.g., Firebase ID token).
- **Query Parameters** (optional):
    - `network` (`string`): Specifies the network (`hardhat` or `sepolia`). Defaults to `hardhat` if not provided.

### Return Values

- **Success (200)**:
    
    ```json
    {
      "success": true,
      "address": string,
      "privateKey": string | null,
      "network": string,
      "fundingInstructions": string | null
    }
    ```
    
    - `address`: The Ethereum address of the test wallet.
    - `privateKey`: The private key for the test wallet (provided only for Hardhat; null for Sepolia to avoid exposing sensitive data).
    - `network`: The network for which the wallet is intended (`hardhat` or `sepolia`).
    - `fundingInstructions`: Instructions for funding the wallet on Sepolia (e.g., faucet URL), or null for Hardhat.
- **Error (400)**: `{ "error": "Invalid network specified" }` if the `network` query parameter is neither `hardhat` nor `sepolia`.
- **Error (401)**: `{ "error": "Unauthorized: Invalid or expired token" }` if the authentication token is invalid or expired.
- **Error (500)**: `{ "error": "Internal server error" }` if wallet generation or retrieval fails.

### Error Conditions

- Throws `Error` if the `network` query parameter is provided but is invalid (not `hardhat` or `sepolia`).
- Throws `Error` if the `Authorization` header is missing or the token is invalid/expired, as verified by Firebase Authentication.
- Throws `Error` if the Hardhat node is unreachable (e.g., not running at `http://192.168.1.13:8545` for chainId 31337) or if wallet generation fails for Sepolia.

### Usage Example

```javascript
// Fetch a test wallet address from the frontend
async function getTestingWallet(network = 'hardhat') {
  try {
    const response = await fetch(`/api/testing-wallet?network=${network}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });
    const data = await response.json();
    console.log(data);
    // Example output for Hardhat:
    // {
    //   success: true,
    //   address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    //   privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    //   network: "hardhat",
    //   fundingInstructions: null
    // }
    // Example output for Sepolia:
    // {
    //   success: true,
    //   address: "0x1234567890123456789012345678901234567890",
    //   privateKey: null,
    //   network: "sepolia",
    //   fundingInstructions: "Fund this address using a Sepolia faucet like https://sepoliafaucet.com"
    // }
    return data;
  } catch (error) {
    console.error('Error fetching test wallet:', error);
  }
}
```