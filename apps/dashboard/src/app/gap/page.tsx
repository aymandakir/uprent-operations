'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Download, RefreshCw, Filter } from 'lucide-react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface GapData {
  platformId: string;
  platformName: string;
  platformType: string;
  city: string;
  expected: number;
  actual: number;
  gap: number;
  gapPercent: number;
  coverage: number;
  lastScrape: string | null;
  success: boolean;
}

interface GapResponse {
  summary: {
    totalExpected: number;
    totalActual: number;
    totalGap: number;
    totalGapPercent: number;
    coverageScore: number;
    newListings24h: number;
    gapListings24h: number;
  };
  topGaps: GapData[];
  allGaps: GapData[];
  trendData: Array<{
    date: string;
    expected: number;
    actual: number;
    gap: number;
    gapPercent: number;
  }>;
  competitorAnalysis?: Array<{
    city: string;
    realListings: number;
    platforms: {
      pararius: number;
      funda: number;
    };
    uprentCoverage: number;
    uprentPercent: number;
    huurscoutCoverage: number;
    huurscoutPercent: number;
    uprentAdvantage: boolean;
    status: 'DOMINATE' | 'PRICE_WAR' | 'BEHIND';
    gap: number;
    gapPercent: number;
  }>;
  filters: {
    city: string;
    platformType: string;
    hours: number;
  };
}

export default function GapReportPage() {
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [platformTypeFilter, setPlatformTypeFilter] = useState<string>('all');

  const apiUrl = `/api/gaps?city=${cityFilter !== 'all' ? cityFilter : ''}&platformType=${platformTypeFilter !== 'all' ? platformTypeFilter : ''}&hours=24`;

  const { data, error, mutate } = useSWR<GapResponse>(
    apiUrl,
    fetcher,
    { refreshInterval: 300000 } // 5 minutes
  );

  const exportCSV = () => {
    if (!data || !data.allGaps) return;

    const csv = [
      ['Platform', 'City', 'Type', 'Expected', 'Actual', 'Gap', 'Gap %', 'Coverage %'],
      ...(data.allGaps || []).map((g) => [
        g.platformName,
        g.city,
        g.platformType,
        g.expected,
        g.actual,
        g.gap,
        g.gapPercent.toFixed(1),
        g.coverage.toFixed(1),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `huurscout-gap-report-${new Date().toISOString()}.csv`;
    a.click();
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800 border border-red-600 rounded-lg p-4">
            <p className="text-white">Error loading gap data: {error.message}</p>
            <p className="text-gray-400 text-sm mt-2">Check browser console for details</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 p-8 flex items-center justify-center">
        <div className="text-white text-xl">Loading gap report...</div>
      </div>
    );
  }

  // Handle case where API returns error
  if ('error' in data) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800 border border-red-600 rounded-lg p-4">
            <p className="text-white">API Error: {(data as any).error}</p>
            <p className="text-gray-400 text-sm mt-2">Make sure Supabase credentials are configured</p>
          </div>
        </div>
      </div>
    );
  }

  const summary = data.summary || {
    totalExpected: 0,
    totalActual: 0,
    totalGap: 0,
    totalGapPercent: 0,
    coverageScore: 0,
    newListings24h: 0,
    gapListings24h: 0,
  };

  const topGaps = data.topGaps || [];
  const allGaps = data.allGaps || [];
  const trendData = data.trendData || [];
  const competitorAnalysis = data.competitorAnalysis || [];

  const hasHighGaps = summary.totalGapPercent > 20;
  
  // Calculate overall competitor stats
  const totalUprent = competitorAnalysis.reduce((sum, c) => sum + c.uprentCoverage, 0);
  const totalHuurscout = competitorAnalysis.reduce((sum, c) => sum + c.huurscoutCoverage, 0);
  const citiesWinning = competitorAnalysis.filter(c => c.uprentAdvantage).length;
  const citiesBehind = competitorAnalysis.filter(c => !c.uprentAdvantage && c.status !== 'PRICE_WAR').length;

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">HUURSCOUT GAP REPORT</h1>
            <p className="text-gray-300">Last 24 hours • Auto-refresh every 5min</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => mutate()}
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

        {/* Alert for high gaps */}
        {hasHighGaps && (
          <div className="mb-6 bg-yellow-900 border-2 border-yellow-500 rounded-lg p-4 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <div>
              <div className="text-yellow-500 font-bold text-lg">🚨 OPPORTUNITY!</div>
              <div className="text-yellow-200">
                Gap exceeds 20% - {summary.totalGap.toFixed(0)} listings HuurScout likely misses!
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-300" />
            <span className="text-gray-300">Filters:</span>
          </div>
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 text-white rounded border border-gray-700"
          >
            <option value="all">All Cities</option>
            <option value="Amsterdam">Amsterdam</option>
            <option value="Rotterdam">Rotterdam</option>
            <option value="Utrecht">Utrecht</option>
          </select>
          <select
            value={platformTypeFilter}
            onChange={(e) => setPlatformTypeFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 text-white rounded border border-gray-700"
          >
            <option value="all">All Platforms</option>
            <option value="funda">Funda</option>
            <option value="pararius">Pararius</option>
            <option value="kamernet">Kamernet</option>
            <option value="facebook_group">Facebook Groups</option>
          </select>
        </div>

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Column 1: Gap Report Summary */}
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">GAP REPORT (Last 24h)</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-300 mb-1">New listings</div>
                <div className="text-3xl font-bold text-white">{summary.newListings24h.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-300 mb-1">Gap listings</div>
                <div className="text-3xl font-bold text-red-500">
                  {summary.gapListings24h.toLocaleString()} ({summary.totalGapPercent.toFixed(1)}%)
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-300 mb-1">Coverage</div>
                <div className="text-3xl font-bold text-green-500">{summary.coverageScore.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* Column 2: Top Gaps */}
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">TOP GAPS</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {topGaps.slice(0, 5).map((gap) => (
                <div
                  key={gap.platformId}
                  className="bg-gray-700 border border-gray-600 rounded p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-white">{gap.platformName}</div>
                    {gap.gapPercent > 20 && (
                      <span className="text-xs bg-red-900 text-red-200 px-2 py-1 rounded">🚨</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-300">
                    {gap.gap} gap ({gap.gapPercent.toFixed(1)}%)
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Expected: {gap.expected} • Actual: {gap.actual}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Trend Chart */}
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
            <h2 className="text-xl font-bold text-white mb-4">TREND CHART</h2>
            <div className="text-sm text-gray-300 mb-4">Gap % - Last 7 days</div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fill: '#9CA3AF' }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', color: '#F3F4F6' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend wrapperStyle={{ color: '#9CA3AF' }} />
                <Line
                  type="monotone"
                  dataKey="gapPercent"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Gap %"
                  dot={{ fill: '#EF4444', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Full Gap Table */}
        <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-white">All Platform Gaps</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    City
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Expected
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actual
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Gap
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Gap %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Coverage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {allGaps.map((gap) => (
                  <tr key={gap.platformId} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {gap.platformName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{gap.city}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{gap.platformType}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{gap.expected}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{gap.actual}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={gap.gap > 0 ? 'text-red-500 font-semibold' : 'text-green-500'}>
                        {gap.gap}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={gap.gapPercent > 20 ? 'text-red-500 font-semibold' : 'text-gray-300'}>
                        {gap.gapPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={gap.coverage >= 80 ? 'text-green-500' : 'text-yellow-500'}>
                        {gap.coverage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* UPRENT vs HuurScout Competitor Analysis */}
        {competitorAnalysis.length > 0 && (
          <div className="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden mt-8">
            <div className="px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-blue-900 to-purple-900">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                🚀 UPRENT vs HUURSCOUT BATTLEFIELD
              </h2>
              <p className="text-gray-300 text-sm mt-1">
                Real-time competitor intelligence • {citiesWinning} cities winning • {citiesBehind} cities behind
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Real Listings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      UPRENT Coverage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      HuurScout Coverage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Gap
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      UPRENT WIN
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {competitorAnalysis.map((comp, index) => {
                    const statusColor = comp.status === 'DOMINATE' 
                      ? 'text-green-500' 
                      : comp.status === 'PRICE_WAR' 
                        ? 'text-yellow-500' 
                        : 'text-red-500';
                    
                    const statusIcon = comp.status === 'DOMINATE' 
                      ? '✅' 
                      : comp.status === 'PRICE_WAR' 
                        ? '🟡' 
                        : '❌';
                    
                    return (
                      <tr key={index} className="hover:bg-gray-700 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white capitalize">
                          {comp.city}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {comp.realListings.toLocaleString()}
                          <div className="text-xs text-gray-500 mt-1">
                            Pararius: {comp.platforms.pararius} • Funda: {comp.platforms.funda}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="font-semibold text-blue-400">
                            {comp.uprentCoverage.toLocaleString()} ({comp.uprentPercent.toFixed(1)}%)
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="font-semibold text-purple-400">
                            {comp.huurscoutCoverage.toLocaleString()} ({comp.huurscoutPercent.toFixed(1)}%)
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {comp.gap.toLocaleString()} ({comp.gapPercent.toFixed(1)}%)
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`font-semibold ${statusColor}`}>
                            {statusIcon} {comp.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {comp.uprentAdvantage ? (
                            <span className="inline-flex items-center gap-1 text-green-500 font-bold">
                              ✅ DOMINATE
                            </span>
                          ) : comp.status === 'PRICE_WAR' ? (
                            <span className="inline-flex items-center gap-1 text-yellow-500 font-bold">
                              🟡 PRICE WAR
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-500 font-bold">
                              ❌ BEHIND
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Summary Row */}
                  <tr className="bg-gray-700 font-bold">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">OVERALL</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {competitorAnalysis.reduce((sum, c) => sum + c.realListings, 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                      {totalUprent.toLocaleString()} ({competitorAnalysis.length > 0 ? (totalUprent / competitorAnalysis.reduce((sum, c) => sum + c.realListings, 0) * 100).toFixed(1) : 0}%)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-400">
                      {totalHuurscout.toLocaleString()} ({competitorAnalysis.length > 0 ? (totalHuurscout / competitorAnalysis.reduce((sum, c) => sum + c.realListings, 0) * 100).toFixed(1) : 0}%)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {Math.abs(totalUprent - totalHuurscout).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {totalUprent > totalHuurscout ? (
                        <span className="text-green-500">✅ WINNING</span>
                      ) : totalUprent === totalHuurscout ? (
                        <span className="text-yellow-500">🟡 TIED</span>
                      ) : (
                        <span className="text-red-500">❌ BEHIND</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {totalUprent > totalHuurscout ? (
                        <span className="text-green-500">✅ DOMINATE</span>
                      ) : (
                        <span className="text-red-500">❌ FIX SELECTORS</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {citiesBehind > 0 && (
              <div className="px-6 py-4 bg-red-900 border-t border-red-700">
                <div className="flex items-center gap-2 text-red-200">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">
                    UPRENT behind in {citiesBehind} city/cities → Action required: Fix selectors!
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

