export type PlanIdentity = { id?: string; reference?: string; name?: string };
export type PlanAvailability = "available" | "missing" | "unknown";
export type PlanLookup = (id: string) => Promise<unknown>;

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const normalize = (value?: string) => (value || "").trim().toLowerCase();

// UUIDs identify candidates for verification, not evidence of deletion.
export function planServerId(plan: PlanIdentity): string | undefined {
  return [plan.id, plan.reference].map(normalize).find(value => uuid.test(value));
}

export function samePlanIdentity(a: PlanIdentity, b: PlanIdentity): boolean {
  const aId = planServerId(a);
  const bId = planServerId(b);
  if (aId && bId) return aId === bId;
  if (normalize(a.reference) && normalize(a.reference) === normalize(b.reference)) return true;
  // Preserve the existing local-reference -> server-ID transition for legacy drafts.
  // Two distinct server UUIDs must never be matched by their shared title.
  return Boolean(normalize(a.name) && normalize(a.name) === normalize(b.name));
}

export async function checkPlanAvailability(id: string, lookup: PlanLookup): Promise<PlanAvailability> {
  try {
    const response = await lookup(id);
    if (!response || typeof response !== "object") return "unknown";
    const envelope = response as { id?: unknown; data?: unknown };
    const plan = envelope.data && typeof envelope.data === "object"
      ? envelope.data as { id?: unknown }
      : envelope;
    return typeof plan.id === "string" && normalize(plan.id) === normalize(id)
      ? "available" : "unknown";
  } catch (error) {
    const failure = error as { status?: number; message?: string } | null;
    // A proxy's 404, an auth error, or a failed list request is not a deleted plan.
    return failure?.status === 404 && typeof failure.message === "string" &&
      /^Plan not found(?: with id:.*)?\.?$/i.test(failure.message.trim())
      ? "missing" : "unknown";
  }
}

export async function requireExistingPlan(plan: PlanIdentity, lookup: PlanLookup): Promise<void> {
  const id = planServerId(plan);
  if (!id) return; // Genuine local references follow the existing creation flow.
  const status = await checkPlanAvailability(id, lookup);
  if (status === "missing") {
    throw new Error("This plan is no longer available on the server. Return to the project list. Your browser copy has been preserved.");
  }
  if (status !== "available") {
    throw new Error("Unable to verify this plan with the server. Please retry when your connection and sign-in are working. Your saved work has been preserved.");
  }
}

export function keepAvailablePlan(plan: PlanIdentity, availability: Record<string, PlanAvailability>): boolean {
  const id = planServerId(plan);
  return !id || availability[id] !== "missing";
}
