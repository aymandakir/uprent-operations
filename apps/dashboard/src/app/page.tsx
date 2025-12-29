import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8 text-white">Uprent Operations</h1>
        <p className="text-xl mb-8 text-gray-300">Production-grade monitoring system for rental platform scrapers</p>
        <div className="flex gap-4">
          <Link
            href="/monitoring"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Monitoring Dashboard
          </Link>
          <Link
            href="/ops"
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors border border-gray-600"
          >
            Ops Dashboard
          </Link>
          <Link
            href="/gap"
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            HuurScout Gap Report
          </Link>
        </div>
      </div>
    </main>
  );
}

