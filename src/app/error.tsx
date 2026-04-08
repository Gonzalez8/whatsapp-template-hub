"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl">
        ⚠️
      </div>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Algo salio mal
      </h2>
      <p className="mb-6 max-w-md text-sm text-gray-500">
        {error.message || "Error inesperado al cargar los templates"}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
      >
        Reintentar
      </button>
    </div>
  );
}
