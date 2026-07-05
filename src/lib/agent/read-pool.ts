import { createPublicClient, formatUnits, http, type Address } from "viem";
import { robinhoodMainnet } from "@/lib/chains/robinhood";
import { RH_MAINNET_CONTRACTS } from "@/lib/contracts/robinhood";
import { venaMiningAbi } from "@/features/miner/config/mining-contract";

const miningMetaAbi = [
  ...venaMiningAbi,
  {
    name: "totalFunded",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "totalClaimed",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

const SECONDS_PER_DAY = BigInt(86_400);

function miningAddress(): Address {
  const env = process.env.NEXT_PUBLIC_STAKING ?? process.env.MINING;
  if (env && /^0x[a-fA-F0-9]{40}$/.test(env)) {
    return env as Address;
  }
  return RH_MAINNET_CONTRACTS.staking as Address;
}

function publicClient() {
  return createPublicClient({
    chain: robinhoodMainnet,
    transport: http(
      process.env.NEXT_PUBLIC_RH_RPC ??
        process.env.RH_RPC ??
        "https://rpc.mainnet.chain.robinhood.com"
    ),
  });
}

function effectiveRewardPerSecond(rewardPerSecond: bigint, poolBalance: bigint) {
  if (poolBalance === BigInt(0)) return BigInt(0);
  const maxRate = poolBalance / SECONDS_PER_DAY;
  return rewardPerSecond > maxRate ? maxRate : rewardPerSecond;
}

export type AgentPoolSnapshot = {
  chainId: number;
  miningContract: Address;
  isActive: boolean;
  poolBalanceVena: number;
  rewardPerSecondVena: number;
  effectiveRateVenaPerSec: number;
  poolDailyVena: number;
  totalPower: number;
  totalFundedVena: number;
  totalClaimedVena: number;
  agentUrl: string;
  siteUrl: string;
  updatedAt: string;
};

export async function fetchAgentPoolSnapshot(): Promise<AgentPoolSnapshot> {
  const client = publicClient();
  const mining = miningAddress();

  const [isActive, poolBalance, rewardPerSecond, totalPower, totalFunded, totalClaimed] =
    await Promise.all([
      client.readContract({
        address: mining,
        abi: miningMetaAbi,
        functionName: "isActive",
      }),
      client.readContract({
        address: mining,
        abi: miningMetaAbi,
        functionName: "poolBalance",
      }),
      client.readContract({
        address: mining,
        abi: miningMetaAbi,
        functionName: "rewardPerSecond",
      }),
      client.readContract({
        address: mining,
        abi: miningMetaAbi,
        functionName: "totalPower",
      }),
      client.readContract({
        address: mining,
        abi: miningMetaAbi,
        functionName: "totalFunded",
      }),
      client.readContract({
        address: mining,
        abi: miningMetaAbi,
        functionName: "totalClaimed",
      }),
    ]);

  const poolBal = poolBalance as bigint;
  const rps = rewardPerSecond as bigint;
  const effective = effectiveRewardPerSecond(rps, poolBal);

  return {
    chainId: robinhoodMainnet.id,
    miningContract: mining,
    isActive: Boolean(isActive),
    poolBalanceVena: Number(formatUnits(poolBal, 18)),
    rewardPerSecondVena: Number(formatUnits(rps, 18)),
    effectiveRateVenaPerSec: Number(formatUnits(effective, 18)),
    poolDailyVena: Number(formatUnits(effective * SECONDS_PER_DAY, 18)),
    totalPower: Number(totalPower as bigint),
    totalFundedVena: Number(formatUnits(totalFunded as bigint, 18)),
    totalClaimedVena: Number(formatUnits(totalClaimed as bigint, 18)),
    agentUrl:
      process.env.NEXT_PUBLIC_VIRTUALS_AGENT_URL ??
      "https://app.virtuals.io/virtuals/95873",
    siteUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://venaprotocol.com",
    updatedAt: new Date().toISOString(),
  };
}

export type AgentUserSnapshot = {
  address: Address;
  power: number;
  stakedTokenIds: number[];
  pendingVena: number;
  sharePct: number;
};

export async function fetchAgentUserSnapshot(
  address: Address
): Promise<AgentUserSnapshot> {
  const client = publicClient();
  const mining = miningAddress();

  const [userInfo, totalPowerWei] = await Promise.all([
    client.readContract({
      address: mining,
      abi: venaMiningAbi,
      functionName: "getUserInfo",
      args: [address],
    }),
    client.readContract({
      address: mining,
      abi: venaMiningAbi,
      functionName: "totalPower",
    }),
  ]);

  const power = Number((userInfo[0] as bigint) ?? BigInt(0));
  const stakedIds = (userInfo[1] as bigint[]).map((id) => Number(id));
  const pending = Number(formatUnits((userInfo[2] as bigint) ?? BigInt(0), 18));
  const totalPower = Number(totalPowerWei as bigint);
  const sharePct = totalPower > 0 && power > 0 ? (power / totalPower) * 100 : 0;

  return {
    address,
    power,
    stakedTokenIds: stakedIds,
    pendingVena: pending,
    sharePct,
  };
}
