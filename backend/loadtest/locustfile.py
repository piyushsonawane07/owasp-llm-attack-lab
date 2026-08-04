"""Load test for the /api/query (chat) endpoint only.

Simulates users scanning the demo's QR code and asking questions: each
simulated user waits a bit (like someone reading the answer/typing a new
question) between requests, then fires another query.

Usage (from backend/):
    uv run locust -f loadtest/locustfile.py --host http://localhost:8088

Then open http://localhost:8089, set:
    - Number of users: 150
    - Ramp up: e.g. 5-10 users/sec (150 people don't all hit "send" in the
      same millisecond; a burst ramp is more realistic than an instant spike)

Since Ollama generation is effectively serialized on the backend, expect
response times to climb steeply as concurrent users increase -- that's the
queueing behavior this test is meant to surface, not a bug in the test.

Env vars:
    LOAD_TEST_PROVIDER=ollama       (default: ollama)
    LOAD_TEST_GUARDRAILS=false      (default: false; set "true" to include
                                     the guardrail input/output LLM checks)
    LOAD_TEST_MIN_WAIT=1            seconds, min think-time between queries
    LOAD_TEST_MAX_WAIT=5            seconds, max think-time between queries
"""

from __future__ import annotations

import os
import random

from locust import HttpUser, between, task

QUESTIONS = [
    "What is the company's remote work policy?",
    "How many vacation days do new employees get?",
    "What is the onboarding process for new hires?",
    "Summarize the product FAQ in a few sentences.",
    "What should I do if a plugin fails to load?",
    "Who do I contact for IT support issues?",
    "What are the steps to request expense reimbursement?",
    "Is there a dress code policy?",
    "What benefits are available to full-time employees?",
    "How do I reset my company account password?",
]

PROVIDER = os.getenv("LOAD_TEST_PROVIDER", "ollama")
GUARDRAILS_ENABLED = os.getenv("LOAD_TEST_GUARDRAILS", "false").lower() == "true"
MIN_WAIT = float(os.getenv("LOAD_TEST_MIN_WAIT", "1"))
MAX_WAIT = float(os.getenv("LOAD_TEST_MAX_WAIT", "5"))


NGROK_HEADERS = {"ngrok-skip-browser-warning": "1"}


class ChatUser(HttpUser):
    """One simulated attendee asking questions against the RAG chatbot."""

    wait_time = between(MIN_WAIT, MAX_WAIT)

    @task
    def query(self) -> None:
        question = random.choice(QUESTIONS)
        with self.client.post(
            "/api/query",
            json={
                "question": question,
                "provider": PROVIDER,
                "guardrails_enabled": GUARDRAILS_ENABLED,
            },
            headers=NGROK_HEADERS,
            # Generation can legitimately take a long time under load;
            # don't let the client itself time out before the server does.
            timeout=180,
            catch_response=True,
        ) as response:
            if response.status_code != 200:
                response.failure(f"HTTP {response.status_code}: {response.text[:200]}")
                return
            data = response.json()
            if not data.get("answer"):
                response.failure("Response had no answer")
