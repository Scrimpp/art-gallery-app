export const DEFAULT_MINT_FEE_CENTS = 2000;
export const MAX_MINT_FEE_CENTS = 5000;

export const MINT_PROCEEDS_SPLITS = [
  {
    key: "artist",
    label: "Original artist",
    description: "Direct payment to the creator",
    basisPoints: 4000,
  },
  {
    key: "treasury",
    label: "Garden treasury",
    description: "Platform sustainability reserves",
    basisPoints: 2500,
  },
  {
    key: "liquidity",
    label: "Liquidity pool",
    description: "Self-sustaining on-platform reserves",
    basisPoints: 2000,
  },
  {
    key: "curation",
    label: "Curation rewards",
    description: "Top community voter rewards",
    basisPoints: 1000,
  },
  {
    key: "maintenance",
    label: "Platform maintenance",
    description: "Infrastructure and operating costs",
    basisPoints: 500,
  },
] as const;

const BASIS_POINTS_DENOMINATOR = 10000;

export type MintProceedsSplitKey = (typeof MINT_PROCEEDS_SPLITS)[number]["key"];

export type MintProceedsAllocation = (typeof MINT_PROCEEDS_SPLITS)[number] & {
  amountCents: number;
  percentageLabel: string;
};

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatMintFeeRange() {
  return `${formatUsd(DEFAULT_MINT_FEE_CENTS)}–${formatUsd(MAX_MINT_FEE_CENTS)}`;
}

export function calculateProceedsBreakdown(totalCents: number): MintProceedsAllocation[] {
  const normalizedTotal = Math.max(0, Math.round(totalCents));
  const withRemainders = MINT_PROCEEDS_SPLITS.map((split) => {
    const rawAmount = normalizedTotal * split.basisPoints;
    const amountCents = Math.floor(rawAmount / BASIS_POINTS_DENOMINATOR);

    return {
      split,
      amountCents,
      remainder: rawAmount % BASIS_POINTS_DENOMINATOR,
    };
  }).sort((left, right) => right.remainder - left.remainder);

  let remainingCents =
    normalizedTotal -
    withRemainders.reduce((sum, entry) => sum + entry.amountCents, 0);

  for (const entry of withRemainders) {
    if (remainingCents <= 0) {
      break;
    }

    entry.amountCents += 1;
    remainingCents -= 1;
  }

  return withRemainders
    .sort(
      (left, right) =>
        MINT_PROCEEDS_SPLITS.findIndex((entry) => entry.key === left.split.key) -
        MINT_PROCEEDS_SPLITS.findIndex((entry) => entry.key === right.split.key),
    )
    .map(({ split, amountCents }) => ({
      ...split,
      amountCents,
      percentageLabel: `${split.basisPoints / 100}%`,
    }));
}
