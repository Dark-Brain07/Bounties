"use client";

import Link from "next/link";
import { Bounty, formatGen, truncateAddress, STATUS_MAP } from "@/lib/contract";

export default function BountyCard({ bounty }: { bounty: Bounty }) {
  const statusInfo = STATUS_MAP[bounty.status] || {
    label: bounty.status_label || "UNKNOWN",
    color: "#94A3B8",
    bg: "rgba(148, 163, 184, 0.12)",
  };

  const isPositive = bounty.claim_polarity === "POSITIVE";

  return (
    <Link
      href={`/bounty/${bounty.bounty_id}`}
      className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between group relative overflow-hidden"
    >
      {/* Top Bar: Badges */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              #{bounty.bounty_id}
            </span>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                isPositive
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {bounty.claim_polarity} CLAIM
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60 font-medium">
              {bounty.category}
            </span>
          </div>

          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
            style={{
              color: statusInfo.color,
              backgroundColor: statusInfo.bg,
              border: `1px solid ${statusInfo.color}33`,
            }}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-2 mb-2">
          {bounty.title}
        </h3>

        {/* Claim Text */}
        <p className="text-sm text-slate-400 line-clamp-2 mb-5 leading-relaxed">
          {bounty.claim_text}
        </p>
      </div>

      {/* Bottom Info Grid */}
      <div className="pt-4 border-t border-white/5 flex items-end justify-between">
        <div>
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider block mb-0.5">
            Escrowed Reward
          </span>
          <div className="text-2xl font-black text-cyan-400 tracking-tight flex items-baseline gap-1">
            <span>{formatGen(bounty.reward_deposited)}</span>
            <span className="text-xs font-semibold text-slate-400">GEN</span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400 mb-1">
            Bond: <span className="font-mono text-slate-200">{formatGen(bounty.required_bond)} GEN</span>
          </div>
          <div className="flex items-center gap-1.5 justify-end">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="text-xs font-medium text-slate-300">
              {bounty.attempt_count} {bounty.attempt_count === 1 ? "attempt" : "attempts"}
            </span>
            {bounty.criteria_locked && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono ml-1">
                LOCKED
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
