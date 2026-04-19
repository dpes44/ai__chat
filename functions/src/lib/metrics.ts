import { MODEL_PRICING_PER_1K_TOKENS_USD } from "./constants";

export function estimateCostUsd(model: string, tokenIn: number, tokenOut: number): number {
  const pricing = MODEL_PRICING_PER_1K_TOKENS_USD[model];
  if (!pricing) {
    return 0;
  }

  const inputCost = (tokenIn / 1000) * pricing.input;
  const outputCost = (tokenOut / 1000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(8));
}

export function percentile95(values: number[]): number {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[idx];
}
