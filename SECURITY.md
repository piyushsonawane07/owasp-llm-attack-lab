# Security Policy

## About the "vulnerabilities" in this repo

This project is an intentional **OWASP Top 10 for LLM Applications** demo. Files under `sample-docs/` and the prompts in `frontend/src/constants.js` deliberately contain planted, **fake** vulnerabilities — synthetic credentials, fake API keys, and synthetic PII — used to illustrate risks like prompt injection, sensitive information disclosure, and excessive agency. These are not real secrets, and reporting them is not necessary.

## Reporting a real vulnerability

If you find an actual security issue in the application itself (e.g. an auth bypass, injection vulnerability, or dependency CVE that isn't part of the intended demo), please report it privately rather than opening a public issue:

- Open a [GitHub Security Advisory](../../security/advisories/new) for this repository, or
- Contact the maintainer directly via the email on their GitHub profile.

Please include:

- A description of the issue and its impact
- Steps to reproduce
- Any relevant logs or screenshots

We'll acknowledge reports as soon as possible and follow up with a fix or mitigation timeline.

## Supported versions

This is a demo project without formal release branches. Security fixes are applied to the `main` branch only.
