// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockLinkToken is ERC20 {
    constructor() ERC20("Chainlink Token", "LINK") {
        _mint(msg.sender, 1000000 * 10 ** 18); // Mint 1M LINK to deployer
    }
}
