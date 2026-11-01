"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  ClipboardList,
  LoaderCircle,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import type { AuthUser } from "@/lib/authTypes";
import {
  decideAmendmentRequest,
  fetchAmendmentRequests,
  type AmendmentDecision,
  type AmendmentRequest,
} from "@/lib/amendmentRequestsApi";

const amendmentRelationFields = new Set([
  "activities",
  "components",
  "fundings",
  "lots",
  "plan",
  "procurementMethod",
  "project",
]);

function formatFieldLabel(field: string) {
  return field
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function AmendmentFieldGrid({ values }: { values: Record<string, unknown> }) {
  const fields = Object.entries(values).filter(
    ([field, value]) =>
      field !== "id" &&
      !amendmentRelationFields.has(field) &&
      (typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"),
  );

  if (fields.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No additional item details are available.
      </p>
    );
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map(([field, value]) => (
        <div className="min-w-0" key={field}>
          <dt className="text-[11px] font-semibold text-slate-500">
            {formatFieldLabel(field)}
          </dt>
          <dd className="mt-0.5 break-words text-xs text-slate-900">
            {typeof value === "boolean"
              ? value
                ? "Yes"
                : "No"
              : String(value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function AmendmentRequestsView({ user }: { user: AuthUser }) {
  const [requests, setRequests] = useState<AmendmentRequest[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await fetchAmendmentRequests());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load amendment requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleDecision = async (
    request: AmendmentRequest,
    decision: AmendmentDecision,
  ) => {
    const comment = comments[request.id] ?? "";
    if (decision !== "APPROVE" && comment.trim().length < 3) {
      setError("Enter a comment before returning or rejecting a request.");
      return;
    }
    setWorkingId(request.id);
    setError(null);
    try {
      await decideAmendmentRequest(request.id, decision, comment.trim());
      await loadRequests();
      setComments((current) => ({ ...current, [request.id]: "" }));
    } catch (decisionError) {
      setError(
        decisionError instanceof Error
          ? decisionError.message
          : "Could not record the amendment decision.",
      );
    } finally {
      setWorkingId(null);
    }
  };

  const roleLabel =
    user.role === "OFFICER"
      ? "you"
      : user.role === "DIRECTOR"
        ? "Director"
        : user.role === "ENDORSING_COMMITTEE"
          ? "Endorsement Committee"
          : "Executive Management";

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Review queue
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">
          Amendment Requests
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {user.role === "OFFICER"
            ? "Track your plan and activity amendment requests and read review comments."
            : `Review plan and activity amendment requests awaiting ${roleLabel}. Approvals continue to the next review stage.`}
        </p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-600">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading amendment requests…
        </div>
      ) : error ? (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800"
          role="alert"
        >
          <p>{error}</p>
          <button
            className="mt-3 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100"
            onClick={() => void loadRequests()}
            type="button"
          >
            Retry
          </button>
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-3 text-base font-semibold text-slate-800">
            No requests awaiting your review
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            New requests will appear here when they reach your review stage.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => {
            const plan = request.plan ?? request.activity?.plan;
            const entityLabel =
              request.entityType === "PLAN"
                ? (plan?.title ?? "Procurement plan")
                : `${request.activity?.reference ?? "Activity"} — ${request.activity?.description ?? ""}`;
            const projectCode = plan?.project?.code;
            const href = projectCode
              ? `/workspace/projects?project=${encodeURIComponent(projectCode)}&plan=${encodeURIComponent(plan?.id ?? "")}${request.activity ? `&activity=${encodeURIComponent(request.activity.reference)}` : ""}`
              : null;
            const busy = workingId === request.id;
            const isExpanded = expandedRequestId === request.id;

            return (
              <article
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                key={request.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800">
                      {request.entityType === "PLAN" ? "Plan" : "Activity"}{" "}
                      amendment
                    </span>
                    <button
                      aria-expanded={isExpanded}
                      className="mt-2 flex items-center gap-2 text-left text-base font-semibold text-slate-900 hover:text-emerald-700"
                      onClick={() =>
                        setExpandedRequestId(isExpanded ? null : request.id)
                      }
                      type="button"
                    >
                      {entityLabel}
                      <ChevronDown
                        aria-hidden="true"
                        className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    <p className="mt-1 text-xs text-slate-500">
                      {plan?.project?.name ?? plan?.project?.code ?? "Project"}{" "}
                      · Requested by{" "}
                      {request.requestedBy.displayName ||
                        request.requestedBy.name}{" "}
                      · {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {href && (
                    <Link
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                      href={href}
                    >
                      Open current item
                    </Link>
                  )}
                </div>
                {isExpanded && (
                  <section
                    aria-label="Amendment request details"
                    className="mt-4 space-y-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-4"
                  >
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Requested changes / justification
                      </h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                        {request.reason}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        This is the change description submitted with the
                        request. The system currently stores the request as
                        text; it does not store a separate before-and-after
                        edit.
                      </p>
                    </div>
                    {request.entityType === "PLAN" && request.plan ? (
                      <>
                        <div className="border-t border-emerald-100 pt-3">
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Current plan details
                          </h4>
                          <AmendmentFieldGrid values={request.plan} />
                        </div>
                        {request.plan.project && (
                          <p className="text-xs text-slate-700">
                            Project: {request.plan.project.name} (
                            {request.plan.project.code})
                          </p>
                        )}
                        <div className="border-t border-emerald-100 pt-3">
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Plan activities (
                            {request.plan.activities?.length ?? 0})
                          </h4>
                          {request.plan.activities?.length ? (
                            <div className="space-y-3">
                              {request.plan.activities.map((activity) => (
                                <article
                                  className="rounded-md border border-slate-200 bg-white p-3"
                                  key={activity.id}
                                >
                                  <h5 className="mb-2 text-xs font-semibold text-slate-800">
                                    {activity.reference}
                                    {activity.description
                                      ? ` — ${activity.description}`
                                      : ""}
                                  </h5>
                                  {activity.procurementMethod && (
                                    <p className="mb-2 text-xs text-slate-600">
                                      Procurement method:{" "}
                                      {activity.procurementMethod.label}
                                    </p>
                                  )}
                                  <AmendmentFieldGrid values={activity} />
                                </article>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">
                              This plan has no active activities.
                            </p>
                          )}
                        </div>
                      </>
                    ) : request.entityType === "ACTIVITY" &&
                      request.activity ? (
                      <>
                        <div className="border-t border-emerald-100 pt-3">
                          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            Current activity details
                          </h4>
                          <AmendmentFieldGrid values={request.activity} />
                          {request.activity.procurementMethod && (
                            <p className="mt-3 text-xs text-slate-700">
                              Procurement method:{" "}
                              {request.activity.procurementMethod.label}
                            </p>
                          )}
                          {request.activity.plan?.project && (
                            <p className="mt-2 text-xs text-slate-700">
                              Plan: {request.activity.plan.title} · Project:{" "}
                              {request.activity.plan.project.name} (
                              {request.activity.plan.project.code})
                            </p>
                          )}
                        </div>
                        {[
                          ["Lots", request.activity.lots],
                          ["Funding", request.activity.fundings],
                          ["Components", request.activity.components],
                        ].map(
                          ([label, entries]) =>
                            Array.isArray(entries) &&
                            entries.length > 0 && (
                              <div
                                className="border-t border-emerald-100 pt-3"
                                key={label as string}
                              >
                                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                                  {label as string}
                                </h4>
                                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-white p-3 text-[11px] text-slate-700">
                                  {JSON.stringify(entries, null, 2)}
                                </pre>
                              </div>
                            ),
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-rose-700">
                        Item details could not be loaded. Refresh and try again.
                      </p>
                    )}
                  </section>
                )}
                <div className="mt-4 rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Officer’s reason
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                    {request.reason}
                  </p>
                </div>
                <div className="mt-4 space-y-2">
                  {(user.role === "OFFICER" ||
                    user.role === "ENDORSING_COMMITTEE") && (
                    <p className="text-xs font-semibold text-slate-700">
                      Status:{" "}
                      <span className="font-medium">
                        {request.status === "PENDING_COMMITTEE"
                          ? "WITH COMMITTEE"
                          : request.status.replaceAll("_", " ")}
                      </span>
                    </p>
                  )}
                  {user.role === "ENDORSING_COMMITTEE" &&
                    request.status === "PENDING_COMMITTEE" && (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
                        Committee votes:{" "}
                        {request.committeeVotes?.filter(
                          (vote) => vote.decision === "APPROVE",
                        ).length ?? 0}{" "}
                        of 3 approvals required
                        {request.committeeVotes?.some(
                          (vote) => vote.memberId === user.id,
                        ) &&
                          ` · Your vote: ${
                            request.committeeVotes.find(
                              (vote) => vote.memberId === user.id,
                            )?.decision
                          } (you may change it while review is open)`}
                      </p>
                    )}
                  {request.directorComment && (
                    <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                      Director: {request.directorComment}
                    </p>
                  )}
                  {request.committeeComment && (
                    <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                      Endorsement Committee: {request.committeeComment}
                    </p>
                  )}
                  {request.managementComment && (
                    <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                      Executive Management: {request.managementComment}
                    </p>
                  )}
                </div>
                {user.role !== "OFFICER" && (
                  <>
                    <label className="mt-4 block text-xs font-semibold text-slate-700">
                      Comment
                      <textarea
                        className="mt-1.5 min-h-20 w-full rounded-lg border border-slate-300 p-2.5 text-sm font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                        onChange={(event) =>
                          setComments((current) => ({
                            ...current,
                            [request.id]: event.target.value,
                          }))
                        }
                        placeholder="Required when returning or rejecting"
                        value={comments[request.id] ?? ""}
                      />
                    </label>
                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void handleDecision(request, "REJECT")}
                        type="button"
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-2 text-xs font-semibold text-amber-800 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void handleDecision(request, "RETURN")}
                        type="button"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Return with comment
                      </button>
                      <button
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void handleDecision(request, "APPROVE")}
                        type="button"
                      >
                        {busy ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Approve
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
