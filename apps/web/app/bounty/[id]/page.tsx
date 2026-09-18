"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
} from "@/lib/contract";
import { useWallet } from "@/lib/wallet";

export default function BountyDetailPage() {
  const params = useParams();
  const bountyId = Number(params.id);

  const { account, isConnected, connect, executeContractWrite } = useWallet();

  const [bounty, setBounty] = useState<Bounty | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Evidence submission state
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceDesc, setEvidenceDesc] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Dispute & Appeal state
  const [disputeAttemptIndex, setDisputeAttemptIndex] = useState<number | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  const [appealAttempt, setAppealAttempt] = useState<Attempt | null>(null);
  const [appealReason, setAppealReason] = useState("");

  const [arbiterAttempt, setArbiterAttempt] = useState<Attempt | null>(null);
  const [arbiterVerdict, setArbiterVerdict] = useState<"APPROVE" | "REJECT" | "PARTIAL">("APPROVE");
  const [arbiterNote, setArbiterNote] = useState("");
  const [arbiterPayoutBps, setArbiterPayoutBps] = useState(5000);

  const loadData = async () => {
    try {
      const b = await readContractRPC("get_bounty", [bountyId]);
      if (b && b.title) {
        setBounty(b);
        const atts = await readContractRPC("get_bounty_attempts", [bountyId]);
        if (Array.isArray(atts)) {
          setAttempts(atts);
        }
      }
    } catch (err) {
      console.error("Failed to load bounty data", err);
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

  // Dispute & Appeal handlers
  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disputeAttemptIndex === null || !disputeReason.trim() || !isConnected || !account) return;

    setActionLoading(true);
    setActionStatus("Raising dispute on attempt...");
    setActionError(null);

    try {
      await executeContractWrite("raise_dispute", [bountyId, disputeAttemptIndex, disputeReason.trim()]);
      setActionStatus("Dispute raised! Status transitioned to DISPUTED.");
      setDisputeAttemptIndex(null);
      setDisputeReason("");
      setTimeout(() => {
        loadData();
        setActionStatus(null);
      }, 3000);
    } catch (err: any) {
      setActionError(err?.message || "Failed to raise dispute");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!arbiterAttempt || !arbiterNote.trim() || !isConnected || !account) return;

    setActionLoading(true);
    setActionStatus("Submitting arbiter ruling...");
    setActionError(null);

    try {
      const bps = arbiterVerdict === "PARTIAL" ? arbiterPayoutBps : 0;
      await executeContractWrite("resolve_dispute", [
        bountyId,
        arbiterAttempt.index,
        arbiterVerdict,
        arbiterNote.trim(),
        bps,
      ]);
      setActionStatus("Ruling recorded! Opened 48-hour appeal window.");
      setArbiterAttempt(null);
      setArbiterNote("");
      setTimeout(() => {
        loadData();
        setActionStatus(null);
      }, 3000);
    } catch (err: any) {
      setActionError(err?.message || "Failed to record ruling");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealAttempt || !appealReason.trim() || !isConnected || !account) return;

    setActionLoading(true);
    setActionStatus("Staking appeal bond and escalating to 2nd-round validator consensus...");
    setActionError(null);

    try {
      const bondWei = BigInt(appealAttempt.bond_amount || appealAttempt.bond_deposited);
      await executeContractWrite(
        "appeal_arbiter_resolution",
        [bountyId, appealAttempt.index, appealReason.trim()],
        bondWei
      );
      setActionStatus("Appeal filed! Escalated to 2nd-round validator consensus.");
      setAppealAttempt(null);
      setAppealReason("");
      setTimeout(() => {
        loadData();
        setActionStatus(null);
      }, 3000);
    } catch (err: any) {
      setActionError(err?.message || "Failed to file appeal");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalizeArbiter = async (attemptIndex: number) => {
    if (!isConnected || !account) return;
    setActionLoading(true);
    setActionStatus("Executing finalization via 2nd-round validator consensus...");
    setActionError(null);

    try {
      await executeContractWrite("finalize_arbiter_resolution", [bountyId, attemptIndex]);
      setActionStatus("Settlement finalized by GenLayer validators!");
      setTimeout(() => {
        loadData();
        setActionStatus(null);
      }, 4000);
    } catch (err: any) {
      setActionError(err?.message || "Failed to finalize");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveAppeal = async (attemptIndex: number) => {
    if (!isConnected || !account) return;
    setActionLoading(true);
    setActionStatus("Executing 2nd-round validator consensus (resolve_appeal)...");
    setActionError(null);

    try {
      await executeContractWrite("resolve_appeal", [bountyId, attemptIndex]);
      setActionStatus("Appeal resolved by GenLayer consensus!");
      setTimeout(() => {
        loadData();
        setActionStatus(null);
      }, 4000);
    } catch (err: any) {
      setActionError(err?.message || "Failed to resolve appeal");
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

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Back link */}
      <div>
        <Link href="/explore" className="text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors">
          ← Back to All Bounties
        </Link>
      </div>

      {/* Action Notification */}
      {actionStatus && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-sm font-mono animate-fade-in">
          {actionStatus}
        </div>
      )}
      {actionError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-mono animate-fade-in">
          {actionError}
        </div>
      )}

      {/* Main Bounty Overview Card */}
      <div className="glass-panel rounded-3xl p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                #{bounty.bounty_id}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {bounty.category}
              </span>
              {bounty.criteria_locked && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🔒 Criteria Frozen
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight pt-2">
              {bounty.title}
            </h1>
          </div>

          <div
            className="text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider"
            style={{
              color: statusInfo.color,
              backgroundColor: statusInfo.bg,
              border: `1px solid ${statusInfo.color}40`,
            }}
          >
            {statusInfo.label}
          </div>
        </div>

        {/* Claim Text */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Verifiable Factual Claim
          </span>
          <p className="text-base text-slate-200 leading-relaxed p-4 rounded-xl bg-slate-900/90 border border-white/5">
            "{bounty.claim_text}"
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Escrowed Reward</span>
            <span className="text-xl font-bold text-emerald-400 font-mono">
              {formatGen(bounty.reward_amount)} GEN
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Required Bond</span>
            <span className="text-xl font-bold text-cyan-400 font-mono">
              {formatGen(bounty.required_bond)} GEN
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Creator</span>
            <span className="text-sm font-mono text-slate-300 truncate block">
              {truncateAddress(bounty.creator)}
            </span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-white/5">
            <span className="text-xs text-slate-400 block mb-1">Arbiter</span>
            <span className="text-sm font-mono text-slate-300 truncate block">
              {truncateAddress(bounty.arbiter)}
            </span>
          </div>
        </div>
      </div>

      {/* Proof Criteria & Evidence Specs */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-6 space-y-3">
          <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center justify-between">
            <span>Precommitted Proof Criteria</span>
            {bounty.criteria_locked && (
              <span className="text-[10px] text-emerald-400 font-mono">IMMUTABLE</span>
            )}
          </h3>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-300 whitespace-pre-line leading-relaxed font-mono">
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

          {/* Accept Bounty Button */}
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
              const isLiveState = [0, 1, 2, 5].includes(att.status);

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
                        Bond: <span className="font-mono text-cyan-400">{formatGen(att.bond_deposited || att.bond_amount)} GEN</span>
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
                      {attStatus.label} (Status: {att.status})
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

                  {/* DISPUTED STATE (Status: 7) BANNER */}
                  {att.status === 7 && (
                    <div className="p-4 rounded-xl bg-pink-500/10 border border-pink-500/30 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-pink-400 font-bold">
                        <span>⚠️ CONTESTED / DISPUTED</span>
                        <span>Disputer: {truncateAddress(att.disputed_by)}</span>
                      </div>
                      <p className="text-slate-300">
                        <strong>Reason:</strong> "{att.dispute_reason || "Evidence outcome contested."}"
                      </p>
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => setArbiterAttempt(att)}
                          className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs"
                        >
                          Provide Arbiter Ruling
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PENDING APPEAL STATE (Status: 9) BANNER */}
                  {att.status === 9 && (
                    <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-3 text-xs">
                      <div className="flex items-center justify-between text-purple-300 font-bold">
                        <span>⚖️ ARBITER RULING: {att.pending_arbiter_verdict || "RECORDED"}</span>
                        <span>Appeal Window Open</span>
                      </div>
                      {att.last_reasoning && (
                        <p className="text-slate-300">
                          <strong>Justification:</strong> "{att.last_reasoning}"
                        </p>
                      )}
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => setAppealAttempt(att)}
                          className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                        >
                          File Appeal (Stake Bond)
                        </button>
                        <button
                          onClick={() => handleFinalizeArbiter(att.index)}
                          disabled={actionLoading}
                          className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold"
                        >
                          Finalize Ruling (2nd Consensus)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* APPEALED STATE (Status: 10) BANNER */}
                  {att.status === 10 && (
                    <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-cyan-300 font-bold">
                        <span>📢 UNDER APPEAL (ESCALATED TO 2ND CONSENSUS)</span>
                        <span>Appellant: {truncateAddress(att.appealed_by)}</span>
                      </div>
                      <p className="text-slate-300">
                        <strong>Appeal Reason:</strong> "{att.appeal_reason}"
                      </p>
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => handleResolveAppeal(att.index)}
                          disabled={actionLoading}
                          className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs"
                        >
                          Run 2nd-Round Validator Consensus
                        </button>
                      </div>
                    </div>
                  )}

                  {/* DISPUTE INITIATION BUTTON (For live non-disputed attempts) */}
                  {isLiveState && (
                    <div className="pt-2 flex justify-end border-t border-white/5">
                      <button
                        onClick={() => {
                          setDisputeAttemptIndex(att.index);
                          setDisputeReason("");
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-pink-300 border border-slate-700 text-xs transition-colors"
                      >
                        Contest / Raise Dispute
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: RAISE DISPUTE */}
      {disputeAttemptIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-950 rounded-3xl max-w-lg w-full p-6 space-y-5 border border-pink-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Contest Attempt #{disputeAttemptIndex}</h3>
              <button onClick={() => setDisputeAttemptIndex(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRaiseDispute} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Reason for Contest / Dispute *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain why this attempt outcome or evidence is disputed..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDisputeAttemptIndex(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !disputeReason.trim()}
                  className="px-6 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold text-xs disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Submit Dispute"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ARBITER RULING */}
      {arbiterAttempt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-950 rounded-3xl max-w-lg w-full p-6 space-y-5 border border-cyan-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Arbiter Ruling for Attempt #{arbiterAttempt.index}</h3>
              <button onClick={() => setArbiterAttempt(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleResolveDispute} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Verdict</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["APPROVE", "REJECT", "PARTIAL"] as const).map((v) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setArbiterVerdict(v)}
                      className={`py-2 rounded-lg text-xs font-bold border ${
                        arbiterVerdict === v
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500"
                          : "bg-slate-900 text-slate-400 border-slate-800"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {arbiterVerdict === "PARTIAL" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">
                    Payout Percentage (Basis points: 500 = 5%, 5000 = 50%)
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="500"
                    max="9500"
                    value={arbiterPayoutBps}
                    onChange={(e) => setArbiterPayoutBps(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Written Justification *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain the evidentiary justification for this ruling..."
                  value={arbiterNote}
                  onChange={(e) => setArbiterNote(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setArbiterAttempt(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !arbiterNote.trim()}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Submit Arbiter Ruling"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FILE APPEAL */}
      {appealAttempt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-950 rounded-3xl max-w-lg w-full p-6 space-y-5 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">File Appeal for Attempt #{appealAttempt.index}</h3>
              <button onClick={() => setAppealAttempt(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleFileAppeal} className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200">
                <strong>Required Appeal Bond:</strong> {formatGen(appealAttempt.bond_amount || appealAttempt.bond_deposited)} GEN
                <p className="text-[11px] text-slate-300 mt-1">
                  Refunded in full if 2nd-round validator consensus overturns the arbiter's ruling.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Appeal Grounds / Reason *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain why the arbiter's ruling should be overturned..."
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAppealAttempt(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !appealReason.trim()}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Stake Bond & File Appeal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
