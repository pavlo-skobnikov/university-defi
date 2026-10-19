import { network } from "hardhat";

const { ethers } = await network.create();
const [user] = await ethers.getSigners();

const coin = await ethers.deployContract("StableCoin", [user.address]);
const engine = await ethers.deployContract("StableEngine", [await coin.getAddress()]);
await coin.transferOwnership(await engine.getAddress());
console.log(`SkobnikovUSD: ${await coin.getAddress()}`);
console.log(`StableEngine: ${await engine.getAddress()}`);
console.log(`Ціна ETH: ${ethers.formatEther(await engine.mockEthUsdPrice())} USD\n`);

// a) депозит 2 ETH
await engine.depositCollateral({ value: ethers.parseEther("2") });
console.log(`[Депозит] 2 ETH, вартість застави: ${ethers.formatEther(await engine.getUsdValue(ethers.parseEther("2")))} USD`);

// b) максимальний мінт: вартість застави * 100 / CR
const collateralUsd = await engine.getUsdValue(await engine.collateralDeposited(user.address));
const maxMint = collateralUsd * 100n / await engine.COLLATERAL_RATIO();
await engine.mintStablecoin(maxMint);
console.log(`[Мінт] ${ethers.formatEther(await coin.balanceOf(user.address))} sUSD`);
console.log(`[HF] ${ethers.formatEther(await engine.getHealthFactor(user.address))}\n`);

// c) спроба зняти 1 ETH
try {
    await engine.withdrawCollateral(ethers.parseEther("1"));
    console.log("[Помилка] Зняття пройшло, захист не спрацював");
} catch (e) {
    console.log(`[Захист] withdrawCollateral(1 ETH) відхилено: ${(e as Error).message.match(/'(.+)'/)?.[1] ?? (e as Error).message}`);
    console.log("[Захист] Захист спрацював успішно");
}
