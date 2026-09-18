"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  readContractRPC,
  Attempt,
  formatGen,
  truncateAddress,
  CONTRACT_ADDRESS,
  EXPLORER_BASE,
  ATTEMPT_STATUS_MAP,
} from "@/lib/contract";
import { useWallet } from "@/lib/wallet";

export default function DisputesPage() {
  const { account, isConnected, connect, executeContractWrite } = useWallet();

  const [activeTab, setActiveTab] = useState<"disputed" | "pending_appeal" | "appealed">("disputed");
  const [disputedList, setDisputedList] = useState<any[]>([]);
  const [pendingAppealList, setPendingAppealList] = useState<any[]>([]);
  const [appealedList, setAppealedList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [initBountyId, setInitBountyId] = useState<number>(0);
  const [initAttemptIndex, setInitAttemptIndex] = useState<number>(0);
  const [initReason, setInitReason] = useState("");

  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [verdict, setVerdict] = useState<"APPROVE" | "REJECT" | "PARTIAL">("APPROVE");
  const [resolutionNote, setResolutionNote] = useState("");
  const [payoutBps, setPayoutBps] = useState(5000);

  const [selectedForAppeal, setSelectedForAppeal] = useState<any | null>(null);
  const [appealReason, setAppealReason] = useState("");

  const [processing, setProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Direct get_disputed_attempts(start_bounty_id, limit) call as required by GenLayer protocol
      const disputedRes = await readContractRPC("get_disputed_attempts", [0, 50]);
      if (Array.isArray(disputedRes)) {
        setDisputedList(disputedRes);
      }

      // 2. Comprehensive scan for pending appeals and active appeals across bounties
      const bountiesRes = await readContractRPC("list_bounties", [0, 20]);
      if (Array.isArray(bountiesRes)) {
        const pendingArr: any[] = [];
        const appealedArr: any[] = [];
        const allDisputed: any[] = Array.isArray(disputedRes) ? [...disputedRes] : [];

        for (const b of bountiesRes) {
          if (b.attempt_count > 0) {
            const atts = await readContractRPC("get_bounty_attempts", [b.bounty_id]);
            if (Array.isArray(atts)) {
              for (const a of atts) {
                if (a.status === 7 && !allDisputed.some((d) => d.bounty_id === a.bounty_id && d.index === a.index)) {
                  allDisputed.push(a);
                } else if (a.status === 9) {
                  pendingArr.push(a);
                } else if (a.status === 10) {
                  appealedArr.push(a);
                }
              }
            }
          }
        }
        setDisputedList(allDisputed);
        setPendingAppealList(pendingArr);
        setAppealedList(appealedArr);
      }
    } catch (err) {
      console.error("Failed to load dispute center data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Action 1: Initiate Dispute
  const handleInitiateDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !account) {
      await connect();
      return;
    }
    if (!initReason.trim()) return;

    setProcessing(true);
    setActionMessage("Submitting dispute escalation transaction to GenLayer Intelligent Contract...");

    try {
      await executeContractWrite("raise_dispute", [
        Number(initBountyId),
        Number(initAttemptIndex),
        initReason.trim(),
      ]);

      setActionMessage("Dispute raised successfully! Attempt status updated to DISPUTED.");
      setShowInitiateModal(false);
      setInitReason("");
      setTimeout(() => {
        loadData();
        setActionMessage(null);
      }, 3000);
    } catch (err: any) {
      setActionMessage("Error raising dispute: " + (err?.message || "Transaction failed"));
    } finally {
      setProcessing(false);
    }
  };

  // Action 2: Arbiter Ruling
  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !resolutionNote || !isConnected || !account) return;

    setProcessing(true);
    setActionMessage("Submitting arbiter written ruling to GenLayer Intelligent Contract...");

    try {
      const bps = verdict === "PARTIAL" ? payoutBps : 0;
      await executeContractWrite("resolve_dispute", [
        selectedDispute.bounty_id,
        selectedDispute.index,
        verdict,
        resolutionNote.trim(),
        bps,
      ]);

      setActionMessage("Dispute resolved by arbiter! Opened appeal window (Status: PENDING_APPEAL).");
      setSelectedDispute(null);
      setResolutionNote("");
      setTimeout(() => {
        loadData();
        setActionMessage(null);
      }, 3000);
    } catch (err: any) {
      setActionMessage("Error resolving dispute: " + (err?.message || "Failed to resolve dispute"));
    } finally {
      setProcessing(false);
    }
  };

  // Action 3: File Appeal (Requires Appeal Bond)
  const handleFileAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedForAppeal || !appealReason || !isConnected || !account) return;

    setProcessing(true);
    setActionMessage("Depositing appeal bond and escalating to 2nd-Round GenLayer consensus...");

    try {
      const bondWei = BigInt(selectedForAppeal.bond_amount || selectedForAppeal.bond_deposited);
      await executeContractWrite(
        "appeal_arbiter_resolution",
        [selectedForAppeal.bounty_id, selectedForAppeal.index, appealReason.trim()],
        bondWei
      );

      setActionMessage("Appeal filed! Attempt escalated to APPEALED status. Ready for 2nd consensus round.");
      setSelectedForAppeal(null);
      setAppealReason("");
      setTimeout(() => {
        loadData();
        setActionMessage(null);
      }, 3000);
    } catch (err: any) {
      setActionMessage("Error filing appeal: " + (err?.message || "Failed to file appeal"));
    } finally {
      setProcessing(false);
    }
  };

  // Action 4: Resolve Appeal (Triggers 2nd-round validator consensus)
  const handleResolveAppeal = async (bountyId: number, attemptIndex: number) => {
    if (!isConnected || !account) {
      await connect();
      return;
    }

    setProcessing(true);
    setActionMessage("Triggering 2nd-round GenLayer validator consensus review (resolve_appeal)...");

    try {
      await executeContractWrite("resolve_appeal", [bountyId, attemptIndex]);
      setActionMessage("Consensus reached! Appeal verdict settled and funds distributed.");
      setTimeout(() => {
        loadData();
        setActionMessage(null);
      }, 4000);
    } catch (err: any) {
      setActionMessage("Error resolving appeal: " + (err?.message || "Failed to trigger consensus"));
    } finally {
      setProcessing(false);
    }
  };

  // Action 5: Finalize Arbiter Resolution (If unappealed after window)
  const handleFinalizeArbiter = async (bountyId: number, attemptIndex: number) => {
    if (!isConnected || !account) {
      await connect();
      return;
    }

    setProcessing(true);
    setActionMessage("Executing finalization with 2nd-round GenLayer validator consensus...");

    try {
      await executeContractWrite("finalize_arbiter_resolution", [bountyId, attemptIndex]);
      setActionMessage("Ruling finalized! GenLayer validators evaluated evidence and settled claim.");
      setTimeout(() => {
        loadData();
        setActionMessage(null);
      }, 4000);
    } catch (err: any) {
      setActionMessage("Error finalizing resolution: " + (err?.message || "Failed to finalize"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Disputes & Appeals Center
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            End-to-end multi-tier adjudication. Contest verdicts, provide arbiter rulings, stake appeal bonds, and trigger 2nd-round GenLayer validator consensus.
          </p>
        </div>

        <button
          onClick={() => setShowInitiateModal(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-pink-500/20 whitespace-nowrap self-start sm:self-auto transition-all"
        >
          + Raise New Dispute
        </button>
      </div>

      {/* Trust Guarantee Alert */}
      <div className="glass-panel rounded-2xl p-6 border-l-4 border-l-cyan-500 space-y-2">
        <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
          GenLayer Bounded Arbiter Trust Guarantee
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          In Bounties, a human arbiter can <strong>never move funds alone</strong>. Arbiter rulings open a 48-hour appeal window. Once appealed or finalized, settlement is verified through a <strong>mandatory second round of independent GenLayer validator consensus</strong> over the live web evidence.
        </p>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono animate-fade-in">
          {actionMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          onClick={() => setActiveTab("disputed")}
          className={`pb-3 px-4 text-xs font-bold transition-all relative ${
            activeTab === "disputed"
              ? "text-pink-400 border-b-2 border-pink-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          1. Active Disputes ({disputedList.length})
        </button>
        <button
          onClick={() => setActiveTab("pending_appeal")}
          className={`pb-3 px-4 text-xs font-bold transition-all relative ${
            activeTab === "pending_appeal"
              ? "text-purple-400 border-b-2 border-purple-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          2. Pending Appeals ({pendingAppealList.length})
        </button>
        <button
          onClick={() => setActiveTab("appealed")}
          className={`pb-3 px-4 text-xs font-bold transition-all relative ${
            activeTab === "appealed"
              ? "text-cyan-400 border-b-2 border-cyan-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          3. Under Active Appeal ({appealedList.length})
        </button>
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div className="text-center py-20 text-slate-400 font-mono text-xs">
          Scanning GenLayer StudioNet for active disputes and appeals...
        </div>
      ) : activeTab === "disputed" ? (
        /* TAB 1: DISPUTED */
        <div className="space-y-4">
          {disputedList.length === 0 ? (
            <div className="glass-panel rounded-2xl p-16 text-center text-slate-400 text-sm">
              No active disputes awaiting arbiter ruling.
            </div>
          ) : (
            disputedList.map((d, i) => (
              <div key={i} className="glass-panel rounded-2xl p-6 space-y-4 border border-pink-500/20">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
                      DISPUTED (Status: 7)
                    </span>
                    <span className="text-sm font-bold text-white">
                      Bounty #{d.bounty_id} • Attempt #{d.index}
                    </span>
                  </div>

                  <Link
                    href={`/bounty/${d.bounty_id}`}
                    className="text-xs text-cyan-400 hover:underline font-semibold"
                  >
                    View Bounty Page ↗
                  </Link>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Disputed By:</span>
                    <span className="font-mono text-slate-200">{truncateAddress(d.disputed_by)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Escrowed Bond:</span>
                    <span className="font-mono text-cyan-400">{formatGen(d.bond_amount || d.bond_deposited)} GEN</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-slate-300">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">
                    Stated Dispute Reason:
                  </span>
                  "{d.dispute_reason || "No explicit reason specified"}"
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedDispute(d)}
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    Provide Arbiter Ruling
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === "pending_appeal" ? (
        /* TAB 2: PENDING APPEAL */
        <div className="space-y-4">
          {pendingAppealList.length === 0 ? (
            <div className="glass-panel rounded-2xl p-16 text-center text-slate-400 text-sm">
              No attempts currently in the 48-hour appeal window.
            </div>
          ) : (
            pendingAppealList.map((d, i) => (
              <div key={i} className="glass-panel rounded-2xl p-6 space-y-4 border border-purple-500/20">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      PENDING APPEAL (Status: 9)
                    </span>
                    <span className="text-sm font-bold text-white">
                      Bounty #{d.bounty_id} • Attempt #{d.index}
                    </span>
                  </div>

                  <Link
                    href={`/bounty/${d.bounty_id}`}
                    className="text-xs text-cyan-400 hover:underline font-semibold"
                  >
                    View Bounty Page ↗
                  </Link>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Pending Ruling:</span>
                    <span className="font-bold text-emerald-400">{d.pending_arbiter_verdict || "RECORDED"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Required Appeal Bond:</span>
                    <span className="font-mono text-cyan-400">{formatGen(d.bond_amount || d.bond_deposited)} GEN</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Appeal Deadline:</span>
                    <span className="font-mono text-slate-300">
                      {d.appeal_deadline ? new Date(Number(d.appeal_deadline) * 1000).toLocaleString() : "Active Window"}
                    </span>
                  </div>
                </div>

                {d.last_reasoning && (
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-slate-300">
                    <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">
                      Arbiter Reasoning:
                    </span>
                    "{d.last_reasoning}"
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
                  <button
                    onClick={() => setSelectedForAppeal(d)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                  >
                    File Appeal (Stake Appeal Bond)
                  </button>

                  <button
                    onClick={() => handleFinalizeArbiter(d.bounty_id, d.index)}
                    disabled={processing}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    Finalize Ruling (2nd Consensus)
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* TAB 3: APPEALED */
        <div className="space-y-4">
          {appealedList.length === 0 ? (
            <div className="glass-panel rounded-2xl p-16 text-center text-slate-400 text-sm">
              No claims under active appeal escalation.
            </div>
          ) : (
            appealedList.map((d, i) => (
              <div key={i} className="glass-panel rounded-2xl p-6 space-y-4 border border-cyan-500/20">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      APPEALED (Status: 10)
                    </span>
                    <span className="text-sm font-bold text-white">
                      Bounty #{d.bounty_id} • Attempt #{d.index}
                    </span>
                  </div>

                  <Link
                    href={`/bounty/${d.bounty_id}`}
                    className="text-xs text-cyan-400 hover:underline font-semibold"
                  >
                    View Bounty Page ↗
                  </Link>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Appealed By:</span>
                    <span className="font-mono text-slate-200">{truncateAddress(d.appealed_by)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Appeal Bond Deposited:</span>
                    <span className="font-mono text-cyan-400">{formatGen(d.appeal_bond_deposited || d.bond_amount)} GEN</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-slate-300">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1 text-[10px]">
                    Appellant's Stated Reason:
                  </span>
                  "{d.appeal_reason || "Escalated for independent multi-validator re-evaluation."}"
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleResolveAppeal(d.bounty_id, d.index)}
                    disabled={processing}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Run 2nd-Round Validator Consensus (resolve_appeal)
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL 1: INITIATE DISPUTE */}
      {showInitiateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-950 rounded-3xl max-w-lg w-full p-6 space-y-6 border border-pink-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Raise New Dispute</h3>
              <button
                onClick={() => setShowInitiateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInitiateDispute} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Bounty ID</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={initBountyId}
                    onChange={(e) => setInitBountyId(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">Attempt Index</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={initAttemptIndex}
                    onChange={(e) => setInitAttemptIndex(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Dispute Reason *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain why this attempt outcome or evidence is contested..."
                  value={initReason}
                  onChange={(e) => setInitReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInitiateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || !initReason.trim()}
                  className="px-6 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-white font-bold text-xs disabled:opacity-50"
                >
                  {processing ? "Submitting..." : "Escalate to Arbiter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ARBITER RULING */}
      {selectedDispute && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-950 rounded-3xl max-w-lg w-full p-6 space-y-6 border border-cyan-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Resolve Dispute #{selectedDispute.bounty_id} (Attempt #{selectedDispute.index})
              </h3>
              <button
                onClick={() => setSelectedDispute(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResolveDispute} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Verdict Code</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["APPROVE", "REJECT", "PARTIAL"] as const).map((v) => (
                    <button
                      type="button"
                      key={v}
                      onClick={() => setVerdict(v)}
                      className={`py-2 rounded-lg text-xs font-bold border ${
                        verdict === v
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500"
                          : "bg-slate-900 text-slate-400 border-slate-800"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {verdict === "PARTIAL" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase">
                    Payout Percentage (Basis Points: 500 = 5%, 5000 = 50%)
                  </label>
                  <input
                    type="number"
                    step="500"
                    min="500"
                    max="9500"
                    value={payoutBps}
                    onChange={(e) => setPayoutBps(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">
                  Written Justification (Required) *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain the evidentiary rationale for this ruling..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDispute(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || !resolutionNote.trim()}
                  className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs disabled:opacity-50"
                >
                  {processing ? "Submitting..." : "Submit Written Ruling"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: FILE APPEAL */}
      {selectedForAppeal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel bg-slate-950 rounded-3xl max-w-lg w-full p-6 space-y-6 border border-purple-500/30">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                File Appeal for Bounty #{selectedForAppeal.bounty_id} (Attempt #{selectedForAppeal.index})
              </h3>
              <button
                onClick={() => setSelectedForAppeal(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFileAppeal} className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 space-y-1">
                <div>
                  <strong>Required Appeal Bond:</strong> {formatGen(selectedForAppeal.bond_amount || selectedForAppeal.bond_deposited)} GEN
                </div>
                <div className="text-[11px] text-slate-300">
                  This bond will be refunded in full if the 2nd-round validator consensus overturns the arbiter's ruling.
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">Appeal Grounds / Reason *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Detail why the arbiter's ruling should be overturned by validator consensus..."
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedForAppeal(null)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || !appealReason.trim()}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-bold text-xs disabled:opacity-50"
                >
                  {processing ? "Submitting..." : `Stake Bond & File Appeal`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
