"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readContractRPC, Bounty, Transparency, formatGen, CONTRACT_ADDRESS, EXPLORER_BASE } from "@/lib/contract";
import BountyCard from "@/components/BountyCard";

export default function Home() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [transparency, setTransparency] = useState<Transparency | null>(null);
  const [bountyCount, setBountyCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [counterRes, transRes, listRes] = await Promise.all([
          readContractRPC("get_bounty_counter", []),
          readContractRPC("get_settlement_transparency", []),
          readContractRPC("list_bounties", [0, 6]),
        ]);

        setBountyCount(Number(counterRes || 0));
        setTransparency(transRes);
        if (Array.isArray(listRes)) {
          setBounties(listRes);
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto pt-6 space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-semibold text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          GenLayer Intelligent Contracts • Live on StudioNet
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
          Public Claims Settled by{" "}
          <span className="gradient-text">AI Validator Consensus</span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Create bounties with precommitted proof criteria. Challengers stake bonds and submit live web evidence. Independent GenLayer validators fetch the evidence and judge consensus autonomously.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Link
            href="/create"
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-base shadow-xl shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Create a Bounty
          </Link>
          <Link
            href="/explore"
            className="px-8 py-3.5 rounded-xl glass-panel hover:bg-slate-800 text-white font-semibold text-base transition-all transform hover:-translate-y-0.5 border border-slate-700"
          >
            Explore Bounties ({bountyCount})
          </Link>
        </div>
      </section>

      {/* Protocol Metrics Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel rounded-2xl p-6 text-center border-glow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Bounties
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white font-mono">
            {bountyCount}
          </div>
          <div className="text-[11px] text-cyan-400 mt-1">On-Chain Registered</div>
        </div>

        <div className="glass-panel rounded-2xl p-6 text-center border-glow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            AI Consensus Settled
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-400 font-mono">
            {transparency?.attempts_settled_by_ai_consensus ?? 0}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">Pure Validator Verdicts</div>
        </div>

        <div className="glass-panel rounded-2xl p-6 text-center border-glow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Human Override Rate
          </div>
          <div className="text-3xl sm:text-4xl font-black text-cyan-400 font-mono">
            {transparency?.human_override_rate_bps ? transparency.human_override_rate_bps / 100 : 0}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Strict Mathematical Floor</div>
        </div>

        <div className="glass-panel rounded-2xl p-6 text-center border-glow">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Contract Status
          </div>
          <div className="text-3xl sm:text-4xl font-black text-white font-mono flex items-center justify-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            ACTIVE
          </div>
          <a
            href={`${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-slate-400 hover:text-cyan-400 mt-1 block truncate"
          >
            {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)} ↗
          </a>
        </div>
      </section>

      {/* Core Protocol Pillars */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            How Bounties Solves Truth On-Chain
          </h2>
          <p className="text-slate-400 mt-2 text-sm">
            Not a centralized oracle. Not a single LLM API. A decentralized multi-validator consensus engine.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Frozen Proof Criteria</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Once any challenger accepts a bounty and commits their bond, the acceptance criteria permanently freeze. The goalposts can never be moved by the creator.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Live Web Verification</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              GenVM validators independently fetch the submitted URL text at consensus time. Challengers cannot tamper with fetched evidence.
            </p>
          </div>

          <div className="glass-panel rounded-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Equivalence Consensus</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Independent validators evaluate the evidence against criteria using GenLayer's Equivalence Principle. Bounded bucketing guarantees exact economic agreement.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Bounties Feed */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Live Verified Bounties
            </h2>
            <p className="text-sm text-slate-400">
              Recent bounties created and awaiting evidence verification on StudioNet.
            </p>
          </div>

          <Link
            href="/explore"
            className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group"
          >
            <span>View All</span>
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-400 font-mono">
            Loading on-chain bounties from StudioNet...
          </div>
        ) : bounties.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center space-y-4">
            <p className="text-slate-400">No bounties found yet. Be the first to create one!</p>
            <Link
              href="/create"
              className="inline-block px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm"
            >
              Create Bounty
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bounties.map((bounty) => (
              <BountyCard key={bounty.bounty_id} bounty={bounty} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
