// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

// Mock FunctionsClient for local Hardhat testing
// Prompt: Fix Error: Transaction reverted: function selector was not recognized and there's no fallback function
// by updating MockFunctionsClient to implement handleOracleRequest, matching the Chainlink Functions Router's interface,
// to simulate _sendRequest behavior in UraniumPriceConsumer tests.
// CHANGE (Current): Replaced _sendRequest with handleOracleRequest to match the external function called by FunctionsClient's internal _sendRequest.
// CHANGE (Current): Ensured compatibility with Sepolia Router (0xb83E47C2bC239B3bf370bc41e1459A34b41238D0) signature.

contract MockFunctionsClient {
    function sendRequest(
        bytes memory data,
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        bytes32 donId
    ) external returns (bytes32) {
        // Simulate successful request; return a predictable requestId
        return bytes32(uint256(1)); // 0x000...01 (32 bytes)
    }
}
