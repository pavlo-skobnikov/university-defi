// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// Імпорт офіційного інтерфейсу маршрутизатора Uniswap V2
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract DefiIntegrator {
    IUniswapV2Router02 public immutable uniswapRouter;

    constructor(address _routerAddress) {
        uniswapRouter = IUniswapV2Router02(_routerAddress);
    }

    function provideLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired
    ) external {
        IERC20(tokenA).transferFrom(msg.sender, address(this), amountADesired);
        IERC20(tokenB).transferFrom(msg.sender, address(this), amountBDesired);

        IERC20(tokenA).approve(address(uniswapRouter), amountADesired);
        IERC20(tokenB).approve(address(uniswapRouter), amountBDesired);

        uniswapRouter.addLiquidity(
            tokenA,
            tokenB,
            amountADesired,
            amountBDesired,
            1, // amountAMin
            1, // amountBMin
            msg.sender,
            block.timestamp + 300
        );
    }

    function swapTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin
    ) external {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(uniswapRouter), amountIn);

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uniswapRouter.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            msg.sender,
            block.timestamp + 300
        );
    }
}
