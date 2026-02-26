import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { ethers } from "https://esm.sh/ethers@6.16.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BSC_TESTNET_RPC_LIST = [
  "https://bsc-testnet-rpc.publicnode.com",
  "https://data-seed-prebsc-1-s1.binance.org:8545",
  "https://data-seed-prebsc-2-s1.binance.org:8545",
  "https://bsc-testnet.blockpi.network/v1/rpc/public",
  "https://rpc.ankr.com/bsc_testnet_chapel",
];

const BSC_TESTNET_CHAIN_ID = 97n;
const CONTRACT_ADDRESS = "0x39A1b047D5d143f8874888cfa1d30Fb2AE6F0CD6";

const CONTRACT_ABI = [
  "function nonces(address) view returns (uint256)",
  "function isAttester(address) view returns (bool)",
  "function actions(bytes32) view returns (bool allowed, uint32 version, bool deprecated)",
  "function lockWithPPLP(address user, string action, uint256 amount, bytes32 evidenceHash, bytes[] sigs)",
];

const PPLP_DOMAIN = {
  name: "FUN Money",
  version: "1.2.1",
  chainId: 97,
  verifyingContract: CONTRACT_ADDRESS,
};

const PPLP_LOCK_TYPES = {
  PureLoveProof: [
    { name: "user", type: "address" },
    { name: "actionHash", type: "bytes32" },
    { name: "amount", type: "uint256" },
    { name: "evidenceHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
  ],
};

function hashActionName(actionName: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(actionName));
}

function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

async function getValidatedProvider(walletAddress: string) {
  for (const rpcUrl of BSC_TESTNET_RPC_LIST) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 5000)
      );

      const network = await Promise.race([provider.getNetwork(), timeout]);
      if (network.chainId !== BSC_TESTNET_CHAIN_ID) continue;

      const code = await Promise.race([provider.getCode(CONTRACT_ADDRESS), timeout]);
      if (code === "0x" || code.length < 4) continue;

      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const nonce = await Promise.race([contract.nonces(walletAddress), timeout]);

      console.log(`[Batch Lock] ✓ RPC ${rpcUrl}, nonce ${nonce}`);
      return { provider, nonce };
    } catch {
      continue;
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const signerPrivateKey = Deno.env.get("ATTESTER_PRIVATE_KEY") || Deno.env.get("TREASURY_PRIVATE_KEY");

    if (!signerPrivateKey) {
      return new Response(
        JSON.stringify({ error: "TREASURY_PRIVATE_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate admin
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!role) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { actor_id, wallet_address } = await req.json();

    if (!actor_id || !wallet_address || !isValidAddress(wallet_address)) {
      return new Response(
        JSON.stringify({ error: "actor_id and valid wallet_address required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // CHECK SUSPENSION & FRAUD
    // ============================================

    const { data: suspension } = await supabase
      .from("user_suspensions")
      .select("id")
      .eq("user_id", actor_id)
      .is("lifted_at", null)
      .maybeSingle();

    if (suspension) {
      return new Response(
        JSON.stringify({ error: "User is suspended", actor_id }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { count: fraudCount } = await supabase
      .from("pplp_fraud_signals")
      .select("*", { count: "exact", head: true })
      .eq("actor_id", actor_id)
      .eq("is_resolved", false)
      .gte("severity", 4);

    if (fraudCount && fraudCount > 0) {
      return new Response(
        JSON.stringify({ error: "Blocked due to unresolved fraud signals", count: fraudCount }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // FETCH ALL PENDING MINT REQUESTS FOR THIS USER+WALLET
    // ============================================

    const { data: pendingRequests, error: fetchErr } = await supabase
      .from("pplp_mint_requests")
      .select("*, pplp_actions!inner(id, action_type, actor_id, evidence_hash, metadata)")
      .eq("actor_id", actor_id)
      .eq("recipient_address", wallet_address)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (fetchErr) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch pending requests", details: fetchErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      return new Response(
        JSON.stringify({ error: "No pending mint requests found", actor_id, wallet_address }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Batch Lock] Found ${pendingRequests.length} pending requests for ${actor_id} → ${wallet_address}`);

    // ============================================
    // CASCADING DISTRIBUTION FOR EACH ACTION
    // ============================================

    const { data: poolConfig } = await supabase
      .from("fun_pool_config")
      .select("*")
      .eq("is_active", true)
      .order("tier_order", { ascending: true });

    const tiers = poolConfig || [
      { pool_name: "genesis_community", retention_rate: 0.01, tier_order: 1 },
      { pool_name: "fun_platform", retention_rate: 0.0099, tier_order: 2 },
      { pool_name: "fun_partners", retention_rate: 0.0098, tier_order: 3 },
    ];

    let totalUserAmountWei = 0n;
    const WEI = BigInt(10 ** 18);
    const actionResults: Array<{
      request: typeof pendingRequests[0];
      userAmount: bigint;
      totalReward: number;
      genesisAmount: bigint;
      platformAmount: bigint;
      partnersAmount: bigint;
    }> = [];

    // Aggregate evidence hashes for combined hash
    const evidenceHashes: string[] = [];

    for (const req of pendingRequests) {
      const totalAmountRaw = BigInt(req.amount);
      let remaining = totalAmountRaw;
      const dist: Record<string, bigint> = {};

      for (const tier of tiers) {
        const rateNum = BigInt(Math.round(Number(tier.retention_rate) * 10000));
        const tierAmt = (remaining * rateNum) / 10000n;
        dist[tier.pool_name] = tierAmt;
        remaining -= tierAmt;
      }

      const userAmount = remaining;
      totalUserAmountWei += userAmount * WEI;

      // Collect evidence hash
      const action = req.pplp_actions as any;
      let evHash = req.evidence_hash || ethers.ZeroHash;
      if (evHash && /^0x[a-fA-F0-9]{64}$/.test(evHash)) {
        evidenceHashes.push(evHash);
      } else if (evHash && evHash !== ethers.ZeroHash) {
        evidenceHashes.push(ethers.keccak256(ethers.toUtf8Bytes(evHash)));
      }

      actionResults.push({
        request: req,
        userAmount,
        totalReward: req.amount,
        genesisAmount: dist["genesis_community"] || 0n,
        platformAmount: dist["fun_platform"] || 0n,
        partnersAmount: dist["fun_partners"] || 0n,
      });
    }

    // Aggregated evidence hash = keccak256 of sorted individual hashes
    evidenceHashes.sort();
    const aggregatedEvidence = evidenceHashes.length > 0
      ? ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
          evidenceHashes.map(() => "bytes32"),
          evidenceHashes
        ))
      : ethers.ZeroHash;

    const totalUserAmount = actionResults.reduce((s, a) => s + Number(a.userAmount), 0);
    const totalRewardAll = actionResults.reduce((s, a) => s + a.totalReward, 0);

    console.log(`[Batch Lock] Total: ${totalRewardAll} FUN (user: ${totalUserAmount}), ${pendingRequests.length} actions`);

    // ============================================
    // GET ON-CHAIN NONCE + VALIDATE RPC
    // ============================================

    const rpcResult = await getValidatedProvider(wallet_address);
    if (!rpcResult) {
      return new Response(
        JSON.stringify({ error: "All BSC Testnet RPCs failed" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { provider, nonce: onChainNonce } = rpcResult;

    // ============================================
    // SIGN SINGLE EIP-712 FOR TOTAL AMOUNT
    // ============================================

    const UNIFIED_ACTION = "FUN_REWARD";
    const actionHash = hashActionName(UNIFIED_ACTION);

    const formattedKey = signerPrivateKey.startsWith("0x")
      ? signerPrivateKey
      : `0x${signerPrivateKey}`;

    const signer = new ethers.Wallet(formattedKey, provider);
    const signerAddress = signer.address;

    const message = {
      user: wallet_address,
      actionHash,
      amount: totalUserAmountWei,
      evidenceHash: aggregatedEvidence,
      nonce: onChainNonce,
    };

    console.log(`[Batch Lock] Signing PureLoveProof: amount=${totalUserAmountWei.toString()} wei, nonce=${onChainNonce}`);

    const signature = await signer.signTypedData(PPLP_DOMAIN, PPLP_LOCK_TYPES, message);
    console.log(`[Batch Lock] ✓ Signed by ${signerAddress}`);

    // ============================================
    // EXECUTE ON-CHAIN lockWithPPLP (SINGLE TX)
    // ============================================

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    let txHash: string | null = null;
    let onChainError: string | null = null;

    try {
      // Verify attester
      const isAttester = await contract.isAttester(signerAddress);
      if (!isAttester) {
        onChainError = "ATTESTER_NOT_REGISTERED";
        throw new Error(`Signer ${signerAddress} is not registered as attester`);
      }

      // Verify action registered
      const actionInfo = await contract.actions(actionHash);
      if (!actionInfo.allowed) {
        onChainError = "ACTION_NOT_REGISTERED";
        throw new Error(`Action FUN_REWARD not registered on-chain`);
      }

      console.log(`[Batch Lock] Submitting lockWithPPLP: user=${wallet_address}, amount=${totalUserAmountWei} wei`);

      const tx = await contract.lockWithPPLP(
        wallet_address,
        UNIFIED_ACTION,
        totalUserAmountWei,
        aggregatedEvidence,
        [signature]
      );

      console.log(`[Batch Lock] ⏳ TX sent: ${tx.hash}`);
      const receipt = await tx.wait(1);

      if (receipt.status === 0) {
        onChainError = "CONTRACT_REVERT";
        throw new Error(`TX ${receipt.hash} reverted`);
      }

      txHash = receipt.hash;
      console.log(`[Batch Lock] ✓ TX confirmed: ${txHash} in block ${receipt.blockNumber}`);
    } catch (txErr: any) {
      const errMsg = txErr?.message || String(txErr);
      console.error(`[Batch Lock] On-chain error:`, errMsg);

      if (!onChainError) {
        if (errMsg.includes("insufficient funds") || errMsg.includes("gas")) {
          onChainError = "INSUFFICIENT_GAS";
        } else {
          onChainError = "CONTRACT_REVERT";
        }
      }

      // Update all requests with error
      const requestIds = pendingRequests.map((r) => r.id);
      await supabase
        .from("pplp_mint_requests")
        .update({
          status: "signed",
          signature,
          signer_address: signerAddress,
          nonce: onChainNonce.toString(),
          on_chain_error: onChainError,
        })
        .in("id", requestIds);

      return new Response(
        JSON.stringify({
          error: "On-chain transaction failed",
          on_chain_error: onChainError,
          details: errMsg.slice(0, 300),
          actions_count: pendingRequests.length,
          total_amount: totalUserAmount,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // UPDATE ALL MINT REQUESTS + ACTIONS + LOGS
    // ============================================

    const freshSupabase = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date().toISOString();

    // Update all mint requests with same tx_hash
    const requestIds = pendingRequests.map((r) => r.id);
    await freshSupabase
      .from("pplp_mint_requests")
      .update({
        status: "minted",
        tx_hash: txHash,
        minted_at: now,
        signature,
        signer_address: signerAddress,
        nonce: onChainNonce.toString(),
        on_chain_error: null,
      })
      .in("id", requestIds);

    // Update all pplp_actions
    const actionIds = pendingRequests.map((r) => r.action_id);
    await freshSupabase
      .from("pplp_actions")
      .update({
        status: "minted",
        minted_at: now,
        mint_request_hash: actionHash,
      })
      .in("id", actionIds);

    // Log cascading distribution for each action individually
    const distributionLogs = actionResults.map((ar) => ({
      action_id: ar.request.action_id,
      actor_id: actor_id,
      total_reward: ar.totalReward,
      user_amount: Number(ar.userAmount),
      genesis_amount: Number(ar.genesisAmount),
      platform_amount: Number(ar.platformAmount),
      partners_amount: Number(ar.partnersAmount),
      user_percentage: Number(ar.userAmount * 10000n / BigInt(ar.totalReward)) / 10000,
      genesis_percentage: Number(ar.genesisAmount * 10000n / BigInt(ar.totalReward)) / 10000,
      platform_percentage: Number(ar.platformAmount * 10000n / BigInt(ar.totalReward)) / 10000,
      partners_percentage: Number(ar.partnersAmount * 10000n / BigInt(ar.totalReward)) / 10000,
      fund_processing_status: "pending",
      mint_request_id: ar.request.id,
    }));

    try {
      await freshSupabase.from("fun_distribution_logs").insert(distributionLogs);
    } catch (logErr) {
      console.warn("[Batch Lock] Distribution log insert failed (non-fatal):", logErr);
    }

    // Update PoPL score once for batch
    try {
      await freshSupabase.rpc("update_popl_score", {
        _user_id: actor_id,
        _action_type: "batch_mint",
        _is_positive: true,
      });
    } catch {}

    // Send single notification
    try {
      const actionTypes = [...new Set(
        pendingRequests.map((r) => (r.pplp_actions as any)?.action_type || "UNKNOWN")
      )];

      await freshSupabase.from("notifications").insert({
        user_id: actor_id,
        type: "mint_approved",
        title: `✅ ${totalUserAmount.toLocaleString()} FUN đã mint thành công! (${pendingRequests.length} hành động)`,
        content: `${pendingRequests.length} hành động (${actionTypes.join(", ")}) đã được gom và lock on-chain trong 1 giao dịch. Vào trang Mint để Activate & Claim.`,
        reference_id: pendingRequests[0].action_id,
        reference_type: "pplp_action",
        metadata: {
          tx_hash: txHash,
          amount: totalUserAmount,
          total_reward: totalRewardAll,
          actions_count: pendingRequests.length,
          action_types: actionTypes,
          batch: true,
        },
      });
    } catch (notifErr) {
      console.warn("[Batch Lock] Notification failed (non-fatal):", notifErr);
    }

    console.log(`[Batch Lock] ✓ Batch complete: ${pendingRequests.length} actions, ${totalUserAmount}/${totalRewardAll} FUN, TX: ${txHash}`);

    return new Response(
      JSON.stringify({
        success: true,
        tx_hash: txHash,
        actor_id,
        wallet_address,
        actions_count: pendingRequests.length,
        total_reward: totalRewardAll,
        user_amount: totalUserAmount,
        action_ids: actionIds,
        message: `✓ Gom ${pendingRequests.length} hành động → 1 giao dịch on-chain: ${totalUserAmount.toLocaleString()} FUN`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Batch Lock] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
