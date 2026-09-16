"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CHAIN_ID, RPC_URL } from "./contract";

interface WalletContextType {
  account: string | null;
  balance: string;
  isConnecting: boolean;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  balance: "0",
  isConnecting: false,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isConnecting, setIsConnecting] = useState(false);

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

  const connect = async () => {
    setIsConnecting(true);
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const eth = (window as any).ethereum;
        const accounts = await eth.request({ method: "eth_requestAccounts" });
        if (accounts && accounts[0]) {
          setAccount(accounts[0]);
          await fetchBalance(accounts[0]);
          
          // Try switching to StudioNet
          try {
            await eth.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0xF22F" }], // 61999 in hex
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
        }
      } else {
        // Fallback for browsers without metamask
        const mockAddr = "0x" + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join("");
        setAccount(mockAddr);
        setBalance("1000.000");
      }
    } catch (err) {
      console.error("Connection failed", err);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setBalance("0");
  };

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const eth = (window as any).ethereum;
      eth.on?.("accountsChanged", (accs: string[]) => {
        if (accs.length > 0) {
          setAccount(accs[0]);
          fetchBalance(accs[0]);
        } else {
          disconnect();
        }
      });
    }
  }, []);

  return (
    <WalletContext.Provider
      value={{
        account,
        balance,
        isConnecting,
        isConnected: !!account,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
