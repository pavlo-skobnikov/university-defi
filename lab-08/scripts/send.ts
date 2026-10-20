import { ethers } from "ethers";
import { readFileSync } from "node:fs";

const ARBITRUM_SEPOLIA_SELECTOR = 3478487238524512106n;
const { messenger: messengerAddress, receiver } = JSON.parse(readFileSync("deployment.json", "utf8"));

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, new ethers.JsonRpcProvider(process.env.RPC_URL));
const messenger = new ethers.Contract(messengerAddress, [
    "function sendMessage(uint64, address, string) returns (bytes32)",
    "event MessageSent(bytes32 indexed messageId, uint64 indexed destinationChainSelector, address receiver, string text, uint256 feePaid)",
], wallet);

console.log("[Агент] Ініціалізація крос-чейн транзакції...");
const args = [ARBITRUM_SEPOLIA_SELECTOR, receiver, "Hello L2 from L1! Skobnikov"];
const tx = await messenger.sendMessage(...args, { gasLimit: (await messenger.sendMessage.estimateGas(...args)) * 13n / 10n });
const receipt = await tx.wait();
const event = receipt.logs.map((l: ethers.Log) => messenger.interface.parseLog(l)).find((e: ethers.LogDescription | null) => e?.name === "MessageSent")!;

console.log(`[УСПІХ] Транзакцію включено у блок L1: ${receipt.blockNumber}`);
console.log(`Хеш транзакції (TxHash): ${receipt.hash}`);
console.log(`MessageId: ${event.args.messageId}`);
console.log(`Комісія CCIP: ${ethers.formatEther(event.args.feePaid)} LINK`);
console.log(`\nВідстеження доставки: https://ccip.chain.link/msg/${event.args.messageId}`);
