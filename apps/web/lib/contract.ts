export const CONTRACT_ADDRESS = "0xeBdE3fE16D05eE4DCA5096F4633FcEE92232877F";
export const RPC_URL = "https://studio.genlayer.com/api";
export const CHAIN_ID = 61999;
export const EXPLORER_BASE = "https://explorer-studio.genlayer.com";

export interface Bounty {
  bounty_id: number;
  creator: string;
  arbiter: string;
  title: string;
  claim_text: string;
  claim_polarity: "POSITIVE" | "NEGATIVE";
  category: string;
  proof_criteria: string;
  evidence_requirements: string;
  status: number;
  status_label: string;
  reward_amount: string;
  reward_deposited: string;
  required_bond: string;
  platform_fee_bps: number;
  attempt_count: number;
  attempts_won: number;
  winning_attempt_index: number;
  criteria_locked: boolean;
  deadline: number;
  created_at: number;
}

export interface Attempt {
  index: number;
  bounty_id: number;
  challenger: string;
  status: number;
  status_label: string;
  bond_amount: string;
  bond_deposited: string;
  evidence_url: string;
  evidence_description: string;
  evidence_content_hash: string;
  evidence_fetched_at: number;
  submitted_at: number;
  resolved_at: number;
  last_verdict: string;
  last_reasoning: string;
  last_payout_bps: number;
  revision_count: number;
  max_revisions: number;
  disputed_by: string;
  dispute_reason: string;
  resolved_by_arbiter: boolean;
  pending_arbiter_verdict: string;
  pending_payout_bps: number;
  appeal_deadline: number;
  appealed_by: string;
  appeal_reason: string;
  appeal_bond_deposited: number;
  human_verdict_overrode_ai: boolean;
}

export interface Transparency {
  attempts_settled_by_ai_consensus: number;
  attempts_settled_by_human_override: number;
  human_override_rate_bps: number;
  total_settled_attempts: number;
}

export interface Reputation {
  bounties_created: number;
  bounties_funded_total: string;
  attempts_made: number;
  attempts_won: number;
  attempts_partial: number;
  attempts_rejected: number;
  attempts_disputed: number;
  total_earned: string;
}

export const STATUS_MAP: Record<number, { label: string; color: string; bg: string }> = {
  0: { label: "OPEN", color: "#06B6D4", bg: "rgba(6, 182, 212, 0.12)" },
  1: { label: "SETTLED", color: "#10B981", bg: "rgba(16, 185, 129, 0.12)" },
  2: { label: "CANCELLED", color: "#94A3B8", bg: "rgba(148, 163, 184, 0.12)" },
  3: { label: "EXPIRED_REFUNDED", color: "#F59E0B", bg: "rgba(245, 158, 11, 0.12)" },
};

export const ATTEMPT_STATUS_MAP: Record<number, { label: string; color: string }> = {
  0: { label: "ACCEPTED", color: "#38BDF8" },
  1: { label: "SUBMITTED", color: "#F59E0B" },
  2: { label: "NEEDS_REVISION", color: "#F97316" },
  3: { label: "WON", color: "#10B981" },
  4: { label: "LOST_RACE", color: "#64748B" },
  5: { label: "REJECTED_FINAL", color: "#EF4444" },
  6: { label: "BOND_FORFEITED", color: "#DC2626" },
  7: { label: "DISPUTED", color: "#EC4899" },
  8: { label: "CANCELLED", color: "#94A3B8" },
  9: { label: "PENDING_APPEAL", color: "#8B5CF6" },
  10: { label: "APPEALED", color: "#A855F7" },
  11: { label: "INSUFFICIENT_EVIDENCE_FINAL", color: "#EAB308" },
};

// RPC Read Call helper using genlayer-js
export async function readContractRPC(functionName: string, args: any[] = []): Promise<any> {
  try {
    const { createClient, chains } = await import("genlayer-js");
    const client = createClient({ chain: chains.studionet });
    return await client.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      functionName,
      args,
    });
  } catch (err) {
    console.error(`Error reading ${functionName}:`, err);
    throw err;
  }
}

export function formatGen(weiStr: string | number | bigint): string {
  try {
    const b = BigInt(String(weiStr || "0"));
    const whole = b / 10n ** 18n;
    const frac = b % 10n ** 18n;
    const fracStr = frac.toString().padStart(18, "0").slice(0, 4);
    return `${whole}.${fracStr}`.replace(/\.?0+$/, "") || "0";
  } catch {
    return "0";
  }
}

export function toGenWei(genStr: string): bigint {
  const [whole = "0", frac = ""] = genStr.split(".");
  const padded = (frac + "0".repeat(18)).slice(0, 18);
  return BigInt(whole) * 10n ** 18n + BigInt(padded);
}

export function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
