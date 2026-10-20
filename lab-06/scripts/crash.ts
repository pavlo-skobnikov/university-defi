import { ethers } from "ethers";
import { readFileSync } from "node:fs";

const { engine: engineAddress, user } = JSON.parse(readFileSync("deployment.json", "utf8"));
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, new ethers.JsonRpcProvider(process.env.RPC_URL));
const engine = new ethers.Contract(engineAddress, [
    "function reduceCollateralForTesting(address user, uint256 amount)",
    "function getHealthFactor(address user) view returns (uint256)",
], wallet);

console.log(`HF до: ${ethers.formatEther(await engine.getHealthFactor(user))}`);
const tx = await engine.reduceCollateralForTesting(user, ethers.parseEther("0.002"));
await tx.wait();
console.log(`reduceCollateralForTesting(0.002 ETH): ${tx.hash}`);
console.log(`HF після: ${ethers.formatEther(await engine.getHealthFactor(user))}`);
