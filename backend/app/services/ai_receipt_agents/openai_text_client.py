from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Optional

from openai import OpenAI


@dataclass(frozen=True)
class OpenAiRunResult:
    text: str
    raw: Any


class OpenAiTextClient:
    def __init__(self, client: OpenAI) -> None:
        self._client = client

    def run(self, *, model: str, messages: list[dict[str, str]]) -> OpenAiRunResult:
        if hasattr(self._client, "responses"):
            response = self._client.responses.create(
                model=model,
                input=messages,
            )
            text_out = getattr(response, "output_text", None)
            if not isinstance(text_out, str) or not text_out.strip():
                text_out = json.dumps(getattr(response, "output", None), ensure_ascii=False)
            return OpenAiRunResult(text=text_out or "", raw=response)

        completion = self._client.chat.completions.create(
            model=model,
            messages=messages,
        )
        msg = completion.choices[0].message
        return OpenAiRunResult(text=(msg.content or ""), raw=completion)


def ensure_openai_client(api_key: str) -> Optional[OpenAI]:
    return OpenAI(api_key=api_key) if api_key else None
