import assert from "node:assert/strict";
import test from "node:test";
import { formatUsdRange } from "../src/frontend/public/shared/utils";

test("exact vehicle prices are not rendered as a duplicate range", () => {
  assert.equal(formatUsdRange(16000, 16000), "$16,000");
  assert.equal(formatUsdRange(16000, 17500), "$16,000–17,500");
});
