import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CONTRACT = "0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6";

const RPC_URLS = [
  "https://bsc-testnet.public.blastapi.io",
  "https://rpc.ankr.com/bsc_testnet_chapel",
  "https://bsc-testnet-rpc.publicnode.com",
  "https://data-seed-prebsc-1-s1.binance.org:8545",
];

// Minimal ABI encodings - no ethers dependency needed
// keccak256("guardianGov()") = 0x... we'll use raw calls
// keccak256("govSetAttesterThreshold(uint256)") selector

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  for (const url of RPC_URLS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      const json = await res.json();
      if (json.result !== undefined) return json.result;
      if (json.error) throw new Error(json.error.message);
    } catch (e) {
      console.log(`RPC ${url} failed: ${e.message}`);
      continue;
    }
  }
  throw new Error("All RPCs failed");
}

// We need ethers for signing transactions
// Using npm: specifier for Deno compatibility
import { ethers } from "npm:ethers@6.13.4";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { threshold } = await req.json();
    if (!threshold || typeof threshold !== "number" || threshold < 1 || threshold > 5) {
      return new Response(JSON.stringify({ error: "Invalid threshold (1-5)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create provider with failover
    let provider: ethers.JsonRpcProvider | null = null;
    for (const url of RPC_URLS) {
      try {
        const p = new ethers.JsonRpcProvider(url, 97);
        await p.getBlockNumber();
        provider = p;
        console.log(`Connected to RPC: ${url}`);
        break;
      } catch {
        console.log(`RPC failed: ${url}`);
      }
    }
    if (!provider) throw new Error("All RPCs failed");

    const abi = [
      "function guardianGov() view returns (address)",
      "function attesterThreshold() view returns (uint256)",
      "function govSetAttesterThreshold(uint256 newThreshold)",
    ];

    const readContract = new ethers.Contract(CONTRACT, abi, provider);

    // Read current state
    const guardianGov = await readContract.guardianGov();
    const currentThreshold = await readContract.attesterThreshold();
    console.log(`guardianGov: ${guardianGov}, currentThreshold: ${currentThreshold}`);

    if (Number(currentThreshold) === threshold) {
      return new Response(JSON.stringify({
        success: true,
        message: `Threshold already set to ${threshold}`,
        guardianGov,
        currentThreshold: Number(currentThreshold),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Try ATTESTER_PRIVATE_KEY first, then TREASURY_PRIVATE_KEY
    const attesterKey = Deno.env.get("ATTESTER_PRIVATE_KEY");
    const treasuryKey = Deno.env.get("TREASURY_PRIVATE_KEY");

    let wallet: ethers.Wallet | null = null;
    let usedKey = "";

    if (attesterKey) {
      const w = new ethers.Wallet(attesterKey, provider);
      if (w.address.toLowerCase() === guardianGov.toLowerCase()) {
        wallet = w;
        usedKey = "ATTESTER_PRIVATE_KEY";
      }
    }

    if (!wallet && treasuryKey) {
      const w = new ethers.Wallet(treasuryKey, provider);
      if (w.address.toLowerCase() === guardianGov.toLowerCase()) {
        wallet = w;
        usedKey = "TREASURY_PRIVATE_KEY";
      }
    }

    if (!wallet) {
      const attesterAddr = attesterKey ? new ethers.Wallet(attesterKey).address : "N/A";
      const treasuryAddr = treasuryKey ? new ethers.Wallet(treasuryKey).address : "N/A";
      return new Response(JSON.stringify({
        error: "NOT_GOV",
        message: "Neither ATTESTER_PRIVATE_KEY nor TREASURY_PRIVATE_KEY matches guardianGov",
        guardianGov,
        attesterAddress: attesterAddr,
        treasuryAddress: treasuryAddr,
        hint: "Add the deployer private key as a secret to proceed",
      }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log(`Using ${usedKey} (${wallet.address}) to set threshold to ${threshold}`);

    const contract = new ethers.Contract(CONTRACT, abi, wallet);
    const tx = await contract.govSetAttesterThreshold(threshold);
    console.log(`Tx sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`Tx confirmed in block ${receipt.blockNumber}`);

    // Verify
    const newThreshold = await readContract.attesterThreshold();

    return new Response(JSON.stringify({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      previousThreshold: Number(currentThreshold),
      newThreshold: Number(newThreshold),
      guardianGov,
      usedKey,
      bscscanUrl: `https://testnet.bscscan.com/tx/${tx.hash}`,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({
      error: e.message,
      details: e.reason || e.code || null,
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
