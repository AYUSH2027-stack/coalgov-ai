# COALGOV AI — Setup and Run Guide

This project is a React 19 + Vite frontend served by an Express + tRPC backend. It uses Drizzle ORM with MySQL/TiDB, Manus OAuth for authentication, and optional Manus Forge services for storage/AI integrations.

## 1. Prerequisites

Install the following on the machine where you will run the project:

- **Node.js 22 LTS or newer**
- **pnpm 10.x**
- **Git**
- A **MySQL-compatible database**: MySQL 8+, TiDB, or a compatible hosted MySQL database
- Network access to the configured OAuth and Forge endpoints, if authentication or hosted integrations are enabled

The project was validated with:

```text
Node.js v22.13.0
pnpm 10.4.1
```

Check your versions:

```bash
node --version
pnpm --version
git --version
```

## 2. Get the source code

If you already have the project directory, enter it:

```bash
cd /path/to/coalgov-ai
```

If you are cloning from a Git repository:

```bash
git clone <your-repository-url> coalgov-ai
cd coalgov-ai
```

Do not commit `.env` files or credentials to the repository.

## 3. Install dependencies

From the project root:

```bash
pnpm install
```

The repository contains a `pnpm-lock.yaml`; keep using pnpm so the lockfile and dependency versions remain consistent.

## 4. Configure environment variables

There is currently no checked-in `.env` file. Create one locally at the project root:

```bash
touch .env
```

Add values in this shape:

```dotenv
# Runtime
NODE_ENV=development
PORT=3000

# Database — required for live dashboard data, migrations, and seed data
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE_NAME

# Session and Manus OAuth
JWT_SECRET=replace-with-a-long-random-secret
VITE_APP_ID=your-manus-oauth-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im

# Owner/admin mapping used by the built-in auth flow
OWNER_OPEN_ID=your-owner-open-id
OWNER_NAME=Your Name

# Manus Forge server-side integration
BUILT_IN_FORGE_API_URL=https://forge.manus.ai
BUILT_IN_FORGE_API_KEY=your-server-side-forge-key

# Optional browser-side Forge integration
VITE_FRONTEND_FORGE_API_URL=https://forge.manus.ai
VITE_FRONTEND_FORGE_API_KEY=your-frontend-forge-key

# Optional analytics
VITE_ANALYTICS_ENDPOINT=https://manus-analytics.com
VITE_ANALYTICS_WEBSITE_ID=your-analytics-website-id

# Optional branding
VITE_APP_TITLE=COALGOV AI — Smart Governance for Coal Mines
VITE_APP_LOGO=
```

### Environment variable details

| Variable | Required for | Notes |
|---|---|---|
| `DATABASE_URL` | Live dashboard data, migrations, seed script | MySQL/TiDB connection string. The Drizzle config fails if this is absent during database commands. |
| `JWT_SECRET` | Secure login sessions | Use a long, random, private value. |
| `VITE_APP_ID` | OAuth login | Manus OAuth application ID. |
| `OAUTH_SERVER_URL` | OAuth callback/server integration | Usually `https://api.manus.im`. |
| `VITE_OAUTH_PORTAL_URL` | Frontend login redirect | Usually `https://manus.im`. |
| `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY` | Server-side Forge-backed integrations | Keep the server key private. |
| `VITE_FRONTEND_FORGE_API_URL` and `VITE_FRONTEND_FORGE_API_KEY` | Browser-side Forge features | Only expose a key intended for frontend use. |
| `OWNER_OPEN_ID` / `OWNER_NAME` | Owner/admin mapping | Used by the built-in user upsert flow. |
| `PORT` | Custom port | Defaults to `3000`; the server searches the next available ports if needed. |
| `NODE_ENV` | Development/production mode | Use `development` for Vite hot reload and `production` for built assets. |
| `VITE_ANALYTICS_*` | Analytics only | Optional; omit if analytics is not needed. |

### Database URL examples

Local MySQL:

```dotenv
DATABASE_URL=mysql://coalgov:strong-password@127.0.0.1:3306/coalgov
```

Hosted TiDB/MySQL:

```dotenv
DATABASE_URL=mysql://USER:PASSWORD@HOST:4000/DATABASE?ssl={"rejectUnauthorized":true}
```

If your password contains special characters, URL-encode them.

## 5. Create the database

Create an empty database before running migrations. For local MySQL:

```sql
CREATE DATABASE coalgov CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'coalgov'@'localhost' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON coalgov.* TO 'coalgov'@'localhost';
FLUSH PRIVILEGES;
```

Then make sure `DATABASE_URL` points to that database.

## 6. Apply the schema

The project schema is defined in `drizzle/schema.ts`. Apply migrations with:

```bash
pnpm db:push
```

This runs:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

For production, review generated migration SQL before applying it to a production database. Back up the database first.

## 7. Seed demo data (optional but recommended)

The website includes fictional COALGOV demo data for mines, compliance records, corrective actions, inspections, and audit events.

After the schema has been applied:

```bash
pnpm exec tsx server/seed.ts
```

This requires a working `DATABASE_URL` and inserts/updates the demo records used by the dashboard.

> The seed data is fictional prototype data. Do not use it as official mining, safety, regulatory, environmental, or operational data.

## 8. Run in development mode

Start the full-stack server with Vite hot reload:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

If port `3000` is busy, the server automatically searches the next available port and prints the selected URL in the terminal.

The development command is defined in `package.json` as:

```bash
NODE_ENV=development tsx watch server/_core/index.ts
```

Keep this terminal running while developing. Stop it with `Ctrl+C`.

## 9. Validate the project

Run the TypeScript checker:

```bash
pnpm check
```

Run the automated tests:

```bash
pnpm test
```

Run both before handing off changes:

```bash
pnpm check && pnpm test
```

## 10. Build and run production mode locally

Create the production frontend and backend bundles:

```bash
pnpm build
```

Start the compiled server:

```bash
NODE_ENV=production pnpm start
```

Then open:

```text
http://localhost:3000
```

The production command serves the compiled Vite assets from `dist/public` and runs the bundled server from `dist/index.js`.

## 11. Useful project commands

| Command | Purpose |
|---|---|
| `pnpm install` | Install locked dependencies |
| `pnpm dev` | Run development server with Vite hot reload |
| `pnpm check` | Run TypeScript validation |
| `pnpm test` | Run Vitest test suite |
| `pnpm build` | Build frontend and backend for production |
| `pnpm start` | Run the production bundle |
| `pnpm db:push` | Generate and apply Drizzle migrations |
| `pnpm exec tsx server/seed.ts` | Seed fictional demo records |
| `pnpm format` | Format the repository with Prettier |

## 12. Troubleshooting

### `DATABASE_URL is required to run drizzle commands`

The `.env` file is missing, is in the wrong directory, or does not contain `DATABASE_URL`.

```bash
pwd
ls -la .env
printenv DATABASE_URL
```

If using `.env`, confirm it is located at the project root beside `package.json`.

### The app starts but dashboard data is empty

Check that:

1. `DATABASE_URL` points to the correct database.
2. Migrations were applied with `pnpm db:push`.
3. Demo data was loaded with `pnpm exec tsx server/seed.ts`.
4. The server was restarted after changing `.env`.

### OAuth login does not work

Verify that:

1. `VITE_APP_ID`, `OAUTH_SERVER_URL`, and `VITE_OAUTH_PORTAL_URL` are set.
2. The OAuth application allows the exact URL/port where the app is running.
3. `JWT_SECRET` is present.
4. The browser can reach the OAuth server.

### File/evidence upload or AI-backed features do not work

Verify the relevant Forge URL and key variables. Never expose the server-side `BUILT_IN_FORGE_API_KEY` in client code or commit it to Git.

### Port conflict

The server automatically looks for an available port starting at `PORT` or `3000`. You can choose another starting port:

```bash
PORT=3100 pnpm dev
```

### Build warning about large chunks

The current build reports a Vite chunk-size warning but completes successfully. It is not a runtime failure. Code splitting can be added later if bundle size becomes a deployment concern.

## 13. Recommended first-run sequence

```bash
cd coalgov-ai
pnpm install
cp .env.example .env   # only if you create and maintain an .env.example file
# Edit .env with real local values
pnpm db:push
pnpm exec tsx server/seed.ts
pnpm check
pnpm test
pnpm dev
```

Because this repository does not currently include `.env.example`, replace the `cp` step by creating `.env` manually from the template in Section 4.
