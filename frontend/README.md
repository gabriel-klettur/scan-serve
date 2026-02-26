# ScanServe — Intelligent Receipt OCR Platform

> A full-stack application that transforms receipt photos into structured, searchable data — powered by dual OCR engines and a multi-agent AI pipeline with real-time streaming.

[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Why This Project Exists

Digitizing physical receipts is a tedious, error-prone process. OCR alone isn't enough — raw text from a crumpled supermarket receipt is noisy, misordered, and missing context. You need **intelligent post-processing** to turn that into usable data.

**ScanServe** solves this with a complete pipeline: upload a photo, run dual OCR engines, then pass the result through a 3-stage AI agent pipeline that normalizes, validates, and formats the data — all streamed to the UI in real time. Receipts are stored offline in IndexedDB with folder organization, bounding box visualization, and confidence scoring.

> This is not a tutorial project. It solves a real problem — digitizing Icelandic supermarket receipts — and does so with the same patterns and quality bar used in professional software teams.

---

## Key Features

- **Dual OCR Engine Support** — Google Cloud Vision API and EasyOCR, selectable per scan or combined for maximum accuracy.
- **Multi-Agent AI Pipeline** — 3-stage LLM processing: Organizer (normalizes with Icelandic context), Auditor (cross-validates fields), Stylist (generates clean Markdown).
- **Real-Time AI Streaming** — NDJSON streaming endpoint with stage-by-stage progress, handoff events, and agent notes rendered live in the UI.
- **Full Trace & Observability** — Every AI run is logged with revision history, per-stage Markdown snapshots saved to disk, and structured metadata in a JSON database.
- **Bounding Box Visualization** — Interactive overlay on scanned images showing detected text regions with confidence scores.
- **Smart Field Extraction** — Automated detection of merchant name, date, and total amount using regex heuristics on raw OCR output.
- **Batch Processing** — Drag-and-drop multi-file upload with parallel processing (5 concurrent for Vision API), queue tracking, and cancel support.
- **Offline-First Storage** — IndexedDB-backed receipt persistence (images, OCR results, AI results) with no cloud dependency.
- **Folder Hierarchy** — Nested folder tree with drag-and-drop organization via a custom `FileTreeExplorer` component.
- **3-Column Receipt Preview** — Original image, processed scan with bounding box overlay, and extracted Markdown text side by side.
- **Scan Result Tabs** — Browser-tab-like interface for navigating between multiple scan results, persisted via Zustand + localStorage.
- **Camera Integration** — Native camera capture on mobile (via `<input capture>`), webcam preview on desktop (via `getUserMedia`), with automatic device detection.
- **Confidence Meter** — Color-coded OCR confidence indicator with semantic labels (Excellent / Good / Fair / Poor).
- **Email Notifications** — Per-image or batch-complete notification support for long-running jobs.
- **Configurable AI Models** — Per-agent model overrides (e.g., `gpt-5-mini` for organizer, `gpt-5-nano` for auditor) with JSON retry logic.
- **HTML Ticket Renderer** — Server-side generation of a styled HTML receipt replica using absolute positioning from bounding box coordinates.

---

## Architecture & Design Principles

This project follows a **feature-sliced architecture** with strict separation between UI, business logic, data access, and infrastructure:

```
frontend/src/
├── components/
│   ├── navigation/          # AppHeader, ScanResultTabs (tab bar with overflow)
│   ├── results/             # AiStageBar, ConfidenceMeter, OCRFields, OCRText
│   ├── uploader/            # ImageUploader, MultipleImageUploader, BatchCameraCapture
│   ├── viewer/              # BeforeAfterViewer, BoundingBoxOverlay
│   └── ui/                  # shadcn/ui primitives (40+ components)
├── features/
│   └── receipts/            # Self-contained feature module
│       ├── components/      # FileTreeExplorer, ReceiptPreviewPanel, ReceiptExplorerTab
│       ├── db/              # IndexedDB database, repos (receipts, folders, settings)
│       ├── hooks/           # TanStack Query hooks (useReceipts, useReceiptFolders)
│       ├── types/           # Receipt & Folder domain types
│       └── utils/           # Folder tree builder, ID generator, object URL manager
├── pages/                   # Home, Results, Receipts, Settings, Pricing, NotFound
├── services/
│   └── api.ts               # Axios REST client + native fetch NDJSON stream consumer
├── store/                   # Zustand stores (OCR state, scan tabs, upload settings)
├── types/                   # Shared TypeScript interfaces
└── utils/
    ├── ocr/                 # Custom layout engine (geometry → rows → columns → markdown)
    │   ├── geometry.ts      # Bounding box math & coordinate normalization
    │   ├── words.ts         # Word-level grouping from raw OCR boxes
    │   ├── rows.ts          # Row detection via Y-axis clustering
    │   ├── columns.ts       # Column alignment & anchor detection
    │   ├── cells.ts         # Cell merging within detected columns
    │   ├── sections.ts      # Header/table/footer section classification
    │   └── markdown.ts      # Structured Markdown table generation
    └── receipt/             # Markdown parser + HTML renderer

backend/app/
├── api/v1/endpoints/        # FastAPI route handlers (OCR, receipts, folders, notifications)
├── core/                    # Config, dependencies, middleware, logging
├── models/                  # Pydantic v2 request/response models
├── repositories/            # JSON file-based persistence
└── services/
    ├── ai_receipt_agents/   # Multi-agent LLM pipeline
    │   ├── pipeline.py      # Orchestrator: Organizer → Auditor → Stylist (sync + stream)
    │   ├── prompts.py       # Per-agent system/user prompt builders
    │   ├── openai_text_client.py  # OpenAI API wrapper
    │   └── json_utils.py    # Robust JSON extraction from LLM output
    ├── ai_trace_service.py  # Run & revision persistence with Markdown snapshots
    ├── ocr_service.py       # EasyOCR wrapper + field guessing heuristics
    ├── google_vision_ocr_service.py  # Google Vision API integration
    ├── ocr_queue.py         # Thread-based concurrent OCR job queue
    ├── storage_service.py   # Upload handling & static file management
    └── ticket_html_renderer.py  # Pixel-accurate HTML receipt generation
```

### Engineering Highlights

| Principle | Implementation |
|---|---|
| **Type Safety End-to-End** | Pydantic v2 models on the backend map 1:1 to TypeScript interfaces on the frontend. API contracts are enforced at both boundaries. |
| **Feature-Sliced Architecture** | The `features/receipts/` module is fully self-contained with its own data layer, hooks, components, and types — ready to be extracted into a standalone package. |
| **Custom OCR Layout Engine** | `utils/ocr/` implements a geometry-based algorithm that converts raw bounding boxes into rows, columns, sections, and Markdown tables — no third-party layout library. |
| **Streaming AI with Observability** | Every AI pipeline run produces immutable revision snapshots stored on disk, enabling auditability and debugging of LLM outputs across all 3 stages. |
| **Offline-First with Zero Config** | The IndexedDB layer works entirely client-side. Users can scan, store, and organize receipts with no account, no cloud, no backend required. |
| **Responsive & Accessible** | Mobile camera capture, touch-friendly layouts, keyboard navigation, and semantic HTML throughout. |

---

## Tech Stack

### Frontend

| Layer | Technology |
|---|---|
| **Framework** | React 18 + TypeScript 5 |
| **Build** | Vite 5 (SWC) |
| **Styling** | Tailwind CSS 3 + shadcn/ui + Radix UI |
| **State** | Zustand (global) + TanStack Query v5 (server/async) |
| **Routing** | React Router v6 |
| **Animations** | Framer Motion |
| **Forms** | React Hook Form + Zod validation |
| **Storage** | IndexedDB (raw IDB API) |
| **HTTP** | Axios (REST) + native `fetch` (NDJSON streaming) |
| **Charts** | Recharts |
| **Icons** | Lucide React |

### Backend

| Layer | Technology |
|---|---|
| **Framework** | FastAPI + Uvicorn |
| **Validation** | Pydantic v2 + pydantic-settings |
| **OCR** | Google Cloud Vision API + EasyOCR (PyTorch) |
| **AI/LLM** | OpenAI API (gpt-5-mini / gpt-5-nano) |
| **Storage** | File-based JSON database + static file serving |
| **Image** | Pillow |
| **Concurrency** | Thread-based OCR queue with configurable workers |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.11+ with pip
- API keys (optional, for full functionality):
  - Google Cloud Vision API key (for Vision OCR engine)
  - OpenAI API key (for AI receipt parsing)

### Installation

```bash
# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys

# Frontend
cd ../frontend
npm install
cp .env.example .env.local
# VITE_API_URL=http://localhost:8000 (default)
```

### Run

```bash
# Terminal 1 — Backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

The app will be available at `http://localhost:8080`.

---

## Usage Workflow

1. **Upload a Receipt** — Drag-and-drop an image, use the file picker, or capture directly from your camera (mobile or desktop webcam).
2. **Select OCR Engine** — Choose between EasyOCR, Google Vision, or both combined for maximum accuracy.
3. **View Scan Results** — The Results page shows original vs. processed images side by side with interactive bounding box overlays.
4. **Run AI Enhancement** — Trigger the 3-stage AI pipeline and watch Organizer → Auditor → Stylist process your receipt in real time.
5. **Manage Receipts** — Browse, organize into folders, and preview receipts in the 3-column explorer — all stored offline in IndexedDB.
6. **Batch Process** — Upload multiple receipts at once with parallel processing, progress tracking, and optional email notifications.

---

## API Integration

The frontend communicates with the backend through these endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `POST /ocr` | multipart | Single image OCR (EasyOCR / Vision / both) |
| `POST /ocr/ticket` | multipart | HTML ticket render from OCR |
| `POST /ocr/ai/parse` | JSON | AI receipt parsing (synchronous) |
| `POST /ocr/ai/parse/stream` | JSON → NDJSON | AI receipt parsing (streaming, real-time stages) |
| `POST /api/v1/receipts` | multipart | Create receipt + trigger queued OCR |
| `GET /api/v1/receipts/:id` | — | Poll receipt status / get OCR result |
| `CRUD /api/v1/folders` | JSON | Folder management |
| `POST /api/v1/notifications/notify` | JSON | Email notification triggers |

### Streaming Protocol

The `/ocr/ai/parse/stream` endpoint emits newline-delimited JSON events:

```
{"type":"pipeline_start","agents":{"organizer":"gpt-5-mini","auditor":"gpt-5-mini","stylist":"gpt-5-mini"}}
{"type":"stage_start","stage":"organizer","agent":"Organizer (islandés)"}
{"type":"stage_result","stage":"organizer","data":{...},"run_id":"...","revision_id":"..."}
{"type":"handoff","from_stage":"organizer","to_stage":"auditor"}
{"type":"stage_start","stage":"auditor","agent":"Auditor (coherencia)"}
...
{"type":"result","data":{"fields":{...},"text_clean":"...","markdown":"..."}}
{"type":"pipeline_done","elapsed_ms":4200,"run_id":"abc123"}
```

---

## Screenshots

> *Coming soon — the application features a modern dark-themed UI with responsive multi-panel layouts.*

---

## Environment Variables

### Frontend (`.env.local`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend API base URL |

### Backend (`.env`)

| Variable | Default | Description |
|---|---|---|
| `GOOGLE_VISION_OCR_API_KEY` | — | Google Cloud Vision API key |
| `GPT_5_MINI_API` | — | OpenAI API key |
| `RV_OPENAI_RECEIPT_MODEL` | `gpt-5-mini` | Default LLM model for all agents |
| `RV_OPENAI_RECEIPT_ORGANIZER_MODEL` | (inherits) | Override model for organizer agent |
| `RV_OPENAI_RECEIPT_AUDITOR_MODEL` | (inherits) | Override model for auditor agent |
| `RV_OPENAI_RECEIPT_STYLIST_MODEL` | (inherits) | Override model for stylist agent |
| `RV_OPENAI_RECEIPT_JSON_RETRIES` | `1` | Retries on invalid JSON from LLM |
| `OCR_QUEUE_MAX_CONCURRENT` | `1` | Max parallel OCR workers |
| `RV_CORS_ORIGINS` | `["http://localhost:8080"]` | Allowed CORS origins |

---

## Project Status

This is an actively developed platform. Planned improvements include:

- [ ] Supabase integration for cloud persistence and auth
- [ ] Export receipts to CSV / Excel / PDF
- [ ] Receipt analytics dashboard with spending trends
- [ ] Drag-and-drop receipt reordering within folders
- [ ] End-to-end tests with Playwright
- [ ] PWA support for mobile installation

---

## About the Author

I'm a software developer passionate about building full-stack applications that combine modern frontend engineering with AI/LLM integration. This project demonstrates my ability to:

- **Design and implement clean architectures** (feature-sliced, separation of concerns, type-safe contracts)
- **Build production-quality React applications** with modern tooling (Vite, TypeScript, Zustand, TanStack Query)
- **Integrate AI/LLM pipelines** with real-time streaming, multi-agent orchestration, and observability
- **Implement offline-first data layers** using browser-native APIs (IndexedDB)
- **Build backend services** with FastAPI, Pydantic v2, and concurrent job queues
- **Create responsive, accessible UIs** with Tailwind CSS, shadcn/ui, and Framer Motion

I'm currently looking for opportunities in software engineering. If you're interested in my work, feel free to reach out.

📧 **Contact**: [GitHub Profile](https://github.com/gabriel-klettur)

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Troubleshooting

- **CORS errors** — Ensure `RV_CORS_ORIGINS` in the backend `.env` includes the frontend URL.
- **Cannot connect to API** — Verify `VITE_API_URL` in `.env.local` and that the backend is running on the expected port.
- **OCR returns empty** — Check that at least one OCR engine is configured (EasyOCR works out of the box; Vision requires an API key).
- **AI parse fails** — Confirm `GPT_5_MINI_API` is set. Check backend logs for `openai_receipt_parse_failed` entries.
