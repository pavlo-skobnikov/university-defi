import { ethers } from "ethers";
import { readFileSync } from "node:fs";

const GOVERNANCE_TOKEN = "0xFeC196011913d8297549a51b1F3109E339602FD4"; // SkobnikovCoin з ЛР4

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.NonceManager(new ethers.Wallet(process.env.PRIVATE_KEY!, provider));
const deploy = async (name: string, ...args: unknown[]) => {
    const { abi, bytecode } = JSON.parse(readFileSync(`artifacts/contracts/${name}.sol/${name}.json`, "utf8"));
    const contract = await new ethers.ContractFactory(abi, bytecode, wallet).deploy(...args);
    await contract.waitForDeployment();
    console.log(`${name}: ${await contract.getAddress()}`);
    return contract as ethers.Contract;
};
const send = async (label: string, tx: Promise<ethers.ContractTransactionResponse>) => {
    const receipt = await (await tx).wait();
    console.log(`${label}: ${receipt!.hash}`);
};

const dao = await deploy("SimpleDAO", GOVERNANCE_TOKEN);
const protocol = await deploy("MockProtocol", await wallet.getAddress());
await send("transferOwnership → DAO", protocol.transferOwnership(await dao.getAddress()));
console.log(`MockProtocol.owner: ${await protocol.owner()}, fee: ${await protocol.fee()}\n`);

// Payload: закодований виклик setFee(10)
const payload = protocol.interface.encodeFunctionData("setFee", [10]);
console.log(`Payload setFee(10): ${payload}`);
await send("createProposal", dao.createProposal(await protocol.getAddress(), payload, "Proposal #1: встановити комісію 10"));
await send("vote (за)", dao.vote(0, true));

const { deadline } = await dao.proposals(0);
console.log("\nОчікування завершення голосування...");
while ((await provider.getBlock("latest"))!.timestamp < deadline) await new Promise((r) => setTimeout(r, 10000));

await send("executeProposal", dao.executeProposal(0));
console.log(`\nMockProtocol.fee = ${await protocol.fee()}`);
