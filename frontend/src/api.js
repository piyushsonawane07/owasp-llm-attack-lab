const API_BASE = import.meta.env.VITE_API_BASE || ''

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, options)
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

export function getModels() {
  return request('/api/models')
}

export function getDocuments() {
  return request('/api/documents')
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

export function queryRag({ question, provider, model }) {
  return request('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, provider, model }),
  })
}
