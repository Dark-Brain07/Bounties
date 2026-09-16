"use client";

import { useEffect, useState } from "react";
import { readContractRPC, Reputation, Transparency, formatGen, truncateAddress, CONTRACT_ADDRESS, EXPLORER_BASE } from "@/lib/contract";
import { useWallet } from "@/lib/wallet";

export default function ReputationPage() {
  const { account } = useWallet();
  const [searchAddress, setSearchAddress] = useState("");
  const [queryResult, setQueryResult] = useState<Reputation | null>(null);
  const [transparency, setTransparency] = useState<Transparency | null>(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    async function loadTransparency() {
      try {
        const trans = await readContractRPC("get_settlement_transparency", []);
        setTransparency(trans);
      } catch (e) {
        console.error("Failed to load transparency", e);
      }
    }
    loadTransparency();
  }, []);

  const handleSearch = async (addrToQuery?: string) => {
    const target = (addrToQuery || searchAddress).trim();
    if (!target) return;

    setSearching(true);
    setSearched(true);
    try {
      const rep = await readContractRPC("get_reputation", [target]);
      setQueryResult(rep);
    } catch (e) {
      console.error(e);
      setQueryResult(null);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          On-Chain Reputation & Transparency
        </h1>
        <p className="text-slate-400 mt-2">
          Track record derived exclusively from immutable settled protocol events. Never self-reported.
        </p>
      </div>

      {/* Protocol Transparency Banner */}
      <div className="glass-panel rounded-3xl p-8 space-y-6 border border-cyan-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Protocol Settlement Provenance
            </h2>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
            Audit-Grade On-Chain Ledger
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
              Total Settled Attempts
            </span>
            <div className="text-3xl font-black text-white font-mono">
              {transparency?.total_settled_attempts ?? 0}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
              AI Consensus Settled
            </span>
            <div className="text-3xl font-black text-emerald-400 font-mono">
              {transparency?.attempts_settled_by_ai_consensus ?? 0}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
              Human Overrides
            </span>
            <div className="text-3xl font-black text-slate-200 font-mono">
              {transparency?.attempts_settled_by_human_override ?? 0}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5">
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
              Override Rate
            </span>
            <div className="text-3xl font-black text-cyan-400 font-mono">
              {transparency?.human_override_rate_bps ? transparency.human_override_rate_bps / 100 : 0}%
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400 italic">
          Every economic payout is executed strictly through GenLayer's Equivalence Principle. Human arbiters only provide advisory context for a mandatory second consensus round, ensuring the final settlement is always decided by the network.
        </p>
      </div>

      {/* Address Reputation Lookup */}
      <div className="glass-panel rounded-3xl p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Participant Reputation Lookup
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Query any address to inspect its verified history as a bounty creator or challenger.
            </p>
          </div>

          {account && (
            <button
              onClick={() => {
                setSearchAddress(account);
                handleSearch(account);
              }}
              className="text-xs text-cyan-400 hover:underline font-mono"
            >
              Inspect My Wallet ({truncateAddress(account)})
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter 0x address..."
            value={searchAddress}
            onChange={(e) => setSearchAddress(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={() => handleSearch()}
            disabled={searching || !searchAddress}
            className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm disabled:opacity-50"
          >
            {searching ? "Querying..." : "Search Reputation"}
          </button>
        </div>

        {/* Results */}
        {searched && (
          <div className="pt-6 border-t border-white/10 space-y-6">
            {!queryResult || (queryResult.bounties_created === 0 && queryResult.attempts_made === 0) ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No on-chain activity recorded for this address yet.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Creator Stats */}
                <div className="p-6 rounded-2xl bg-slate-900/90 border border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
                    Creator Track Record
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Bounties Created:</span>
                      <span className="font-mono text-white font-bold">{queryResult.bounties_created}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Escrow Funded:</span>
                      <span className="font-mono text-cyan-400 font-bold">{formatGen(queryResult.bounties_funded_total)} GEN</span>
                    </div>
                  </div>
                </div>

                {/* Challenger Stats */}
                <div className="p-6 rounded-2xl bg-slate-900/90 border border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">
                    Challenger Track Record
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Attempts Made:</span>
                      <span className="font-mono text-white font-bold">{queryResult.attempts_made}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Attempts Won (100%):</span>
                      <span className="font-mono text-emerald-400 font-bold">{queryResult.attempts_won}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Partial Settlements:</span>
                      <span className="font-mono text-cyan-400 font-bold">{queryResult.attempts_partial}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Rejections:</span>
                      <span className="font-mono text-rose-400 font-bold">{queryResult.attempts_rejected}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Disputes Contested:</span>
                      <span className="font-mono text-pink-400 font-bold">{queryResult.attempts_disputed}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-white/5">
                      <span className="text-slate-400 font-semibold">Total GEN Earned:</span>
                      <span className="font-mono text-emerald-400 font-bold text-base">{formatGen(queryResult.total_earned)} GEN</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
