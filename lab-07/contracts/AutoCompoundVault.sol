// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract AutoCompoundVault is ERC20 {
    IERC20 public immutable underlyingAsset;
    IERC20 public immutable rewardToken;
    IUniswapV2Router02 public immutable router;

    event Deposited(address indexed caller, address indexed owner, uint256 assets, uint256 shares);
    event Withdrawn(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    event Compounded(uint256 rewardSold, uint256 assetsReinvested);

    constructor(
        address _asset,
        address _rewardToken,
        address _router,
        string memory _name,
        string memory _symbol
    ) ERC20(_name, _symbol) {
        underlyingAsset = IERC20(_asset);
        rewardToken = IERC20(_rewardToken);
        router = IUniswapV2Router02(_router);
    }

    function totalAssets() public view returns (uint256) {
        return underlyingAsset.balanceOf(address(this));
    }

    function convertToShares(uint256 assets) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return assets;
        }
        // Формула: (Активи * Загальна кількість акцій) / Загальна кількість активів
        return (assets * supply) / totalAssets();
    }

    function convertToAssets(uint256 shares) public view returns (uint256) {
        uint256 supply = totalSupply();
        if (supply == 0) {
            return shares;
        }
        // Формула: (Акції * Загальна кількість активів) / Загальна кількість акцій
        return (shares * totalAssets()) / supply;
    }

    function deposit(uint256 assets) external returns (uint256 shares) {
        require(assets > 0, "Zero assets");

        shares = convertToShares(assets);
        require(shares > 0, "Zero shares");

        // Спочатку випускаємо акції користувачу
        _mint(msg.sender, shares);

        // Потім фізично забираємо базовий актив (потребує approve)
        underlyingAsset.transferFrom(msg.sender, address(this), assets);

        emit Deposited(msg.sender, msg.sender, assets, shares);
    }

    function withdraw(uint256 shares) external returns (uint256 assets) {
        require(shares > 0, "Zero shares");

        assets = convertToAssets(shares);
        require(assets > 0, "Zero assets");

        // Спочатку спалюємо акції користувача
        _burn(msg.sender, shares);

        // Фізично повертаємо базовий актив
        underlyingAsset.transfer(msg.sender, assets);

        emit Withdrawn(msg.sender, msg.sender, msg.sender, assets, shares);
    }

    function compound() external {
        uint256 rewardBalance = rewardToken.balanceOf(address(this));
        require(rewardBalance > 0, "No rewards to compound");

        // Надаємо дозвіл маршрутизатору на обмін нашої винагороди
        rewardToken.approve(address(router), rewardBalance);

        address[] memory path = new address[](2);
        path[0] = address(rewardToken);
        path[1] = address(underlyingAsset);

        // Фіксуємо баланс базового активу до обміну
        uint256 initialAssetBalance = totalAssets();

        // Виконуємо міжконтрактний обмін винагороди на базовий актив
        router.swapExactTokensForTokens(
            rewardBalance,
            1, // У реальному контракті тут має бути розрахунок slippage
            path,
            address(this), // Сховище отримує базовий актив на свій баланс
            block.timestamp + 300
        );

        // Рахуємо, скільки базового активу ми отримали з обміну
        uint256 newAssets = totalAssets() - initialAssetBalance;

        emit Compounded(rewardBalance, newAssets);
    }
}
