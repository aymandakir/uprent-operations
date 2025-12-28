'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import type { PlatformMonitor, ScrapeLog, PlatformAlert } from '@uprent/shared';

// Environment variables are injected at build time for Next.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default function MonitoringPage() {
  const [monitors, setMonitors] = useState<PlatformMonitor[]>([]);
  const [logs, setLogs] = useState<ScrapeLog[]>([]);
  const [alerts, setAlerts] = useState<PlatformAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials');
      setLoading(false);
      return;
    }

    const client = createClient(supabaseUrl, supabaseKey);

    async function fetchData() {
      try {
        // Fetch monitors
        const { data: monitorsData } = await client
          .from('platform_monitors')
          .select('*')
          .order('name');

        // Fetch recent logs
        const { data: logsData } = await client
          .from('scrape_logs')
          .select('*')
          .order('scraped_at', { ascending: false })
          .limit(100);

        // Fetch active alerts
        const { data: alertsData } = await client
          .from('platform_alerts')
          .select('*')
          .eq('resolved', false)
          .order('created_at', { ascending: false });

        setMonitors(monitorsData || []);
        setLogs(logsData || []);
        setAlerts(alertsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Prepare chart data
  const chartData = logs
    .slice(0, 20)
    .reverse()
    .map(log => ({
      time: new Date(log.scrapedAt).toLocaleTimeString(),
      listings: log.listingsFound,
      platform: monitors.find(m => m.id === log.platformId)?.name || 'Unknown'
    }));

  const platformStats = monitors.map(monitor => {
    const platformLogs = logs.filter(log => log.platformId === monitor.id);
    const recentLogs = platformLogs.slice(0, 10);
    const avgListings = recentLogs.length > 0
      ? recentLogs.reduce((sum, log) => sum + log.listingsFound, 0) / recentLogs.length
      : 0;
    const successRate = recentLogs.length > 0
      ? (recentLogs.filter(log => log.success).length / recentLogs.length) * 100
      : 0;

    return {
      name: monitor.name,
      avgListings: Math.round(avgListings),
      successRate: Math.round(successRate),
      status: monitor.status,
      expectedMin: monitor.expectedMinListings
    };
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Scraper Monitoring Dashboard</h1>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              Active Alerts ({alerts.length})
            </h2>
            <div className="space-y-2">
              {alerts.map(alert => (
                <div key={alert.id} className="bg-white p-3 rounded border border-red-200">
                  <div className="font-semibold">{alert.alertType}</div>
                  <div className="text-sm text-gray-600">{alert.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(alert.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {platformStats.map(stat => (
            <div key={stat.name} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">{stat.name}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Avg Listings:</span>
                  <span className="font-semibold">{stat.avgListings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Success Rate:</span>
                  <span className={`font-semibold ${stat.successRate >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {stat.successRate}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-semibold ${
                    stat.status === 'active' ? 'text-green-600' : 
                    stat.status === 'error' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {stat.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Listings Over Time</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="listings" stroke="#8884d8" name="Listings Found" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Platform Comparison</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={platformStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgListings" fill="#8884d8" name="Avg Listings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Scrape Logs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Listings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.slice(0, 20).map(log => {
                  const monitor = monitors.find(m => m.id === log.platformId);
                  return (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {monitor?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {log.listingsFound}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                            Failed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(log.scrapedAt).toLocaleString()}
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

