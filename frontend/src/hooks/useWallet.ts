import { useState, useEffect, useCallback } from "react";
import {
  isConnected,
  requestAccess,
  getAddress,
  getNetworkDetails,
  signTransaction,
} from "@stellar/freighter-api";
import { TransactionBuilder, Horizon } from "@stellar/stellar-sdk";

export interface WalletState {
  address: string | null;
  network: string | null;
  networkPassphrase: string | null;
  sorobanRpcUrl: string | null;
  isConnected: boolean;
  isAllowed: boolean;
  loading: boolean;
  error: string | null;
}

export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    network: null,
    networkPassphrase: null,
    sorobanRpcUrl: null,
    isConnected: false,
    isAllowed: false,
    loading: true,
    error: null,
  });

  const checkConnection = useCallback(async () => {
    try {
      const connected = await isConnected();
      if (!connected.isConnected) {
        setWalletState((prev) => ({
          ...prev,
          isConnected: false,
          loading: false,
          error: "Freighter not installed or not connected",
        }));
        return;
      }

      const networkDetails = await getNetworkDetails();
      if (networkDetails.error) {
        setWalletState((prev) => ({
          ...prev,
          isConnected: true,
          loading: false,
          error: networkDetails.error || "Failed to get network details",
        }));
        return;
      }

      const addressResult = await getAddress();
      if (addressResult.error || !addressResult.address) {
        setWalletState((prev) => ({
          ...prev,
          isConnected: true,
          isAllowed: false,
          address: null,
          network: networkDetails.network,
          networkPassphrase: networkDetails.networkPassphrase,
          sorobanRpcUrl: networkDetails.sorobanRpcUrl || null,
          loading: false,
        }));
        return;
      }

      setWalletState({
        address: addressResult.address,
        network: networkDetails.network,
        networkPassphrase: networkDetails.networkPassphrase,
        sorobanRpcUrl: networkDetails.sorobanRpcUrl || null,
        isConnected: true,
        isAllowed: true,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setWalletState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to connect to wallet",
      }));
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      setWalletState((prev) => ({ ...prev, loading: true, error: null }));
      
      const connected = await isConnected();
      if (!connected.isConnected) {
        setWalletState((prev) => ({
          ...prev,
          loading: false,
          error: "Please install Freighter wallet extension",
        }));
        return;
      }

      const accessResult = await requestAccess();
      if (accessResult.error || !accessResult.address) {
        setWalletState((prev) => ({
          ...prev,
          loading: false,
          error: accessResult.error || "User rejected connection",
        }));
        return;
      }

      const networkDetails = await getNetworkDetails();
      if (networkDetails.error) {
        setWalletState((prev) => ({
          ...prev,
          loading: false,
          error: networkDetails.error || "Failed to get network details",
        }));
        return;
      }

      setWalletState({
        address: accessResult.address,
        network: networkDetails.network,
        networkPassphrase: networkDetails.networkPassphrase,
        sorobanRpcUrl: networkDetails.sorobanRpcUrl || null,
        isConnected: true,
        isAllowed: true,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setWalletState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to connect",
      }));
    }
  }, []);

  const signAndSubmit = useCallback(
    async (transactionXdr: string) => {
      if (!walletState.address || !walletState.networkPassphrase) {
        throw new Error("Wallet not connected");
      }

      const signedResult = await signTransaction(transactionXdr, {
        networkPassphrase: walletState.networkPassphrase,
        address: walletState.address,
      });

      if (signedResult.error) {
        throw new Error(signedResult.error);
      }

      if (!signedResult.signedTxXdr) {
        throw new Error("Transaction signing failed");
      }

      // Submit transaction
      const server = new Horizon.Server(
        walletState.network === "TESTNET"
          ? "https://horizon-testnet.stellar.org"
          : "https://horizon.stellar.org"
      );

      const transaction = TransactionBuilder.fromXDR(
        signedResult.signedTxXdr,
        walletState.networkPassphrase
      );

      const response = await server.submitTransaction(transaction);
      return response;
    },
    [walletState]
  );

  useEffect(() => {
    checkConnection();
    // Poll for wallet changes
    const interval = setInterval(checkConnection, 3000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return {
    ...walletState,
    connect,
    signAndSubmit,
    refresh: checkConnection,
  };
};

