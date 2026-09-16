import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient, createAccount, studionet, TransactionStatus } from "./genlayer-wrapper.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  console.log("=== DEPLOYING BOUNTIES INTELLIGENT CONTRACT ===");
  const deployer = createAccount();
  console.log("Deployer Address:", deployer.address);

  const client = createClient({ chain: studionet, account: deployer });

  console.log("Requesting initial GEN funds via StudioNet sim_fundAccount...");
  await client.request({
    method: "sim_fundAccount",
    params: [deployer.address, 5000],
  });

  const balance = await client.getBalance({ address: deployer.address });
  console.log("Deployer Balance:", balance.toString(), "GEN");

  const contractPath = path.resolve(__dirname, "../contracts/bounties.py");
  const contractCode = fs.readFileSync(contractPath, "utf-8");
  console.log(`Read contracts/bounties.py (${contractCode.length} bytes, ${contractCode.split("\n").length} lines).`);

  const constructorArgs = [deployer.address, 250];
  console.log("Deploying contract with args:", constructorArgs);

  const txHash = await client.deployContract({
    code: contractCode,
    args: constructorArgs,
  });
  console.log("Deployment transaction submitted. Hash:", txHash);

  console.log("Waiting for deployment receipt (FINALIZED)...");
  await client.waitForTransactionReceipt({
    hash: txHash,
    status: TransactionStatus.FINALIZED,
    retries: 250,
    interval: 3000,
  });
  console.log("Receipt received!");

  const tx = await client.getTransaction({ hash: txHash });

  let contractAddress = null;
  if (tx.contract_address) contractAddress = tx.contract_address;
  else if (tx.to_address && tx.to_address !== "0x0000000000000000000000000000000000000000") contractAddress = tx.to_address;
  else if (tx.data?.contract_address) contractAddress = tx.data.contract_address;
  else if (tx.consensus_data?.leader_receipt?.execution_result) {
    contractAddress = tx.consensus_data.leader_receipt.execution_result;
  }
  if (!contractAddress && tx.consensus_data?.validators) {
    for (const val of tx.consensus_data.validators) {
      if (val.result && typeof val.result === "string" && val.result.startsWith("0x")) {
        contractAddress = val.result;
        break;
      }
    }
  }

  if (!contractAddress) {
    console.error("Warning: contractAddress could not be derived! Full tx:\n", JSON.stringify(tx, null, 2));
    throw new Error("Failed to derive contract address");
  }

  console.log("\n=======================================================");
  console.log("BOUNTIES CONTRACT DEPLOYED SUCCESSFULLY!");
  console.log("Contract Address:", contractAddress);
  console.log("Explorer Link: https://explorer-studio.genlayer.com/address/" + contractAddress);
  console.log("Deployment Tx Hash:", txHash);
  console.log("=======================================================\n");

  const deploymentData = {
    contractAddress,
    deployTxHash: txHash,
    deployer: deployer.address,
    deployerPrivateKey: deployer.privateKey,
    treasuryAddress: deployer.address,
    defaultFeeBps: 250,
    timestamp: new Date().toISOString(),
    network: "studionet",
    rpcUrl: "https://studio.genlayer.com/api",
    explorerUrl: `https://explorer-studio.genlayer.com/address/${contractAddress}`
  };

  fs.writeFileSync(
    path.resolve(__dirname, "deploy-latest.json"),
    JSON.stringify(deploymentData, null, 2),
    "utf-8"
  );
  console.log("Saved deployment metadata to scripts/deploy-latest.json");

  const libContractContent = `import { createClient, studionet, TransactionStatus } from "./genlayer-wrapper.mjs";

export const CONTRACT_ADDRESS = "${contractAddress}";
export const DEPLOYER_ADDRESS = "${deployer.address}";
export const DEPLOYER_PRIVATE_KEY = "${deployer.privateKey}";

export const readOnlyClient = createClient({ chain: studionet });

export function clientFor(account) {
  return createClient({ chain: studionet, account });
}

export async function read(functionName, args = []) {
  return readOnlyClient.readContract({ address: CONTRACT_ADDRESS, functionName, args });
}

export async function write(client, functionName, args = [], value = 0n) {
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value,
  });
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.FINALIZED,
    retries: 180,
    interval: 3000,
  });
  return { hash, receipt };
}

export function toGenWei(amountStr) {
  const [whole, frac = ""] = String(amountStr).split(".");
  const paddedFrac = (frac + "0".repeat(18)).slice(0, 18);
  return BigInt(whole || "0") * 10n ** 18n + BigInt(paddedFrac || "0");
}
`;

  fs.writeFileSync(
    path.resolve(__dirname, "lib-contract.mjs"),
    libContractContent,
    "utf-8"
  );
  console.log("Created scripts/lib-contract.mjs");
}

main().catch((err) => {
  console.error("Deployment failed:", err);
  process.exit(1);
});
