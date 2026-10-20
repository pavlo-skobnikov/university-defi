import { ethers } from "ethers";
import { readFileSync } from "node:fs";

const { engine: engineAddress, user } = JSON.parse(readFileSync("deployment.json", "utf8"));
const wallet = new ethers.Wallet(process.env.LIQUIDATOR_KEY!, new ethers.JsonRpcProvider(process.env.RPC_URL));
const engine = new ethers.Contract(engineAddress, [
    "function getHealthFactor(address user) view returns (uint256)",
    "function liquidate(address user)",
], wallet);

// У реальному боті список формується з БД індексатора (ЛР3)
const usersToMonitor = [user];
console.log(`Запуск бота-ліквідатора ${wallet.address}. Очікування зміни HF...`);

while (true) {
    for (const u of usersToMonitor) {
        try {
            const hf = await engine.getHealthFactor(u);
            console.log(`Позиція ${u} | HF: ${hf === ethers.MaxUint256 ? "∞" : ethers.formatEther(hf)}`);

            if (hf < ethers.parseEther("1")) {
                console.log(`[УВАГА] Виявлено неплатоспроможну позицію ${u}! Ініціалізація ліквідації...`);
                const tx = await engine.liquidate(u);
                const receipt = await tx.wait();
                console.log(`[УСПІХ] Позицію ліквідовано у блоці ${receipt.blockNumber}. Tx: ${receipt.hash}`);
            }
        } catch (e) {
            console.log(`Помилка перевірки позиції ${u}: ${(e as Error).message}`);
        }
    }
    await new Promise((r) => setTimeout(r, 12000));
}
