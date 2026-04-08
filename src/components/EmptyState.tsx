export function EmptyState() {
  return (
    <div className="py-20 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-3xl">
        📭
      </div>
      <p className="text-lg font-medium text-gray-900">
        No se encontraron templates
      </p>
      <p className="mt-1 text-sm text-gray-500">
        Prueba a cambiar los filtros o el texto de busqueda
      </p>
    </div>
  );
}
