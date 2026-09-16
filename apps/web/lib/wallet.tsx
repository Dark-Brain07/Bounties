"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CHAIN_ID, RPC_URL, CONTRACT_ADDRESS } from "./contract";

interface WalletContextType {
  account: string | null;
  balance: string;
  isConnecting: boolean;
  isConnected: boolean;
  isDevAccount: boolean;
  walletError: string | null;
  connect: (forceDev?: boolean) => Promise<void>;
  connectMetaMask: () => Promise<void>;
  connectDevAccount: () => Promise<void>;
  disconnect: () => void;
  requestFaucet: () => Promise<void>;
  executeContractWrite: (
    functionName: string,
    args: any[],
    value?: bigint
  ) => Promise<{ hash: string; receipt?: any }>;
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  balance: "0",
  isConnecting: false,
  isConnected: false,
  isDevAccount: false,
  walletError: null,
  connect: async () => {},
  connectMetaMask: async () => {},
  connectDevAccount: async () => {},
  disconnect: () => {},
  requestFaucet: async () => {},
  executeContractWrite: async () => {
    throw new Error("Wallet not connected");
  },
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDevAccount, setIsDevAccount] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const fetchBalance = async (address: string) => {
    try {
      const res = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBalance",
          params: [address, "latest"],
        }),
      });
      const data = await res.json();
      if (data.result) {
        const val = BigInt(data.result);
        const eth = Number(val) / 1e18;
        setBalance(eth.toFixed(3));
      }
    } catch (e) {
      console.error("Failed to fetch balance", e);
    }
  };

  const connectMetaMask = async () => {
    setIsConnecting(true);
    setWalletError(null);
    try {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        const msg = "MetaMask extension was not detected in this browser window. You can use the 'Instant StudioNet Dev Signer' button to test with 2,000 free testnet GEN instantly without any extension.";
        setWalletError(msg);
        alert(msg);
        return;
      }

      const eth = (window as any).ethereum;
      let accounts: string[] = [];

      try {
        accounts = await eth.request({ method: "eth_requestAccounts" });
      } catch (reqErr: any) {
        if (reqErr.code === -32002) {
          const msg = "MetaMask request already pending! Please check your browser extension toolbar and click the MetaMask icon to unlock/approve.";
          setWalletError(msg);
          alert(msg);
          return;
        }
        throw reqErr;
      }

      if (!accounts || accounts.length === 0) {
        throw new Error("No account was selected in MetaMask.");
      }

      const activeAccount = accounts[0];
      setAccount(activeAccount);
      setPrivateKey(null);
      setIsDevAccount(false);

      if (typeof window !== "undefined") {
        localStorage.setItem("bounties_wallet_type", "metamask");
        localStorage.removeItem("bounties_key");
      }

      await fetchBalance(activeAccount);

      // Attempt chain switch to StudioNet
      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xF22F" }], // 61999
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xF22F",
                chainName: "GenLayer StudioNet",
                nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
                rpcUrls: [RPC_URL],
                blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
              },
            ],
          });
        }
      }
    } catch (err: any) {
      console.error("MetaMask connection failed:", err);
      const msg = err?.message || "Failed to connect MetaMask";
      setWalletError(msg);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectDevAccount = async () => {
    setIsConnecting(true);
    setWalletError(null);
    try {
      const gl = await import("genlayer-js");
      let storedKey = typeof window !== "undefined" ? localStorage.getItem("bounties_key") : null;
      let act: any;

      if (storedKey) {
        act = gl.createAccount(storedKey as `0x${string}`);
      } else {
        act = gl.createAccount();
        if (typeof window !== "undefined") {
          localStorage.setItem("bounties_key", act.privateKey);
        }
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("bounties_wallet_type", "dev");
      }

      const client = gl.createClient({ chain: gl.chains.studionet, account: act });
      try {
        await client.request({
          method: "sim_fundAccount",
          params: [act.address, 2000],
        });
      } catch (fErr) {
        console.warn("Auto-funding returned notice:", fErr);
      }

      setAccount(act.address);
      setPrivateKey(act.privateKey);
      setIsDevAccount(true);
      await fetchBalance(act.address);
    } catch (err: any) {
      console.error("Dev account connection failed:", err);
      setWalletError(err?.message || "Failed to initialize StudioNet dev account");
    } finally {
      setIsConnecting(false);
    }
  };

  const connect = async (forceDev = false) => {
    if (forceDev) {
      await connectDevAccount();
    } else {
      await connectMetaMask();
    }
  };

  const disconnect = () => {
    setAccount(null);
    setPrivateKey(null);
    setBalance("0");
    setIsDevAccount(false);
    setWalletError(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("bounties_key");
      localStorage.removeItem("bounties_wallet_type");
    }
  };

  const requestFaucet = async () => {
    if (!account) return;
    try {
      await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "sim_fundAccount",
          params: [account, 200],
        }),
      });
      await fetchBalance(account);
    } catch (e) {
      console.error("Faucet request error:", e);
    }
  };

  const executeContractWrite = async (
    functionName: string,
    args: any[],
    value: bigint = 0n
  ): Promise<{ hash: string; receipt?: any }> => {
    if (!account) {
      throw new Error("Please connect a wallet first");
    }

    if (isDevAccount || privateKey) {
      const gl = await import("genlayer-js");
      const key = privateKey || (typeof window !== "undefined" ? localStorage.getItem("bounties_key") : null);
      if (!key) throw new Error("Private key not available for StudioNet account");
      
      const act = gl.createAccount(key as `0x${string}`);
      const client = gl.createClient({ chain: gl.chains.studionet, account: act });

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName,
        args,
        value,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash,
        retries: 120,
        interval: 3000,
      });

      await fetchBalance(account);
      return { hash, receipt };
    } else if (typeof window !== "undefined" && (window as any).ethereum) {
      const gl = await import("genlayer-js");
      const client = gl.createClient({
        chain: gl.chains.studionet,
        account: account as `0x${string}`,
        provider: (window as any).ethereum,
      });

      try {
        await client.connect("studionet");
      } catch (e) {
        console.warn("client.connect notification:", e);
      }

      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName,
        args,
        value,
      });

      const receipt = await client.waitForTransactionReceipt({
        hash,
        retries: 120,
        interval: 3000,
      });

      await fetchBalance(account);
      return { hash, receipt };
    }

    throw new Error("No available signer");
  };

  // Passive re-connect on reload if previously connected
  useEffect(() => {
    if (typeof window !== "undefined") {
      const walletType = localStorage.getItem("bounties_wallet_type");
      if (walletType === "metamask" && (window as any).ethereum) {
        // Non-intrusive check: only connect if MetaMask already has authorized accounts
        (window as any).ethereum
          .request({ method: "eth_accounts" })
          .then((accs: string[]) => {
            if (accs && accs.length > 0) {
              setAccount(accs[0]);
              setIsDevAccount(false);
              fetchBalance(accs[0]);
            }
          })
          .catch(() => {});
      } else if (walletType === "dev" && localStorage.getItem("bounties_key")) {
        connectDevAccount();
      }
    }
  }, []);

  // Listen to MetaMask account / chain changes
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      const handleAccounts = (accounts: string[]) => {
        if (accounts.length > 0) {
          if (!isDevAccount) {
            setAccount(accounts[0]);
            fetchBalance(accounts[0]);
          }
        } else {
          disconnect();
        }
      };

      eth.on?.("accountsChanged", handleAccounts);
      return () => {
        eth.removeListener?.("accountsChanged", handleAccounts);
      };
    }
  }, [isDevAccount]);

  return (
    <WalletContext.Provider
      value={{
        account,
        balance,
        isConnecting,
        isConnected: !!account,
        isDevAccount,
        walletError,
        connect,
        connectMetaMask,
        connectDevAccount,
        disconnect,
        requestFaucet,
        executeContractWrite,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
