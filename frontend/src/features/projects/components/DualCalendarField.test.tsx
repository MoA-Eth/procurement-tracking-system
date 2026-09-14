import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DualCalendarField } from "./DualCalendarField";

describe("DualCalendarField", () => {
  it("renders Gregorian and Ethiopian calendar inputs and labels", () => {
    const markup = renderToStaticMarkup(
      <DualCalendarField
        id="test-project-start"
        label="Project Start Date (Optional)"
        gregorianValue="2026-06-01"
        ethiopianValue="24-Ginbot-2018"
        onChange={() => undefined}
        required={false}
      />,
    );

    expect(markup).toContain("Project Start Date (Optional)");
    expect(markup).toContain("GREGORIAN");
    expect(markup).toContain("ETHIOPIAN");
    expect(markup).toContain('value="2026-06-01"');
    expect(markup).toContain("24-Ginbot-2018");
  });

  it("automatically computes Ethiopian date representation if omitted", () => {
    const markup = renderToStaticMarkup(
      <DualCalendarField
        id="test-auto-convert"
        label="Target Planned Date"
        gregorianValue="2024-07-08"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain("Target Planned Date");
    expect(markup).toContain("01-Hamle-2016");
  });
});
