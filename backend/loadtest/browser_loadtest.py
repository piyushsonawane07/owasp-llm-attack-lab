"""Browser-driven load test for the actual frontend UI.

locustfile.py only hits POST /api/query directly -- it never loads the page,
runs the React bundle, or issues a real browser fetch(). This script drives
real (headless) Chromium tabs through the actual chat UI instead: navigate to
the app, type a question, click Send, wait for the rendered answer. That
exercises the full path a real attendee's phone takes: static asset loading
(JS/CSS bundle), the Vite dev server (or your production static host), the
ngrok tunnel if you're using one, and only then the backend API.

Setup (from backend/):
    uv add --dev playwright
    uv run playwright install chromium

Usage:
    uv run python loadtest/browser_loadtest.py --url http://localhost:5173 --users 20 --ramp 4

    # To actually watch the browsers work (real windows, slowed down):
    uv run python loadtest/browser_loadtest.py --url http://localhost:5173 --users 3 --headed --slow-mo 250

Point --url at whatever the audience actually hits (ngrok URL, your LAN IP,
etc.) to include real network latency in the results.

Notes:
- Each "user" here is a real headless browser tab -- far heavier on your
  machine than the API-only Locust test. 20-50 concurrent browsers is
  realistic for a laptop; this is NOT how you'd simulate all 150 audience
  phones (use locustfile.py at that scale; this script is for verifying the
  UI itself holds up, not for raw backend throughput).
- If you're serving the frontend with `npm run dev` (Vite dev server), that
  server is single-process and not built for concurrency -- expect it to be
  the bottleneck here, not the FastAPI backend. For a real event, build the
  frontend (`npm run build`) and serve the static output instead.
"""

from __future__ import annotations

import argparse
import asyncio
import random
import statistics
import time

from playwright.async_api import async_playwright

SAMPLE_QUESTIONS = [
    "How many days of casual leave and sick leave do employees get per year?",
    "What mandatory trainings do new hires need to complete?",
    "What is CloudSync used for?",
]


class Result:
    __slots__ = ("user_id", "page_load_s", "query_s", "ok", "error")

    def __init__(self, user_id: int):
        self.user_id = user_id
        self.page_load_s: float | None = None
        self.query_s: float | None = None
        self.ok = False
        self.error: str | None = None


async def run_user(
    browser, user_id: int, url: str, iterations: int, min_wait: float, max_wait: float
) -> list[Result]:
    results: list[Result] = []
    context = await browser.new_context()
    page = await context.new_page()

    try:
        t0 = time.monotonic()
        await page.goto(url, wait_until="domcontentloaded", timeout=60_000)
        await page.wait_for_selector('input[type="text"]', timeout=60_000)
        # The chat input renders immediately, but it's only truly usable once
        # the app's bootstrap fetch (/api/models, /api/documents) resolves --
        # clicking Send before that fails with "Model is not available yet."
        # networkidle waits out that bootstrap call before we interact, the
        # same way a real (patient) user's click would land after it.
        await page.wait_for_load_state("networkidle", timeout=60_000)
        page_load_s = time.monotonic() - t0

        for i in range(iterations):
            result = Result(user_id)
            result.page_load_s = page_load_s if i == 0 else None
            try:
                question = random.choice(SAMPLE_QUESTIONS)
                # The app retries its own bootstrap (/api/models, /api/documents)
                # with backoff before enabling the input, so under a heavy
                # synthetic spike (many users launching in the same instant)
                # that can legitimately take longer than Playwright's 30s
                # default action timeout.
                await page.fill('input[type="text"]', question, timeout=45_000)

                t1 = time.monotonic()
                async with page.expect_response(
                    lambda r: "/api/query" in r.url, timeout=180_000
                ) as response_info:
                    await page.click('form button[type="submit"]')
                response = await response_info.value
                result.query_s = time.monotonic() - t1
                result.ok = response.ok
                if not response.ok:
                    result.error = f"HTTP {response.status}"
            except Exception as exc:  # noqa: BLE001 - report and keep going
                result.error = f"{type(exc).__name__}: {exc}"
            results.append(result)

            await asyncio.sleep(random.uniform(min_wait, max_wait))
    except Exception as exc:  # noqa: BLE001
        failed = Result(user_id)
        failed.error = f"setup failed: {type(exc).__name__}: {exc}"
        results.append(failed)
    finally:
        await context.close()

    return results


def summarize(all_results: list[Result]) -> None:
    page_loads = [r.page_load_s for r in all_results if r.page_load_s is not None]
    queries = [r.query_s for r in all_results if r.query_s is not None]
    failures = [r for r in all_results if not r.ok]

    def stats(label: str, values: list[float]) -> None:
        if not values:
            print(f"  {label}: no samples")
            return
        values = sorted(values)
        p50 = statistics.median(values)
        p95 = values[min(len(values) - 1, int(len(values) * 0.95))]
        print(
            f"  {label}: n={len(values)} min={min(values):.2f}s "
            f"p50={p50:.2f}s p95={p95:.2f}s max={max(values):.2f}s"
        )

    print("\n=== Browser load test summary ===")
    stats("Page load (first paint of chat input)", page_loads)
    stats("Query round-trip (click Send -> answer received)", queries)
    print(f"  Failures: {len(failures)} / {len(all_results)}")
    for f in failures[:10]:
        print(f"    user {f.user_id}: {f.error}")


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default="http://localhost:5173", help="Frontend URL to load")
    parser.add_argument("--users", type=int, default=20, help="Concurrent simulated browser users")
    parser.add_argument("--ramp", type=float, default=4, help="Users started per second")
    parser.add_argument("--iterations", type=int, default=3, help="Questions asked per user")
    parser.add_argument("--min-wait", type=float, default=1.0, help="Min think-time between questions (s)")
    parser.add_argument("--max-wait", type=float, default=4.0, help="Max think-time between questions (s)")
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Show real browser windows instead of running headless. Each "
        "user opens its own visible window, so keep --users small (e.g. "
        "1-5) or your screen will be flooded.",
    )
    parser.add_argument(
        "--slow-mo",
        type=float,
        default=0,
        help="Milliseconds to slow down each Playwright action by, so you can "
        "actually watch what's happening in --headed mode (e.g. 250).",
    )
    args = parser.parse_args()

    if args.headed and args.users > 8:
        print(
            f"Warning: --headed with --users {args.users} will open {args.users} "
            "visible browser windows. Consider a smaller --users for --headed runs."
        )

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=not args.headed, slow_mo=args.slow_mo)
        tasks = []
        for i in range(args.users):
            tasks.append(
                asyncio.create_task(
                    run_user(browser, i, args.url, args.iterations, args.min_wait, args.max_wait)
                )
            )
            if args.ramp > 0:
                await asyncio.sleep(1 / args.ramp)

        nested_results = await asyncio.gather(*tasks)
        await browser.close()

    all_results = [r for user_results in nested_results for r in user_results]
    summarize(all_results)


if __name__ == "__main__":
    asyncio.run(main())
