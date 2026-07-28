export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">nj-worktrace</h1>
        <h2 className="text-xl text-gray-600 mb-6">Technical foundation</h2>
        <p className="mb-4 text-gray-700">
          Aplicación personal multiespacio para trazabilidad de trabajo y
          colaboración controlada con clientes.
        </p>
        <p className="mb-6 text-gray-600">
          El dominio todavía no está implementado. Esta es la cimentación
          ejecutable: Next.js, TypeScript estricto, estructura modular y
          health check.
        </p>
        <div className="border rounded p-4 bg-gray-50">
          <p className="text-sm font-mono">
            Health check:{' '}
            <a
              href="/api/health"
              className="text-blue-600 underline hover:text-blue-800"
            >
              /api/health
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
