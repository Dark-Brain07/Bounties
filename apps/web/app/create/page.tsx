"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { CONTRACT_ADDRESS, toGenWei, RPC_URL } from "@/lib/contract";

const CATEGORIES = [
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

export default function CreateBountyPage() {
  const router = useRouter();
  const { account, isConnected, connect } = useWallet();

  const [title, setTitle] = useState("");
  const [claimText, setClaimText] = useState("");
  const [claimPolarity, setClaimPolarity] = useState<"POSITIVE" | "NEGATIVE">("POSITIVE");
  const [category, setCategory] = useState("DOCUMENTATION");
  const [proofCriteria, setProofCriteria] = useState(
    "1. The evidence page must explicitly confirm the claim.\n2. Must originate from an official domain or verifiable commit hash."
  );
  const [evidenceRequirements, setEvidenceRequirements] = useState(
    "Publicly accessible URL (documentation, GitHub repository, explorer transaction, or published report)."
  );
  const [arbiter, setArbiter] = useState("");
  const [deadlineDays, setDeadlineDays] = useState(7);
  const [rewardAmount, setRewardAmount] = useState("1.0");
  const [requiredBond, setRequiredBond] = useState("0.1");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isConnected || !account) {
      await connect();
      return;
    }

    if (!title || !claimText || !proofCriteria || !rewardAmount) {
      setError("Please fill out all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const arbiterAddress = arbiter.trim() || account;
      const deadlineSeconds = deadlineDays * 24 * 3600;
      const rewardWei = toGenWei(rewardAmount);
      const bondWei = toGenWei(requiredBond || "0");

      const args = [
        title.trim(),
        claimText.trim(),
        claimPolarity,
        category,
        proofCriteria.trim(),
        evidenceRequirements.trim(),
        arbiterAddress,
        deadlineSeconds,
        Number(bondWei),
      ];

      // Dispatch transaction via provider or RPC
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const eth = (window as any).ethereum;
        
        // Encode transaction data using genlayer-js or standard format
        const txParams = {
          from: account,
          to: CONTRACT_ADDRESS,
          value: "0x" + rewardWei.toString(16),
          data: {
            method: "create_bounty",
            args,
          },
        };

        // Call eth_sendTransaction
        const hash = await eth.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: account,
              to: CONTRACT_ADDRESS,
              value: "0x" + rewardWei.toString(16),
              data: JSON.stringify({ method: "create_bounty", args }),
            },
          ],
        });

        setTxHash(hash);
      } else {
        throw new Error("No Web3 wallet detected. Please connect MetaMask.");
      }

      setTimeout(() => {
        router.push("/explore");
      }, 4000);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to create bounty. Please check your balance.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Create a Verifiable Bounty
        </h1>
        <p className="text-slate-400 mt-2">
          Lock funds in escrow against a specific claim. Acceptance criteria freeze upon the first accepted challenger attempt.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-8 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {txHash && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            Bounty transaction submitted! Tx: {txHash.slice(0, 10)}... Redirecting...
          </div>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Bounty Title *
          </label>
          <input
            type="text"
            required
            maxLength={200}
            placeholder="e.g., Prove Uniswap v4 Hook executes afterSwap bitmask correctly"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Claim Text */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Full Claim Statement *
          </label>
          <textarea
            required
            rows={3}
            placeholder="State the exact factual claim under test..."
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Polarity & Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Claim Polarity
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setClaimPolarity("POSITIVE")}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  claimPolarity === "POSITIVE"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500"
                    : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600"
                }`}
              >
                ✓ POSITIVE (Prove it happened)
              </button>
              <button
                type="button"
                onClick={() => setClaimPolarity("NEGATIVE")}
                className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                  claimPolarity === "NEGATIVE"
                    ? "bg-rose-500/20 text-rose-400 border-rose-500"
                    : "bg-slate-900 text-slate-400 border-slate-700 hover:border-slate-600"
                }`}
              >
                ✗ NEGATIVE (Prove violation)
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Proof Criteria */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Precommitted Acceptance Criteria *
            </label>
            <span className="text-[11px] text-amber-400">Permanently locked on 1st accept</span>
          </div>
          <textarea
            required
            rows={4}
            value={proofCriteria}
            onChange={(e) => setProofCriteria(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Evidence Requirements */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Evidence Format Guidance
          </label>
          <input
            type="text"
            value={evidenceRequirements}
            onChange={(e) => setEvidenceRequirements(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Financial Escrow & Bond */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              Reward Amount (GEN) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-4 py-3 text-base font-bold text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Required Bond (GEN)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={requiredBond}
              onChange={(e) => setRequiredBond(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base font-bold text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Deadline (Days)
            </label>
            <input
              type="number"
              min="1"
              max="90"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-base font-bold text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Arbiter Address */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Arbiter Address (Optional)
            </label>
            <span className="text-[11px] text-slate-400">Defaults to your address</span>
          </div>
          <input
            type="text"
            placeholder={account || "0x..."}
            value={arbiter}
            onChange={(e) => setArbiter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Submit */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Platform Fee: <span className="font-bold text-slate-300">2.5%</span> (paid on winning settlement)
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-bold text-sm shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
          >
            {submitting ? "Funding Escrow..." : `Lock ${rewardAmount} GEN & Create Bounty`}
          </button>
        </div>
      </form>
    </div>
  );
}
