export function Header() {
  return (
    <header className="relative left-1/2 mb-6 -ml-[50vw] w-screen overflow-hidden bg-gradient-to-br from-[#052e2a] via-[#075d50] to-[#0d8a6a] px-4 py-6 text-white shadow-[0_4px_24px_-4px_rgba(0,0,0,0.2)] sm:mb-10 sm:px-8 sm:py-10">
      {/* Subtle pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5a2 2 0 110-4 2 2 0 010 4zm0 54a2 2 0 110-4 2 2 0 010 4zm25-27a2 2 0 110-4 2 2 0 010 4zm-50 0a2 2 0 110-4 2 2 0 010 4z' fill='%23fff'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Glow accents */}
      <div className="pointer-events-none absolute -top-24 right-1/4 h-48 w-96 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-64 rounded-full bg-teal-300/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-[1400px] items-center gap-3 sm:gap-5">
        {/* WhatsApp icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/12 shadow-lg ring-1 shadow-black/10 ring-white/10 backdrop-blur-sm sm:h-13 sm:w-13 sm:rounded-2xl">
          <svg className="h-5 w-5 sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </div>

        <div className="min-w-0">
          <h1 className="font-display text-xl font-extrabold tracking-tight sm:text-[26px]">Template Hub</h1>
          <p className="mt-0.5 text-xs font-medium text-white/60 sm:mt-1 sm:text-[13px]">
            Visualiza y gestiona los templates de WhatsApp Business
          </p>
        </div>
      </div>
    </header>
  );
}
