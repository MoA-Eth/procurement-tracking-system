import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DisbursementForm } from "./DisbursementForm";

describe("DisbursementForm", () => {
  it("renders the voucher reference, amount, and contract origin options", () => {
    const html = renderToStaticMarkup(
      <DisbursementForm
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
        smsThreshold={20000000}
      />,
    );

    // Verify key fields and controls are present in the DOM
    expect(html).toContain("Disbursement Origin");
    expect(html).toContain("Payment Voucher Reference");
    expect(html).toContain("Auto-Generate");
    expect(html).toContain("Disbursement Amount");
  });
});

