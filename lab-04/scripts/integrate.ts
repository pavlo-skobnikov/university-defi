import { ethers } from "ethers";
import { readFileSync } from "node:fs";

const UNISWAP_V2_ROUTER = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008";

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.NonceManager(new ethers.Wallet(process.env.PRIVATE_KEY!, provider));
const artifact = (name: string) => JSON.parse(readFileSync(`artifacts/contracts/${name}.sol/${name}.json`, "utf8"));
const deploy = async (name: string, ...args: unknown[]) => {
    const { abi, bytecode } = artifact(name);
    const contract = await new ethers.ContractFactory(abi, bytecode, wallet).deploy(...args);
    await contract.waitForDeployment();
    console.log(`${name} розгорнуто: ${await contract.getAddress()}`);
    return contract as ethers.Contract;
};
const call = async (fn: ethers.BaseContractMethod, ...args: unknown[]) =>
    fn(...args, { gasLimit: (await fn.estimateGas(...args)) * 13n / 10n });
const send = async (label: string, tx: Promise<ethers.ContractTransactionResponse>) => {
    const receipt = await (await tx).wait();
    console.log(`${label}: ${receipt!.hash}`);
};

// 1. Емісія двох токенів і розгортання інтегратора
const tokenA = await deploy("AssetToken", "SkobnikovCoin", "SKC", 1000000);
const tokenB = await deploy("AssetToken", "MockFiat", "MFT", 1000000);
const integrator = await deploy("DefiIntegrator", UNISWAP_V2_ROUTER);
const [a, b, i] = await Promise.all([tokenA.getAddress(), tokenB.getAddress(), integrator.getAddress()]);

// a) approve інтегратору
await send("Approve SKC", tokenA.approve(i, ethers.parseEther("1050")));
await send("Approve MFT", tokenB.approve(i, ethers.parseEther("2000")));

// b) новий пул SKC/MFT з ліквідністю 1000/2000
await send("provideLiquidity", call(integrator.provideLiquidity, a, b, ethers.parseEther("1000"), ethers.parseEther("2000")));

// c) обмін 50 SKC -> MFT з допуском проковзування 1%
const router = new ethers.Contract(UNISWAP_V2_ROUTER, ["function getAmountsOut(uint256, address[]) view returns (uint256[])"], provider);
const [, expected] = await router.getAmountsOut(ethers.parseEther("50"), [a, b]);
const before = await tokenB.balanceOf(await wallet.getAddress());
await send("swapTokens", call(integrator.swapTokens, a, b, ethers.parseEther("50"), expected * 99n / 100n));
console.log(`Отримано: ${ethers.formatEther(await tokenB.balanceOf(await wallet.getAddress()) - before)} MFT`);
