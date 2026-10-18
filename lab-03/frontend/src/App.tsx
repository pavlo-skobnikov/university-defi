import { useState } from 'react';
import { ethers } from 'ethers';

type Swap = { transactionHash: string; amountIn: string; amountOut: string };

declare global {
  interface Window { ethereum?: ethers.Eip1193Provider }
}

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [history, setHistory] = useState<Swap[]>([]);

  // Підключення Web3 гаманця (MetaMask)
  const connectWallet = async () => {
    if (window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const userAddress = accounts[0];
      setAccount(userAddress);

      // Завантажуємо історію з нашого бекенду одразу після підключення
      fetchHistory(userAddress);
    } else {
      alert("Будь ласка, встановіть розширення MetaMask!");
    }
  };

  const fetchHistory = async (walletAddress: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/swaps?trader=${walletAddress}`);
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error("Помилка завантаження історії:", error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>DeFi Пул (React SPA)</h1>

      {!account ? (
        <button onClick={connectWallet} style={{ padding: '10px' }}>Підключити MetaMask</button>
      ) : (
        <p><strong>Підключено:</strong> {account}</p>
      )}
      <h2>Історія обмінів (з БД)</h2>
      <table border={1} cellPadding={10} style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th>Хеш транзакції</th>
            <th>Віддав (Amount In)</th>
            <th>Отримав (Amount Out)</th>
          </tr>
        </thead>
        <tbody>
          {history.length > 0 ? history.map((swap, index) => (
            <tr key={index}>
              <td>{swap.transactionHash}</td>
              <td>{swap.amountIn}</td>
              <td>{swap.amountOut}</td>
            </tr>
          )) : <tr><td colSpan={3}>Історія порожня</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
export default App;
