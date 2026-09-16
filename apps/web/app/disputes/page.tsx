"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { readContractRPC, Attempt, formatGen, truncateAddress, CONTRACT_ADDRESS, EXPLORER_BASE } from "@/lib/contract";
import { useWallet } from "@/lib/wallet";

export default function DisputesPage() {
  const { account, isConnected, connect } = useWallet();
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Resolution form state
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [verdict, setVerdict] = useState<"APPROVE" | "REJECT" | "PARTIAL">("APPROVE");
  const [resolutionNote, setResolutionNote] = useState("");
  const [payoutBps, setPayoutBps] = useState(10000);
  const [resolving, setResolving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadDisputes = async () => {
    try {
      const res = await readContractRPC("get_disputed_attempts", []);
      if (Array.isArray(res)) {
        setDisputes(res);
      }
    } catch (err) {
      console.error("Failed to load disputed attempts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDispute || !resolutionNote || !isConnected || !account) return;

    setResolving(true);
    setActionMessage("Submitting arbiter resolution to GenLayer Intelligent Contract...");

    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const eth = (window as any).ethereum;
        await eth.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: account,
              to: CONTRACT_ADDRESS,
              data: JSON.stringify({
                method: "resolve_dispute",
                args: [
                  selectedDispute.bounty_id,
                  selectedDispute.index,
                  verdict,
                  resolutionNote.trim(),
                  payoutBps,
                ],
              }),
            },
          ],
        });

        setActionMessage("Dispute resolved! Opened 48-hour appeal window.");
        setSelectedDispute(null);
        setResolutionNote("");
        setTimeout(() => {
          loadDisputes();
          setActionMessage(null);
        }, 3000);
      }
    } catch (err: any) {
      setActionMessage("Error: " + (err?.message || "Failed to resolve dispute"));
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Disputes & Appeals Center
        </h1>
        <p className="text-slate-400 mt-2">
          Transparent multi-tier dispute resolution. Arbiters provide written justification, while final settlement is strictly verified through a mandatory second round of GenLayer AI consensus.
        </p>
      </div>

      {/* Trust Guarantee Alert */}
      <div className="glass-panel rounded-2xl p-6 border-l-4 border-l-cyan-500 space-y-2">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">
          GenLayer Trust Boundary Guarantee
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          An arbiter's ruling never moves money alone. Resolving a dispute opens a 48-hour appeal window. Once the window elapses or if appealed, a <strong>mandatory second round of independent GenLayer validator consensus</strong> evaluates the dispute context to guarantee objective fairness.
        </p>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm">
          {actionMessage}
        </div>
      )}

      {/* Active Disputes List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Active Contested Claims</h2>

        {loading ? (
          <div className="text-center py-20 text-slate-400 font-mono">
            Scanning for disputed attempts on StudioNet...
          </div>
        ) : disputes.length === 0 ? (
          <div className="glass-panel rounded-2xl p-16 text-center text-slate-400">
            No active disputes found. All current attempts have settled through automated consensus!
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((d, i) => (
              <div key={i} className="glass-panel rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-500/20">
                      DISPUTED
                    </span>
                    <span className="text-sm font-bold text-white">
                      Bounty #{d.bounty_id} (Attempt #{d.index})
                    </span>
                  </div>

                  <Link
                    href={`/bounty/${d.bounty_id}`}
                    className="text-xs text-cyan-400 hover:underline"
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
                    <span className="text-slate-400 block mb-1">Locked Bond:</span>
                    <span className="font-mono text-cyan-400">{formatGen(d.bond_deposited)} GEN</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 text-xs text-slate-300">
                  <span className="font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Stated Dispute Reason:
                  </span>
                  "{d.dispute_reason}"
                </div>

                {/* Arbiter Action Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedDispute(d)}
                    className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs shadow-md"
                  >
                    Provide Arbiter Ruling
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
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

            <form onSubmit={handleResolve} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 uppercase">
                  Verdict Code
                </label>
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
                    Payout Percentage (Basis Points, 500-9500)
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
                  disabled={resolving || !resolutionNote}
                  className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs disabled:opacity-50"
                >
                  {resolving ? "Submitting..." : "Submit Written Ruling"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
