import { network } from "hardhat";

async function main() {
    const { ethers } = await network.create();
    const [, trader] = await ethers.getSigners();

    // 1. Емісія двох активів
    const Token = await ethers.getContractFactory("AssetToken");
    const tokenA = await Token.deploy("SkobnikovCoin", "SKC", 1000000);
    const tokenB = await Token.deploy("MockFiat", "MFT", 1000000);

    console.log(`[Емісія] SKC розгорнуто за адресою: ${await tokenA.getAddress()}`);
    console.log(`[Емісія] MFT розгорнуто за адресою: ${await tokenB.getAddress()}`);

    // 2. Розгортання пулу ліквідності
    const DexPool = await ethers.getContractFactory("DexPool");
    const pool = await DexPool.deploy(await tokenA.getAddress(), await tokenB.getAddress());
    const poolAddress = await pool.getAddress();
    console.log(`[Пул] DexPool розгорнуто за адресою: ${poolAddress}`);

    // 3. Approve
    await tokenA.approve(poolAddress, ethers.parseEther("100000"));
    await tokenB.approve(poolAddress, ethers.parseEther("100000"));

    // 4. Ліквідність 1:2
    console.log("\n[Ліквідність] Додаємо 1000 SKC та 2000 MFT у пул...");
    await pool.addLiquidity(ethers.parseEther("1000"), ethers.parseEther("2000"));

    // 5. Обмін 50 SKC -> MFT
    await tokenA.transfer(trader.address, ethers.parseEther("50"));
    await tokenA.connect(trader).approve(poolAddress, ethers.parseEther("50"));

    const fee = await pool.getFee(ethers.parseEther("50"));
    console.log(`\n[Трейдинг] Трейдер продає 50 SKC (комісія ${Number(fee) / 10}%)...`);
    await pool.connect(trader).swapAforB(ethers.parseEther("50"));

    // 6. Результат
    const balance = await tokenB.balanceOf(trader.address);
    console.log(`[Результат] Трейдер отримав: ${ethers.formatEther(balance)} MFT`);
    console.log(`[Пул] Резерви: ${ethers.formatEther(await pool.reserveA())} SKC / ${ethers.formatEther(await pool.reserveB())} MFT`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
