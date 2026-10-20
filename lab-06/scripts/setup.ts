import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "node:fs";

const PRICE_FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306"; // Chainlink ETH/USD, Sepolia

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const borrower = new ethers.NonceManager(new ethers.Wallet(process.env.PRIVATE_KEY!, provider));
const liquidator = new ethers.Wallet(process.env.LIQUIDATOR_KEY!).address;
const artifact = (name: string) => JSON.parse(readFileSync(`artifacts/contracts/${name}.sol/${name}.json`, "utf8"));
const deploy = async (name: string, ...args: unknown[]) => {
    const { abi, bytecode } = artifact(name);
    const contract = await new ethers.ContractFactory(abi, bytecode, borrower).deploy(...args);
    await contract.waitForDeployment();
    console.log(`${name}: ${await contract.getAddress()}`);
    return contract as ethers.Contract;
};
const send = async (tx: Promise<ethers.ContractTransactionResponse>) => (await tx).wait();

const user = await borrower.getAddress();
const coin = await deploy("StableCoin", user);
const engine = await deploy("StableEngine", await coin.getAddress(), PRICE_FEED);
await send(coin.transferOwnership(await engine.getAddress()));

// Позиція з HF ≈ 1.1
await send(engine.depositCollateral({ value: ethers.parseEther("0.01") }));
const collateralUsd = await engine.getUsdValue(ethers.parseEther("0.01"));
const debt = collateralUsd * 100n / 150n * 10n / 11n;
await send(engine.mintStablecoin(debt));
console.log(`Ціна ETH (Chainlink): ${ethers.formatEther(await engine.getUsdValue(ethers.parseEther("1")))} USD`);
console.log(`Боржник ${user}: застава 0.01 ETH, борг ${ethers.formatEther(debt)} sUSD`);
console.log(`HF: ${ethers.formatEther(await engine.getHealthFactor(user))}`);

// Ліквідатор отримує sUSD для погашення боргу і ETH на газ
await send(coin.transfer(liquidator, debt));
await (await borrower.sendTransaction({ to: liquidator, value: ethers.parseEther("0.002") })).wait();
console.log(`Ліквідатор ${liquidator}: ${ethers.formatEther(debt)} sUSD, 0.002 ETH`);

writeFileSync("deployment.json", JSON.stringify({ engine: await engine.getAddress(), user }, null, 2));
