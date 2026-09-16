"use client";

import { useEffect, useState } from "react";
import { readContractRPC, Bounty } from "@/lib/contract";
import BountyCard from "@/components/BountyCard";

const CATEGORIES = [
  "ALL",
  "SECURITY",
  "GOVERNANCE",
  "OPEN_SOURCE",
  "DOCUMENTATION",
  "PROTOCOL_RESEARCH",
  "ONCHAIN_ANALYSIS",
  "PRODUCT_CLAIMS",
  "PUBLIC_ACCOUNTABILITY",
  "OTHER",
];

const STATUSES = ["ALL", "OPEN", "SETTLED", "CANCELLED"];

export default function ExplorePage() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [polarity, setPolarity] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await readContractRPC("list_bounties", [0, 50]);
        if (Array.isArray(res)) {
          setBounties(res);
        }
      } catch (err) {
        console.error("Failed to load bounties", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = bounties.filter((b) => {
    if (category !== "ALL" && b.category !== category) return false;
    if (status === "OPEN" && b.status !== 0) return false;
    if (status === "SETTLED" && b.status !== 1) return false;
    if (status === "CANCELLED" && b.status !== 2) return false;
    if (polarity !== "ALL" && b.claim_polarity !== polarity) return false;
    if (
      search &&
      !b.title.toLowerCase().includes(search.toLowerCase()) &&
      !b.claim_text.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Explore Claims & Bounties
        </h1>
        <p className="text-slate-400 mt-2">
          Discover verified public challenges or stake a bond to prove/disprove active claims.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel rounded-2xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search claims, titles, or criteria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  Status: {s}
                </option>
              ))}
            </select>

            {/* Polarity Filter */}
            <select
              value={polarity}
              onChange={(e) => setPolarity(e.target.value)}
              className="bg-slate-900/90 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Polarities</option>
              <option value="POSITIVE">Positive Claims</option>
              <option value="NEGATIVE">Negative Claims</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                category === cat
                  ? "bg-cyan-500 text-black font-bold shadow-md shadow-cyan-500/20"
                  : "bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Bounties */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 font-mono">
          Loading bounties from GenLayer StudioNet...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 text-center text-slate-400">
          No bounties match your selected filters.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((b) => (
            <BountyCard key={b.bounty_id} bounty={b} />
          ))}
        </div>
      )}
    </div>
  );
}
