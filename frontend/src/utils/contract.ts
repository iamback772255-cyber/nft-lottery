import {
  Address,
  xdr,
  scValToNative,
  nativeToScVal,
  StrKey,
  Contract,
  TransactionBuilder,
  Keypair,
  Account,
  rpc,
  Horizon,
} from "@stellar/stellar-sdk";

// Contract ID - can be overridden via environment variable
// Default: Original deployed contract
// Set VITE_CONTRACT_ID in .env file to use your own deployed contract
export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ||
  "CDEHL3FHJEO2RDYILJCPPNYWMKF2PGUJKAKGUU5MW6GWLETJOKLKI53Y";
export const TESTNET_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const SOROBAN_RPC_URL = "https://soroban-testnet.stellar.org";

// Admin address - can be overridden via environment variable
// This is the admin address from contract initialization
export const ADMIN_ADDRESS =
  import.meta.env.VITE_ADMIN_ADDRESS ||
  "GB7UYMD3K7CLHC374ZRZDAR5ORC55P7BIFTSZZT426GS6OQHVFP5G3XG";

export interface Lottery {
  id: string;
  ticket_price: string;
  max_tickets: number;
  tickets_sold: number;
  is_active: boolean;
  winner: string | null;
  nft_prize: {
    name: string;
    image_url: string;
    rarity: number;
  };
}

export interface NFTMetadata {
  name: string;
  image_url: string;
  rarity: number;
}

export const getRpcServer = () => {
  return new rpc.Server(SOROBAN_RPC_URL, {
    allowHttp: true,
  });
};

export const getContract = () => {
  return new Contract(CONTRACT_ID);
};

export const getLotteryCount = async (): Promise<number> => {
  const contract = getContract();
  const rpcServer = getRpcServer();

  try {
    // Create a dummy keypair for read-only operations
    const dummyKeypair = Keypair.random();
    const dummyAccount = new Account(dummyKeypair.publicKey(), "0");
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call("get_lottery_count"))
      .setTimeout(30)
      .build();

    const result = await rpcServer.simulateTransaction(tx);

    if (rpc.Api.isSimulationSuccess(result)) {
      const successResult =
        result as rpc.Api.SimulateTransactionSuccessResponse;
      if (successResult.result) {
        return Number(scValToNative(successResult.result.retval));
      }
    }
    return 0;
  } catch (error) {
    console.error("Error fetching lottery count:", error);
    return 0;
  }
};

export const getLottery = async (
  lotteryId: number
): Promise<Lottery | null> => {
  const contract = getContract();
  const rpcServer = getRpcServer();

  try {
    const dummyKeypair = Keypair.random();
    const dummyAccount = new Account(dummyKeypair.publicKey(), "0");
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call("get_lottery", nativeToScVal(lotteryId, { type: "u64" }))
      )
      .setTimeout(30)
      .build();

    const result = await rpcServer.simulateTransaction(tx);

    if (rpc.Api.isSimulationSuccess(result)) {
      const successResult =
        result as rpc.Api.SimulateTransactionSuccessResponse;
      if (successResult.result) {
        const lottery = scValToNative(successResult.result.retval) as any;

        // Parse winner address - handle different possible formats
        let winnerAddress: string | null = null;
        if (lottery.winner) {
          try {
            // The winner is an Option<Address>, so scValToNative should return
            // either null/undefined if None, or an Address object if Some
            // Address from scValToNative typically has a _value property with the raw bytes
            if (lottery.winner._value) {
              // Address object with _value property (raw bytes)
              winnerAddress = StrKey.encodeEd25519PublicKey(
                lottery.winner._value
              );
            } else if (typeof lottery.winner === "string") {
              // Already a string
              winnerAddress = lottery.winner;
            } else if (lottery.winner.address) {
              // Address object with address property
              winnerAddress = StrKey.encodeEd25519PublicKey(
                lottery.winner.address
              );
            } else if (
              lottery.winner.toString &&
              typeof lottery.winner.toString === "function"
            ) {
              // Try toString method
              winnerAddress = lottery.winner.toString();
            } else {
              // Last resort: try to extract bytes from the object
              console.warn("Winner address format unexpected:", lottery.winner);
              if (lottery.winner && typeof lottery.winner === "object") {
                const keys = Object.keys(lottery.winner);
                for (const key of keys) {
                  const val = (lottery.winner as any)[key];
                  if (
                    val &&
                    (Array.isArray(val) || val instanceof Uint8Array)
                  ) {
                    try {
                      const uint8Array = Array.isArray(val)
                        ? new Uint8Array(val)
                        : val;
                      winnerAddress = StrKey.encodeEd25519PublicKey(
                        Buffer.from(uint8Array)
                      );
                      break;
                    } catch (e) {}
                  }
                }
              }
            }
          } catch (e) {
            console.error("Error parsing winner address:", e, lottery.winner);
          }
        }

        return {
          id: lottery.id.toString(),
          ticket_price: lottery.ticket_price.toString(),
          max_tickets: Number(lottery.max_tickets),
          tickets_sold: Number(lottery.tickets_sold),
          is_active: lottery.is_active,
          winner: winnerAddress,
          nft_prize: {
            name: lottery.nft_prize.name.toString(),
            image_url: lottery.nft_prize.image_url.toString(),
            rarity: Number(lottery.nft_prize.rarity),
          },
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error fetching lottery:", error);
    return null;
  }
};

export const getUserTickets = async (
  userAddress: string,
  lotteryId: number
): Promise<number[]> => {
  const contract = getContract();
  const rpcServer = getRpcServer();

  try {
    const userAddr = Address.fromString(userAddress);
    const dummyKeypair = Keypair.random();
    const dummyAccount = new Account(dummyKeypair.publicKey(), "0");
    const tx = new TransactionBuilder(dummyAccount, {
      fee: "100",
      networkPassphrase: TESTNET_NETWORK_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "get_user_tickets",
          nativeToScVal(userAddr, { type: "address" }),
          nativeToScVal(lotteryId, { type: "u64" })
        )
      )
      .setTimeout(30)
      .build();

    const result = await rpcServer.simulateTransaction(tx);

    if (rpc.Api.isSimulationSuccess(result)) {
      const successResult =
        result as rpc.Api.SimulateTransactionSuccessResponse;
      if (successResult.result) {
        const tickets = scValToNative(successResult.result.retval) as number[];
        return tickets.map((t: any) => Number(t));
      }
    }
    return [];
  } catch (error) {
    console.error("Error fetching user tickets:", error);
    return [];
  }
};

export const prepareTransaction = async (
  method: string,
  args: xdr.ScVal[],
  sourceAccount: string,
  networkPassphrase: string
): Promise<string> => {
  const contract = getContract();
  const rpcServer = getRpcServer();

  // Get account sequence number
  const server = new Horizon.Server(
    networkPassphrase.includes("Test")
      ? "https://horizon-testnet.stellar.org"
      : "https://horizon.stellar.org"
  );

  const account = await server.loadAccount(sourceAccount);

  const builder = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: networkPassphrase,
  });

  const contractCall = contract.call(method, ...args);
  builder.addOperation(contractCall);

  const transaction = builder.setTimeout(30).build();

  // Simulate to get resource estimates
  const simResult = await rpcServer.simulateTransaction(transaction);

  if (rpc.Api.isSimulationError(simResult)) {
    const errorResult = simResult as rpc.Api.SimulateTransactionErrorResponse;
    throw new Error(`Simulation failed: ${errorResult.error}`);
  }

  // Restore the transaction with the correct resource estimates
  const restoredTransaction = rpc
    .assembleTransaction(transaction, simResult)
    .build();

  return restoredTransaction.toXDR();
};
