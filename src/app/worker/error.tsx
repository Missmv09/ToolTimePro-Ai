'use client'

export default function WorkerError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-6">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Something went wrong</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-700 text-sm font-mono break-words">
            {error.message}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            Try again
          </button>
          <a
            href="/auth/login"
            className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl text-center hover:bg-gray-300"
          >
            Go to Login
          </a>
        </div>
      </div>
    </div>
  )
}
