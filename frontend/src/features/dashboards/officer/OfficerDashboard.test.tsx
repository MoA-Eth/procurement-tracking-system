import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  OfficerDashboard,
  formatPlanReference,
  formatReturnedPlanDetail,
  formatDelayedActivityAlert,
  formatDirectorNote,
  formatTimeAgo,
} from "./OfficerDashboard";
import type { AuthUser } from "@/lib/authTypes";

const mockOfficerUser: AuthUser = {
  id: "user-123",
  email: "officer@example.com",
  username: "abel_officer",
  displayName: "Abel Officer",
  role: "OFFICER",
};

describe("OfficerDashboard - Alerts Center & UI Layout", () => {
  it("renders Alerts Center with min-height and overflow protection classes", () => {
    const html = renderToStaticMarkup(
      <OfficerDashboard user={mockOfficerUser} />,
    );

    // Alerts Center aside exists
    expect(html).toContain("Alerts Center");

    // Container has minimum height and scroll classes
    expect(html).toContain("min-h-[380px]");
    expect(html).toContain("xl:min-h-[415px]");
    expect(html).toContain("overflow-y-auto");

    // Aside has overflow protection
    expect(html).toContain("min-w-0");
  });

  it("does not render the removed Requiring My Action section", () => {
    const html = renderToStaticMarkup(
      <OfficerDashboard user={mockOfficerUser} />,
    );

    // Requiring My Action has been removed
    expect(html).not.toContain("Requiring My Action");
    expect(html).not.toContain(
      "Plans and activities requiring my action table",
    );
  });

  it("includes UI overflow protection classes on alert cards and text", () => {
    const html = renderToStaticMarkup(
      <OfficerDashboard user={mockOfficerUser} />,
    );

    expect(html).toContain("truncate");
  });
});

describe("Delayed Activities in Alerts Center", () => {
  it("formats delayed activity alert matching the reference card design", () => {
    // Reference card example from user:
    // Line 1: 1488 Day(s) Overdue
    // Line 2: ET-MOLF-152395-CW-RFB
    // Line 3: Notification of Award
    const now = new Date("2026-09-04T08:00:00Z").getTime();
    const mockActivity = {
      id: "act-1",
      reference: "ET-MOLF-152395-CW-RFB",
      stages: [
        {
          id: "st-1",
          status: "DELAYED",
          stageType: {
            id: "st-t1",
            code: "NOA",
            label: "Notification of Award",
          },
          currentTargetEndDate: new Date(
            now - 1488 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      ],
    };

    const alert = formatDelayedActivityAlert(mockActivity, "ET-MOLF", now);

    expect(alert.statusLine).toBe("1488 Day(s) Overdue");
    expect(alert.referenceLine).toBe("ET-MOLF-152395-CW-RFB");
    expect(alert.detailLine).toBe("Notification of Award");
    expect(alert.tone).toBe("delayed");
    expect(alert.href).toBe(
      "/workspace/activity-tracker?activity=ET-MOLF-152395-CW-RFB",
    );
  });

  it("formats delayed activity with stage contract and fallback reference cleanly", () => {
    // Second reference card example from user:
    // Line 1: 1198 Day(s) Overdue
    // Line 2: ET-MOLF-270921-GO-DIR
    // Line 3: Draft Contract
    const now = new Date("2026-09-04T08:00:00Z").getTime();
    const mockActivity = {
      id: "act-2",
      reference: "ET-MOLF-270921-GO-DIR",
      stages: [
        {
          id: "st-2",
          status: "DELAYED",
          stageType: { id: "st-t2", code: "DC", label: "Draft Contract" },
          plannedEndDate: new Date(
            now - 1198 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      ],
    };

    const alert = formatDelayedActivityAlert(mockActivity, "ET-MOLF", now);

    expect(alert.statusLine).toBe("1198 Day(s) Overdue");
    expect(alert.referenceLine).toBe("ET-MOLF-270921-GO-DIR");
    expect(alert.detailLine).toBe("Draft Contract");
    expect(alert.tone).toBe("delayed");
    expect(alert.href).toBe(
      "/workspace/activity-tracker?activity=ET-MOLF-270921-GO-DIR",
    );
  });

  it("handles fallback to 'Delayed Activity' if days cannot be computed", () => {
    const mockActivity = {
      id: "act-3",
      reference: "ACT-NO-DATE",
      stages: [
        {
          id: "st-3",
          status: "DELAYED",
          stageType: { id: "st-t3", code: "BE", label: "Bid Evaluation" },
        },
      ],
    };

    const alert = formatDelayedActivityAlert(mockActivity, "PRJ-1", null);

    expect(alert.statusLine).toBe("Delayed Activity");
    expect(alert.referenceLine).toBe("ACT-NO-DATE");
    expect(alert.detailLine).toBe("Bid Evaluation");
    expect(alert.tone).toBe("delayed");
  });
});

describe("Alerts formatting helpers - relevance & anti-repetition", () => {
  it("formatPlanReference avoids duplicating project code when present in title", () => {
    // Exact case from user screenshot: title contains the project code string
    const result = formatPlanReference("vvvvvvvvvv", "vvvvvvvvvv_plan");
    expect(result).toBe("vvvvvvvvvv_plan");
    expect(result).not.toBe("vvvvvvvvvv - vvvvvvvvvv_plan");

    // Normal case with distinct project code and title
    const normal = formatPlanReference(
      "PRJ-24-001",
      "2016 EFY Annual Procurement Plan",
    );
    expect(normal).toBe("PRJ-24-001 • 2016 EFY Annual Procurement Plan");
  });

  it("formatReturnedPlanDetail strips boilerplate repetition and provides relevant action", () => {
    // User screenshot case: "Returned by Director: Returned by Director for revisions."
    const boilerplate = formatReturnedPlanDetail(
      "Returned by Director for revisions.",
      2,
    );
    expect(boilerplate).toBe("2 activities to review & resubmit");
    expect(boilerplate).not.toContain("Returned by Director");

    // Default with no activities count
    const defaultMsg = formatReturnedPlanDetail(
      "Returned by Director for revisions.",
      0,
    );
    expect(defaultMsg).toBe("Review comments and resubmit for approval");

    // Real director feedback
    const customFeedback = formatReturnedPlanDetail(
      "Returned by Director: Please adjust the delivery period for lot 3.",
    );
    expect(customFeedback).toBe(
      "Feedback: Please adjust the delivery period for lot 3.",
    );
  });

  it("formatDirectorNote extracts clean director comments for the callout box", () => {
    // Exact case from user screenshot:
    // "Director note: Adjust BOQ contingency & verify IDA credit ratio."
    const customNote = formatDirectorNote(
      "Adjust BOQ contingency & verify IDA credit ratio.",
    );
    expect(customNote).toBe(
      "Adjust BOQ contingency & verify IDA credit ratio.",
    );

    // Strips repetitive prefix if present in the director input
    const withPrefix = formatDirectorNote(
      "Director note: Adjust BOQ contingency & verify IDA credit ratio.",
    );
    expect(withPrefix).toBe(
      "Adjust BOQ contingency & verify IDA credit ratio.",
    );

    // Fallback when boilerplate or empty
    const fallback = formatDirectorNote(
      "Returned by Director for revisions.",
      1,
    );
    expect(fallback).toBe("Review 1 activity and resubmit for approval.");
  });

  it("formatTimeAgo computes relative time cleanly", () => {
    const now = new Date("2026-09-04T12:00:00Z").getTime();
    // 2 hours ago (matches user screenshot "2h ago")
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(twoHoursAgo, now)).toBe("2h ago");

    // 15 minutes ago
    const fifteenMinAgo = new Date(now - 15 * 60 * 1000).toISOString();
    expect(formatTimeAgo(fifteenMinAgo, now)).toBe("15m ago");

    // Null timestamp or null currentTime
    expect(formatTimeAgo(null, now)).toBe("");
    expect(formatTimeAgo(twoHoursAgo, null)).toBe("");
  });
});
