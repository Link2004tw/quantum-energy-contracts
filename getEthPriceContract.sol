// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract EthPriceContract {
    AggregatorV3Interface internal priceFeed;

    // Initialize with Chainlink ETH/USD price feed address
    constructor(address _priceFeedAddress) {
        priceFeed = AggregatorV3Interface(_priceFeedAddress);
    }

    // Get the latest ETH/USD price
    function getLatestPrice() public view returns (int) {
        (
            , // roundId
            int price, // price in USD (with 8 decimals)
            , // startedAt
            , // updatedAt
            // answeredInRound
        ) = priceFeed.latestRoundData();
        return price; // Returns ETH price in USD (e.g., 2000.12345678 * 10^8)
    }

    // Get price decimals (usually 8 for ETH/USD)
    function getPriceDecimals() public view returns (uint8) {
        return priceFeed.decimals();
    }
}