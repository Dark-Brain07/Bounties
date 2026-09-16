"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  readContractRPC,
  Bounty,
  Attempt,
  formatGen,
  truncateAddress,
  STATUS_MAP,
  ATTEMPT_STATUS_MAP,
  CONTRACT_ADDRESS,
  EXPLORER_BASE,
  toGenWei,
} from "@/lib/contract";
import { useWallet } from "@/lib/wallet";

export default function BountyDetailPage() {
  const params = useParams();
  const bountyId = Number(params?.id || 0);

  const { account, isConnected, connect, executeContractWrite } = useWallet();

  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Challenger form state
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [bountyRes, attemptsRes] = await Promise.all([
        readContractRPC("get_bounty", [bountyId]),
        readContractRPC("get_bounty_attempts", [bountyId]),
      ]);

      setBounty(bountyRes);
      if (Array.isArray(attemptsRes)) {
        setAttempts(attemptsRes);
      }
    } catch (err) {
      console.error("Failed to load bounty details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [bountyId]);

  const handleAccept = async () => {
    if (!bounty || !isConnected || !account) {
      await connect();
      return;
    }

    setActionLoading(true);
    setActionStatus("Locking bond and accepting bounty on StudioNet...");
    setActionError(null);

    try {
      const bondWei = BigInt(bounty.required_bond);
      await executeContractWrite("accept_bounty", [bountyId], bondWei);

      setActionStatus("Attempt created! Refreshing...");
      setTimeout(() => {
        loadData();
        setActionStatus(null);
      }, 3000);
    } catch (err: any) {
      setActionError(err?.message || "Failed to accept bounty");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitEvidence = async (attemptIndex: number) => {
    if (!evidenceUrl || !isConnected || !account) return;

    setActionLoading(true);
    setActionStatus("Submitting evidence URL to intelligent contract...");
    setActionError(null);

    try {
      await executeContractWrite("submit_evidence", [
        bountyId,
        attemptIndex,
        evidenceUrl.trim(),
        evidenceDesc.trim(),
      ]);

      setActionStatus("Evidence submitted successfully!");
      setEvidenceUrl("");
      setEvidenceDesc("");
      setTimeout(() => {
        loadData();
        setActionStatus(null);
      }, 3000);
    } catch (err: any) {
      setActionError(err?.message || "Failed to submit evidence");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async (attemptIndex: number) => {
    if (!isConnected || !account) return;

    setActionLoading(true);
    setActionStatus("Triggering GenLayer independent validator web fetch & consensus...");
    setActionError(null);

    try {
      await executeContractWrite("request_verification", [bountyId, attemptIndex]);

      setActionStatus("Validators verifying evidence... Consensus pending!");
      setTimeout(() => {
        loadData();
        setActionStatus(null);
      }, 4000);
    } catch (err: any) {
      setActionError(err?.message || "Verification request failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-400 font-mono">
        Loading bounty #{bountyId} from GenLayer StudioNet...
      </div>
    );
  }

  if (!bounty) {
    return (
      <div className="glass-panel rounded-2xl p-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Bounty Not Found</h2>
        <p className="text-slate-400">Bounty #{bountyId} does not exist on-chain.</p>
        <Link href="/explore" className="inline-block px-6 py-2.5 rounded-xl bg-cyan-500 text-black font-bold text-sm">
          Return to Explorer
        </Link>
      </div>
    );
  }

  const statusInfo = STATUS_MAP[bounty.status] || {
    label: bounty.status_label || "OPEN",
    color: "#06B6D4",
    bg: "rgba(6, 182, 212, 0.12)",
  };

  const isPositive = bounty.claim_polarity === "POSITIVE";

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Back Link */}
      <Link
        href="/explore"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <span>←</span>
        <span>Back to Bounties</span>
      </Link>

      {/* Header Card */}
      <div className="glass-panel rounded-3xl p-8 space-y-6 relative overflow-hidden">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700">
              Bounty #{bounty.bounty_id}
            </span>
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                isPositive
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {bounty.claim_polarity} CLAIM
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 font-medium">
              {bounty.category}
            </span>
          </div>

          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{
              color: statusInfo.color,
              backgroundColor: statusInfo.bg,
              border: `1px solid ${statusInfo.color}33`,
            }}
          >
            {statusInfo.label}
          </span>
        </div>

        {/* Title & Claim */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            {bounty.title}
          </h1>
          <div className="p-4 rounded-xl bg-slate-900/90 border border-white/5 text-slate-200 text-base leading-relaxed">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Factual Claim Under Test:
            </span>
            {bounty.claim_text}
          </div>
        </div>

        {/* Financial Escrow Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
              Escrowed Reward
            </span>
            <div className="text-2xl font-black text-cyan-400">
              {formatGen(bounty.reward_deposited)} <span className="text-xs text-slate-400">GEN</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
              Required Bond
            </span>
            <div className="text-xl font-bold text-white">
              {formatGen(bounty.required_bond)} <span className="text-xs text-slate-400">GEN</span>
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
              Creator
            </span>
            <div className="text-sm font-mono text-slate-300">
              {truncateAddress(bounty.creator)}
            </div>
          </div>

          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
              Criteria Status
            </span>
            <div className="text-sm font-semibold">
              {bounty.criteria_locked ? (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  LOCKED (IMMUTABLE)
                </span>
              ) : (
                <span className="text-cyan-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  OPEN FOR ACCEPTANCE
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Feedback */}
        {actionStatus && (
          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm">
            {actionStatus}
          </div>
        )}
        {actionError && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {actionError}
          </div>
        )}
      </div>

      {/* Criteria & Requirements Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              Precommitted Proof Criteria
            </h3>
            {bounty.criteria_locked && (
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                LOCKED
              </span>
            )}
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
            {bounty.proof_criteria}
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6 space-y-3">
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Evidence Guidance
          </h3>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 leading-relaxed">
            {bounty.evidence_requirements || "Publicly accessible URL containing evidence."}
          </div>

          {/* Accept Bounty Button (If Bounty is Open) */}
          {bounty.status === 0 && (
            <div className="pt-4">
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-bold text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
              >
                {actionLoading ? "Processing..." : `Accept Bounty (Stake ${formatGen(bounty.required_bond)} GEN)`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Challenger Attempts & Consensus Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Challenger Attempts ({attempts.length})
            </h2>
            <p className="text-sm text-slate-400">
              Concurrent attempts evaluating public evidence against the frozen criteria.
            </p>
          </div>
        </div>

        {attempts.length === 0 ? (
          <div className="glass-panel rounded-2xl p-12 text-center text-slate-400">
            No challengers have accepted this bounty yet. Be the first to stake a bond!
          </div>
        ) : (
          <div className="space-y-4">
            {attempts.map((att) => {
              const attStatus = ATTEMPT_STATUS_MAP[att.status] || {
                label: att.status_label || "STATUS",
                color: "#38BDF8",
              };

              const isChallenger = account && att.challenger.toLowerCase() === account.toLowerCase();

              return (
                <div key={att.index} className="glass-panel rounded-2xl p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        Attempt #{att.index}
                      </span>
                      <span className="text-xs text-slate-400">
                        Challenger: <span className="font-mono text-slate-200">{truncateAddress(att.challenger)}</span>
                      </span>
                      <span className="text-xs text-slate-400">
                        Bond: <span className="font-mono text-cyan-400">{formatGen(att.bond_deposited)} GEN</span>
                      </span>
                    </div>

                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{
                        color: attStatus.color,
                        backgroundColor: `${attStatus.color}1a`,
                        border: `1px solid ${attStatus.color}33`,
                      }}
                    >
                      {attStatus.label}
                    </span>
                  </div>

                  {/* Evidence Display or Submission Form */}
                  {att.evidence_url ? (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Submitted Evidence URL:
                        </span>
                        <a
                          href={att.evidence_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-400 hover:underline font-mono break-all"
                        >
                          {att.evidence_url} ↗
                        </a>
                      </div>
                      {att.evidence_description && (
                        <p className="text-slate-300 text-xs italic bg-slate-900/60 p-3 rounded-lg">
                          "{att.evidence_description}"
                        </p>
                      )}
                    </div>
                  ) : isChallenger ? (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                        Submit Evidence URL for Verification
                      </h4>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                      <input
                        type="text"
                        placeholder="Short description of what the page shows..."
                        value={evidenceDesc}
                        onChange={(e) => setEvidenceDesc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                      />
                      <button
                        onClick={() => handleSubmitEvidence(att.index)}
                        disabled={actionLoading || !evidenceUrl}
                        className="px-5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs disabled:opacity-50"
                      >
                        Submit Evidence URL
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">
                      Awaiting challenger evidence submission...
                    </div>
                  )}

                  {/* Verification Trigger */}
                  {att.status === 1 && (
                    <div className="pt-2 flex items-center justify-between border-t border-white/5">
                      <span className="text-xs text-slate-400">
                        Evidence is ready for GenLayer validator evaluation.
                      </span>
                      <button
                        onClick={() => handleVerify(att.index)}
                        disabled={actionLoading}
                        className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-md shadow-cyan-500/20 disabled:opacity-50"
                      >
                        Trigger Validator Verification
                      </button>
                    </div>
                  )}

                  {/* Verdict & Reasoning Output */}
                  {att.last_verdict && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-400 uppercase">AI Consensus Verdict:</span>
                        <span className="text-emerald-400">{att.last_verdict}</span>
                      </div>
                      {att.last_reasoning && (
                        <p className="text-slate-300 leading-relaxed">{att.last_reasoning}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
