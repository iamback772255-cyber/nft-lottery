import { useState, useEffect } from "react";
import { useWallet } from "./hooks/useWallet";
import {
  getLotteryCount,
  getLottery,
  getUserTickets,
  prepareTransaction,
  type Lottery,
  CONTRACT_ID,
  ADMIN_ADDRESS,
} from "./utils/contract";
import { nativeToScVal, Address } from "@stellar/stellar-sdk";
import "./App.css";

function App() {
  const wallet = useWallet();
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLottery, setSelectedLottery] = useState<number | null>(null);
  const [userTickets, setUserTickets] = useState<number[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBuyForm, setShowBuyForm] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Create lottery form state
  const [createForm, setCreateForm] = useState({
    ticket_price: "",
    max_tickets: "",
    nft_name: "",
    nft_image: "",
    nft_rarity: "1",
  });

  // Buy tickets form state
  const [buyForm, setBuyForm] = useState({
    num_tickets: "1",
  });

  useEffect(() => {
    loadLotteries();
  }, []);

  const loadLotteries = async () => {
    try {
      setLoading(true);
      setError(null);
      const count = await getLotteryCount();
      const lotteryPromises: Promise<Lottery | null>[] = [];

      for (let i = 1; i <= count; i++) {
        lotteryPromises.push(getLottery(i));
      }

      const results = await Promise.all(lotteryPromises);
      setLotteries(results.filter((l): l is Lottery => l !== null));
    } catch (err: any) {
      setError(err.message || "Failed to load lotteries");
    } finally {
      setLoading(false);
    }
  };

  const loadUserTickets = async (lotteryId: number) => {
    if (!wallet.address) return;

    try {
      const tickets = await getUserTickets(wallet.address, lotteryId);
      setUserTickets(tickets);
    } catch (err) {
      console.error("Error loading user tickets:", err);
    }
  };

  const handleCreateLottery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.address || !wallet.networkPassphrase) {
      setError("Wallet not connected");
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Validate ticket price - must be positive and reasonable
      const ticketPrice = BigInt(createForm.ticket_price);
      if (ticketPrice <= 0n) {
        setError("Ticket price must be greater than 0");
        setProcessing(false);
        return;
      }

      // Validate max tickets
      const maxTickets = Number(createForm.max_tickets);
      if (maxTickets <= 0 || maxTickets > 10000) {
        setError("Max tickets must be between 1 and 10000");
        setProcessing(false);
        return;
      }

      // Validate rarity
      const rarity = Number(createForm.nft_rarity);
      if (rarity < 1 || rarity > 4) {
        setError("Rarity must be between 1 and 4");
        setProcessing(false);
        return;
      }

      const adminAddr = Address.fromString(wallet.address);
      const args = [
        nativeToScVal(adminAddr, { type: "address" }),
        nativeToScVal(ticketPrice, { type: "i128" }),
        nativeToScVal(maxTickets, { type: "u32" }),
        nativeToScVal(createForm.nft_name, { type: "string" }),
        nativeToScVal(createForm.nft_image, { type: "string" }),
        nativeToScVal(rarity, { type: "u32" }),
      ];

      const txXdr = await prepareTransaction(
        "create_lottery",
        args,
        wallet.address,
        wallet.networkPassphrase
      );

      await wallet.signAndSubmit(txXdr);

      setShowCreateForm(false);
      setCreateForm({
        ticket_price: "",
        max_tickets: "",
        nft_name: "",
        nft_image: "",
        nft_rarity: "1",
      });

      setTimeout(() => {
        loadLotteries();
      }, 2000);
    } catch (err: any) {
      let errorMessage = err.message || "Failed to create lottery";

      // Provide more helpful error messages
      if (
        errorMessage.includes("UnreachableCodeReached") ||
        errorMessage.includes("InvalidAction")
      ) {
        errorMessage =
          "Contract not initialized or unauthorized. Please ensure:\n1. The contract has been initialized\n2. Your wallet address is the admin address\n3. You have sufficient funds";
      } else if (errorMessage.includes("Unauthorized")) {
        errorMessage =
          "Unauthorized: Your wallet address is not the admin address";
      } else if (errorMessage.includes("Simulation failed")) {
        errorMessage = `Transaction simulation failed: ${errorMessage}`;
      }

      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleBuyTickets = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.address || !wallet.networkPassphrase || !selectedLottery) {
      setError("Wallet not connected or lottery not selected");
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const buyerAddr = Address.fromString(wallet.address);
      const args = [
        nativeToScVal(buyerAddr, { type: "address" }),
        nativeToScVal(selectedLottery, { type: "u64" }),
        nativeToScVal(Number(buyForm.num_tickets), { type: "u32" }),
      ];

      const txXdr = await prepareTransaction(
        "buy_ticket",
        args,
        wallet.address,
        wallet.networkPassphrase
      );

      await wallet.signAndSubmit(txXdr);

      setShowBuyForm(false);
      setBuyForm({ num_tickets: "1" });

      setTimeout(() => {
        loadLotteries();
        if (selectedLottery) {
          loadUserTickets(selectedLottery);
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to buy tickets");
    } finally {
      setProcessing(false);
    }
  };

  const handleDrawWinner = async (lotteryId: number) => {
    if (!wallet.address || !wallet.networkPassphrase) {
      setError("Wallet not connected");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to draw the winner? This will end the lottery."
      )
    ) {
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      const adminAddr = Address.fromString(wallet.address);
      const args = [
        nativeToScVal(adminAddr, { type: "address" }),
        nativeToScVal(lotteryId, { type: "u64" }),
      ];

      const txXdr = await prepareTransaction(
        "draw_winner",
        args,
        wallet.address,
        wallet.networkPassphrase
      );

      await wallet.signAndSubmit(txXdr);

      setTimeout(() => {
        loadLotteries();
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to draw winner");
    } finally {
      setProcessing(false);
    }
  };

  const getRarityName = (rarity: number): string => {
    const names = ["", "Common", "Rare", "Epic", "Legendary"];
    return names[rarity] || "Unknown";
  };

  const getRarityColor = (rarity: number): string => {
    const colors = ["", "#9ca3af", "#3b82f6", "#8b5cf6", "#f59e0b"];
    return colors[rarity] || "#9ca3af";
  };

  const formatPrice = (price: string): { value: string; unit: string } => {
    const num = BigInt(price);
    const xlm = Number(num) / 1_000_000;

    // If price is less than 0.01 XLM, show in stroops
    if (xlm < 0.01) {
      return {
        value: num.toString(),
        unit: "stroops",
      };
    }

    // Otherwise show in XLM with 2 decimal places
    return {
      value: xlm.toFixed(2),
      unit: "XLM",
    };
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🎰 NFT Lottery DApp</h1>
        <div className="wallet-section">
          {wallet.loading ? (
            <span>Loading...</span>
          ) : wallet.isConnected && wallet.address ? (
            <div className="wallet-info">
              <span className="wallet-address">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-6)}
              </span>
              <span className="network-badge">{wallet.network}</span>
              <button onClick={wallet.refresh} className="refresh-btn">
                🔄
              </button>
            </div>
          ) : (
            <button onClick={wallet.connect} className="connect-btn">
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            <span>⚠️ {error}</span>
            {error.includes("Contract not initialized") && (
              <div style={{ fontSize: "0.875rem", marginTop: "0.5rem" }}>
                <strong>Note:</strong> The contract must be initialized before
                creating lotteries. Use the Stellar CLI to initialize:
                <code
                  style={{
                    display: "block",
                    marginTop: "0.25rem",
                    padding: "0.25rem",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: "4px",
                  }}
                >
                  stellar contract invoke --id {CONTRACT_ID} --source admin
                  --network testnet -- initialize --admin YOUR_ADMIN_ADDRESS
                  --payment_token YOUR_TOKEN_ID
                </code>
              </div>
            )}
          </div>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {wallet.isConnected && wallet.address && (
        <div className="actions-bar">
          {wallet.address === ADMIN_ADDRESS && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="action-btn create-btn"
              disabled={processing}
            >
              ➕ Create Lottery
            </button>
          )}
          <button onClick={loadLotteries} className="action-btn">
            🔄 Refresh
          </button>
        </div>
      )}

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Lottery</h2>
            <form onSubmit={handleCreateLottery}>
              <div className="form-group">
                <label>Ticket Price (stroops)</label>
                <input
                  type="number"
                  value={createForm.ticket_price}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      ticket_price: e.target.value,
                    })
                  }
                  required
                  min="1"
                />
                <small>1 stroop = 0.000001 XLM</small>
              </div>
              <div className="form-group">
                <label>Max Tickets</label>
                <input
                  type="number"
                  value={createForm.max_tickets}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      max_tickets: e.target.value,
                    })
                  }
                  required
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>NFT Name</label>
                <input
                  type="text"
                  value={createForm.nft_name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, nft_name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>NFT Image URL</label>
                <input
                  type="url"
                  value={createForm.nft_image}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, nft_image: e.target.value })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>NFT Rarity</label>
                <select
                  value={createForm.nft_rarity}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, nft_rarity: e.target.value })
                  }
                  required
                >
                  <option value="1">Common</option>
                  <option value="2">Rare</option>
                  <option value="3">Epic</option>
                  <option value="4">Legendary</option>
                </select>
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button type="submit" disabled={processing}>
                  {processing ? "Creating..." : "Create Lottery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBuyForm && selectedLottery && (
        <div className="modal-overlay" onClick={() => setShowBuyForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Buy Tickets</h2>
            <form onSubmit={handleBuyTickets}>
              <div className="form-group">
                <label>Number of Tickets</label>
                <input
                  type="number"
                  value={buyForm.num_tickets}
                  onChange={(e) =>
                    setBuyForm({ ...buyForm, num_tickets: e.target.value })
                  }
                  required
                  min="1"
                  max={
                    selectedLottery
                      ? lotteries.find((l) => Number(l.id) === selectedLottery)
                          ?.max_tickets || 0
                      : 0
                  }
                />
                {selectedLottery && (
                  <small>
                    Price per ticket:{" "}
                    {(() => {
                      const formatted = formatPrice(
                        lotteries.find((l) => Number(l.id) === selectedLottery)
                          ?.ticket_price || "0"
                      );
                      return `${formatted.value} ${formatted.unit}`;
                    })()}
                  </small>
                )}
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={() => setShowBuyForm(false)}
                  disabled={processing}
                >
                  Cancel
                </button>
                <button type="submit" disabled={processing}>
                  {processing ? "Processing..." : "Buy Tickets"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <main className="main-content">
        {loading ? (
          <div className="loading">Loading lotteries...</div>
        ) : lotteries.length === 0 ? (
          <div className="empty-state">
            <p>No lotteries found. Create one to get started!</p>
          </div>
        ) : (
          <div className="lotteries-grid">
            {lotteries.map((lottery) => {
              const isWinner =
                wallet.address &&
                lottery.winner &&
                lottery.winner.toLowerCase() === wallet.address.toLowerCase();
              return (
                <div
                  key={lottery.id}
                  className={`lottery-card ${isWinner ? "you-won" : ""}`}
                  style={
                    isWinner
                      ? {
                          border: "3px solid #fbbf24",
                          boxShadow: "0 0 20px rgba(251, 191, 36, 0.5)",
                        }
                      : {}
                  }
                >
                  <div
                    className="lottery-header"
                    style={{
                      borderTopColor: getRarityColor(lottery.nft_prize.rarity),
                    }}
                  >
                    <div className="lottery-title">
                      <h3>{lottery.nft_prize.name}</h3>
                      <span
                        className="rarity-badge"
                        style={{
                          backgroundColor: getRarityColor(
                            lottery.nft_prize.rarity
                          ),
                        }}
                      >
                        {getRarityName(lottery.nft_prize.rarity)}
                      </span>
                    </div>
                    <div className="lottery-status">
                      {lottery.is_active ? (
                        <span className="status-active">🟢 Active</span>
                      ) : (
                        <span className="status-ended">🔴 Ended</span>
                      )}
                    </div>
                  </div>

                  <div className="lottery-image">
                    <img
                      src={lottery.nft_prize.image_url}
                      alt={lottery.nft_prize.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://placehold.co/400x400?text=NFT";
                      }}
                    />
                  </div>

                  <div className="lottery-info">
                    <div className="info-row">
                      <span>Ticket Price:</span>
                      <span>
                        {(() => {
                          const formatted = formatPrice(lottery.ticket_price);
                          return `${formatted.value} ${formatted.unit}`;
                        })()}
                      </span>
                    </div>
                    <div className="info-row">
                      <span>Tickets Sold:</span>
                      <span>
                        {lottery.tickets_sold} / {lottery.max_tickets}
                      </span>
                    </div>
                    <div className="info-row">
                      <span>Progress:</span>
                      <span>
                        {Math.round(
                          (lottery.tickets_sold / lottery.max_tickets) * 100
                        )}
                        %
                      </span>
                    </div>
                    {lottery.winner && (
                      <div
                        className="info-row winner"
                        style={{
                          backgroundColor: "#fef3c7",
                          padding: "12px",
                          borderRadius: "8px",
                          marginTop: "8px",
                          border: isWinner
                            ? "2px solid #fbbf24"
                            : "2px solid #f59e0b",
                        }}
                      >
                        <span style={{ fontWeight: "bold", fontSize: "16px" }}>
                          {isWinner ? "🎉 You Won!" : "🏆 Winner:"}
                        </span>
                        {!isWinner && (
                          <span
                            style={{
                              fontWeight: "bold",
                              fontFamily: "monospace",
                              fontSize: "14px",
                            }}
                          >
                            {lottery.winner.length > 12
                              ? `${lottery.winner.slice(
                                  0,
                                  8
                                )}...${lottery.winner.slice(-8)}`
                              : lottery.winner}
                          </span>
                        )}
                      </div>
                    )}
                    {!lottery.is_active && !lottery.winner && (
                      <div
                        className="info-row"
                        style={{
                          color: "#6b7280",
                          fontStyle: "italic",
                          marginTop: "8px",
                        }}
                      >
                        <span>No winner drawn yet</span>
                      </div>
                    )}
                  </div>

                  <div className="lottery-actions">
                    {wallet.isConnected && wallet.address && (
                      <>
                        {lottery.is_active ? (
                          <>
                            {lottery.tickets_sold < lottery.max_tickets && (
                              <button
                                onClick={() => {
                                  setSelectedLottery(Number(lottery.id));
                                  setShowBuyForm(true);
                                }}
                                className="action-btn buy-btn"
                                disabled={processing}
                              >
                                🎫 Buy Tickets
                              </button>
                            )}
                            {lottery.tickets_sold >= lottery.max_tickets && (
                              <div
                                style={{
                                  padding: "8px",
                                  backgroundColor: "#fee2e2",
                                  borderRadius: "6px",
                                  textAlign: "center",
                                  fontSize: "14px",
                                  fontWeight: "500",
                                  color: "#991b1b",
                                }}
                              >
                                🚫 Sold Out
                              </div>
                            )}
                            <button
                              onClick={() => {
                                if (selectedLottery === Number(lottery.id)) {
                                  // Toggle off if already selected
                                  setSelectedLottery(null);
                                  setUserTickets([]);
                                } else {
                                  // Toggle on
                                  setSelectedLottery(Number(lottery.id));
                                  loadUserTickets(Number(lottery.id));
                                }
                              }}
                              className="action-btn"
                              style={{
                                backgroundColor:
                                  selectedLottery === Number(lottery.id)
                                    ? "#667eea"
                                    : undefined,
                                color:
                                  selectedLottery === Number(lottery.id)
                                    ? "white"
                                    : undefined,
                              }}
                            >
                              🎟️ My Tickets
                            </button>
                            {wallet.address === ADMIN_ADDRESS && (
                              <button
                                onClick={() =>
                                  handleDrawWinner(Number(lottery.id))
                                }
                                className="action-btn draw-btn"
                                disabled={processing}
                              >
                                🎲 Draw Winner
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                if (selectedLottery === Number(lottery.id)) {
                                  // Toggle off if already selected
                                  setSelectedLottery(null);
                                  setUserTickets([]);
                                } else {
                                  // Toggle on
                                  setSelectedLottery(Number(lottery.id));
                                  loadUserTickets(Number(lottery.id));
                                }
                              }}
                              className="action-btn"
                              style={{
                                backgroundColor:
                                  selectedLottery === Number(lottery.id)
                                    ? "#667eea"
                                    : undefined,
                                color:
                                  selectedLottery === Number(lottery.id)
                                    ? "white"
                                    : undefined,
                              }}
                            >
                              🎟️ My Tickets
                            </button>
                            {lottery.winner && (
                              <div
                                style={{
                                  padding: "8px",
                                  backgroundColor: "#dcfce7",
                                  borderRadius: "6px",
                                  marginTop: "8px",
                                  textAlign: "center",
                                  fontSize: "14px",
                                  fontWeight: "500",
                                }}
                              >
                                ✅ Lottery Completed
                              </div>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>

                  {selectedLottery === Number(lottery.id) &&
                    userTickets.length > 0 && (
                      <div className="user-tickets">
                        <h4>Your Tickets:</h4>
                        <div className="tickets-list">
                          {userTickets.map((ticket) => (
                            <span key={ticket} className="ticket-number">
                              #{ticket}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>
          Contract ID: <code>{CONTRACT_ID}</code>
        </p>
        <p>Built on Stellar Soroban Testnet</p>
      </footer>
    </div>
  );
}

export default App;
