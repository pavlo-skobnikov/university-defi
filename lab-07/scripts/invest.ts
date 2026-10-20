import { ethers } from "ethers";
import { readFileSync } from "node:fs";

const UNISWAP_V2_ROUTER = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008";
// Токени з ЛР4, пул SKC/MFT у Uniswap V2 вже існує
const TOKEN_A = "0xFeC196011913d8297549a51b1F3109E339602FD4"; // SkobnikovCoin (базовий актив)
const TOKEN_B = "0x4184dF0eC0a6aFFDa43AE6266AdfC26488789f0D"; // MockFiat (винагорода)

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.NonceManager(new ethers.Wallet(process.env.PRIVATE_KEY!, provider));
const erc20 = ["function approve(address, uint256) returns (bool)", "function transfer(address, uint256) returns (bool)"];
const tokenA = new ethers.Contract(TOKEN_A, erc20, wallet);
const tokenB = new ethers.Contract(TOKEN_B, erc20, wallet);
const send = async (tx: Promise<ethers.ContractTransactionResponse>) => (await tx).wait();
const fmt = ethers.formatEther;

const { abi, bytecode } = JSON.parse(readFileSync("artifacts/contracts/AutoCompoundVault.sol/AutoCompoundVault.json", "utf8"));
const vault = await new ethers.ContractFactory(abi, bytecode, wallet)
    .deploy(TOKEN_A, TOKEN_B, UNISWAP_V2_ROUTER, "Vault SkobnikovCoin", "vSKC") as ethers.Contract;
await vault.waitForDeployment();
const vaultAddress = await vault.getAddress();
const user = await wallet.getAddress();
console.log(`AutoCompoundVault: ${vaultAddress}\n`);

// a) депозит 1000 SKC
await send(tokenA.approve(vaultAddress, ethers.parseEther("1000")));
await send(vault.deposit(ethers.parseEther("1000")));
const shares = await vault.balanceOf(user);
console.log(`[Депозит] 1000 SKC → ${fmt(shares)} vSKC`);
console.log(`[До] convertToAssets: ${fmt(await vault.convertToAssets(shares))} SKC, totalAssets: ${fmt(await vault.totalAssets())} SKC\n`);

// Імітація винагороди: прямий переказ 100 MFT на адресу сховища
await send(tokenB.transfer(vaultAddress, ethers.parseEther("100")));
console.log("[Винагорода] 100 MFT переказано на сховище");

// b) compound
const tx = await vault.compound({ gasLimit: (await vault.compound.estimateGas()) * 13n / 10n });
await tx.wait();
console.log(`[Compound] ${tx.hash}\n`);

// c) вартість акцій після компаундингу
const assets = await vault.convertToAssets(shares);
console.log(`[Після] convertToAssets: ${fmt(assets)} SKC, totalAssets: ${fmt(await vault.totalAssets())} SKC`);
console.log(`[Результат] ${fmt(shares)} vSKC можна обміняти на ${fmt(assets)} SKC (+${fmt(assets - ethers.parseEther("1000"))} SKC)`);
