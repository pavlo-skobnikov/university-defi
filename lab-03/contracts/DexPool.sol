// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DexPool {
    IERC20 public tokenA;
    IERC20 public tokenB;

    uint256 public reserveA;
    uint256 public reserveB;

    event Swap(address indexed trader, uint256 amountIn, uint256 amountOut);

    constructor(address _tokenA, address _tokenB) {
        tokenA = IERC20(_tokenA);
        tokenB = IERC20(_tokenB);
    }

    function addLiquidity(uint256 amountA, uint256 amountB) external {
        tokenA.transferFrom(msg.sender, address(this), amountA);
        tokenB.transferFrom(msg.sender, address(this), amountB);

        reserveA += amountA;
        reserveB += amountB;
    }

    // Динамічна комісія: 0.1% для угод до 5% резерву, 1% для більших
    function getFee(uint256 amountIn) public view returns (uint256) {
        return amountIn * 100 > reserveA * 5 ? 10 : 1;
    }

    function swapAforB(uint256 amountInA) external {
        require(amountInA > 0, "Amount must be greater than zero");

        uint256 amountInWithFee = amountInA * (1000 - getFee(amountInA));
        uint256 numerator = amountInWithFee * reserveB;
        uint256 denominator = (reserveA * 1000) + amountInWithFee;

        uint256 amountOutB = numerator / denominator;
        require(amountOutB > 0, "Insufficient output");

        reserveA += amountInA;
        reserveB -= amountOutB;

        tokenA.transferFrom(msg.sender, address(this), amountInA);
        tokenB.transfer(msg.sender, amountOutB);
        emit Swap(msg.sender, amountInA, amountOutB);
    }
}
