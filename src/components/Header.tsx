export function Header() {
  return (
    <header className="relative left-1/2 -ml-[50vw] mb-6 w-screen bg-gradient-to-br from-[#075e54] to-[#128c7e] px-8 py-7 text-white shadow-md">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xl font-bold">
          W
        </div>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">
            WhatsApp Template Hub
          </h1>
          <p className="mt-0.5 text-[13px] opacity-85">
            Visualiza y gestiona los templates de WhatsApp Business
          </p>
        </div>
      </div>
    </header>
  );
}
