# Bounties — Autonomous Verification & Claim Consensus Protocol

An on-chain marketplace for verifiable public claims, settled autonomously by **GenLayer's validator consensus** against live, independently-fetched web evidence.

---

## ⚡ Live Deployment State

| Parameter | Value |
|---|---|
| **Contract Address** | `0xeBdE3fE16D05eE4DCA5096F4633FcEE92232877F` |
| **Explorer Link** | [View on GenLayer Studio](https://explorer-studio.genlayer.com/address/0xeBdE3fE16D05eE4DCA5096F4633FcEE92232877F) |
| **Live Web DApp** | [bounties-xi.vercel.app](https://bounties-xi.vercel.app) |
| **Medium Article** | [Introducing Bounties on Medium](https://medium.com/@engraju007/introducing-bounties-autonomous-verification-claim-consensus-on-genlayer-add1e9904ff8?sharedUserId=engraju007) |
| **GitHub Repository** | [Dark-Brain07/Bounties](https://github.com/Dark-Brain07/Bounties) |
| **Network** | GenLayer StudioNet (Chain ID: `61999`) |
| **Deploy Tx Hash** | `0x89b729b6390384418338910fce65f94512464375b22751707400f14cfacb31b1` |
| **Protocol Fee** | `250 bps` (2.5%) |
| **AI Settlements** | 100% determined by GenLayer Equivalence Principle |

---

## 🎯 The Core Problem & GenLayer Solution

Centralized bounty arbiters, manual escrow agents, and single off-chain LLM calls suffer from three fatal vulnerabilities:
1. **Financial Opposing Incentives:** Creators want claims to fail (to retain reward funds); challengers want claims to succeed (to claim the reward). Centralized operators are constantly tempted to favor whichever party controls or pressures them.
2. **Irreversible Real Value Transfers:** Wrong decisions move real funds irreversibly. Best-effort LLM outputs without multi-validator consensus risk catastrophic misallocations.
3. **Evidence Tampering & Falsification:** Challengers can fabricate text descriptions or spoof responses. 

### How Bounties Resolves This:
- **`create_bounty(...)`**: Creator escrows GEN against a claim and structured proof criteria.
- **`accept_bounty(...)`**: Challenger locks required bond. Criteria permanently lock (`criteria_locked = True`), preventing goalpost manipulation.
- **`submit_evidence(...)`**: Challenger provides a public URL.
- **`request_verification(...)`**: GenVM validators independently fetch the raw live page (`gl.nondet.web.render`) and judge it against criteria via `gl.eq_principle.prompt_comparative`.
- **Bucketed Payout Consensus (`PAYOUT_BUCKET_BPS = 500`)**: Partial settlements are mapped onto a discrete 5% grid inside the non-deterministic block, ensuring consensus convergence.
- **Irreversible Terminal Settlement**: State ledger is zeroed before value is routed through the `@gl.evm.contract_interface` EVM bridge.
- **Bounded Dispute Model**: Arbiter rulings only provide written context for an appealable window; unappealed or appealed disputes are finalized through a mandatory second round of GenLayer validator consensus.

---

## 🏗️ Repository Architecture

```
Bounties/
├── contracts/
│   └── bounties.py                  # Intelligent Contract (class Bounties)
├── scripts/
│   ├── genlayer-wrapper.mjs         # Multi-environment SDK wrapper
│   ├── lib-contract.mjs             # Read/write contract connector
│   ├── deploy.mjs                   # Automated StudioNet deployer
│   ├── test-suite.mjs               # On-chain integration test suite
│   └── deploy-latest.json           # Live deployment metadata
├── apps/
│   └── web/                         # Next.js 14 Web3 Frontend Application
│       ├── app/
│       │   ├── page.tsx             # Landing & protocol metrics
│       │   ├── explore/page.tsx     # Bounties Explorer & search
│       │   ├── create/page.tsx      # Bounty creation studio
│       │   ├── bounty/[id]/page.tsx # Detailed bounty, evidence & consensus
│       │   ├── disputes/page.tsx    # Multi-tier dispute resolution
│       │   └── reputation/page.tsx  # On-chain reputation dashboard
│       ├── components/              # Modular UI components
│       └── lib/contract.ts          # Contract types & RPC helpers
├── all_submissions.md               # Official GenLayer Points Portal submissions
└── README.md                        # Master Documentation
```

---

## 🚀 Quickstart & Testing

### 1. Verify Live Contract State
```bash
cd scripts
node -e "import('./lib-contract.mjs').then(async m => console.log('Bounties Counter:', await m.read('get_bounty_counter')))"
```

### 2. Run On-Chain Integration Test Suite
```bash
cd scripts
node test-suite.mjs
```

### 3. Run Frontend Web Application
```bash
cd apps/web
npm run dev
# Open http://localhost:3000
```

---

## 📚 Documentation & Research

* **Medium Article:** [Introducing Bounties: Autonomous Verification & Claim Consensus on GenLayer](https://medium.com/@engraju007/introducing-bounties-autonomous-verification-claim-consensus-on-genlayer-add1e9904ff8?sharedUserId=engraju007)
* **Architecture Deep-Dive:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
* **Deployment Guide:** [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md)
* **Submissions Guide:** [`all_submissions.md`](./all_submissions.md)

