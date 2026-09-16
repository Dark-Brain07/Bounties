# GenLayer Points Portal Submissions: Bounties

This document contains pre-formatted submission entries for the GenLayer Points Portal, prepared in strict compliance with official category and explorer link rules.

---

## 1. Projects & Milestones Category

**Portal Category:** `Projects & Milestones` (20–4,000 pts)  
**Primary Tag:** `AI & Agents`  
**Secondary Tag:** `Dispute Resolution`  
**Focus Sub-Tags:** `Protocol Experiment`, `Dataset Verification`

### Title
**Bounties — Autonomous Verification & Claim Consensus Protocol on GenLayer**

### Links
- **Contract Address:** `0xeBdE3fE16D05eE4DCA5096F4633FcEE92232877F`
- **Explorer Link:** [View on GenLayer Studio](https://explorer-studio.genlayer.com/address/0xeBdE3fE16D05eE4DCA5096F4633FcEE92232877F)
- **Live Application:** [bounties-xi.vercel.app](https://bounties-xi.vercel.app)
- **Source Code:** [View on GitHub](https://github.com/Dark-Brain07/Bounties)

### Description
Bounties is a decentralized Web3 claim verification and bounty marketplace settled autonomously by GenLayer multi-validator consensus against live, independently-fetched web evidence.

In decentralized networks and open ecosystems, verifying whether a team delivered open-source code, whether documentation adheres to safety invariants, or whether a public claim occurred cannot be handled by numeric price oracles. Centralized arbiters introduce catastrophic counterparty risk and moral hazard.

Bounties resolves this with an adversarial staking mechanism governed directly by GenLayer Intelligent Validators:
1. **Bonded Escrow Creation:** A creator escrows GEN against a factual claim and defines precommitted, structured acceptance criteria.
2. **Criteria Immutability:** Once any challenger commits a required bond via `accept_bounty`, the acceptance criteria permanently freeze on-chain (`criteria_locked = True`), preventing goalpost manipulation.
3. **Live Web Fetch via GenVM:** Challengers submit public URLs. GenLayer validators independently fetch the raw web content (`gl.nondet.web.render`) inside non-deterministic execution, preventing evidence falsification.
4. **LLM Equivalence Consensus:** Validators evaluate the live fetched text against frozen criteria using `gl.eq_principle.prompt_comparative`. Coarse payout bucketing (`_bucket_payout_bps`) guarantees exact consensus agreement on partial settlements.
5. **Irreversible Zero-Then-Transfer Settlement:** The contract ledger is zeroed before calling the EVM compatibility bridge (`@gl.evm.contract_interface`), providing reentrancy and drain immunity.
6. **Bounded Arbiter Trust Model:** Human arbiters provide advisory context only; unappealed or appealed disputes are finalized through a mandatory second round of GenLayer validator consensus (`_settle_via_second_consensus`).

Includes a Next.js 14 Web3 application, an automated StudioNet deployment suite, and an end-to-end integration test suite verifying creation, bond locking, criteria freeze, evidence submission, and disputes.

---

## 2. Tools & Infrastructure Category

**Portal Category:** `Tools & Infrastructure` (50–2,500 pts)  
**Primary Tag:** `AI & Agents`  
**Secondary Tag:** `Dispute Resolution`

#### Bounties Intelligent Contract

**Title:** Bounties Intelligent Verification & Multi-Validator Consensus Arbiter
**Description:**
`class Bounties(gl.Contract)` is a production-hardened Intelligent Contract deployed on GenLayer StudioNet that arbitrates economic claim bounties. The contract features deterministic storage layout (`TreeMap` and `@allow_storage`), criteria lock guards on first challenger acceptance, concurrent racing attempt safety with settlement DoS ceilings (`MAX_ATTEMPTS_PER_BOUNTY = 40`), FNV-1a evidence fingerprinting, discrete payout bucketing (`PAYOUT_BUCKET_BPS = 500`), timeout grace periods (`VERIFICATION_GRACE_SECONDS = 86400`), and an on-chain reputation ledger derived purely from settled outcomes.

- **Contract Address:** `0xeBdE3fE16D05eE4DCA5096F4633FcEE92232877F`
- **Explorer Link:** [View on GenLayer Studio](https://explorer-studio.genlayer.com/address/0xeBdE3fE16D05eE4DCA5096F4633FcEE92232877F)
- **Source Code:** [View on GitHub](https://github.com/Dark-Brain07/Bounties/blob/main/contracts/bounties.py)

---

## 3. Documentation & Educational Content Category

**Portal Category:** `Documentation / Educational Content`  
**Primary Tag:** `Developer Tools`  
**Secondary Tag:** `AI & Agents`

### Title
**Bounties Architecture Guide: Consensus Settlement & Arbiter Bounding in GenVM**

### Description
Comprehensive architectural documentation and engineering guide detailing:
- The exact state machine lifecycle: `OPEN` → `LOCKED` → `SUBMITTED` → `WON`/`REJECTED`/`DISPUTED`.
- Why discrete payout bucketing is mandatory to avoid leader-rotation and UNDETERMINED consensus states.
- The bounded arbiter model: why human rulings must never directly move funds and how second-round validator consensus enforces protocol neutrality.
- Storage integrity rules using GenVM's native types (`TreeMap`, `DynArray`, sized integers).

- **Contract Address:** `0xeBdE3fE16D05eE4DCA5096F4633FcEE92232877F`
- **Explorer Link:** [View on GenLayer Studio](https://explorer-studio.genlayer.com/address/0xeBdE3fE16D05eE4DCA5096F4633FcEE92232877F)
