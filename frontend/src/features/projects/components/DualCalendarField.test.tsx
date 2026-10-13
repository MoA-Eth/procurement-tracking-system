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
    expect(markup).toContain("01-June-2026");
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
    expect(markup).toContain("08-July-2024");
    expect(markup).toContain("01-Hamle-2016");
  });

  it("automatically computes Gregorian date representation if omitted when Ethiopian date is given", () => {
    const markup = renderToStaticMarkup(
      <DualCalendarField
        id="test-eth-to-greg"
        label="Target Date"
        gregorianValue=""
        ethiopianValue="01-Meskerem-2017"
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain("Target Date");
    expect(markup).toContain("11-September-2024");
    expect(markup).toContain("01-Meskerem-2017");
  });

  it("renders with variant='compact' properly", () => {
    const markup = renderToStaticMarkup(
      <DualCalendarField
        id="test-compact"
        label="Compact Date Filter"
        gregorianValue="2024-09-11"
        ethiopianValue="01-Meskerem-2017"
        onChange={() => undefined}
        variant="compact"
      />,
    );

    expect(markup).toContain("Compact Date Filter");
    expect(markup).toContain("11-September-2024");
    expect(markup).toContain("01-Meskerem-2017");
    expect(markup).toContain("GREGORIAN");
    expect(markup).toContain("ETHIOPIAN");
  });
});
