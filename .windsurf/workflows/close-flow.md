---
description: Document PR lifecycle from readiness check through merge for ScanServe
---

> **⚡ AI Credits Rule**: Batch file reads in parallel. Minimize tool calls. Do not re-read files already seen in this conversation.

# /close-flow — Pull Request & Merge Protocol

Use this workflow whenever a branch is ready to close the loop: fully document the pull request, guide it through review, and merge with confidence.

## 1. Confirm Readiness
1. Ensure working tree is clean and branch is pushed:
   ```powershell
   git status -sb
   git push -u origin <current-branch>
   ```
2. Run frontend lint to catch any issues:
   ```powershell
   cd frontend
   npm run lint
   ```
3. Build the frontend to verify no build errors:
   ```powershell
   cd frontend
   npm run build
   ```
4. Verify backend starts without errors:
   ```powershell
   cd backend
   python -c "from app.main import app; print('OK')"
   ```
5. Perform a final self-review: frontend components, backend endpoints, Pydantic models, styling consistency, and responsive behavior.

## 2. Draft the Pull Request
1. Open a PR from `<current-branch>` into the canonical target (e.g., `main`).
2. Fill out the PR description with:
   - **Summary**: What changed and why.
   - **Scope**: Frontend, backend, or both.
   - **Implementation Notes**: Component/service changes, new endpoints, new dependencies.
   - **Screenshots/Recordings**: Before/after for UI changes (desktop + mobile).
   - **API Changes**: New or modified endpoints, request/response schema changes.
   - **Follow-up Tasks**: Any remaining work or improvements.
3. Link related issues if any.

## 3. Review Cycle Management
1. Respond to reviewer comments promptly.
2. For code updates:
   - Apply scoped fixes.
   - Re-run lint and build (frontend), verify import (backend).
   - Push changes and update the PR description if scope shifts.
3. Keep the branch up to date:
   ```powershell
   git fetch origin
   git rebase origin/main   # or merge based on preference
   git push --force-with-lease
   ```

## 4. Pre-Merge Gate
1. Verify both frontend and backend run correctly together (ports 8080 + 8000).
2. Test key flows: upload image → OCR → AI parse → view results.
3. Perform a final diff inspection for unintended files, secrets, or `.env` leaks.

## 5. Merge & Post-Merge Tasks
1. Merge using squash merge for clean history.
2. Clean up branches:
   ```powershell
   git checkout main
   git pull --ff-only origin main
   git branch -d <current-branch>
   git push origin --delete <current-branch>
   ```
3. Verify both frontend and backend run correctly on the merged `main` branch.
4. Record a brief session summary with:
   - PR number and merge status.
   - Changes deployed (frontend/backend).
   - Any follow-up items.
