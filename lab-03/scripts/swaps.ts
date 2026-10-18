import { network } from "hardhat";

const { ethers } = await network.create();
const [trader] = await ethers.getSigners();

const Token = await ethers.getContractFactory("AssetToken");
const tokenA = await Token.deploy("SkobnikovCoin", "SKC", 1000000);
const tokenB = await Token.deploy("MockFiat", "MFT", 1000000);
const pool = await (await ethers.getContractFactory("DexPool")).deploy(await tokenA.getAddress(), await tokenB.getAddress());
const poolAddress = await pool.getAddress();
console.log(`DexPool: ${poolAddress}`);

await tokenA.approve(poolAddress, ethers.MaxUint256);
await tokenB.approve(poolAddress, ethers.MaxUint256);
await pool.addLiquidity(ethers.parseEther("1000"), ethers.parseEther("2000"));

for (const amount of ["10", "50", "100"]) {
    const tx = await pool.swapAforB(ethers.parseEther(amount));
    console.log(`Swap ${amount} SKC: ${tx.hash}`);
}
console.log(`Трейдер: ${trader.address}`);
