import { describe, expect, it } from "vitest";
import { checkPlanAvailability, keepAvailablePlan, planServerId, requireExistingPlan, samePlanIdentity } from "./planAvailability";

const deleted = "3e6b0bf5-2a20-4194-9b8f-390d79f7214b";
const other = "855b2ac2-704a-49d7-ae3b-92b5449df00f";
const missing = async () => { throw Object.assign(new Error("Plan not found"), { status: 404 }); };

describe("server plan availability", () => {
  it("keeps genuine local draft references outside server verification", async () => {
    expect(planServerId({ reference: "PP-DRIVE-2019-01" })).toBeUndefined();
    let calls = 0;
    await requireExistingPlan({ reference: "PP-DRIVE-2019-01" }, async () => { calls++; return null; });
    expect(calls).toBe(0);
  });
  it("recognizes a UUID in either id or reference", () => {
    expect(planServerId({ id: deleted.toUpperCase(), reference: "PP-OLD" })).toBe(deleted);
    expect(planServerId({ reference: deleted })).toBe(deleted);
  });
  it("does not match distinct server plans by title", () => {
    expect(samePlanIdentity({ id: deleted, name: "Annual plan" }, { id: other, name: "Annual plan" })).toBe(false);
  });
  it("supports legacy drafts receiving a server identity", () => {
    expect(samePlanIdentity({ reference: "PP-LOCAL", name: "Annual plan" }, { id: other, name: "Annual plan" })).toBe(true);
  });
  it("accepts exact IDs in direct and wrapped responses", async () => {
    expect(await checkPlanAvailability(deleted, async () => ({ id: deleted }))).toBe("available");
    expect(await checkPlanAvailability(deleted, async () => ({ data: { id: deleted } }))).toBe("available");
  });
  it("does not accept a different plan or malformed response", async () => {
    expect(await checkPlanAvailability(deleted, async () => ({ id: other }))).toBe("unknown");
    expect(await checkPlanAvailability(deleted, async () => "<html>bad gateway</html>")).toBe("unknown");
  });
  it("recognizes a confirmed missing-plan response", async () => {
    expect(await checkPlanAvailability(deleted, missing)).toBe("missing");
  });
  it.each([0, 401, 403, 429, 500, 502])("does not infer deletion from status %s", async status => {
    expect(await checkPlanAvailability(deleted, async () => { throw Object.assign(new Error("Plan not found"), { status }); })).toBe("unknown");
  });
  it("does not infer deletion from a generic proxy 404", async () => {
    expect(await checkPlanAvailability(deleted, async () => { throw Object.assign(new Error("Not Found"), { status: 404 }); })).toBe("unknown");
  });
  it("filters only confirmed missing records without modifying saved data", () => {
    const records = [{ id: deleted }, { id: other }, { reference: "PP-LOCAL" }];
    const before = JSON.stringify(records);
    expect(records.filter(plan => keepAvailablePlan(plan, { [deleted]: "missing", [other]: "unknown" }))).toEqual([records[1], records[2]]);
    expect(JSON.stringify(records)).toBe(before);
  });
  it("stops submission for missing plans and failed verification", async () => {
    await expect(requireExistingPlan({ id: deleted }, missing)).rejects.toThrow("no longer available");
    await expect(requireExistingPlan({ id: deleted }, async () => { throw new Error("offline"); })).rejects.toThrow("Unable to verify");
    await expect(requireExistingPlan({ id: other }, async () => ({ id: other }))).resolves.toBeUndefined();
  });
});
