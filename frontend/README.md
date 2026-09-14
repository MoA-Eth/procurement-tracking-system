# MoA Procurement Tracking System Frontend

Next.js frontend for the Ministry of Agriculture procurement planning, tracking,
and reporting system.

## What this application provides

- Secure sign-in through a same-origin Next.js authentication proxy.
- Administrator user creation with email-based account invitations.
- Password creation from single-use invitation links.
- Forced temporary-password replacement for the bootstrap Administrator.
- Password-reset request and completion screens.
- Protected, role-specific dashboards.
- Session-aware sign-out.
- Ministry of Agriculture branding and consistent authentication screens.

The supported roles are:

- Officer
- Director
- Endorsing Committee
- Administrator

## Technology

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Vitest

## Authentication architecture

The browser sends authentication requests to `/api/auth/*` on the frontend. The
Next.js route handler forwards approved requests to the backend and relays the
backend's session cookie.

- The session identifier is stored only in an `HttpOnly`, `SameSite=Strict`
  cookie.
- Passwords and session identifiers are never stored in browser storage.
- “Remember me” stores only the user's email or username preference.
- Protected pages validate the backend session during server rendering.
- Temporary-password sessions can access only the password-change flow.
- Invited users create their first password without entering a current password.
- The user-management form accepts only name, email, and a non-Administrator
  role; it never displays a password or invitation token.
- Users are redirected to the dashboard assigned to their backend role.
- Signing out asks the backend to revoke the session before returning to sign-in.

## Routes

| Route                            | Purpose                                                 |
| -------------------------------- | ------------------------------------------------------- |
| `/`                              | Sign-in and password-reset request                      |
| `/change-password`               | Mandatory first-login password change                   |
| `/create-password?token=...`     | Create a password from an account invitation            |
| `/reset-password?token=...`      | Complete a password reset                               |
| `/admin/users`                   | Administrator-only user creation                        |
| `/dashboard/officer`             | Officer dashboard                                       |
| `/dashboard/director`            | Director dashboard                                      |
| `/dashboard/endorsing-committee` | Endorsing Committee dashboard                           |
| `/dashboard/admin`               | Administrator dashboard                                 |
| `/workspace/[section]`           | Authorized role workspace                               |
| `/access-denied`                 | Signed-in unauthorized-access response                  |
| `/api/auth/[...path]`            | Same-origin proxy for approved authentication endpoints |
| `/api/admin/users`               | Same-origin proxy for Administrator user invitations    |

## Role navigation

The reusable application sidebar is generated from a centralized permission
matrix. Pages repeat the authorization check on the server so hiding a link is
not the only access control.

| Role                       | Sidebar links                                                     |
| -------------------------- | ----------------------------------------------------------------- |
| Officer                    | Dashboard, Projects, Contracts, Activity Tracker                  |
| Director                   | Dashboard, Projects, Plan for Review, Committee Progress, Reports |
| Endorsing Committee Member | Dashboard, Plan for Review, My Decisions                          |
| Administrator              | Dashboard, User Management, System Logs (Timestamp)               |

The signed-in user's name and role are displayed in the application header and
sidebar account area.

## Prerequisites

- Node.js 24, matching `.nvmrc`
- npm
- The procurement tracking backend running locally or at a reachable URL

## Local setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy the environment template.

   PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   Git Bash, macOS, or Linux:

   ```bash
   cp .env.example .env.local
   ```

3. Confirm that `.env.local` points to the backend:

   ```dotenv
   BACKEND_API_URL=http://localhost:5000
   ```

   `BACKEND_API_URL` is server-only. Do not rename it to a `NEXT_PUBLIC_*`
   variable or expose backend credentials through it.

   Do not add `MAILERSEND_API_TOKEN`, `MAILERSEND_FROM_EMAIL`, or
   `MAILERSEND_FROM_NAME` to the frontend. MailerSend is called only by the
   backend after the Administrator's request has been authenticated.

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open <http://localhost:3000>.

## Available commands

| Command                | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Start the development server                       |
| `npm run build`        | Create a production build                          |
| `npm start`            | Run the production build                           |
| `npm run format:check` | Check Prettier formatting                          |
| `npm run format`       | Apply Prettier formatting                          |
| `npm run lint`         | Run ESLint                                         |
| `npm run typecheck`    | Run the TypeScript compiler without emitting files |
| `npm test`             | Run the Vitest test suite                          |

Run the complete verification set before opening a pull request:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Production configuration

- Run the frontend and backend behind HTTPS.
- Set `BACKEND_API_URL` to a URL reachable from the Next.js server.
- Set `APP_ORIGIN` to the frontend's public HTTPS origin.
- Keep `.env.local` and all deployment secrets out of Git.
- Configure the backend's frontend URL, CORS origin, secure session settings,
  database, invitation delivery, and password-reset delivery for the deployed
  environment.

## Related repository

The Express and PostgreSQL API is maintained in the
`procurement-tracking-system-backend` repository.
