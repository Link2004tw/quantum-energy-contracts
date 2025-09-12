// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract MockFunctionsRouter {
    event RequestSent(
        bytes32 indexed requestId,
        bytes data,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 donId
    );

    function sendRequest(
        bytes calldata data,
        uint64 subscriptionId,
        uint32 gasLimit,
        bytes32 donId
    ) external returns (bytes32) {
        console.log("MockFunctionsRouter: _sendRequest called");
        console.logBytes(data);
        console.log("SubscriptionId:", subscriptionId);
        console.log("GasLimit:", gasLimit);
        console.logBytes32(donId);

        bytes32 requestId = keccak256(
            abi.encodePacked(msg.sender, block.timestamp, data)
        );
        emit RequestSent(requestId, data, subscriptionId, gasLimit, donId);
        return requestId;
    }

    // Helper function to simulate fulfillment in tests
    function simulateFulfillment(
        bytes32 requestId,
        bytes calldata response,
        bytes calldata err
    ) external {
        console.log("MockFunctionsRouter: simulateFulfillment called");
        console.logBytes32(requestId);
        (bool success, ) = msg.sender.call(
            abi.encodeWithSignature(
                "_fulfillRequest(bytes32,bytes,bytes)",
                requestId,
                response,
                err
            )
        );
        require(success, "Fulfillment failed");
    }
}
