import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DirectorActivityTrackerView } from "./DirectorActivityTrackerView";

describe("DirectorActivityTrackerView", () => {
  it("renders correctly for DIRECTOR role", () => {
    const markup = renderToStaticMarkup(
      <DirectorActivityTrackerView userRole="DIRECTOR" />,
    );

    expect(markup).toContain("Director Activity Tracker");
    expect(markup).toContain(
      "Track active officer progress, procurement milestones, stage completion, and critical project delays across the directorate.",
    );
    expect(markup).not.toContain("View-Only Oversight");
  });

  it("renders correctly for MANAGEMENT role with View-Only badge and executive oversight description", () => {
    const markup = renderToStaticMarkup(
      <DirectorActivityTrackerView userRole="MANAGEMENT" />,
    );

    expect(markup).toContain("Management Activity Tracker");
    expect(markup).toContain("View-Only Oversight");
    expect(markup).toContain(
      "Executive view-only oversight of active officer progress, procurement milestones, stage completion, and critical project delays.",
    );
  });
});
