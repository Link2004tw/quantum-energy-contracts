# Frontend API Documentation for EnergyContract Application

This document provides comprehensive documentation for all frontend-facing APIs in the EnergyContract application. These APIs are designed to be called from the frontend of a Next.js application to interact with server-side actions and the `EnergyContract` smart contract, perform administrative tasks, check contract state, generate CSRF tokens, fetch Ethereum balances, retrieve user orders, fetch individual user data, handle user login, verify user roles, and check registered Ethereum addresses. Each API is described with its purpose, endpoint, method, parameters, return values, error conditions, and usage examples. The APIs leverage server-side actions for secure operations and integrate with Firebase for data storage.

## Table of Contents

- [[#GET /api/admin/get-users]]
- [[#GET /api/admin/get-user]]
- [[#GET /api/check-paused]]
- [[#GET /api/generate-token]]
- [[#GET /api/get-eth-balance]]
- [[#GET /api/get-orders]]
- [[#POST /api/login]]
- [[#POST /api/send-energy-data]]
- [[#POST /api/check-registered]]
- [[#POST /api/verify-role]]

## GET /api/admin/get-users

### Purpose and Use Cases

Fetches a list of all users from the Firebase Realtime Database for administrative purposes. Returns user details such as email, username, Ethereum address, user ID, and energy balance. This API is protected by middleware requiring admin custom claims via `/api/verify-role`, ensuring only authorized admins can access it. Compatible with `CooldownTimer` and `InvalidCommitment` fix in the smart contract.

### Endpoint

`GET /api/admin/get-users`

### Parameters

- **Headers**:
    - `Authorization` (`string`): Bearer token with admin custom claims.
- **Query Parameters**: None.

### Return Values

- **Success (200)**: JSON array of user objects, each containing:
    - `email` (`string`): User's email address (empty string if not set).
    - `username` (`string`): User's username (empty string if not set).
    - `ethereumAddress` (`string | null`): User's Ethereum address or null if not set.
    - `uid` (`string`): User's unique Firebase ID.
    - `energy` (`number`): User's energy balance in kWh (defaults to 0).
- **Error (401)**: `{ error: "Unauthorized" }` if the authentication token is missing or invalid.
- **Error (403)**: `{ error: "Forbidden" }` if the user lacks admin custom claims.
- **Error (500)**: `{ error: "Internal server error" }` if fetching users fails.

### Error Conditions

- Returns 401 if the Authorization header is missing or the token is invalid.
- Returns 403 if the middleware detects missing or invalid admin custom claims.
- Throws `Error` if the Firebase database query fails.

### Usage Example

```javascript
// Fetch all users from the frontend
async function fetchUsers() {
  try {
    const response = await fetch('/api/admin/get-users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    const data = await response.json();
    console.log(data);
    // Example output:
    // [
    //   { email: "user1@example.com", username: "user1", ethereumAddress: "0x123...", uid: "user123", energy: 100 },
    //   { email: "user2@example.com", username: "user2", ethereumAddress: null, uid: "user456", energy: 0 }
    // ]
  } catch (error) {
    console.error('Error fetching users:', error);
  }
}
```

## GET /api/admin/get-user

### Purpose and Use Cases

Fetches data for a specific user from the Firebase Realtime Database based on their `uid`. Returns user details such as `uid`, `ethereumAddress`, `energy`, `username`, and `email`. This API is protected by middleware requiring admin custom claims via `/api/verify-role`, ensuring only authorized admins can access it. Includes validation for compatibility with `CooldownTimer` and `InvalidCommitment` fixes by resetting invalid `energy` or `ethereumAddress` values.

### Endpoint

`GET /api/admin/get-user?uid=<userId>`

### Parameters

- **Headers**:
    - `Authorization` (`string`): Bearer token with admin custom claims.
- **Query Parameters**:
    - `uid` (`string`): The unique Firebase ID of the user to fetch.

### Return Values

- **Success (200)**:
    
    ```json
    {
      "success": true,
      "user": {
        "uid": string,
        "ethereumAddress": string | null,
        "energy": number,
        "username": string,
        "email": string
      }
    }
    ```
    
- **Error (400)**: `{ error: "Missing uid query parameter" }` if the `uid` is not provided.
- **Error (401)**: `{ error: string }` if the authentication token is invalid or expired.
- **Error (403)**: `{ error: "Forbidden" }` if the user lacks admin custom claims.
- **Error (404)**: `{ error: "User not found" }` if no user exists for the provided `uid`.
- **Error (500)**: `{ error: "Internal server error" }` if fetching the user fails.

### Error Conditions

- Throws `Error` if the `uid` query parameter is missing.
- Throws `Error` if the Authorization header is missing or the token is invalid/expired.
- Throws `Error` if the user does not exist in the Firebase Realtime Database.
- Throws `Error` if the Firebase database query fails.
- Logs a warning and resets `energy` to 0 if it is negative (for `CooldownTimer` and `InvalidCommitment` compatibility).
- Logs a warning and resets `ethereumAddress` to `null` if it is invalid (checked via `ethers.isAddress`).

### Usage Example

```javascript
// Fetch a specific user from the frontend
async function fetchUser(uid) {
  try {
    const response = await fetch(`/api/admin/get-user?uid=${uid}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
      },
    });
    const data = await response.json();
    console.log(data);
    // Example output:
    // {
    //   success: true,
    //   user: {
    //     uid: "user123",
    //     ethereumAddress: "0x123...",
    //     energy: 100,
    //     username: "user1",
    //     email: "user1@example.com"
    //   }
    // }
  } catch (error) {
    console.error('Error fetching user:', error);
  }
}
```

## GET /api/check-paused

### Purpose and Use Cases

Checks if the `EnergyContract` smart contract is paused by calling the server-side `isPaused` function from `contractUtils`. Used by the frontend to determine if contract interactions (e.g., purchases or energy additions) are currently disabled, ensuring users are informed of the contract's state before attempting actions.

### Endpoint

`GET /api/check-paused`

### Parameters

- None.

### Return Values

- **Success (200)**: `{ isPaused: boolean }` indicating whether the contract is paused.
- **Error (500)**: `{ error: string }` if checking the pause state fails (e.g., due to contract connection issues).

### Error Conditions

- Throws `Error` if the `isPaused` function call fails (e.g., network issues, contract initialization failure).

### Usage Example

```javascript
// Check if the contract is paused
async function checkPaused() {
  try {
    const response = await fetch('/api/check-paused', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    console.log(data); // { isPaused: true } or { isPaused: false }
  } catch (error) {
    console.error('Error checking pause state:', error);
  }
}
```

## GET /api/generate-token

### Purpose and Use Cases

Generates and stores a CSRF token in an httpOnly cookie and returns it to the client for securing subsequent API calls. Used by the frontend to obtain a token for protecting server actions against cross-site request forgery attacks. Requires authentication via a valid bearer token.

### Endpoint

`GET /api/generate-token`

### Parameters

- **Headers**:
    - `Authorization` (`string`): Bearer token for authentication.

### Return Values

- **Success (200)**: `{ token: string }` containing a 32-byte hexadecimal CSRF token.
- **Error (401)**: `{ error: string }` if the authentication token is invalid or expired.
- **Error (500)**: `{ error: "Failed to generate CSRF token" }` if token generation or cookie storage fails.

### Error Conditions

- Throws `Error` if the Authorization header is missing or the token is invalid/expired.
- Throws `Error` if cookie storage or token generation fails.

### Usage Example

```javascript
// Generate a CSRF token
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
    console.log(data.token); // "a1b2c3d4e5f6..."
    return data.token;
  } catch (error) {
    console.error('Error generating CSRF token:', error);
  }
}
```

## GET /api/get-eth-balance

### Purpose and Use Cases

Fetches the Ethereum balance of a specified address using the `getEthBalance` function from `contractUtils`. Used by the frontend to display a user's ETH balance, ensuring they have sufficient funds for transactions. Requires Firebase ID token authentication and validates the Ethereum address using `ethers.js`. Compatible with existing `getEthBalance` function.

### Endpoint

`GET /api/get-eth-balance?address=<ethereumAddress>`

### Parameters

- **Headers**:
    - `Authorization` (`string`): Bearer token for authentication.
- **Query Parameters**:
    - `address` (`string`): Ethereum address to check the balance for.

### Return Values

- **Success (200)**:
    
    ```json
    {
      "success": true,
      "address": string,
      "balance": string
    }
    ```
    
    - `address`: The provided Ethereum address.
    - `balance`: The balance in ETH as a decimal string.
- **Error (400)**: `{ error: "Missing address query parameter" }` if the address is not provided.
- **Error (400)**: `{ error: "Invalid Ethereum address" }` if the address is invalid.
- **Error (401)**: `{ error: string }` if the authentication token is invalid or expired.
- **Error (500)**: `{ error: "Internal server error" }` if fetching the balance fails (e.g., due to network issues).

### Error Conditions

- Throws `Error` if the `address` query parameter is missing.
- Throws `Error` if the provided address is not a valid Ethereum address (checked via `ethers.isAddress`).
- Throws `Error` if the Authorization header is missing or the token is invalid/expired.
- Throws `Error` if the `getEthBalance` function fails (e.g., network issues, provider misconfiguration).

### Usage Example

```javascript
// Fetch Ethereum balance for an address
async function getEthBalance() {
  try {
    const response = await fetch('/api/get-eth-balance?address=0x1234567890123456789012345678901234567890', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });
    const data = await response.json();
    console.log(data); // { success: true, address: "0x123...", balance: "1.23456" }
  } catch (error) {
    console.error('Error fetching ETH balance:', error);
  }
}
```

## GET /api/get-orders

### Purpose and Use Cases

Fetches all committed energy purchase orders for a specific user from the Firebase Realtime Database based on their `uid`. Returns order details such as `energyRequested`, `transactionHash`, `uid`, `ethereumAddress`, `nonce`, and `createdAt`. Requires Firebase ID token authentication. Used by the frontend to display a user's order history.

### Endpoint

`GET /api/get-orders?uid=<userId>`

### Parameters

- **Headers**:
    - `Authorization` (`string`): Bearer token for authentication.
- **Query Parameters**:
    - `uid` (`string`): The unique Firebase ID of the user whose orders are to be fetched.

### Return Values

- **Success (200)**:
    
    ```json
    {
      "success": true,
      "orders": [
        {
          "energyRequested": number,
          "transactionHash": string,
          "uid": string,
          "ethereumAddress": string,
          "nonce": string,
          "createdAt": string
        }
      ]
    }
    ```
    
- **Error (400)**: `{ error: "Missing uid query parameter" }` if the `uid` is not provided.
- **Error (401)**: `{ error: string }` if the authentication token is invalid or expired.
- **Error (500)**: `{ error: "Internal server error" }` if fetching the orders fails.

### Error Conditions

- Throws `Error` if the `uid` query parameter is missing.
- Throws `Error` if the Authorization header is missing or the token is invalid/expired.
- Throws `Error` if the Firebase database query fails.

### Usage Example

```javascript
// Fetch user orders from the frontend
async function fetchOrders(uid) {
  try {
    const response = await fetch(`/api/get-orders?uid=${uid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });
    const data = await response.json();
    console.log(data);
    // Example output:
    // {
    //   success: true,
    //   orders: [
    //     {
    //       energyRequested: 100,
    //       transactionHash: "0x123...",
    //       uid: "user123",
    //       ethereumAddress: "0x456...",
    //       nonce: "12345",
    //       createdAt: "2023-10-01T12:00:00Z"
    //     }
    //   ]
    // }
  } catch (error) {
    console.error('Error fetching orders:', error);
  }
}
```

## POST /api/login

### Purpose and Use Cases

Handles user login by accepting a Firebase ID token and storing it in an httpOnly cookie named `__session`. Used by the frontend to authenticate users and establish a session for subsequent API calls requiring authentication.

### Endpoint

`POST /api/login`

### Parameters

- **Body** (JSON):
    - `idToken` (`string`): Firebase ID token for user authentication.

### Return Values

- **Success (200)**: `{ status: "ok" }` indicating the session cookie was set successfully.
- **Error (400)**: `{ error: "Missing token" }` if the `idToken` is not provided.

### Error Conditions

- Throws `Error` if the `idToken` is missing from the request body.

### Usage Example

```javascript
// Perform user login from the frontend
async function login(idToken) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });
    const data = await response.json();
    console.log(data); // { status: "ok" }
  } catch (error) {
    console.error('Error during login:', error);
  }
}
```

## POST /api/send-energy-data

### Purpose and Use Cases

Fetches the available energy in the `EnergyContract` smart contract and the latest ETH price using the `getAvailableEnergy` and `getLatestEthPriceWC` functions from `contractUtils`. Used by the frontend to display the current available energy and ETH price for user reference during transactions. Requires Firebase ID token authentication.

### Endpoint

`POST /api/send-energy-data`

### Parameters

- **Headers**:
    - `Authorization` (`string`): Bearer token for authentication.

### Return Values

- **Success (200)**:
    
    ```json
    {
      "status": "ok",
      "energy": string,
      "ethPrice": number
    }
    ```
    
    - `energy`: The available energy in kWh as a string.
    - `ethPrice`: The latest ETH price in USD.
- **Error (401)**: `{ error: string }` if the authentication token is invalid or expired.
- **Error (500)**: `{ error: "Internal Server Error" }` if fetching energy or ETH price fails.

### Error Conditions

- Throws `Error` if the Authorization header is missing or the token is invalid/expired.
- Throws `Error` if the `getAvailableEnergy` or `getLatestEthPriceWC` functions fail (e.g., due to network issues or contract misconfiguration).

### Usage Example

```javascript
// Fetch available energy and ETH price from the frontend
async function fetchEnergyData() {
  try {
    const response = await fetch('/api/send-energy-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
    });
    const data = await response.json();
    console.log(data); // { status: "ok", energy: "1000", ethPrice: 2000 }
  } catch (error) {
    console.error('Error fetching energy data:', error);
  }
}
```

## POST /api/check-registered

### Purpose and Use Cases

Checks if one or more Ethereum addresses are registered in the Firebase Realtime Database under `registeredAddresses` and adds new valid addresses if they don't exist. Used by the frontend to verify address registration status and register new addresses, ensuring only valid Ethereum addresses are stored. Fixes the error "set failed: value argument contains undefined in property 'registeredAddresses.1'" by filtering out undefined, null, empty, or invalid addresses.

### Endpoint

`POST /api/check-registered`

### Parameters

- **Headers**:
    - `Authorization` (`string`): Bearer token for authentication.
- **Body** (JSON):
    - `addresses` (`array` | `string`): Single Ethereum address or array of Ethereum addresses to check/register.

### Return Values

- **Success (200)**: `{ exists: boolean }` indicating whether any of the provided addresses already exist in the database.
- **Success (201)**: `{ exists: boolean }` if new addresses were added to the database.
- **Error (400)**: `{ error: "Invalid request body" }` if the request body is malformed.
- **Error (400)**: `{ error: "No valid Ethereum addresses provided" }` if no valid addresses are provided after filtering.
- **Error (401)**: `{ error: "Unauthorized: Invalid or expired token" }` if the authentication token is invalid or expired.
- **Error (500)**: `{ error: "Internal server error" }` if database operations fail.
- **Error (500)**: `{ error: "Internal server error: Invalid data structure in registeredAddresses" }` if the stored `registeredAddresses` is not an array.

### Error Conditions

- Throws `Error` if the request body cannot be parsed.
- Throws `Error` if no valid Ethereum addresses are provided after filtering.
- Throws `Error` if the Authorization header is missing or the token is invalid/expired.
- Throws `Error` if the Firebase database query or update fails.
- Throws `Error` if `registeredAddresses` in the database is not an array.

### Usage Example

```javascript
// Check and register Ethereum addresses
async function checkRegisteredAddresses() {
  try {
    const response = await fetch('/api/check-registered', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        addresses: ['0x1234567890123456789012345678901234567890', '0x4567890123456789012345678901234567890123'],
      }),
    });
    const data = await response.json();
    console.log(data); // { exists: true } or { exists: false }
  } catch (error) {
    console.error('Error checking/registering addresses:', error);
  }
}
```

## POST /api/verify-role

### Purpose and Use Cases

Verifies if the authenticated user has specific role-based custom claims (e.g., admin) using Firebase Authentication. This API is typically used as middleware or a utility endpoint by other APIs (e.g., `/api/admin/get-users`, `/api/admin/get-user`) to ensure the user has the required permissions before performing sensitive operations. Requires a valid Firebase ID token.

### Endpoint

`POST /api/verify-role`

### Parameters

- **Headers**:
    - `Authorization` (`string`): Bearer token for authentication.
- **Body** (JSON):
    - `role` (`string`): The role to verify (e.g., "admin").

### Return Values

- **Success (200)**:
    
    ```json
    {
      "success": true,
      "hasRole": boolean
    }
    ```
    
    - `hasRole`: Indicates whether the user has the specified role.
- **Error (400)**: `{ error: "Missing role in request body" }` if the `role` is not provided.
- **Error (401)**: `{ error: "Unauthorized: Invalid or expired token" }` if the authentication token is invalid or expired.
- **Error (500)**: `{ error: "Internal server error" }` if role verification fails (e.g., due to Firebase Authentication issues).

### Error Conditions

- Throws `Error` if the `role` parameter is missing from the request body.
- Throws `Error` if the Authorization header is missing or the token is invalid/expired.
- Throws `Error` if Firebase Authentication fails to verify the token or custom claims.

### Usage Example

```javascript
// Verify if the user has admin role
async function verifyRole() {
  try {
    const response = await fetch('/api/verify-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ role: 'admin' }),
    });
    const data = await response.json();
    console.log(data); // { success: true, hasRole: true } or { success: true, hasRole: false }
  } catch (error) {
    console.error('Error verifying role:', error);
  }
}
```