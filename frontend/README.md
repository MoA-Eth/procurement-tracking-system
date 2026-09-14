# MoA Procurement Tracking System — Frontend

Client web application for the Ministry of Agriculture Procurement Tracking System, built with **Next.js 16 (App Router)**, **React 19**, and **Tailwind CSS v4**.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16.3.0 (App Router)
- **Library**: React 19.2.8
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Animation & Icons**: Motion 13, Lucide React
- **Date Conversion**: `ethiopian-date` (Ethiopian Fiscal Calendar conversion)
- **Spreadsheet Processing**: `xlsx` (Excel template parsing and project imports)
- **Testing & Tooling**: Vitest, ESLint 9, Prettier

---

## 💡 Architecture & Key Features

1. **Same-Origin Authentication Proxy**:
   - Browser authentication requests hit `/api/auth/*` route handlers on the Next.js server.
   - Handlers proxy requests to the backend API, securing the session within an `HttpOnly`, `SameSite=Strict` cookie (`moa_user_session`).
   - Sensitive session tokens and passwords are never stored in browser `localStorage`.

2. **Role-Driven Navigation & Server Authorization**:
   - Navigation links are rendered according to a centralized permission matrix.
   - Pages enforce role authorization server-side before rendering.

3. **Dual Calendar Support**:
   - Built-in utilities convert and display procurement dates across both the Gregorian Calendar (GC) and Ethiopian Calendar (EC).

4. **Excel Import & Streamed Exports**:
   - Supports bulk project uploads using `.xlsx` templates.
   - Triggers browser downloads from backend streaming report endpoints.

---

## 📂 Directory Structure

```text
frontend/
├── public/                 # Ministry logos, icons, and static assets
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── (auth)/         # Sign-in, password reset, and invitation acceptance
│   │   ├── admin/          # Administrator user management
│   │   ├── dashboard/      # Role dashboards (/officer, /director, /endorsing-committee, /admin)
│   │   ├── workspace/      # Dynamic workspace sections
│   │   └── api/            # Server route proxies (/api/auth, /api/admin)
│   ├── components/         # Shared UI components (Sidebar, Header, Modals, Badges)
│   ├── context/            # React state contexts (Auth, TabSession)
│   ├── features/           # Feature-specific components and data:
│   │   ├── plans/          # Procurement plan forms and approval reviews
│   │   ├── projects/       # Projects management and activity milestones
│   │   ├── contracts/      # Contracts, disbursements, and supplier forms
│   │   ├── reports/        # Report filter forms and download handlers
│   │   └── dashboards/     # Role dashboard views
│   ├── lib/                # API clients (apiClient, authApi, plansApi, reportsApi, etc.)
│   └── types/              # Global TypeScript interfaces
├── .env.example            # Environment template
├── next.config.ts          # Next.js configuration
├── package.json            # Scripts and dependencies
└── tsconfig.json           # TypeScript configuration
```

---

## ⚙️ Environment Variables

Copy the template to `.env.local`:

```bash
cp .env.example .env.local
```

| Variable                          | Description                                    | Default                     |
| :-------------------------------- | :--------------------------------------------- | :-------------------------- |
| `BACKEND_API_URL`                 | Server-side URL to the backend Express API     | `http://localhost:5000`     |
| `APP_ORIGIN`                      | Public origin of the frontend application      | `http://localhost:3200`     |
| `NEXT_PUBLIC_SESSION_COOKIE_NAME` | Cookie name for session isolation              | `moa_user_session`          |
| `NEXT_PUBLIC_BACKEND_API_URL`     | Optional fallback URL for direct browser calls | `http://localhost:5000/api` |

---

## 🚦 Available Scripts

Run from the `frontend/` directory:

| Command                | Description                                                    |
| :--------------------- | :------------------------------------------------------------- |
| `npm run dev`          | Start development server on **Port 3200** (`next dev -p 3200`) |
| `npm run build`        | Compile and bundle production build                            |
| `npm start`            | Run production server                                          |
| `npm run typecheck`    | Run TypeScript compiler validation (`tsc --noEmit`)            |
| `npm run lint`         | Run ESLint across codebase                                     |
| `npm run format`       | Format code with Prettier                                      |
| `npm run format:check` | Check code formatting compliance                               |
| `npm test`             | Run test suite with Vitest                                     |

---

## 🗺️ Role Dashboards & Routes

| Route                            | Role Access              | Purpose                                              |
| :------------------------------- | :----------------------- | :--------------------------------------------------- |
| `/`                              | Public                   | Sign-in & password-reset requests                    |
| `/create-password?token=...`     | Public (Token-validated) | Set initial password from account invitation         |
| `/reset-password?token=...`      | Public (Token-validated) | Set new password from reset link                     |
| `/change-password`               | Authenticated            | Mandatory first-time password update                 |
| `/dashboard/officer`             | Officer                  | Plan preparation, activities, contracts              |
| `/dashboard/director`            | Director / Management    | Plan review, officer assignments, KPI progress       |
| `/dashboard/endorsing-committee` | Endorsing Committee      | Plan review and decision voting (`APPROVE`/`REJECT`) |
| `/dashboard/admin`               | Administrator            | User invitations, status toggling, audit logs        |
