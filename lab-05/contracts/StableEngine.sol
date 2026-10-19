// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./StableCoin.sol";

contract StableEngine {
    StableCoin public immutable sUsd;

    uint256 public constant COLLATERAL_RATIO = 150;
    uint256 public constant MIN_HEALTH_FACTOR = 1e18;

    uint256 public mockEthUsdPrice = 2000e18;

    mapping(address => uint256) public collateralDeposited;
    mapping(address => uint256) public sUsdMinted;

    event CollateralDeposited(address indexed user, uint256 amount);
    event StablecoinMinted(address indexed user, uint256 amount);

    constructor(address _sUsdAddress) {
        sUsd = StableCoin(_sUsdAddress);
    }

    function depositCollateral() external payable {
        require(msg.value > 0, "Needs more than 0");
        collateralDeposited[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }

    function mintStablecoin(uint256 _sUsdAmount) external {
        require(_sUsdAmount > 0, "Needs more than 0");

        sUsdMinted[msg.sender] += _sUsdAmount;

        // Перевіряємо, чи позиція залишається надійною після випуску боргу
        _revertIfHealthFactorIsBroken(msg.sender);

        sUsd.mint(msg.sender, _sUsdAmount);
        emit StablecoinMinted(msg.sender, _sUsdAmount);
    }

    function burnStablecoin(uint256 amount) external {
        require(amount > 0, "Needs more than 0");
        sUsdMinted[msg.sender] -= amount;
        sUsd.burn(msg.sender, amount);
    }

    function withdrawCollateral(uint256 amount) external {
        require(amount > 0, "Needs more than 0");
        collateralDeposited[msg.sender] -= amount;
        _revertIfHealthFactorIsBroken(msg.sender);
        payable(msg.sender).transfer(amount);
    }

    // Зміна ринкової ціни (лише для симуляції в лабораторній)
    function setMockOraclePrice(uint256 _newPrice) external {
        mockEthUsdPrice = _newPrice;
    }

    function getHealthFactor(address user) public view returns (uint256) {
        uint256 debt = sUsdMinted[user];
        if (debt == 0) return type(uint256).max;

        uint256 collateralValueInUsd = getUsdValue(collateralDeposited[user]);
        uint256 collateralAdjustedForThreshold = (collateralValueInUsd * 100) / COLLATERAL_RATIO;

        return (collateralAdjustedForThreshold * 1e18) / debt;
    }

    function getUsdValue(uint256 ethAmount) public view returns (uint256) {
        return (ethAmount * mockEthUsdPrice) / 1e18;
    }

    function _revertIfHealthFactorIsBroken(address user) internal view {
        uint256 userHealthFactor = getHealthFactor(user);
        require(userHealthFactor >= MIN_HEALTH_FACTOR, "Health factor is broken (under 1.0)");
    }
}
