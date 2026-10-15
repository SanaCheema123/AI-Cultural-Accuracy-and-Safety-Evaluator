# CulturalGuard AI

**AI Cultural Accuracy and Safety Evaluator**  
**Tagline:** *Respecting Cultures. Empowering AI.*

CulturalGuard AI evaluates an uploaded AI-generated image against an Arabic prompt and stores structured signals for semantic alignment, cultural/contextual consistency, safety, and potential bias/stereotype indicators.

## Current product scope

The user-facing product is intentionally focused on five pages:

1. **Landing** — `/`
2. **Home / Overview** — `/app`
3. **Evaluate** — `/app/evaluate`
4. **History** — `/app/history`
5. **Settings** — `/app/settings`

Authentication routes remain as supporting infrastructure. Older evaluation-detail URLs redirect into the single Evaluate workspace, while retired application routes redirect to Home.

## Live-data behavior

This build contains **no production demo evaluator, no Demo Model A/B/C selector, no prefilled demo login, and no fabricated dashboard/history records**.

- A new workspace starts empty.
- Home and History show only evaluations persisted from actual user requests.
- The Evaluate page uses the single live multimodal model configured on the backend.
- If no live provider is configured, the UI shows **Model not configured** and disables live evaluation instead of inventing scores.
- The project ships with **no API key or provider secret**.

Automated cultural judgments remain probabilistic. The UI separates score, confidence, evidence, explanation, recommendation, and human review rather than presenting model output as cultural truth.

## Architecture

```text
React + TypeScript + Vite
          |
          v
FastAPI /api/v1
          |
          v
Authentication + workspace authorization
          |
          v
EvaluationService
          |
          v
Configured live multimodal HTTP provider
          |
          +--> semantic similarity
          +--> cultural/contextual findings
          +--> safety findings
          +--> potential bias/stereotype findings
          |
          v
Result aggregation + review recommendation
          |
          v
SQLite (local) / PostgreSQL (deployment)
          |
          +--> Home overview
          +--> History
          `--> Human review stored with evaluation
```

The live model call is isolated behind `LiveMultimodalEvaluator`, so a provider-specific adapter can replace it without changing the frontend workflow or database contract.

## Repository structure

```text
/
├── frontend/               React + TypeScript + Vite
├── backend/                FastAPI + SQLAlchemy + Alembic
├── ml/                     model-interface / future ML integration area
├── docs/                   architecture, API, live AI setup, QA
├── tests/e2e/              Playwright workflows
├── docker/                 container definitions
├── scripts/                development / diagram utilities
├── .env.example
├── docker-compose.yml
├── README.md
└── LICENSE
```

## Local requirements

Recommended:

- Python **3.11**
- Node.js 20+
- npm

SQLite is used by the supplied local configuration. PostgreSQL remains supported for Docker/deployment.

## 1. Configure environment

Copy the environment template if `.env` does not exist:

```powershell
Copy-Item .env.example .env
```

For live evaluation, create your own Gemini API key in Google AI Studio and put only that secret in the project-root `.env`:

```env
GEMINI_API_KEY=your-google-ai-studio-key
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
GEMINI_TIMEOUT_SECONDS=120
GEMINI_JSON_MODE=true
```

Create a key at `https://aistudio.google.com/apikey`. The project defaults to `gemini-3.5-flash-lite`, a multimodal Gemini model with an eligible free tier. Free-tier quotas and regional availability are controlled by Google and can change.

No object-storage credentials are required: uploads use local validated storage in development.

See [`docs/LIVE_AI_SETUP.md`](docs/LIVE_AI_SETUP.md) for setup and troubleshooting.

## 2. Run backend without a virtual environment

```powershell
cd backend
py -3.11 -m pip install -r requirements.txt
py -3.11 -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify:

- API: `http://127.0.0.1:8000`
- Swagger: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`
- Readiness: `http://127.0.0.1:8000/ready`

The health response tells you whether a live AI model is configured.

## 3. Run frontend

```powershell
cd frontend
npm install
npm run typecheck
npm run build
npm run dev
```

Open:

```text
http://localhost:5173
```

Register a new account from the Sign Up page. The project does not create a preset user.

## Arabic / RTL

Arabic is a first-class interface mode.

When the user switches to Arabic:

- `<html lang="ar" dir="rtl">` is applied immediately;
- the sidebar moves from the left edge to the right edge;
- desktop content spacing mirrors with the sidebar;
- the mobile drawer opens/closes from the RTL side;
- navigation, cards, menus, forms, tables, icons, and logical spacing remain aligned;
- the Arabic prompt editor remains RTL even when the surrounding UI is English.

Translations are centralized in:

```text
frontend/src/i18n/locales/en.json
frontend/src/i18n/locales/ar.json
```

## Evaluation flow

```text
Image + Arabic prompt
        ↓
input / image validation
        ↓
live multimodal provider request
        ↓
semantic alignment
cultural/contextual assessment
safety assessment
potential bias/stereotype indicators
        ↓
normalization + confidence
        ↓
review recommendation
        ↓
persistence
        ↓
Evaluate result + Home + History
```

The backend intentionally does not equate prompt-image semantic similarity with cultural correctness.

## Live provider response

The generic adapter expects structured JSON for:

```text
language
vision
similarity
cultural
safety
bias
```

Each automated assessment can include:

```text
score
confidence
status
finding/category
severity
risk level
evidence
explanation
recommendation
uncertainty (cultural findings)
```

A provider that cannot produce this contract should be integrated through a provider-specific adapter rather than forcing fake values into the application.

## Database

Local development:

```env
DATABASE_URL=sqlite:///./culturalguard.db
```

Docker/deployment can use PostgreSQL through SQLAlchemy. Database tables include users/workspaces, evaluations, inputs/results, cultural/safety/bias findings, model runs, expert reviews, reports, and audit logs.

No `.db` file or seeded evaluation history is shipped in the source package.

If you are replacing an older local copy and want to remove its previous local SQLite history/uploads explicitly, stop the backend and run from the project root:

```powershell
py -3.11 scripts\reset_local_data.py --yes
```

This script only targets `backend/culturalguard.db` and `backend/uploads`. It does not touch an external PostgreSQL database.

## Testing

Backend:

```powershell
cd backend
py -3.11 -m pytest -q
```

The test suite uses a deterministic **test double** for the external provider so tests do not make paid/network calls. This test double is not used by the production application.

Frontend:

```powershell
cd frontend
npm run typecheck
npm run test -- --run
npm run build
```

E2E:

```powershell
npm run e2e
```

The real live-evaluation E2E case is skipped unless `E2E_LIVE_AI=true` and a real provider is configured.

## Security notes

- Never commit `GEMINI_API_KEY`.
- Keep real secrets in environment variables / your deployment secret manager.
- Uploaded files are validated before evaluation.
- Passwords are hashed; authentication tokens are signed.
- Workspace-scoped authorization protects evaluation data.
- Errors returned to the frontend do not expose server stack traces.
- Live provider errors fail explicitly; the app does not fall back to fake model output.

## Docker

Docker Compose remains available for deployment-style development:

```powershell
docker compose up --build
```

Docker uses PostgreSQL. Configure live-provider environment variables before attempting an evaluation.

## Validation record

See [`docs/QA_REPORT.md`](docs/QA_REPORT.md).

Current source validation includes:

- backend Pytest suite: **14 passed**;
- backend Python compilation: passed;
- frontend TS/TSX syntax parse: passed;
- English/Arabic translation-key parity: passed.

A real external provider call is **not claimed** unless you supply valid live-provider configuration.
