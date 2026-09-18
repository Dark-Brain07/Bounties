import { createClient, studionet, TransactionStatus } from "./genlayer-wrapper.mjs";

export const CONTRACT_ADDRESS = "0xeBdE3fE16D05eE4DCA5096F4633FcEE92232877F";
export const DEPLOYER_ADDRESS = "0x91D6ED5Cc2A1E8daa9Fedd5D1631A41E9749a53b";

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

  let receipt = null;
  let attempts = 0;
  while (!receipt && attempts < 5) {
    try {
      receipt = await client.waitForTransactionReceipt({
        hash,
        retries: 180,
        interval: 3000,
      });
    } catch (e) {
      attempts++;
      if (attempts >= 5) throw e;
      await new Promise((r) => setTimeout(r, 4000));
    }
  }
  return { hash, receipt };
}

export function toGenWei(amountStr) {
  const [whole, frac = ""] = String(amountStr).split(".");
  const paddedFrac = (frac + "0".repeat(18)).slice(0, 18);
  return BigInt(whole || "0") * 10n ** 18n + BigInt(paddedFrac || "0");
}
