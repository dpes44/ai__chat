import { describe, expect, it } from "vitest";

import { estimateCostUsd, percentile95 } from "../src/lib/metrics";
import { redactSensitiveText } from "../src/lib/redaction";

describe("metrics", () => {
  it("calculates p95", () => {
    const value = percentile95([10, 20, 30, 40, 50]);
    expect(value).toBe(50);
  });

  it("returns zero for unknown model pricing", () => {
    expect(estimateCostUsd("unknown-model", 1000, 1000)).toBe(0);
  });
});

describe("redaction", () => {
  it("redacts secrets", () => {
    const input = "Bearer abc123 x-api-key: sk-test-123456789";
    const output = redactSensitiveText(input);
    expect(output).not.toContain("abc123");
    expect(output).not.toContain("sk-test-123456789");
  });
});
