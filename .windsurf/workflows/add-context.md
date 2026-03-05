---
description: Load full-project context for the ScanServe OCR platform before starting work
---

> **⚡ AI Credits Rule**: Batch file reads in parallel. Minimize tool calls. Do not re-read files already seen in this conversation.

# /add-context — ScanServe Context Bootstrapping

Run this workflow when a Cascade session needs complete awareness of the project. It front-loads knowledge from both the frontend and backend of this full-stack receipt OCR platform.

## 1. Confirm Directory Structure
1. Verify project structure:
   ```powershell
   Get-ChildItem -Name
   ```
2. Key folders to confirm:
   - `frontend/` — React SPA (Vite + TypeScript)
   - `backend/` — FastAPI + Python
   - `docs/` — Planning docs, pricing specs
   - `.windsurf/` — IDE rules and workflows

## 2. Review Frontend Configuration
1. Read core config files in parallel:
   - `frontend/package.json` — dependencies and scripts
   - `frontend/vite.config.ts` — build configuration (port 8080, `@/` alias)
   - `frontend/tsconfig.json` — TypeScript settings
   - `frontend/tailwind.config.ts` — design tokens
2. Note the stack: React 18, TypeScript, Vite, Tailwind, shadcn/ui, Zustand, TanStack Query, Framer Motion, Axios.

## 3. Review Backend Configuration
1. Read core config files in parallel:
   - `backend/requirements.txt` — Python dependencies
   - `backend/app/core/config.py` — Settings with `RV_` env prefix
   - `backend/app/main.py` — FastAPI app setup, middleware, routers
2. Note the stack: FastAPI, Pydantic v2, EasyOCR, Google Vision, OpenAI, Pillow.

## 4. Understand Frontend Architecture
1. List the main areas:
   ```powershell
   Get-ChildItem frontend/src -Depth 1
   ```
2. Key areas:
   - `components/navigation/` — AppHeader, ScanResultTabs
   - `components/results/` — AiStageBar, ConfidenceMeter, OCRFields
   - `components/uploader/` — ImageUploader, MultipleImageUploader, BatchCameraCapture
   - `components/viewer/` — BeforeAfterViewer, BoundingBoxOverlay
   - `components/ui/` — shadcn/ui primitives (DO NOT modify)
   - `features/receipts/` — Self-contained feature module (components, db, hooks, types, utils)
   - `store/` — Zustand stores (ocrStore, scanResultsStore, uploadSettingsStore)
   - `services/api.ts` — Axios REST + native fetch NDJSON streaming
   - `utils/ocr/` — Custom layout engine (geometry → rows → columns → markdown)

## 5. Understand Backend Architecture
1. List the main areas:
   ```powershell
   Get-ChildItem backend/app -Depth 1
   ```
2. Key areas:
   - `api/v1/endpoints/` — Route handlers (OCR, receipts, folders, notifications)
   - `services/ai_receipt_agents/` — Multi-agent LLM pipeline (Organizer → Auditor → Stylist)
   - `services/ocr_service.py` — EasyOCR wrapper
   - `services/google_vision_ocr_service.py` — Google Vision integration
   - `services/ocr_queue.py` — Thread-based concurrent job queue
   - `models/` — Pydantic v2 request/response models
   - `repositories/` — JSON file-based persistence

## 6. Check Design System & Pages
1. Review `frontend/src/index.css` for CSS variables and custom utilities.
2. Review pages: `Home.tsx`, `Results.tsx`, `Receipts.tsx`, `Settings.tsx`, `Pricing.tsx`.
3. Review `frontend/src/App.tsx` for routing and provider setup.

## 7. Review Rules & Workflows
1. Read `.windsurf/rules/project.md` for enforced conventions.
2. Understand available workflows: `/all-flow`, `/close-flow`.

## 8. Consolidate Understanding
1. Produce a concise context brief covering:
   - Platform purpose (receipt OCR + AI-powered structuring)
   - Frontend architecture (feature-sliced, Zustand + TanStack Query, IndexedDB offline)
   - Backend architecture (FastAPI service layer, multi-agent AI pipeline, NDJSON streaming)
   - Data flow: Upload → OCR (EasyOCR / Vision) → AI Pipeline (Organizer → Auditor → Stylist) → Structured output
   - Environment setup (ports 8080/8000, env vars)
2. Highlight any open questions before implementation.

## 9. Ready to Execute
1. Only after documenting the above, proceed with task-specific workflows.
2. Keep the context brief handy for future sessions.
