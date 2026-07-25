import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { FileText, X, BadgeCheck, RefreshCw, UploadCloud, Trash2 } from 'lucide-react'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DeleteModal({ doc, isDeleting, onCancel, onConfirm }) {
  const [alsoDeleteFile, setAlsoDeleteFile] = useState(false)

  return (
    <div
      className="fixed inset-0 bg-tw-wave/45 flex items-center justify-center p-4 z-40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-tw-talc rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-tw-wave/10">
          <h3 className="font-serif font-bold text-tw-wave text-base">Delete document</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="text-tw-wave/60 hover:text-tw-pink p-1 rounded transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-tw-onyx">
            Remove <span className="font-semibold break-all">{doc.filename}</span> and delete its
            embeddings from the vector store? This cannot be undone.
          </p>
          <label className="flex items-start gap-2 text-xs text-tw-onyx/70 leading-snug">
            <input
              type="checkbox"
              checked={alsoDeleteFile}
              onChange={(e) => setAlsoDeleteFile(e.target.checked)}
              className="mt-0.5 accent-tw-pink"
            />
            <span>
              Also delete the file from{' '}
              <code className="bg-tw-mist border border-tw-wave/15 rounded px-1 py-0.5">
                sample-docs/
              </code>
            </span>
          </label>
        </div>

        <footer className="flex items-center justify-end gap-2 px-5 py-4 border-t border-tw-wave/10 bg-tw-mist/60">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-tw-wave/20 text-tw-wave hover:bg-tw-mist transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(alsoDeleteFile)}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-tw-pink text-tw-talc hover:bg-tw-pink/90 disabled:opacity-60 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default function LibraryView({
  library,
  libraryLoading,
  libraryError,
  onOpenDoc,
  activeDoc,
  activeDocContent,
  activeDocLoading,
  onCloseDoc,
  onReindex,
  reindexing,
  reindexResult,
  onUpload,
  uploading,
  uploadMessage,
  onDelete,
  deletingFilename,
}) {
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(null)

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    onUpload(e.dataTransfer.files)
  }

  return (
    <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6 pb-safe font-sans bg-tw-mist">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-serif font-bold text-tw-wave mb-1">
            Document Library
          </h2>
          <p className="text-xs md:text-sm text-tw-onyx/70">
            Upload files here or drop them into{' '}
            <code className="bg-tw-talc border border-tw-wave/15 rounded px-1.5 py-0.5">sample-docs/</code>
            , then reindex to pick up anything added manually.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-tw-pink hover:bg-tw-pink/90 disabled:opacity-60 text-tw-talc rounded-lg text-xs font-semibold transition shadow"
          >
            <UploadCloud className={`w-4 h-4 ${uploading ? 'animate-pulse' : ''}`} />
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".md,.pdf,.docx,.txt,.text"
            hidden
            onChange={(e) => {
              onUpload(e.target.files)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            onClick={onReindex}
            disabled={reindexing}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-tw-wave hover:bg-tw-wave/90 disabled:opacity-60 text-tw-talc rounded-lg text-xs font-semibold transition shadow"
          >
            <RefreshCw className={`w-4 h-4 ${reindexing ? 'animate-spin' : ''}`} />
            {reindexing ? 'Reindexing…' : 'Reindex'}
          </button>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
        }}
        className={`flex flex-col items-center justify-center gap-1 text-center py-6 rounded-xl border-2 border-dashed transition cursor-pointer ${
          dragOver
            ? 'border-tw-pink bg-tw-pink/5'
            : 'border-tw-wave/25 bg-tw-talc/60 hover:border-tw-sapphire'
        }`}
      >
        <UploadCloud className="w-5 h-5 text-tw-sapphire mb-1" />
        <strong className="text-sm text-tw-wave">
          {uploading ? 'Indexing…' : 'Drop .md, .pdf, .docx, or .txt files here'}
        </strong>
        <span className="text-xs text-tw-onyx/60">or click to browse</span>
      </div>

      {uploadMessage && (
        <div
          className={`px-3 py-2 rounded-lg text-xs font-sans font-semibold ${
            uploadMessage.error
              ? 'bg-tw-pink/10 border border-tw-pink/40 text-[#9d3145]'
              : 'bg-tw-jade/10 border border-tw-jade/40 text-[#2f5b3a]'
          }`}
        >
          {uploadMessage.text}
        </div>
      )}

      {reindexResult && (
        <div className="px-3 py-2 rounded-lg bg-tw-jade/10 border border-tw-jade/40 text-[#2f5b3a] text-xs font-sans font-semibold">
          Added {reindexResult.added.length}, updated {reindexResult.updated.length}, skipped{' '}
          {reindexResult.skipped.length}
          {reindexResult.failed.length > 0 && `, failed ${reindexResult.failed.length}`}. Now{' '}
          {reindexResult.documents} document(s) indexed.
        </div>
      )}

      {libraryError && (
        <div className="px-3 py-2 rounded-lg bg-tw-pink/10 border border-tw-pink/40 text-[#9d3145] text-xs font-semibold">
          {libraryError}
        </div>
      )}

      {libraryLoading ? (
        <p className="text-sm text-tw-onyx/60">Loading library…</p>
      ) : library.length === 0 ? (
        <p className="text-sm text-tw-onyx/60">No documents available in the library yet.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {library.map((doc) => {
            const isDeleting = deletingFilename === doc.filename

            return (
              <div
                key={doc.filename}
                className="relative p-4 rounded-xl border border-tw-wave/20 bg-tw-talc shadow-sm hover:border-tw-sapphire hover:shadow-md transition group"
              >
                <button
                  type="button"
                  onClick={() => onOpenDoc(doc)}
                  className="text-left w-full"
                >
                  <div className="flex items-center justify-between mb-2 pr-6">
                    <h3 className="font-semibold text-sm text-tw-wave flex items-center gap-2 truncate pr-2">
                      <FileText className="w-4 h-4 text-tw-sapphire shrink-0" />
                      <span className="truncate">{doc.filename}</span>
                    </h3>
                    {doc.indexed && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] bg-tw-jade/10 text-tw-jade px-2 py-0.5 rounded font-bold border border-tw-jade/40">
                        <BadgeCheck className="w-3 h-3" /> Indexed
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-tw-wave/50 group-hover:text-tw-pink transition">
                    {doc.extension.replace('.', '')} · {formatBytes(doc.size_bytes)}
                  </p>
                </button>

                {doc.document_id && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingDelete(doc)
                    }}
                    disabled={isDeleting}
                    aria-label={`Delete ${doc.filename}`}
                    title="Delete document and its embeddings"
                    className="absolute top-3 right-3 p-1.5 rounded text-tw-wave/40 hover:text-tw-pink hover:bg-tw-pink/10 disabled:opacity-60 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {pendingDelete && (
        <DeleteModal
          doc={pendingDelete}
          isDeleting={deletingFilename === pendingDelete.filename}
          onCancel={() => setPendingDelete(null)}
          onConfirm={(alsoDeleteFile) => {
            onDelete(pendingDelete, alsoDeleteFile)
            setPendingDelete(null)
          }}
        />
      )}

      {activeDoc && (
        <div
          className="fixed inset-0 bg-tw-wave/45 flex items-center justify-center p-4 md:p-6 z-30"
          onClick={onCloseDoc}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] bg-tw-talc rounded-xl shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-tw-wave/10">
              <h3 className="font-serif font-bold text-tw-wave text-base md:text-lg truncate pr-3">
                {activeDoc.filename}
              </h3>
              <button
                onClick={onCloseDoc}
                aria-label="Close"
                className="text-tw-wave/60 hover:text-tw-pink p-1 rounded transition shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </header>
            <div className="p-4 md:p-5 overflow-y-auto text-sm text-tw-onyx leading-relaxed font-sans">
              {activeDocLoading ? (
                <p>Loading…</p>
              ) : activeDoc.extension === '.md' ? (
                <div className="markdown-body">
                  <ReactMarkdown>{activeDocContent}</ReactMarkdown>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-words font-sans bg-tw-mist p-3 rounded-lg border border-tw-wave/10">
                  {activeDocContent}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
