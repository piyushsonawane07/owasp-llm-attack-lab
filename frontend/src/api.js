const API_BASE = import.meta.env.VITE_API_BASE || ''

// Plain fetch() never times out on its own. Under audience load, a slow or
// momentarily-overloaded backend would otherwise hang a request
// indefinitely instead of failing fast enough for the caller to retry.
const DEFAULT_TIMEOUT_MS = 20_000

async function request(path, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...fetchOptions.headers,
      },
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000}s.`)
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
  let data = null
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    data = await response.json()
  } else {
    data = await response.text()
  }

  if (!response.ok) {
    const detail =
      typeof data === 'object' && data?.detail
        ? typeof data.detail === 'string'
          ? data.detail
          : JSON.stringify(data.detail)
        : `Request failed (${response.status})`
    throw new Error(detail)
  }

  return data
}

export function getHealth() {
  return request('/api/health')
}

// Lightweight endpoints polled once at bootstrap: fail fast so App.jsx's
// retry-with-backoff loop can cycle through several attempts quickly under
// load, rather than waiting out the full default timeout on each try.
const BOOTSTRAP_TIMEOUT_MS = 8_000

export function getModels() {
  return request('/api/models', { timeoutMs: BOOTSTRAP_TIMEOUT_MS })
}

export function getDocuments() {
  return request('/api/documents', { timeoutMs: BOOTSTRAP_TIMEOUT_MS })
}

export function getLibrary() {
  return request('/api/library')
}

export function getLibraryDoc(filename) {
  return request(`/api/library/${encodeURIComponent(filename)}`)
}

export function reindexLibrary(force = false) {
  return request(`/api/library/reindex?force=${force}`, { method: 'POST' })
}

export function uploadDocument(file) {
  const form = new FormData()
  form.append('file', file)
  return request('/api/upload', { method: 'POST', body: form })
}

export function deleteDocument(id, deleteFile = false) {
  return request(`/api/documents/${id}?delete_file=${deleteFile}`, { method: 'DELETE' })
}

// LLM generation can legitimately take a while, especially under load where
// Ollama serializes requests -- give it much more room than the default
// timeout (matches the backend's own 180s Ollama client timeout).
const QUERY_TIMEOUT_MS = 180_000

export function queryRag({ question, provider, model, guardrails_enabled }) {
  return request('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, provider, model, guardrails_enabled }),
    timeoutMs: QUERY_TIMEOUT_MS,
  })
}

// Excessive Agency (LLM06) demo: no document retrieval — the model is handed
// a destructive tool schema via the system prompt alone.
export function agentQuery({ question, provider, model, guardrails_enabled }) {
  return request('/api/agent-query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, provider, model, guardrails_enabled }),
    timeoutMs: QUERY_TIMEOUT_MS,
  })
}
