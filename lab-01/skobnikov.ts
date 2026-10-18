import { ethers } from "ethers";

const BIRTHDAY = "28";
const { RPC_URL, PRIVATE_KEY } = process.env;

if (!PRIVATE_KEY) {
  let wallet = ethers.Wallet.createRandom();
  let attempts = 1;
  while (!wallet.address.startsWith("0x" + BIRTHDAY)) {
    wallet = ethers.Wallet.createRandom();
    attempts++;
  }
  console.log(`Знайдено за ${attempts} спроб`);
  console.log("Address:    ", wallet.address);
  console.log("PrivateKey: ", wallet.privateKey);
  process.exit(0);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
console.log("Address:", wallet.address);

const balance = await provider.getBalance(wallet.address);
console.log("Balance:", ethers.formatEther(balance), "ETH");

const to = "0x42645cE4Dd0B766dE53ee483cbf54bcEa670f9b2";
const tx = await wallet.sendTransaction({ to, value: ethers.parseEther("0.001"), gasLimit: 21000 });
console.log("To:     ", to);
console.log("Tx hash:", tx.hash);

const receipt = await tx.wait();
console.log("Status: ", receipt!.status);
console.log("Block:  ", receipt!.blockNumber);
console.log("GasUsed:", receipt!.gasUsed.toString());
