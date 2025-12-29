'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { AlertTriangle, CheckCircle, RefreshCw, Download, Copy } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003';

interface Platform {
  id: string;
  name: string;
  platformType: string | null;
  expectedMinListings: number;
  status: string;
  lastScrape: {
    startedAt: string;
    success: boolean;
    listingsFound: number;
    error: string | null;
  } | null;
  totalListings: number;
}

interface Summary {
  totalPlatforms: number;
  failingPlatforms: number;
  avgListingsLast24h: number;
}

interface GapReport {
  totalNewListings24h: number;
  gapListings24h: number;
  gapPercentage: number;
  topGapPlatforms: Array<{ platformType: string; count: number }>;
  sampleGapListings: Array<{
    id: string;
    title: string | null;
    price: number | null;
    url: string;
    city: string | null;
    platformType: string | null;
  }>;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function OpsPage() {
  const { data: platformsData, error: platformsError, mutate: refreshPlatforms } = useSWR(
    `${API_URL}/api/platforms/overview`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const { data: gapData, error: gapError } = useSWR(
    `${API_URL}/api/reports/huurscout-gap?hours=24`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const platforms: Platform[] = platformsData?.platforms || [];
  const summary: Summary = {
    totalPlatforms: platformsData?.summary?.totalPlatforms || 0,
    failingPlatforms: platformsData?.summary?.failingPlatforms || 0,
    avgListingsLast24h: platformsData?.summary?.avgListingsLast24h || 0,
  };
  const gapReport: GapReport | null = gapData || null;

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedUrl(id);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const exportCSV = () => {
    const csv = [
      ['Platform', 'Type', 'Status', 'Last Scrape', 'Success', 'Listings Found', 'Total Listings'],
      ...platforms.map((p) => [
        p.name,
        p.platformType || 'N/A',
        p.status,
        p.lastScrape?.startedAt || 'Never',
        p.lastScrape?.success ? 'Yes' : 'No',
        p.lastScrape?.listingsFound || 0,
        p.totalListings,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `platforms-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (platformsError) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800 border border-red-600 rounded-lg p-4">
            <p className="text-white">Error loading data: {platformsError.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white">UPRENT OPS</h1>
            <p className="text-gray-300">Total: {summary.totalPlatforms} platforms</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refreshPlatforms()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-2 transition-colors border border-gray-600"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="text-sm text-gray-300 mb-1">Active Platforms</div>
            <div className="text-3xl font-bold text-white">{summary.totalPlatforms}</div>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="text-sm text-gray-300 mb-1">Failing</div>
            <div className="text-3xl font-bold text-red-500">{summary.failingPlatforms}</div>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="text-sm text-gray-300 mb-1">Avg Listings (24h)</div>
            <div className="text-3xl font-bold text-white">{(summary.avgListingsLast24h || 0).toFixed(1)}</div>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <div className="text-sm text-gray-300 mb-1">Success Rate</div>
            <div className="text-3xl font-bold text-green-500">
              {summary.totalPlatforms > 0
                ? Math.round(((summary.totalPlatforms - summary.failingPlatforms) / summary.totalPlatforms) * 100)
                : 0}
              %
            </div>
          </div>
        </div>

        {/* HuurScout Gap Report */}
        {gapReport && (
          <div className="bg-gray-800 border border-yellow-600 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              HUURSCOUT GAP REPORT (Last 24h)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-300">New listings total</div>
                <div className="text-2xl font-bold text-white">{gapReport.totalNewListings24h}</div>
              </div>
              <div>
                <div className="text-sm text-gray-300">Gap listings</div>
                <div className="text-2xl font-bold text-red-500">
                  {gapReport.gapListings24h} ({Number(gapReport.gapPercentage || 0).toFixed(1)}%)
                </div>
              </div>
            </div>
            <div className="mb-4">
              <div className="text-sm font-semibold mb-2 text-white">Top gap sources:</div>
              <div className="flex flex-wrap gap-2">
                {gapReport.topGapPlatforms.slice(0, 5).map((platform) => (
                  <span key={platform.platformType} className="bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600">
                    {platform.platformType}: {platform.count}
                  </span>
                ))}
              </div>
            </div>
            {gapReport.sampleGapListings.length > 0 && (
              <div>
                <div className="text-sm font-semibold mb-2 text-white">Sample missed listings:</div>
                <div className="space-y-2">
                  {gapReport.sampleGapListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="bg-gray-700 border border-gray-600 p-3 rounded flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-white">{listing.title || 'Untitled'}</div>
                        <div className="text-sm text-gray-300">
                          {listing.city && `${listing.city} • `}
                          {listing.platformType && `[${listing.platformType}]`}
                          {listing.price && ` • €${listing.price}`}
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(listing.url, listing.id)}
                        className="ml-4 px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded flex items-center gap-1 text-sm transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                        {copiedUrl === listing.id ? 'Copied!' : 'Copy URL'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Platform Table */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">Platform Table</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Last Scrape
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Listings
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {platforms.map((platform) => {
                  const isHealthy =
                    platform.status === 'active' &&
                    platform.lastScrape?.success &&
                    (platform.lastScrape.listingsFound >= platform.expectedMinListings ||
                      platform.lastScrape.listingsFound > 0);

                  const lastScrapeTime = platform.lastScrape?.startedAt
                    ? new Date(platform.lastScrape.startedAt)
                    : null;
                  const timeAgo = lastScrapeTime
                    ? Math.floor((Date.now() - lastScrapeTime.getTime()) / 60000)
                    : null;

                  return (
                    <tr key={platform.id} className="hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{platform.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {platform.platformType || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {timeAgo !== null
                          ? `${timeAgo}min ago`
                          : platform.lastScrape
                          ? new Date(platform.lastScrape.startedAt).toLocaleString()
                          : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {platform.lastScrape?.listingsFound ?? 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {platform.totalListings}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isHealthy ? (
                          <span className="inline-flex items-center gap-1 text-green-500">
                            <CheckCircle className="w-4 h-4" />
                            🟢
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-500">
                            <AlertTriangle className="w-4 h-4" />
                            🔴
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

