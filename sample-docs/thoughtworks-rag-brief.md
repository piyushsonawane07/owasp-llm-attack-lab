# RAG Demo Brief

## Purpose

This document is a sample knowledge base for demonstrating Retrieval-Augmented Generation (RAG). Upload it to the demo app, then ask questions about the content below.

## What is RAG?

RAG combines two steps:

1. **Retrieval** — find the most relevant passages from your documents.
2. **Generation** — send those passages to a language model so it can answer with grounded context.

This reduces hallucinations when answers must come from a specific set of files.

## How this demo works

- Supported uploads: Markdown, PDF, DOCX, and plain text.
- Text is split into overlapping chunks of about 500 characters.
- Chunks are embedded with a small local model: `all-MiniLM-L6-v2`.
- At query time, the top matching chunks are retrieved using cosine similarity.
- The selected model (Gemini or Ollama) writes the final answer from that context.

## Demo talking points

- Show the upload panel and confirm chunk counts appear.
- Ask a question that is answered only in the uploaded file.
- Expand the Sources panel to show which chunks were used.
- Switch between Gemini and Ollama to compare latency and style.

## Sample facts for questions

- Project codename: **Harbor Light**
- Pilot start date: **12 March 2026**
- Primary risk: **stale documents** if the knowledge base is not refreshed after major policy changes
- Success metric: **80% of audience questions answered from retrieved sources within 10 seconds**
- Recommended chunk overlap: **50 characters** for short briefing notes

## Recommended audience prompts

1. What is the project codename?
2. When does the pilot start?
3. What is the primary risk called out in the brief?
4. How does this demo perform retrieval?
5. What success metric should facilitators track?
