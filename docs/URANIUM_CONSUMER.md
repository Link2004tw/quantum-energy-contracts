# UraniumPriceConsumer Smart Contract Documentation

## Overview

The `UraniumPriceConsumer` smart contract is designed to fetch the spot price of uranium using Chainlink Functions. It integrates with an external API to retrieve the price, processes it, and stores it on-chain for use in other smart contracts or applications. The contract is built on Solidity version 0.8.19 and uses Chainlink's `FunctionsClient` and `ConfirmedOwner` contracts for secure oracle integration and access control.

## Dependencies

- **Solidity Version**: ^0.8.19
- **Chainlink Contracts**:
    - `FunctionsClient` from `@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol`
    - `ConfirmedOwner` from `@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol`
    - `FunctionsRequest` from `@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol`

## Contract Structure

### State Variables

- `lastPrice` (`uint256 public`): Stores the most recent uranium price (scaled by 100 to handle decimals).
- `lastRequestId` (`bytes32 public`): Stores the ID of the most recent Chainlink Functions request.
- `SOURCE_CODE` (`string private constant`): JavaScript code executed by Chainlink Functions to fetch the uranium price from an external API.

### Constructor

```solidity
constructor(address router) FunctionsClient(router) ConfirmedOwner(msg.sender)
```

- **Parameters**:
    - `router` (`address`): The address of the Chainlink Functions router contract.
- **Purpose**: Initializes the contract with the Chainlink Functions router and sets the contract deployer as the owner.

### Events

- `PriceRequested(bytes32 indexed requestId, uint64 subscriptionId)`: Emitted when a new price request is sent to Chainlink Functions.
- `PriceFulfilled(bytes32 indexed requestId, uint256 price)`: Emitted when a price request is successfully fulfilled.
- `RequestFailed(bytes32 indexed requestId, bytes error)`: Emitted when a price request fails.

## Core Functions

### `requestUraniumPrice`

```solidity
function requestUraniumPrice(uint64 subscriptionId, bytes32 donID) external onlyOwner returns (bytes32 requestId)
```

- **Purpose**: Initiates a Chainlink Functions request to fetch the uranium spot price.
- **Parameters**:
    - `subscriptionId` (`uint64`): The Chainlink subscription ID for billing.
    - `donID` (`bytes32`): The decentralized oracle network ID.
- **Access Control**: Restricted to the contract owner (`onlyOwner` modifier).
- **Logic**:
    - Initializes a `FunctionsRequest` with inline JavaScript (`SOURCE_CODE`).
    - Sends the request to Chainlink Functions with a gas limit of 600,000.
    - Stores the request ID in `lastRequestId`.
    - Emits the `PriceRequested` event.
- **Returns**: The `requestId` (`bytes32`) of the Chainlink Functions request.

### `fulfillRequest`

```solidity
function fulfillRequest(bytes32 requestId, bytes memory response, bytes memory err) internal override
```

- **Purpose**: Callback function used by Chainlink Functions to deliver the response or error.
- **Parameters**:
    - `requestId` (`bytes32`): The ID of the request.
    - `response` (`bytes`): The encoded response data (expected to be a `uint256` price).
    - `err` (`bytes`): Any error message if the request failed.
- **Logic**:
    - If `err` is non-empty, emits `RequestFailed` and exits.
    - Decodes the `response` into a `uint256` price.
    - Updates `lastPrice` and `lastRequestId`.
    - Emits the `PriceFulfilled` event.
- **Access**: Internal, called by Chainlink Functions.

### `getFormattedPrice`

```solidity
function getFormattedPrice() external view returns (uint256 wholePart, uint256 decimalPart)
```

- **Purpose**: Provides the stored price in a human-readable format (split into whole and decimal parts).
- **Logic**:
    - Divides `lastPrice` by 100 to get the `wholePart`.
    - Takes `lastPrice` modulo 100 to get the `decimalPart` (representing two decimal places).
- **Returns**:
    - `wholePart` (`uint256`): The integer part of the price.
    - `decimalPart` (`uint256`): The decimal part of the price (two digits).

## JavaScript Source Code

The `SOURCE_CODE` constant contains JavaScript executed by Chainlink Functions to fetch the uranium price:

- **API Endpoint**: `https://humble-rebirth-production.up.railway.app/?priceType=spot`
- **Logic**:
    - Makes an HTTP GET request to the API.
    - Checks for errors in the response.
    - Extracts the `uranium_price` from the response data.
    - Converts the price to a number (removing commas if it’s a string).
    - Validates the price format.
    - Scales the price by 100 (to handle two decimal places).
    - Encodes the result as a `uint256` using `Functions.encodeUint256`.

## Usage

1. **Deploy the Contract**:
    - Deploy with the address of the Chainlink Functions router for the target blockchain.
2. **Request Price**:
    - Call `requestUraniumPrice` with a valid `subscriptionId` and `donID`.
    - Ensure the subscription is funded with LINK tokens.
3. **Receive Price**:
    - Chainlink Functions executes the request and calls `fulfillRequest`.
    - The price is stored in `lastPrice` (scaled by 100).
4. **Read Price**:
    - Use `getFormattedPrice` to retrieve the price in a human-readable format (e.g., `$12.34` is returned as `wholePart = 12`, `decimalPart = 34`).

## Security Considerations

- **Access Control**: Only the contract owner can request price updates (`onlyOwner` modifier).
- **Error Handling**: The contract handles API and Chainlink errors gracefully, emitting `RequestFailed` if issues occur.
- **Price Validation**: The JavaScript source code validates the price format to prevent invalid data from being stored.
- **Gas Limit**: The request uses a 600,000 gas limit to ensure sufficient computation for the Chainlink Functions call.

## License

- **SPDX-License-Identifier**: MIT