# Firebase Realtime Database Structure for EnergyContract

This document details the structure of the Firebase Realtime Database used in the `solarfarm_ui` frontend of the `EnergyContract` project, as observed at 12:19 AM EEST on Tuesday, July 29, 2025. The database includes nodes for `users`, `requests`, `energyTransactions`, and `committedOrders`, storing user profiles, request approvals, transaction data, and committed orders tied to the `EnergyContract` smart contract. The structure aligns with the `CommittedOrders` model (`solarfarm_ui/models/committedOrders.js`) and uses a `uid/transactionHash` composite key for committed orders, supporting the commit-reveal mechanism and frontend interactions at `http://localhost:3000/orders`.

## Database Overview

- **Database Type**: Firebase Realtime Database.
- **Access Rules**: Configured with:
  ```json
  {
    "rules": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
  ```
  - Only authenticated users (via Email/Password or Google sign-in) can read/write data.
- **Integration**: Managed via `solarfarm_ui/config/firebase.js` (client-side) and `solarfarm_ui/config/adminfirebase.js` (server-side).
- **Primary Use**: Stores user data, request approvals, transaction histories, and committed orders for display and processing in `solarfarm_ui/app/orders/`.

## Database Schema

The database consists of four main nodes: `users`, `requests`, `energyTransactions`, and `committedOrders`. Below is the detailed structure based on the provided screenshots.

### Root Node: `/`

- **Description**: The root contains multiple nodes for different data types.
- **Structure**:
  ```json
  {
    "users": {
      /* User profiles */
    },
    "requests": {
      /* Request approvals */
    },
    "energyTransactions": {
      /* Transaction records */
    },
    "committedOrders": {
      /* Committed order records */
    }
  }
  ```

### Node: `/users`

- **Description**: Stores user profile data, linked to Firebase Authentication.
- **Structure**:
  ```json
  {
    "users": {
      "<uid>": {
        "birthday": String,
        "createdAt": String,
        "email": String,
        "energy": Number,
        "ethereumAddress": String,
        "username": String
      }
    }
  }
  ```
  - **Fields**:
    - `birthday`: Date string (e.g., `"Mon Jul 28 2025"`).
    - `createdAt`: ISO 8601 timestamp (e.g., `"2025-07-28T09:43:15.333Z"`).
    - `email`: User email (e.g., `"test5@solarfarm.com"`).
    - `energy`: Energy balance (e.g., `0`).
    - `ethereumAddress`: User’s Ethereum address (e.g., `"0x70997970c51812dc3a010c7d01b50e0d17dc79c8"`).
    - `username`: User’s username (e.g., `"tester1000"`).
  - **Example**:
    ```json
    {
      "users": {
        "4Lua37PDGEMF01rGY8tAjaG054v2": {
          "birthday": "Mon Jul 28 2025",
          "createdAt": "2025-07-28T09:43:15.333Z",
          "email": "test5@solarfarm.com",
          "energy": 0,
          "ethereumAddress": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
          "username": "tester1000"
        }
      }
    }
    ```

### Node: `/requests`

- **Description**: Stores approval requests, likely for user or transaction validation.
- **Structure**:
  ```json
  {
    "requests": {
      "<request_id>": {
        "ethereumAddress": String,
        "metadata": Object,
        "status": String,
        "userId": String
      }
    }
  }
  ```
  - **Fields**:
    - `ethereumAddress`: User’s Ethereum address (e.g., `"0x70997970c51812dc3a010c7d01b50e0d17dc79c8"`).
    - `metadata`: Nested object (currently empty in screenshot).
    - `status`: Request status (e.g., `"approved"`).
    - `userId`: Firebase UID of the requester (e.g., `"Cmv8RF5U0KPqPmcwJeB09UV8wi12"`).
  - **Example**:
    ```json
    {
      "requests": {
        "Cmv8RF5U0KPqPmcwJeB09UV8wi12": {
          "ethereumAddress": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
          "metadata": {},
          "status": "approved",
          "userId": "Cmv8RF5U0KPqPmcwJeB09UV8wi12"
        }
      }
    }
    ```

### Node: `/energyTransactions`

- **Description**: Records energy transaction details, linked to blockchain interactions.
- **Structure**:
  ```json
  {
    "energyTransactions": {
      "<transaction_id>": {
        "confirmHash": String,
        "energyAmountkWh": Number,
        "requestHash": String,
        "timestamp": String,
        "transactionId": String
      }
    }
  }
  ```
  - **Fields**:
    - `confirmHash`: Hash of the confirmation transaction (e.g., `"0x3054fde54b7744d75328ac2342778e42ce63454c00a1a0fe93507cbd3b5e5f"`).
    - `energyAmountkWh`: Energy amount in kWh (e.g., `1000`).
    - `requestHash`: Hash of the request transaction (e.g., `"0x5999fbf1ab15557f463a6e2debe7f798cfba64e4b4664e5480c1067cc5"`).
    - `timestamp`: ISO 8601 timestamp (e.g., `"2025-07-28T19:16:24.012Z"`).
    - `transactionId`: Unique transaction ID (e.g., `"18d4acb3-2f99-4f44-8a79-44ef21b94d8a"`).
  - **Example**:
    ```json
    {
      "energyTransactions": {
        "18d4acb3-2f99-4f44-8a79-44ef21b94d8a": {
          "confirmHash": "0x3054fde54b7744d75328ac2342778e42ce63454c00a1a0fe93507cbd3b5e5f",
          "energyAmountkWh": 1000,
          "requestHash": "0x5999fbf1ab15557f463a6e2debe7f798cfba64e4b4664e5480c1067cc5",
          "timestamp": "2025-07-28T19:16:24.012Z",
          "transactionId": "18d4acb3-2f99-4f44-8a79-44ef21b94d8a"
        }
      }
    }
    ```

### Node: `/committedOrders`

- **Description**: Stores committed orders, keyed by `uid/transactionHash`, reflecting the `CommittedOrders` model.
- **Structure**:
  ```json
  {
    "committedOrders": {
      "<uid>/<transactionHash>": {
        "createdAt": String,
        "energyRequested": Number,
        "ethereumAddress": String,
        "nonce": String,
        "transactionHash": String,
        "uid": String
      }
    }
  }
  ```
  - **Fields**:
    - `createdAt`: ISO 8601 timestamp (e.g., `"2025-07-28T11:17:094Z"`).
    - `energyRequested`: Amount of energy requested in kWh (e.g., `1000`).
    - `ethereumAddress`: User’s Ethereum address (e.g., `"0x70997970c51812dc3a010c7d01b50e0d17dc79c8"`).
    - `nonce`: Optional nonce for commit-reveal (e.g., `"71779"`).
    - `transactionHash`: Blockchain transaction hash (e.g., `"0x5fbe36b41360c725ff2e18b5b6ced011cd5ea3f3c66c0532f1335f1f4552c"`).
    - `uid`: Firebase UID (e.g., `"Vwpfib0T7RsGPRxaQxe4kQzmT1"`).
  - **Example**:
    ```json
    {
      "committedOrders": {
        "Vwpfib0T7RsGPRxaQxe4kQzmT1/0x5fbe36b41360c725ff2e18b5b6ced011cd5ea3f3c66c0532f1335f1f4552c": {
          "createdAt": "2025-07-28T11:17:094Z",
          "energyRequested": 1000,
          "ethereumAddress": "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
          "nonce": "71779",
          "transactionHash": "0x5fbe36b41360c725ff2e18b5b6ced011cd5ea3f3c66c0532f1335f1f4552c",
          "uid": "Vwpfib0T7RsGPRxaQxe4kQzmT1"
        }
      }
    }
    ```

## Data Relationships

- **Users to Committed Orders**:
  - The `uid` links user profiles (`/users/<uid>`) to their committed orders (`/committedOrders/<uid>/<transactionHash>`).
  - Example: `Vwpfib0T7RsGPRxaQxe4kQzmT1` in both `users` and `committedOrders`.
- **Committed Orders to Energy Transactions**:
  - The `transactionHash` in `/committedOrders` corresponds to transaction hashes in `/energyTransactions`, ensuring blockchain consistency.
  - Example: `0x5fbe36b41360c725ff2e18b5b6ced011cd5ea3f3c66c0532f1335f1f4552c` links to a transaction.
- **Requests to Users**:
  - The `userId` in `/requests` matches a `uid` in `/users`, validating user requests.
  - Example: `Cmv8RF5U0KPqPmcwJeB09UV8wi12` links a request to a user.
- **Frontend Integration**:
  - Data is fetched via `solarfarm_ui/utils/databaseUtils.js` and displayed in `OrdersList.jsx` and `OrderItem.jsx`.

## Integration with Frontend

- **Data Retrieval**:
  - `solarfarm_ui/utils/databaseUtils.js` queries `/committedOrders/<uid>` for user-specific orders.
- **Data Display**:
  - Rendered in `solarfarm_ui/app/orders/`, with `energyRequested` (e.g., `1000 kWh`) shown in `OrderItem.jsx`.
- **Data Creation**:
  - Created via `solarfarm_ui/app/buySolar/page.jsx`, linking to `EnergyContract` transactions.

## Security Considerations

- **Authentication**: Enforced by Firebase rules, restricting access to authenticated users.
- **Validation**: `CommittedOrders` class ensures data integrity (e.g., valid `transactionHash`).
- **Sensitive Data**: Secured via `.gitignore` (e.g., `solarfarm_ui/.env`, `solarfarm_account.json`).
- **Cross-Validation**: Verified against blockchain via `solarfarm_ui/utils/contract.js`.

## Notes

- **Scalability**: Use Firebase indexing for large datasets under `/committedOrders`.
- **Testing**: Verify with `npm run dev` and Firebase Console.
- **Documentation**: Update `docs/SETUP.md` with this structure.

This structure supports the `EnergyContract` project’s requirements, reflecting the current database state as of July 29, 2025.
