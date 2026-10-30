# Executive dashboard module

## Contract focused default view

The default page prioritizes the user's 13-column contract register. Cost estimates, initial contract amounts, contract completion and reported activity progress appear above visible filters and the register. Dates use mm/dd/yy; missing and pre-contract values remain explicit. The register is no longer collapsed. Extra visualizations and the full-portfolio operational summary are retained under Additional charts and operational summary, closed initially. All other modules remain unchanged.

Read-only executive oversight for Works, Goods and Services. Local preview:
`http://localhost:3201/workspace/executive-dashboard`.

## Scope and release

This is an additive module, not a replacement for the existing dashboards or procurement workflows. It uses the existing authentication, shell and PostgreSQL tables. No database migration, seed, new environment variable or dependency is required. No workbook rows are imported: the supplied workbook contains only its 13 column headings.

Deploy the backend and frontend changes together using the existing system's release process. The deployed system must already have the schema represented by this repository. This task does not deploy to a production host.

Module files:

- `backend/src/modules/executive-dashboard/` — read-only API, mappings, tests.
- `frontend/src/features/executive-dashboard/` — view, filters, measurements, export, tests.

Integration changes:

- `backend/src/app.ts` — import and mount `/api/executive-dashboard`.
- `frontend/src/lib/navigation.ts` — one new section for ADMIN, DIRECTOR and MANAGEMENT.
- `frontend/src/app/(protected)/workspace/[section]/page.tsx` — render the new section after existing permission checks.
- `frontend/src/lib/navigation.test.ts` — updated navigation and permission assertions.

Other local changes from earlier setup/authentication work are separate from this module and are not part of this release scope. Roll back by removing the module's route mount, workspace branch, navigation entry and files; database rollback is unnecessary.

The companion `executive-dashboard-module.patch` contains only the module files and integration changes listed above, plus this guide. From a compatible checkout, review and apply it with `git apply --check executive-dashboard-module.patch`, then `git apply executive-dashboard-module.patch`. If the check fails, reconcile the listed integration points against the deployed version; do not overwrite unrelated code. The patch includes no environment files, passwords, workbook data, local authentication fixes, generated build outputs or database contents.

Validation:

```powershell
cd backend
npm run typecheck
npx vitest run src/modules/executive-dashboard
cd ../frontend
npm run typecheck
npx vitest run src/features/executive-dashboard/model.test.ts src/lib/navigation.test.ts
```

Build the frontend and backend with their existing `npm run build` commands as part of release. Verify access as Management, Director and Administrator; Officers and Committee members must receive 403 from the executive API. Anonymous access must receive 401. The API requires an authenticated opaque session and rejects password-change-only sessions.

Local validation completed: both production builds, both TypeScript checks, scoped ESLint, 17 backend module tests and 39 frontend visualization/measurement/navigation tests. The live API returned 401 without a session and 200 with an administrator session. The authenticated browser page, Services selector and reset control were checked with the empty local dataset.

## Sources and field mapping

The supplied `4_5942863659549074149.xlsx`, `Sheet1!A1:M1`, is the register specification. It contains no data rows. Live data comes from the existing PostgreSQL models below; the response is refreshed on initial load and with Refresh, and is not stored by this module.

| Workbook field | Existing system source / handling |
| --- | --- |
| No. | Export row number within the filtered population |
| Contract Ref | Contract.contractNo; Activity.reference before a contract exists |
| Contract Description | Linked Activity.description, then Plan.title; unavailable for unlinked contracts |
| Project | Activity → Plan → Project.name |
| Cost Estimate | Activity.estimatedBudget and Activity.currency |
| Date of Invitation | Actual start/end of an applicable invitation stage; never a planned date |
| Date of bid opening | Actual start/end of an applicable bid-opening stage; never a planned date |
| Date Contract Signed | Contract.signatureDate |
| Supplier/Contractor, Country | Supplier.name; supplier country is unavailable in the existing schema. Project.country is labelled separately, not substituted as supplier country |
| Initial Contract Amount | Contract.totalValue, excluding VAT, grouped by Contract.currency |
| Initial Contract Completion Date | Contract.plannedEndDate |
| Complete, Yes/No | Completed contract status or recorded actualCompletionDate; not applicable before contract |
| % completion | Activity.performancePct if between 0 and 100; labelled reported activity completion, never inferred from payments |

Works and Goods map directly from Plan.procurementCategory. Consultancy/consulting and non-consulting services are grouped under Services. Source category remains inspectable. Missing or unknown categories remain Unclassified; description keywords are not used to guess category.

## Measurement rules

- One register row per non-deleted contract, plus one row per active activity without a contract. Activities must belong to active plans and projects. Contracts without a linked activity remain visible as unclassified with missing project details. Contracts linked to inactive scope are excluded.
- Activity counts and estimated values deduplicate by activity ID, since an activity can have several contracts. Contract counts and values operate at contract grain. Filtered exports preserve all selected register rows; repeated activity estimates in the register must not be summed as contract amounts.
- Initial contract values include all displayed statuses, including closed contracts. ETB, USD and any other currencies remain separate; there is no exchange-rate assumption. Unknown currency is retained in an Unspecified bucket.
- Overdue means an incomplete, non-cancelled/non-terminated contract whose revised completion target (or initial target if no revision) is before the snapshot date in UTC. A contract due today is not overdue. Missing targets are not classified as on-time performance; they are listed under reporting coverage.
- Completed count uses contract status or actual completion date. Reported activity progress remains independent and may be missing even for a completed contract. It is not averaged into an unsupported physical portfolio completion metric.
- Filters intersect by item type, project, currency, delivery status and search text. Category comparison cards ignore only the item-type filter so all three categories can be compared; the other filters apply. Charts, KPIs, register, record detail and CSV use the selected population.
- The on-screen register and CSV both use the 13 requested workbook columns in their original order. The register scrolls horizontally, with row numbers and references frozen. Dates throughout this module and its CSV use mm/dd/yy in UTC. The initial completion column uses the original planned date, not a revised target.
- CSV exports all filtered rows, not just the visible page. Amounts include their recorded currency and progress includes its percent sign. Missing values are explicit: Not recorded, Not reported, Supplier country not available, or Not applicable (pre-contract). Measured zeros remain zero. Text starting with spreadsheet formula characters is neutralized.

## Data availability and limitations

Initial development used an empty local database. The app is now connected to a separate restored local production copy with 34 activities and 1 contract; no synthetic procurement records were inserted. The 13-column register and CSV were checked against all 34 rows, including signature date 10/23/26 and initial completion date 10/08/27. All activities lack reported progress and the restored copy has no stage records, so invitation/bid-opening dates remain missing. Non-empty calculations, currency separation, missingness, filtering, export and overdue boundaries are also tested with isolated fixtures. Authenticated populated-table visual review remains dependent on signing in to the accessible preview session. The module currently reads the scoped register into memory; large portfolios may need server-side filtering/pagination later.

Supplier country and contract-specific physical progress cannot be supplied without extending existing capture workflows. They remain explicitly unavailable rather than adding a migration or changing those workflows in this module.

## Review against the visualization references

Reviewed `Procurement_Contract_Dashboard_Visualization_Proposal.docx` and `Contract Visualization Types.html` on 15 October 2026. The HTML is a saved conversation containing illustrative figures; none of its sample values are used as procurement data.

| Proposed visualization | Executive module implementation |
| --- | --- |
| Executive KPI cards | Registered contracts, initial contract value, completed count/rate, overdue count, total estimates by currency and average reported activity progress with coverage |
| Contracts by project | Horizontal bars using distinct contract IDs; selecting a project applies the global project filter |
| Completion status | Donut with completed, incomplete and unknown counts; the denominator is registered contracts, excluding pre-contract activities |
| Estimated versus contract amount | Grouped project bars with activity estimates counted once. Estimates and contract commitments are labelled as different populations |
| Contract value by project | Initial values by project in one selected currency |
| Supplier comparison | Supplier commitment bars in the selected currency; selecting a supplier applies the global supplier filter |
| Overall progress gauge | Average valid reported percentages across unique activities. This is explicitly activity progress, not contract-specific physical implementation. Missing progress is not zero |
| Project progress comparison | Horizontal 0–100% bars with the reported/total activity coverage shown per project |
| Implementation tracker | Contract follow-up table, overdue highlighting, reported linked-activity progress and effective target dates; original 13-column register retained |
| Gantt-style deadline view | Recorded implementation start through the revised/original completion target. Missing start may use an explicitly labelled signature-date proxy. Missing or reversed date intervals do not produce invented bars |
| Procurement milestone trend | Monthly invitation, opening and signature counts for the last 12 calendar months. Invitations/openings deduplicate activities; signatures deduplicate contracts |
| Contract signing values over time | Monthly initial values with a historical recorded signature, in one currency; not expenditure or payment amounts |
| Cost scatterplot and variance | One matched point per activity, comparing its estimate with all its linked contract amounts in the same currency. Partially filtered and mixed-currency award sets are excluded. Variance uses matched totals, not the full unawarded pipeline |
| Supplier country chart/map | Explicitly unavailable: supplier country is not stored. Project country is not substituted and no geography is invented |

The visuals are organized into Executive overview, Timeline & delivery, and Finance & suppliers views within the existing module. The original shared filters apply to all views and the register; supplier, signing-year and effective completion-year filters are also provided. A separate financial-chart currency selector controls only currency-valued charts and makes no exchange-rate conversion.

### Source-specific findings and safeguards

- The restored local copy has one contract, 33 pre-contract activities, no recorded stage milestones and no reported completion percentages. The gauge/progress panels show missing coverage; procurement history remains unavailable until dated events exist.
- The contract's signature is dated 10/23/26, after the 10/15/26 review date. It remains in register/commitment comparisons but is excluded from historical signature charts and processing-time calculations. This is visibly flagged; no source date was changed.
- Two source projects share the same name and code. Their IDs are distinct; charts do not silently merge their values. Short record suffixes distinguish duplicate names in charts and project filters.
- The ETB matched pair has an estimate and initial contract amount of ETB 50,000 each, giving 0% matched variance. This is not evidence that the full procurement pipeline has zero variance or that the future-dated contract is already signed.
- Current-source averages, sparse data and missingness are not replaced by the sample values or graphs in the attached references. No migrations or source procurement-data changes are required.

### Additional verification

Automated checks cover duplicate project names, activity-versus-contract grain, multi-contract estimates, mixed/partial currency pairs, zero-denominator variance, missing progress, future signatures, valid calendar positioning, supplier/date filters, schedule proxies and invalid intervals. Server-rendered chart checks exercise all three views. Private loopback-only static snapshots from the restored local data were used for bounded layout review without changing authentication or inserting sample records.

### Recording reference update

The ministerial overview also exposes contracts by project, average reported activity progress by project, monthly contract signature counts, and the implementation timeline shown in the supplied recording. The existing completion donut is retained. Counts use registered contracts; progress excludes missing reports and identifies reporting coverage. Future signatures are excluded from the historical trend. Reference mockup values are never used as data. The detailed register remains collapsed.

### Leadership decision briefing

The main view prioritizes recommended follow-up, overdue initial contract value by currency, completion targets in the next 90 days, and reporting coverage. Suggestions are derived from recorded indicators, not approvals or claims of loss. Awaiting-contract activities are not classified as delayed. Delivery and attention panels precede diagnostic charts; projects without progress reports use an explicit missing-data message. Verified with 39 frontend dashboard/navigation tests, lint, production build, and a static browser review using the local restored database.

### Mobile and tablet layouts

Dashboard-only scoped styles adapt cards, briefing padding, filter widths, touch targets, tabs, pagination, and record dialogs. The 13-column register scrolls within its own region; frozen columns are disabled below 640px. Overview preview verified at 320px, 390px, and 768px with no page-wide horizontal overflow. Production build, lint, and 39 tests pass. Other modules are unchanged.

### Existing dashboard summary

Reviewed the director/management summary, review queue, delay, pipeline, and financial calculations. Added a read-only full active portfolio summary: projects, plans, director review queue (including rejected/returned follow-up), committee review, executive authorization, and delayed activities. Delay rules match the existing dashboard: activity DELAYED or any applicable incomplete stage flagged DELAYED or past its effective target. Stage coverage is explicit. No fixed FX conversion or synthetic schedule-adherence score is copied. This summary is independent of contract filters; existing dashboard modules are unchanged. Local snapshot: 16 projects, 17 plans, 34 activities, zero review queues/delay flags and zero activities with stages. No migration needed. Backend 18 tests and type check; frontend 39 tests, lint, and build passed.

## Contract register graphs

The default filtered view includes matched activity estimates versus total initial awards, a contract completion donut, per-contract reported activity progress, supplier initial award values and a common-scale milestone plot for invitation, opening, signature and original completion target. References, descriptions and project names contextualize the timeline; references open details. Supplier country remains unavailable. Currencies remain separate; no values or dates are inferred. Financial comparisons require complete same-currency activity award groups. All 13 source fields remain together in the register and export.
