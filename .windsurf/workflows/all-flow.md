---
description: Initialize branch, commit discipline, and dev servers for each Cascade session on ScanServe
---

> **⚡ AI Credits Rule**: Batch file reads in parallel. Minimize tool calls. Do not re-read files already seen in this conversation.

# /all-flow — Session Initialization Protocol

Use this workflow once at the beginning of every Cascade session to enforce clean branching and disciplined commits.

## 1. Pre-flight Checklist
1. **Assess repo state**
   ```powershell
   git status -sb
   ```
   - If dirty with unrelated changes, stop and ask the user before proceeding.
2. **Sync with default branch**
   ```powershell
   git fetch origin
   git pull --ff-only origin main
   ```
   - Replace `main` if the canonical branch differs.
3. **Review open tasks**: Confirm priorities and scope before coding.

## 2. Create a Fresh Working Branch
1. Define a descriptive slug (`feature`, `fix`, or `chore`) + date + short scope, e.g. `feature/2026-03-03-batch-upload-progress`.
2. Create and switch:
   ```powershell
   git checkout -b <new-branch>
   ```
3. Note the branch name in the session summary so the user can track progress.

## 3. Start Development Servers
1. **Backend** (Terminal 1):
   ```powershell
   cd backend
   venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ```
   - Verify health: `GET http://localhost:8000/health`
2. **Frontend** (Terminal 2):
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
   - Verify the app runs at `http://localhost:8080`.

## 4. Implementation Loop (Repeat per Change)
1. **Plan first**: Outline intent and affected files (frontend/backend) before editing code.
2. **Implement change**: Keep edits scoped and follow existing patterns.
   - Frontend: feature-sliced architecture, Zustand stores, TanStack Query hooks.
   - Backend: service layer, Pydantic models, endpoint handlers.
3. **Visual verification**: Check the browser preview to confirm UI changes.
4. **Lint check** (frontend):
   ```powershell
   cd frontend
   npm run lint
   ```

## 5. Commit Discipline
1. Commit after each cohesive, reviewed change.
2. Follow conventional commit style:
   - `feat(frontend): add batch upload progress bar`
   - `feat(backend): add CSV export endpoint for receipts`
   - `fix(ocr): correct bounding box coordinate normalization`
   - `refactor(store): simplify ocrStore state transitions`
   - `docs: update API endpoint documentation`
3. Use scope `(frontend)`, `(backend)`, `(ocr)`, `(ai)`, `(db)` to clarify affected area.
4. Include a detailed body when context is non-trivial.
5. Push the branch regularly:
   ```powershell
   git push -u origin <new-branch>
   ```

## 6. Session Wrap-Up
1. Ensure no pending changes remain uncommitted (`git status` should be clean).
2. Summarize:
   - Branch name and readiness (e.g., needs PR, awaiting review, etc.).
   - Changes made (frontend/backend) and visual verification status.
   - Follow-up tasks or risks discovered.
3. If the branch is ready for review, coordinate PR creation; otherwise, leave clear next-step notes.
