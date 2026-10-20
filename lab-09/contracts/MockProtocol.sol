// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MockProtocol is Ownable {
    uint256 public fee;

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setFee(uint256 newFee) external onlyOwner {
        fee = newFee;
    }
}
