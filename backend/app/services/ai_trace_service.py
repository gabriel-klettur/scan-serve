from __future__ import annotations

import time
import uuid
from pathlib import Path
from typing import Optional

from app.models.ai_receipt import AiReceiptParseResponse
from app.models.ai_trace import AiReceiptRevision, AiReceiptRun
from app.repositories.json_db import JsonDb


class AiTraceService:
    def __init__(self, *, db: JsonDb, runs_dir: Path) -> None:
        self._db = db
        self._runs_dir = runs_dir

    @staticmethod
    def _now_ms() -> int:
        return int(time.time() * 1000)

    def start_run(self, *, receipt_id: str, agents: Optional[dict[str, str]] = None) -> AiReceiptRun:
        now = self._now_ms()
        run = AiReceiptRun(
            id=uuid.uuid4().hex,
            receiptId=receipt_id,
            createdAt=now,
            updatedAt=now,
            status="processing",
            agents=agents or {},
            error=None,
            elapsedMs=None,
        )

        def mutate(data):
            data.setdefault("aiRuns", []).append(run.model_dump())
            return data

        self._db.mutate(mutate)
        return run

    def update_run_agents(self, *, run_id: str, receipt_id: str, agents: dict[str, str]) -> None:
        def mutate(data):
            runs = data.get("aiRuns", [])
            for i, r in enumerate(runs):
                if r.get("id") == run_id and r.get("receiptId") == receipt_id:
                    runs[i] = {**r, "agents": agents, "updatedAt": self._now_ms()}
                    data["aiRuns"] = runs
                    return data
            return data

        self._db.mutate(mutate)

    def add_revision(
        self,
        *,
        receipt_id: str,
        run_id: str,
        stage: str,
        agent_label: Optional[str],
        model: Optional[str],
        result: AiReceiptParseResponse,
    ) -> AiReceiptRevision:
        now = self._now_ms()
        rev_id = uuid.uuid4().hex

        markdown_path: Optional[str] = None
        md = (result.markdown or "").strip()
        if md:
            run_dir = self._runs_dir / "ai_runs" / receipt_id / run_id
            run_dir.mkdir(parents=True, exist_ok=True)
            file_name = f"{now}_{stage}.md"
            out_path = run_dir / file_name
            out_path.write_text(md + "\n", encoding="utf-8")
            markdown_path = str(out_path)

        rev = AiReceiptRevision(
            id=rev_id,
            runId=run_id,
            receiptId=receipt_id,
            stage=stage,
            createdAt=now,
            agentLabel=agent_label,
            model=model,
            fields=result.fields,
            text_clean=result.text_clean,
            markdown=result.markdown,
            markdownPath=markdown_path,
            data=result.data,
        )

        def mutate(data):
            data.setdefault("aiRevisions", []).append(rev.model_dump())
            runs = data.get("aiRuns", [])
            for i, r in enumerate(runs):
                if r.get("id") == run_id and r.get("receiptId") == receipt_id:
                    runs[i] = {**r, "updatedAt": self._now_ms()}
                    data["aiRuns"] = runs
                    break
            return data

        self._db.mutate(mutate)
        return rev

    def finish_run(
        self,
        *,
        receipt_id: str,
        run_id: str,
        status: str,
        error: Optional[str],
        elapsed_ms: Optional[int],
    ) -> None:
        def mutate(data):
            runs = data.get("aiRuns", [])
            for i, r in enumerate(runs):
                if r.get("id") == run_id and r.get("receiptId") == receipt_id:
                    runs[i] = {
                        **r,
                        "status": status,
                        "error": error,
                        "elapsedMs": elapsed_ms,
                        "updatedAt": self._now_ms(),
                    }
                    data["aiRuns"] = runs
                    return data
            return data

        self._db.mutate(mutate)

    def list_runs(self, *, receipt_id: str) -> list[AiReceiptRun]:
        data = self._db.read()
        runs = [AiReceiptRun(**r) for r in data.get("aiRuns", []) if r.get("receiptId") == receipt_id]
        runs.sort(key=lambda r: r.createdAt, reverse=True)
        return runs

    def list_revisions(self, *, receipt_id: str, run_id: str) -> list[AiReceiptRevision]:
        data = self._db.read()
        revs = [
            AiReceiptRevision(**r)
            for r in data.get("aiRevisions", [])
            if r.get("receiptId") == receipt_id and r.get("runId") == run_id
        ]
        revs.sort(key=lambda r: r.createdAt)
        return revs

    def get_revision(self, *, receipt_id: str, revision_id: str) -> AiReceiptRevision:
        data = self._db.read()
        rec = next(
            (r for r in data.get("aiRevisions", []) if r.get("id") == revision_id and r.get("receiptId") == receipt_id),
            None,
        )
        if not rec:
            raise KeyError("Revision not found")
        return AiReceiptRevision(**rec)
