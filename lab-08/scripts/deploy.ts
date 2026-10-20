import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "node:fs";

// Адреси з CCIP Directory (docs.chain.link/ccip/directory/testnet)
const SEPOLIA_ROUTER = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59";
const SEPOLIA_LINK = "0x779877A7B0D9E8603169DdbD7836e478b4624789";

const sepolia = new ethers.JsonRpcProvider(process.env.RPC_URL);
const arbitrum = new ethers.JsonRpcProvider(process.env.RPC_URL!.replace("eth-sepolia", "arb-sepolia"));
const key = process.env.PRIVATE_KEY!;
const artifact = (name: string) => JSON.parse(readFileSync(`artifacts/contracts/${name}.sol/${name}.json`, "utf8"));
const deploy = async (name: string, wallet: ethers.Wallet, ...args: unknown[]) => {
    const { abi, bytecode } = artifact(name);
    const contract = await new ethers.ContractFactory(abi, bytecode, wallet).deploy(...args);
    await contract.waitForDeployment();
    return await contract.getAddress();
};

const receiver = await deploy("MessageReceiver", new ethers.Wallet(key, arbitrum));
console.log(`MessageReceiver (Arbitrum Sepolia): ${receiver}`);

const l1 = new ethers.Wallet(key, sepolia);
const messenger = await deploy("CrossChainMessenger", l1, SEPOLIA_ROUTER, SEPOLIA_LINK);
console.log(`CrossChainMessenger (Sepolia): ${messenger}`);

// Поповнення месенджера LINK для оплати комісії CCIP
const link = new ethers.Contract(SEPOLIA_LINK, ["function transfer(address, uint256) returns (bool)"], l1);
await (await link.transfer(messenger, ethers.parseEther("1"))).wait();
console.log("Месенджер поповнено на 1 LINK");

writeFileSync("deployment.json", JSON.stringify({ messenger, receiver }, null, 2));
