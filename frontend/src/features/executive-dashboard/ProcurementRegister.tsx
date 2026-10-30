"use client";
import {
  REGISTER_COLUMNS,
  registerCells,
  TYPE_LABELS,
  type ExecutiveRecord,
} from "./model";
export function ProcurementRegister({
  records,
  firstRowNumber,
  onSelect,
}: {
  records: ExecutiveRecord[];
  firstRowNumber: number;
  onSelect: (record: ExecutiveRecord) => void;
}) {
  return (
    <div
      role="region"
      aria-label="All 13 procurement register columns; scroll horizontally"
      tabIndex={0}
      className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-emerald-700"
    >
      <table className="w-[2600px] table-fixed text-left text-sm">
        <caption className="sr-only">
          Procurement register with all 13 workbook columns. Dates use mm/dd/yy.
        </caption>
        <colgroup>
          <col style={{ width: 56 }} />
          <col style={{ width: 224 }} />
          <col style={{ width: 320 }} />
          {Array.from({ length: 10 }, (_, index) => (
            <col key={index} style={{ width: 200 }} />
          ))}
        </colgroup>
        <thead className="bg-slate-50 text-xs text-slate-600">
          <tr>
            {REGISTER_COLUMNS.map((label, index) => (
              <th
                key={label}
                scope="col"
                className={`px-4 py-4 font-semibold ${index === 0 ? "sticky left-0 z-20 w-14 min-w-14 bg-slate-50" : index === 1 ? "sticky left-14 z-20 min-w-56 bg-slate-50 shadow-sm" : index === 2 ? "min-w-80" : "min-w-44"}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {records.map((row, rowIndex) => (
            <tr key={row.id} className="group align-top hover:bg-slate-50">
              {registerCells(row, firstRowNumber + rowIndex).map(
                (value, columnIndex) => (
                  <td
                    key={REGISTER_COLUMNS[columnIndex]}
                    className={`break-words px-4 py-4 text-xs leading-5 ${columnIndex === 0 ? "sticky left-0 z-10 bg-white group-hover:bg-slate-50" : columnIndex === 1 ? "sticky left-14 z-10 bg-white shadow-sm group-hover:bg-slate-50" : ""}`}
                  >
                    {columnIndex === 1 ? (
                      <>
                        <button
                          onClick={() => onSelect(row)}
                          className="text-left font-semibold text-emerald-800 underline decoration-emerald-200 underline-offset-4"
                        >
                          {value}
                        </button>
                        <span className="mt-1 block text-slate-500">
                          {TYPE_LABELS[row.itemType]}
                        </span>
                      </>
                    ) : (
                      <span
                        className={
                          /not recorded|not reported|not available|not awarded|not applicable/i.test(
                            value,
                          )
                            ? "text-slate-500"
                            : "text-slate-800"
                        }
                      >
                        {value}
                      </span>
                    )}
                  </td>
                ),
              )}
            </tr>
          ))}
          {!records.length && (
            <tr>
              <td
                colSpan={REGISTER_COLUMNS.length}
                className="px-5 py-10 text-center text-slate-500"
              >
                No records to display.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
