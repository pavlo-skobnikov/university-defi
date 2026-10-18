import { ethers } from "ethers";
import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:http";

const RPC_URL = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const POOL = process.env.POOL ?? "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

const db = new DatabaseSync("swaps.db");
db.exec(`CREATE TABLE IF NOT EXISTS swaps (
  transactionHash TEXT, logIndex INTEGER, blockNumber INTEGER,
  trader TEXT, amountIn TEXT, amountOut TEXT,
  PRIMARY KEY (transactionHash, logIndex))`);
const insert = db.prepare("INSERT OR IGNORE INTO swaps VALUES (?, ?, ?, ?, ?, ?)");

const provider = new ethers.JsonRpcProvider(RPC_URL);
const pool = new ethers.Contract(POOL, ["event Swap(address indexed trader, uint256 amountIn, uint256 amountOut)"], provider);

const last = db.prepare("SELECT MAX(blockNumber) AS b FROM swaps").get() as { b: number | null };
let fromBlock = (last.b ?? -1) + 1;
console.log(`Слухаємо події Swap пулу ${POOL}...`);

async function poll() {
  try {
    const toBlock = await provider.getBlockNumber();
    if (toBlock >= fromBlock) {
      const logs = await pool.queryFilter(pool.filters.Swap(), fromBlock, toBlock);
      for (const log of logs as ethers.EventLog[]) {
        const [trader, amountIn, amountOut] = log.args;
        insert.run(log.transactionHash, log.index, log.blockNumber, trader.toLowerCase(),
          ethers.formatEther(amountIn), ethers.formatEther(amountOut));
        console.log(`Блок: ${log.blockNumber} | Хеш: ${log.transactionHash}`);
        console.log(`Трейдер: ${trader} | Віддав: ${ethers.formatEther(amountIn)} | Отримав: ${ethers.formatEther(amountOut)}\n`);
      }
      fromBlock = toBlock + 1;
    }
  } catch (e) {
    console.log(`Помилка опитування RPC: ${(e as Error).message}`);
  }
  setTimeout(poll, 5000);
}
poll();

createServer((req, res) => {
  const url = new URL(req.url!, "http://localhost");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/json");
  if (url.pathname !== "/api/swaps") return res.writeHead(404).end("[]");
  const trader = (url.searchParams.get("trader") ?? "").toLowerCase();
  res.end(JSON.stringify(db.prepare("SELECT transactionHash, amountIn, amountOut FROM swaps WHERE trader = ? ORDER BY blockNumber").all(trader)));
}).listen(3001, () => console.log("REST API: http://localhost:3001/api/swaps?trader=0x..."));
