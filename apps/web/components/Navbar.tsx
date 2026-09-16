"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { truncateAddress, CONTRACT_ADDRESS, EXPLORER_BASE } from "@/lib/contract";

export default function Navbar() {
  const pathname = usePathname();
  const {
    account,
    balance,
    isConnecting,
    isConnected,
    isDevAccount,
    connectMetaMask,
    connectDevAccount,
    disconnect,
    requestFaucet,
  } = useWallet();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);

  const navLinks = [
    { href: "/explore", label: "Explore" },
    { href: "/create", label: "Create Bounty" },
    { href: "/disputes", label: "Disputes & Appeals" },
    { href: "/reputation", label: "Reputation" },
  ];

  const handleFaucet = async () => {
    setFaucetLoading(true);
    try {
      await requestFaucet();
    } finally {
      setFaucetLoading(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass-panel border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-emerald-400 p-0.5 glow-cyan">
                <div className="w-full h-full bg-[#080C14] rounded-[10px] flex items-center justify-center">
                  <svg className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                    Bounties
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    GenLayer
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 tracking-wide block">
                  Consensus Truth Protocol
                </span>
              </div>
            </Link>

            {/* Nav Items */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action / Wallet */}
          <div className="flex items-center gap-3">
            {/* Network Indicator */}
            <a
              href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-mono text-slate-300 hover:border-cyan-500/40 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>StudioNet</span>
            </a>

            {/* Connected State */}
            {isConnected && account ? (
              <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/30 rounded-xl p-1.5 pl-3">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="text-xs font-bold text-emerald-400">{balance} GEN</span>
                    <span className={`text-[9px] px-1 rounded uppercase font-semibold ${isDevAccount ? 'bg-purple-500/20 text-purple-300' : 'bg-amber-500/20 text-amber-300'}`}>
                      {isDevAccount ? "Dev Signer" : "MetaMask"}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">{truncateAddress(account)}</div>
                </div>

                <button
                  onClick={handleFaucet}
                  disabled={faucetLoading}
                  title="Get free testnet GEN from StudioNet faucet"
                  className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {faucetLoading ? "..." : "+200 GEN"}
                </button>

                <button
                  onClick={disconnect}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowWalletModal(true)}
                disabled={isConnecting}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-semibold text-sm shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isConnecting ? "Connecting..." : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Wallet Selector Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowWalletModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-white mb-2">Connect to Bounties</h3>
            <p className="text-xs text-slate-400 mb-6">
              Choose your preferred signer for GenLayer StudioNet (Chain ID 61999).
            </p>

            <div className="space-y-3">
              {/* Option 1: MetaMask */}
              <button
                onClick={async () => {
                  setShowWalletModal(false);
                  await connectMetaMask();
                }}
                className="w-full p-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-amber-500/50 transition-all flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">
                    🦊
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-amber-300 transition-colors">
                      MetaMask
                    </div>
                    <div className="text-xs text-slate-400">
                      Standard browser extension wallet
                    </div>
                  </div>
                </div>
                <span className="text-slate-500 group-hover:text-white transition-colors">→</span>
              </button>

              {/* Option 2: Instant StudioNet Dev Account */}
              <button
                onClick={async () => {
                  setShowWalletModal(false);
                  await connectDevAccount();
                }}
                className="w-full p-4 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-cyan-500/50 transition-all flex items-center justify-between group text-left"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-xl">
                    ⚡
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                      <span>Instant StudioNet Signer</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Zero Setup
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Auto-funded with 2,000 GEN testnet tokens
                    </div>
                  </div>
                </div>
                <span className="text-slate-500 group-hover:text-white transition-colors">→</span>
              </button>
            </div>

            <div className="mt-5 p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400">
              💡 <strong>MetaMask Tip:</strong> If MetaMask does not pop up automatically, check your browser extension toolbar — Chrome often queues requests under the fox icon with a small notification badge.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
