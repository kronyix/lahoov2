<div align="center">

# **Every drop, everywhere. Instantly.**
## Lahoo AI Blood Grid 🩸

![Lahoo Banner](https://img.shields.io/badge/Lahoo-AI_Blood_Logistics-red?style=for-the-badge&logo=firebase)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)

<br/>

![Lahoo AI Landing Page](docs/images/landing.png)
<br/>

### Seamless Experiences for Workers and Donors

| 🏥 Care Operations & Voice Dispatch | 🩸 Live Grid Deficit Command Map |
| :---: | :---: |
| ![Voice Dispatch](docs/images/voice-dispatch.png) | ![Donor Deficit Map](docs/images/donor-map.png) |

<br/>

</div>

**Lahoo AI Blood Grid** is an intelligent, real-time blood logistics and donor matching platform. It bridges the gap between healthcare workers managing critical blood inventory/cold chains, and donors who want to make a localized, community-driven impact.

By combining real-time inventory telemetry, AI-driven voice intent translation (for regional emergency requests), and a localized donor notification grid, Lahoo ensures blood is where it needs to be, right when it's needed most.

---

## 🌟 Key Features

Lahoo is split into two primary experiences via a unified API backend:

### 🏥 For Healthcare Workers (`worker`)
* **Live Inventory & Cold Chain Tracking:** Track blood storage units (BSUs), expiration dates, and real-time temperature logs to prevent wastage.
* **Emergency Dispatching:** Dispatch and route multi-hop shipments with real-time ETA stages.
* **AI Voice Intents:** Transcribe and structure regional-language emergency requests effortlessly using Google Cloud Speech-to-Text and Vertex AI.
* **Credit Ledger & Vouchers:** Issue replacement-credit vouchers directly via WhatsApp deep links.

### 🩸 For Blood Donors (`donor`)
* **Proximity Deficit Matching:** View and claim real-time blood deficits within your district or state.
* **Guardian System:** Opt-in to "Rare-Type Guardian" alerts based on a specified radius and active hours to be notified only for critical emergencies.
* **Impact Timeline:** Track your privacy-blinded donation history and the lives you've saved.
* **Community Sovereignty Rings:** Adopt community drives and pool donation efforts.

---

## 🏗️ Architecture & Stack

This project is organized as a monorepo using **pnpm workspaces**.

* **Runtime:** Node.js 24
* **Language:** TypeScript 5.9
* **API Server:** Express 5 (Deployed via Firebase Hosting rewrites to Google Cloud Functions)
* **Database:** PostgreSQL + Drizzle ORM
* **Validation:** Zod (`zod/v4`) + `drizzle-zod`
* **API Contracts:** OpenAPI 3.1.0 ➔ Code generation via **Orval** (outputs React Hooks & Zod schemas)
* **Build Tooling:** esbuild (CJS bundle)

### 📂 Workspace Structure
* `artifacts/api-server/` - The core Express API backend
* `artifacts/laho-ai/` - The frontend application (UI components, React)
* `lib/api-spec/` - The OpenAPI specification (`openapi.yaml`) and Orval codegen configuration
* `lib/api-client-react/` - Auto-generated API client and React Hooks
* `lib/api-zod/` - Auto-generated Zod types from the OpenAPI spec
* `lib/db/` - Database schemas, migrations, and Drizzle config
* `functions/` - Cloud functions entry points

---

## 🚀 Run & Operate

Ensure you have [Node.js 24](https://nodejs.org/) and [pnpm](https://pnpm.io/) installed.

### Prerequisites
You need a PostgreSQL database. Set the following environment variable:
```bash
export DATABASE_URL="postgresql://user:pass@localhost:5432/lahoo"
```

### Common Commands

* **Start API Server:**
  ```bash
  pnpm --filter @workspace/api-server run dev
  ```
  _Runs the API server on port 5000._

* **Database Migrations (Dev Only):**
  ```bash
  pnpm --filter @workspace/db run push
  ```
  _Pushes schema changes directly to your development DB._

* **Regenerate API Clients:**
  ```bash
  pnpm --filter @workspace/api-spec run codegen
  ```
  _Regenerates API hooks and Zod schemas whenever `openapi.yaml` changes._

* **Typechecking & Build:**
  ```bash
  pnpm run typecheck
  # or to build all packages:
  pnpm run build
  ```

---

## 💡 Architecture Decisions

* **Contract-First API Design:** We maintain `lib/api-spec/openapi.yaml` as the absolute source of truth. Frontend hooks, API validation schemas, and types are entirely auto-generated from this spec using Orval. This guarantees backend-frontend contract safety.
* **Modular Monorepo:** Separating `api-server`, `api-zod`, `api-client-react`, and `db` into distinct workspace packages prevents circular dependencies and allows independent linting, typing, and testing.
* **Serverless Deployment:** Express is wrapped in Google Cloud Functions to scale down to zero when not in use, routing through Firebase Hosting for custom domains and static asset serving.

---

## ⚠️ Gotchas & Pointers

* **Always re-run Codegen:** If you change an endpoint definition, you MUST run `pnpm --filter @workspace/api-spec run codegen` before the frontend or backend types will reflect the change.
* **Refer to `pnpm-workspace` Skill:** If you are unfamiliar with the monorepo structure, consult the project's workspace setup files or package details for standard TypeScript configurations.
