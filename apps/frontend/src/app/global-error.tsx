'use client'; // Error boundaries must be Client Components

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 font-sans">
          <h1 className="text-4xl font-bold text-red-600 mb-4">
            Something went wrong!
          </h1>
          <p className="text-gray-600 mb-8">A global error occurred.</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-blue-500 text-white border-none rounded-md cursor-pointer hover:bg-blue-600 transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
