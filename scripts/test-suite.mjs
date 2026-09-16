import { createClient, createAccount, studionet, TransactionStatus } from "./genlayer-wrapper.mjs";
import { CONTRACT_ADDRESS, read, write, toGenWei } from "./lib-contract.mjs";

function assert(condition, message) {
  if (!condition) {
    console.error("❌ ASSERTION FAILED:", message);
    throw new Error(message);
  }
  console.log("  ✓ " + message);
}

async function runTests() {
  console.log("\n=======================================================");
  console.log("RUNNING BOUNTIES CONTRACT TEST SUITE");
  console.log("Contract Address:", CONTRACT_ADDRESS);
  console.log("=======================================================\n");

  // Step 1: Verify Initial Protocol Configuration
  console.log("\n[TEST 1] Verifying Initial Configuration & Transparency...");
  const owner = await read("get_owner");
  const treasury = await read("get_treasury");
  const defaultFee = await read("get_default_fee_bps");
  const isPaused = await read("is_paused");
  const initialCounter = await read("get_bounty_counter");
  const transparency = await read("get_settlement_transparency");

  assert(owner && owner.startsWith("0x"), "Contract has valid owner address: " + owner);
  assert(treasury && treasury.startsWith("0x"), "Contract has valid treasury address: " + treasury);
  assert(Number(defaultFee) === 250, "Default fee is set to 250 bps (2.5%)");
  assert(isPaused === false, "Contract is not paused");
  assert(Number(initialCounter) >= 0, "Bounty counter is initialized: " + initialCounter);
  assert(Number(transparency.total_settled_attempts) >= 0, "Transparency ledger is initialized");

  // Step 2: Setup Accounts
  console.log("\n[TEST 2] Setting up Creator and Challenger accounts...");
  const creator = createAccount();
  const challenger = createAccount();
  const clientCreator = createClient({ chain: studionet, account: creator });
  const clientChallenger = createClient({ chain: studionet, account: challenger });

  console.log("Funding Creator (" + creator.address + ") with 2000 GEN...");
  await clientCreator.request({ method: "sim_fundAccount", params: [creator.address, 2000] });

  console.log("Funding Challenger (" + challenger.address + ") with 2000 GEN...");
  await clientChallenger.request({ method: "sim_fundAccount", params: [challenger.address, 2000] });

  const creatorBal = await clientCreator.getBalance({ address: creator.address });
  const challengerBal = await clientChallenger.getBalance({ address: challenger.address });
  assert(creatorBal > 0n, "Creator balance funded: " + creatorBal);
  assert(challengerBal > 0n, "Challenger balance funded: " + challengerBal);

  // Step 3: Create Bounty
  console.log("\n[TEST 3] Creating a new verified bounty...");
  const rewardWei = toGenWei("10"); // 10 GEN
  const bondWei = toGenWei("1");    // 1 GEN required bond

  const createArgs = [
    "Verify GenLayer validator consensus documentation",
    "The official GenLayer documentation describes decentralized validator consensus and execution.",
    "POSITIVE",
    "DOCUMENTATION",
    "1. The evidence page must describe GenLayer validator consensus.\n2. Must mention Intelligent Contracts.",
    "Official GenLayer documentation URL (e.g. docs.genlayer.com).",
    creator.address, // Arbiter (self-arbitrated)
    172800,          // 2 days deadline
    Number(bondWei),
  ];

  console.log("Dispatching create_bounty transaction with 10 GEN escrow...");
  const createTx = await write(clientCreator, "create_bounty", createArgs, rewardWei);
  console.log("create_bounty tx hash:", createTx.hash, "status:", createTx.receipt?.status);

  const updatedCounter = await read("get_bounty_counter");
  const newBountyId = Number(updatedCounter) - 1;
  assert(newBountyId >= 0, "Bounty counter incremented to: " + updatedCounter);

  const bounty = await read("get_bounty", [newBountyId]);
  assert(bounty.title === "Verify GenLayer validator consensus documentation", "Bounty title matches");
  assert(bounty.status === 0, "Bounty status is OPEN (0)");
  assert(BigInt(bounty.reward_deposited) === rewardWei, "Reward deposited correctly holds 10 GEN");
  assert(bounty.criteria_locked === false, "Criteria is not yet locked prior to first acceptance");

  // Step 4: Challenger Accepts Bounty
  console.log("\n[TEST 4] Challenger accepts bounty and stakes 1 GEN bond...");
  const acceptTx = await write(clientChallenger, "accept_bounty", [newBountyId], bondWei);
  console.log("accept_bounty tx hash:", acceptTx.hash, "status:", acceptTx.receipt?.status);

  const bountyAfterAccept = await read("get_bounty", [newBountyId]);
  assert(bountyAfterAccept.criteria_locked === true, "Criteria permanently LOCKED upon first acceptance");
  assert(Number(bountyAfterAccept.attempt_count) === 1, "Attempt count updated to 1");

  const attempt = await read("get_attempt", [newBountyId, 0]);
  assert(attempt.challenger.toLowerCase() === challenger.address.toLowerCase(), "Attempt challenger matches");
  assert(attempt.status === 0, "Attempt status is ATTEMPT_ACCEPTED (0)");
  assert(BigInt(attempt.bond_amount) === bondWei, "Challenger bond amount is exactly 1 GEN");

  // Step 5: Challenger Submits Evidence
  console.log("\n[TEST 5] Challenger submits evidence URL...");
  const evidenceUrl = "https://docs.genlayer.com";
  const evidenceDesc = "GenLayer documentation describing validators and consensus mechanics.";
  const submitTx = await write(clientChallenger, "submit_evidence", [newBountyId, 0, evidenceUrl, evidenceDesc]);
  console.log("submit_evidence tx hash:", submitTx.hash);

  const attemptAfterSubmit = await read("get_attempt", [newBountyId, 0]);
  assert(attemptAfterSubmit.status === 1, "Attempt status transitioned to SUBMITTED (1)");
  assert(attemptAfterSubmit.evidence_url === evidenceUrl, "Evidence URL recorded correctly");

  // Step 6: Dispute flow test
  console.log("\n[TEST 6] Testing dispute escalation...");
  const disputeTx = await write(clientCreator, "raise_dispute", [newBountyId, 0, "Creator requested clarification on evidence relevance"]);
  console.log("raise_dispute tx hash:", disputeTx.hash);

  const attemptDisputed = await read("get_attempt", [newBountyId, 0]);
  assert(attemptDisputed.status === 7, "Attempt status transitioned to DISPUTED (7)");

  // Step 7: Arbiter Dispute Resolution
  console.log("\n[TEST 7] Arbiter resolves dispute with written note...");
  const resolveTx = await write(clientCreator, "resolve_dispute", [
    newBountyId,
    0,
    "APPROVE",
    "Evidence confirmed to fulfill criteria under arbitration review.",
    10000 // 100% payout_bps
  ]);
  console.log("resolve_dispute tx hash:", resolveTx.hash);

  const attemptResolved = await read("get_attempt", [newBountyId, 0]);
  assert(attemptResolved.status === 9, "Attempt status is ARBITER_RESOLVED_PENDING_APPEAL (9)");
  assert(Number(attemptResolved.appeal_deadline) > 0, "Appeal deadline window opened");

  // Step 8: Listing and Queries
  console.log("\n[TEST 8] Verifying listing and pagination...");
  const bountiesList = await read("list_bounties", [0, 10]);
  assert(Array.isArray(bountiesList) && bountiesList.length > 0, "list_bounties returned " + bountiesList.length + " bounties");

  const attemptsList = await read("get_bounty_attempts", [newBountyId]);
  assert(Array.isArray(attemptsList) && attemptsList.length === 1, "get_bounty_attempts returned 1 attempt");

  console.log("\n=======================================================");
  console.log("ALL ON-CHAIN TESTS PASSED SUCCESSFULLY! 🚀");
  console.log("=======================================================\n");
}

runTests().catch(err => {
  console.error("Test Suite encountered an error:", err);
  process.exit(1);
});
