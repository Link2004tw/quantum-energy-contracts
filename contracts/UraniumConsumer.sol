// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FunctionsClient} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/FunctionsClient.sol";
import {ConfirmedOwner} from "@chainlink/contracts/src/v0.8/shared/access/ConfirmedOwner.sol";
import {FunctionsRequest} from "@chainlink/contracts/src/v0.8/functions/v1_0_0/libraries/FunctionsRequest.sol";

contract UraniumPriceConsumer is FunctionsClient, ConfirmedOwner {
    using FunctionsRequest for FunctionsRequest.Request;

    uint256 public lastPrice;
    bytes32 public lastRequestId;

    string private constant SOURCE_CODE =
        "const response = await Functions.makeHttpRequest({ "
        "url: 'https://humble-rebirth-production.up.railway.app/?priceType=spot', "
        "method: 'GET', "
        "}); "
        "if (!response || response.error) { "
        "  throw Error('Request failed'); "
        "} "
        "let price = response.data.data.uranium_price; "
        "if (typeof price === 'string') { "
        "  price = parseFloat(price.replace(/,/g, '')); "
        "} "
        "if (!Number.isFinite(price)) { "
        "  throw Error('Invalid price format'); "
        "} "
        "const scaled = Math.round(price * 100); "
        "return Functions.encodeUint256(scaled);";

    constructor(
        address router
    ) FunctionsClient(router) ConfirmedOwner(msg.sender) {}

    event PriceRequested(bytes32 indexed requestId, uint64 subscriptionId);
    event PriceFulfilled(bytes32 indexed requestId, uint256 price);
    event RequestFailed(bytes32 indexed requestId, bytes error);

    // Enhanced fulfillment callback with error handling
    function fulfillRequest(
        bytes32 requestId,
        bytes memory response,
        bytes memory err
    ) internal override {
        if (err.length > 0) {
            emit RequestFailed(requestId, err);
            return;
        }

        // Decode the response
        uint256 newPrice = abi.decode(response, (uint256));
        lastPrice = newPrice;
        lastRequestId = requestId;

        emit PriceFulfilled(requestId, lastPrice);
    }

    function requestUraniumPrice(
        uint64 subscriptionId,
        bytes32 donID
    ) external onlyOwner returns (bytes32 requestId) {
        // Build the request
        FunctionsRequest.Request memory req;
        req.initializeRequestForInlineJavaScript(SOURCE_CODE);

        // Send the request with higher gas limit
        requestId = _sendRequest(
            req.encodeCBOR(),
            subscriptionId,
            600_000,
            donID
        );
        lastRequestId = requestId;

        emit PriceRequested(requestId, subscriptionId);
        return requestId;
    }

    // Helper function to get price in human-readable format (with 2 decimals)
    function getFormattedPrice()
        external
        view
        returns (uint256 wholePart, uint256 decimalPart)
    {
        wholePart = lastPrice / 100;
        decimalPart = lastPrice % 100;
    }
}
