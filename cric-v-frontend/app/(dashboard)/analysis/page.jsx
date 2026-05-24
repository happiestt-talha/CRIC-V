'use client'

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  User,
  Activity,
  Target,
  Calendar,
  ChevronRight,
  BarChart3,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { analysisApi } from '@/lib/api/analysis';
import axiosInstance from '@/lib/api/axios';
import PitchHeatmap from '@/components/analysis/PitchHeatmap';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { formatDate } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function AnalysisHub() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [bowlingHistory, setBowlingHistory] = useState([]);
  const [battingHistory, setBattingHistory] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [playersLoading, setPlayersLoading] = useState(true);

  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [sessionAnalysis, setSessionAnalysis] = useState(null)
  const [sessionAnalysisLoading, setSessionAnalysisLoading] = useState(false)

  const handleSessionClick = async (e, sessionId) => {
    e.preventDefault() // prevent Link navigation
    if (selectedSessionId === sessionId) {
      // clicking same session collapses it
      setSelectedSessionId(null)
      setSessionAnalysis(null)
      return
    }
    setSelectedSessionId(sessionId)
    setSessionAnalysisLoading(true)
    try {
      const data = await analysisApi.getSessionAnalysis(sessionId)
      setSessionAnalysis(data)
    } catch (err) {
      console.error('Failed to fetch session analysis:', err)
      setSessionAnalysis(null)
    } finally {
      setSessionAnalysisLoading(false)
    }
  }

  // Fetch players on mount
  useEffect(() => {
    axiosInstance.get('/users/players')
      .then(res => {
        setPlayers(res.data);
        setPlayersLoading(false);
      })
      .catch(err => {
        console.error("Error fetching players:", err);
        setPlayersLoading(false);
      });
  }, []);

  // Fetch analysis when player changes
  useEffect(() => {
    if (selectedPlayerId) {
      setLoading(true);
      const id = parseInt(selectedPlayerId);
      Promise.all([
        analysisApi.getPlayerBowlingAnalysis(id),
        analysisApi.getPlayerBattingAnalysis(id),
        analysisApi.getBowlingInsights(id)
      ]).then(([bowling, batting, insightsData]) => {
        // Sort chronologically for charts (oldest to newest)
        const sortedBowling = [...bowling].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const sortedBatting = [...batting].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        setBowlingHistory(sortedBowling);
        setBattingHistory(sortedBatting);
        setInsights(insightsData);
        setLoading(false);
      }).catch(err => {
        console.error("Error fetching analysis history:", err);
        setLoading(false);
      });
    }
  }, [selectedPlayerId]);

  const selectedPlayer = useMemo(() =>
    players.find(p => p.id === parseInt(selectedPlayerId)),
    [players, selectedPlayerId]
  );

  if (playersLoading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-[#0f172a] flex flex-col">
        <Navbar title="Analysis Hub" />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner text="Initializing Analytics Engine..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0f172a] text-slate-700 dark:text-slate-200 flex flex-col">
      <Navbar title="Performance Hub" />

      <div className="flex-1 max-w-[1600px] mx-auto w-full p-4 md:p-8 space-y-8">
        {/* Header & Selector */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900/40 p-8 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Performance Hub</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <p className="text-slate-500 dark:text-slate-500 font-black text-[10px] tracking-[0.2em] uppercase">
                AI-DRIVEN PLAYER ANALYTICS
              </p>
            </div>
          </div>

          <div className="w-full md:w-80 space-y-2 flex flex-col">
            <label className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] ml-1">
              Select Squad Member
            </label>
            <Select className='w-full' onValueChange={setSelectedPlayerId} value={selectedPlayerId}>
              <SelectTrigger
                style={{ '--placeholder-color': 'rgb(148 163 184)' }}
                className="w-full md:w-80 bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-600 h-14 font-black text-slate-900 dark:text-slate-100 data-[state=open]:border-green-500 data-[state=open]:ring-1 data-[state=open]:ring-green-500/40 transition-all hover:border-slate-400">
                <SelectValue className="text-slate-900 dark:text-slate-100" placeholder="CHOOSE A PLAYER..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-100 dark:bg-slate-800 border border-slate-600 shadow-xl shadow-black/50">
                {players.map(p => (
                  <SelectItem
                    key={p.id}
                    value={p.id.toString()}
                    className="font-bold text-slate-700 dark:text-slate-200 focus:bg-green-500/20 focus:text-green-300 cursor-pointer"
                  >
                    {p.full_name.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!selectedPlayerId ? (
          <div className="flex-1 flex flex-col items-center justify-center py-32 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <div className="w-32 h-32 rounded-full bg-white dark:bg-slate-900/50 flex items-center justify-center text-slate-800 ring-2 ring-slate-800/50 shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-green-500/0 to-green-500/5 group-hover:to-green-500/20 transition-all duration-700" />
              <User className="w-14 h-14 relative z-10" />
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-black text-slate-500 dark:text-slate-500 tracking-tighter italic uppercase">System Idle</h3>
              <p className="text-slate-500 dark:text-slate-600 font-bold uppercase text-[10px] tracking-[0.3em] max-w-xs mx-auto leading-relaxed">
                Select a player from the registry to initialize neural performance mapping.
              </p>
            </div>
          </div>
        ) : loading ? (
          <div className="flex-1 flex items-center justify-center py-32">
            <LoadingSpinner text={`RECONSTRUCTING PERFORMANCE HISTORY FOR ${selectedPlayer?.full_name?.toUpperCase()}...`} />
          </div>
        ) : (
          <div className="space-y-16 animate-in fade-in duration-1000">

            {/* Section 1: Bowling History */}
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-green-500/10 ring-1 ring-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                    <Activity className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Bowling Trajectory</h2>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-600 tracking-[0.2em] uppercase">Pace, Extension & Legality Metrics</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-10 gap-8">
                {/* List - 3 cols */}
                <Card className="xl:col-span-3 bg-white/80 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-2xl backdrop-blur-sm">
                  <CardHeader className="bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4">
                    <CardTitle className="text-[10px] font-black text-slate-500 dark:text-slate-500 tracking-[0.2em] uppercase">Recent Sessions</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-200/30 dark:divide-slate-800/30 max-h-[500px] overflow-y-auto no-scrollbar">
                      {bowlingHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4 animate-in fade-in duration-700">
                          <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-slate-800 ring-1 ring-slate-800/50">
                            <Activity className="w-8 h-8 opacity-20" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em]">Data Missing</p>
                            <p className="text-xs text-slate-700 font-bold max-w-[150px] uppercase leading-tight">Record and analyze a bowling session to initialize metrics.</p>
                          </div>
                        </div>
                      ) : (
                        [...bowlingHistory].reverse().map((analysis) => (
                          <button
                            key={analysis.id}
                            onClick={(e) => handleSessionClick(e, analysis.session_id)}
                            className={cn(
                              "w-full flex items-center justify-between p-5 hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-all group border-l-4 text-left",
                              selectedSessionId === analysis.session_id
                                ? "border-l-green-500 bg-slate-800/40"
                                : "border-l-transparent hover:border-l-green-500"
                            )}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight">{formatDate(analysis.created_at)}</span>
                                <Badge className={cn(
                                  "text-[8px] font-black uppercase tracking-widest h-4 px-1.5 border-none",
                                  analysis.bowling_metrics?.icc_compliant ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                                )}>
                                  {analysis.bowling_metrics?.icc_compliant ? 'LEGAL' : 'ILLEGAL'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-950/50 px-2 py-0.5 rounded">
                                  {analysis.bowling_metrics?.release_speed != null && analysis.bowling_metrics.release_speed > 0
                                    ? analysis.bowling_metrics.release_speed.toFixed(1)
                                    : 'N/A'} <span className="text-[8px] opacity-50">KM/H</span>
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-950/50 px-2 py-0.5 rounded">
                                  {analysis.bowling_metrics?.elbow_extension != null && analysis.bowling_metrics.elbow_extension > 0
                                    ? analysis.bowling_metrics.elbow_extension.toFixed(1)
                                    : 'N/A'}<span className="text-[8px] opacity-50">° EXT</span>
                                </span>
                              </div>
                            </div>
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                              selectedSessionId === analysis.session_id
                                ? "bg-green-500/10 text-green-500 rotate-90"
                                : "bg-white dark:bg-slate-900 text-slate-700 group-hover:text-green-500 group-hover:bg-green-500/10"
                            )}>
                              <ChevronRight className="w-4 h-4 transition-transform" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Chart - 7 cols */}
                <Card className="xl:col-span-7 bg-white/60 dark:bg-slate-900/20 border-slate-200/50 dark:border-slate-800/50 shadow-2xl p-8 relative overflow-hidden flex flex-col justify-center min-h-[450px]">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[100px] pointer-events-none" />
                  
                  {bowlingHistory.length > 0 ? (
                    <div className="h-[450px] w-full relative z-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={bowlingHistory.map(a => ({
                          date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                          speed: (a.bowling_metrics?.release_speed > 0) ? a.bowling_metrics.release_speed : null,
                          elbow: (a.bowling_metrics?.elbow_extension > 0) ? a.bowling_metrics.elbow_extension : null,
                        }))}>
                          <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.5} />
                          <XAxis dataKey="date" stroke="#475569" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} dy={10} />
                          <YAxis yId="left" stroke="#22c55e" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} unit=" KM/H" domain={['dataMin - 10', 'dataMax + 10']} />
                          <YAxis yId="right" orientation="right" stroke="#ef4444" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} unit="°" domain={[0, 40]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)', backdropFilter: 'blur(10px)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}
                            labelStyle={{ fontWeight: 'black', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}
                            itemStyle={{ fontWeight: 'black', fontSize: '12px' }}
                          />
                          <Legend verticalAlign="top" align="right" height={40} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                          <ReferenceLine yId="right" y={15} label={{ position: 'right', value: 'ICC ILLEGAL LIMIT', fill: '#ef4444', fontSize: 9, fontWeight: 'black', letterSpacing: '0.1em' }} stroke="#ef4444" strokeDasharray="8 8" strokeWidth={2} />
                          <Line yId="left" connectNulls={false} type="monotone" dataKey="speed" name="RELEASE SPEED" stroke="#22c55e" strokeWidth={5} dot={{ r: 6, fill: '#22c55e', strokeWidth: 3, stroke: '#0f172a' }} activeDot={{ r: 8, strokeWidth: 0, fill: '#4ade80' }} animationDuration={1500} />
                          <Line yId="right" connectNulls={false} type="stepAfter" dataKey="elbow" name="ELBOW EXTENSION" stroke="#ef4444" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#0f172a' }} animationDuration={2000} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-6 py-20 relative z-10">
                      <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-slate-800 ring-2 ring-slate-800 shadow-inner group">
                        <BarChart3 className="w-10 h-10 opacity-10 group-hover:opacity-30 transition-opacity duration-700" />
                        <div className="absolute inset-0 bg-green-500/5 animate-pulse rounded-full" />
                      </div>
                      <div className="text-center space-y-2">
                        <h4 className="text-lg font-black text-slate-500 dark:text-slate-500 dark:text-slate-400 italic uppercase tracking-tighter">Insufficient Progression Data</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-600 font-bold uppercase tracking-[0.3em] max-w-xs mx-auto">Analyze at least 2 sessions to generate trend mapping.</p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Session Drill-Down Panel — Bowling */}
              {selectedSessionId && bowlingHistory.some(a => a.session_id === selectedSessionId) && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                  <Card className="bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/50 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                        <Activity className="w-4 h-4 text-green-500" />
                        Session #{selectedSessionId} — Detailed Bowling Analysis
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/sessions/${selectedSessionId}`}
                          className="text-[10px] font-black text-green-500 hover:text-green-400 uppercase tracking-widest flex items-center gap-1 transition-colors"
                        >
                          VIEW FULL SESSION <ChevronRight className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => { setSelectedSessionId(null); setSessionAnalysis(null) }}
                          className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-500 hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs font-black"
                        >
                          ✕
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {sessionAnalysisLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <LoadingSpinner text="Loading session analysis..." />
                        </div>
                      ) : sessionAnalysis ? (
                        <div className="space-y-6">
                          {/* ICC Compliance Banner */}
                          {sessionAnalysis.bowling_metrics && (
                            <div className={cn(
                              "rounded-xl p-4 flex items-center gap-4 border",
                              sessionAnalysis.bowling_metrics.icc_compliant === true
                                ? "bg-green-500/10 border-green-500/20 text-green-400"
                                : sessionAnalysis.bowling_metrics.icc_compliant === false
                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                : "bg-slate-100/50 dark:bg-slate-800/50 border-slate-700/50 text-slate-500 dark:text-slate-500 dark:text-slate-400"
                            )}>
                              <AlertCircle className="w-5 h-5 flex-shrink-0" />
                              <div>
                                <p className="text-xs font-black uppercase tracking-widest">
                                  {sessionAnalysis.bowling_metrics.icc_compliant === true
                                    ? "ICC Compliant — Bowling action meets standards"
                                    : sessionAnalysis.bowling_metrics.icc_compliant === false
                                    ? "Illegal Action Detected"
                                    : "ICC Compliance check pending"}
                                </p>
                                {sessionAnalysis.bowling_metrics.violations?.length > 0 && (
                                  <ul className="mt-2 space-y-1">
                                    {sessionAnalysis.bowling_metrics.violations.map((v, i) => (
                                      <li key={i} className="text-[10px] font-bold opacity-80">• {v}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              {
                                label: 'Elbow Extension',
                                value: sessionAnalysis.bowling_metrics?.elbow_extension != null
                                  ? `${sessionAnalysis.bowling_metrics.elbow_extension.toFixed(1)}°`
                                  : 'N/A',
                                color: sessionAnalysis.bowling_metrics?.elbow_extension >= 15 ? 'text-red-400' : 'text-green-400'
                              },
                              {
                                label: 'Release Speed',
                                value: sessionAnalysis.bowling_metrics?.release_speed != null
                                  ? `${sessionAnalysis.bowling_metrics.release_speed.toFixed(1)} km/h`
                                  : 'N/A',
                                color: 'text-blue-400'
                              },
                              {
                                label: 'Arm Type',
                                value: sessionAnalysis.bowling_metrics?.arm_type ?? 'N/A',
                                color: 'text-slate-500 dark:text-slate-600 dark:text-slate-300'
                              },
                              {
                                label: 'Accuracy Score',
                                value: sessionAnalysis.bowling_metrics?.accuracy_score != null
                                  ? `${sessionAnalysis.bowling_metrics.accuracy_score.toFixed(0)}%`
                                  : 'N/A',
                                color: sessionAnalysis.bowling_metrics?.accuracy_score >= 70 ? 'text-green-400' : 'text-amber-400'
                              },
                            ].map((metric, i) => (
                              <div key={i} className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200/50 dark:border-slate-800/50">
                                <p className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest mb-2">{metric.label}</p>
                                <p className={cn("text-xl font-black tracking-tight", metric.color)}>{metric.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Recommendations */}
                          {sessionAnalysis.bowling_metrics?.recommendations?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Recommendations</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {sessionAnalysis.bowling_metrics.recommendations.map((rec, i) => (
                                  <div key={i} className="flex items-start gap-3 bg-slate-950/30 rounded-lg p-3 border border-slate-800/30">
                                    <span className="text-amber-500 mt-0.5 flex-shrink-0">💡</span>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-600 dark:text-slate-300 leading-relaxed">{rec}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-600">
                          <p className="text-sm font-black uppercase tracking-widest">Failed to load session analysis</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Section 2: Batting History */}
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Dynamic Shot Analysis</h2>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-600 tracking-[0.2em] uppercase">Angle Control & Head Stability Over Time</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-10 gap-8">
                <Card className="xl:col-span-3 bg-white/80 dark:bg-slate-900/30 border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-2xl backdrop-blur-sm">
                  <CardHeader className="bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4">
                    <CardTitle className="text-[10px] font-black text-slate-500 dark:text-slate-500 tracking-[0.2em] uppercase">Session History</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-200/30 dark:divide-slate-800/30 max-h-[500px] overflow-y-auto no-scrollbar">
                      {battingHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4 animate-in fade-in duration-700">
                          <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-slate-800 ring-1 ring-slate-800/50">
                            <TrendingUp className="w-8 h-8 opacity-20" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em]">Data Missing</p>
                            <p className="text-xs text-slate-700 font-bold max-w-[150px] uppercase leading-tight">Record and analyze a batting session to initialize metrics.</p>
                          </div>
                        </div>
                      ) : (
                        [...battingHistory].reverse().map((analysis) => (
                          <button
                            key={analysis.id}
                            onClick={(e) => handleSessionClick(e, analysis.session_id)}
                            className={cn(
                              "w-full flex items-center justify-between p-5 hover:bg-slate-100/40 dark:hover:bg-slate-800/40 transition-all group border-l-4 text-left",
                              selectedSessionId === analysis.session_id
                                ? "border-l-blue-500 bg-slate-800/40"
                                : "border-l-transparent hover:border-l-blue-500"
                            )}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight">{formatDate(analysis.created_at)}</span>
                                <Badge className="bg-blue-500/10 text-blue-500 text-[8px] font-black uppercase tracking-widest h-4 border-none">
                                  {analysis.batting_metrics?.shot_selection?.toUpperCase() || 'GENERAL'}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-950/50 px-2 py-0.5 rounded">
                                  {analysis.batting_metrics?.bat_angle != null
                                    ? analysis.batting_metrics.bat_angle.toFixed(1)
                                    : 'N/A'}° <span className="text-[8px] opacity-50">ANGLE</span>
                                </span>
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest bg-slate-50 dark:bg-slate-950/50 px-2 py-0.5 rounded">
                                  {analysis.batting_metrics?.head_stillness != null
                                    ? analysis.batting_metrics.head_stillness.toFixed(0)
                                    : 'N/A'} <span className="text-[8px] opacity-50">STILLNESS</span>
                                </span>
                              </div>
                            </div>
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                              selectedSessionId === analysis.session_id
                                ? "bg-blue-500/10 text-blue-500 rotate-90"
                                : "bg-white dark:bg-slate-900 text-slate-700 group-hover:text-blue-500 group-hover:bg-blue-500/10"
                            )}>
                              <ChevronRight className="w-4 h-4 transition-transform" />
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="xl:col-span-7 bg-white/60 dark:bg-slate-900/20 border-slate-200/50 dark:border-slate-800/50 shadow-2xl p-8 relative overflow-hidden flex flex-col justify-center min-h-[450px]">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
                  
                  {battingHistory.length > 0 ? (
                    <div className="h-[450px] w-full relative z-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={battingHistory.map(a => ({
                          date: new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                          angle: a.batting_metrics?.bat_angle ?? null,
                          stillness: a.batting_metrics?.head_stillness ?? null,
                        }))}>
                          <CartesianGrid stroke="var(--border-color)" strokeDasharray="3 3" opacity={0.5} />
                          <XAxis dataKey="date" stroke="#475569" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} dy={10} />
                          <YAxis yId="left" stroke="#3b82f6" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} unit="°" />
                          <YAxis yId="right" orientation="right" stroke="#8b5cf6" fontSize={10} fontWeight="black" tickLine={false} axisLine={false} unit="/100" domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', color: 'var(--text-primary)', backdropFilter: 'blur(10px)' }}
                            labelStyle={{ fontWeight: 'black', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase', marginBottom: '8px' }}
                          />
                          <Legend verticalAlign="top" align="right" height={40} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                          <Line yId="left" connectNulls={false} type="monotone" dataKey="angle" name="BAT ANGLE" stroke="#3b82f6" strokeWidth={5} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 3, stroke: '#0f172a' }} animationDuration={1500} />
                          <Line yId="right" connectNulls={false} type="monotone" dataKey="stillness" name="HEAD STILLNESS" stroke="#8b5cf6" strokeWidth={5} dot={{ r: 6, fill: '#8b5cf6', strokeWidth: 3, stroke: '#0f172a' }} animationDuration={2000} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-6 py-20 relative z-10">
                      <div className="w-24 h-24 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-slate-800 ring-2 ring-slate-800 shadow-inner group">
                        <TrendingUp className="w-10 h-10 opacity-10 group-hover:opacity-30 transition-opacity duration-700" />
                        <div className="absolute inset-0 bg-blue-500/5 animate-pulse rounded-full" />
                      </div>
                      <div className="text-center space-y-2">
                        <h4 className="text-lg font-black text-slate-500 dark:text-slate-500 dark:text-slate-400 italic uppercase tracking-tighter">Technical Insights Pending</h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-600 font-bold uppercase tracking-[0.3em] max-w-xs mx-auto">Analyze batting sessions to initialize Neural trend mapping.</p>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              {/* Session Drill-Down Panel — Batting */}
              {selectedSessionId && battingHistory.some(a => a.session_id === selectedSessionId) && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                  <Card className="bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/50 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex flex-row items-center justify-between">
                      <CardTitle className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        Session #{selectedSessionId} — Detailed Batting Analysis
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/sessions/${selectedSessionId}`}
                          className="text-[10px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest flex items-center gap-1 transition-colors"
                        >
                          VIEW FULL SESSION <ChevronRight className="w-3 h-3" />
                        </Link>
                        <button
                          onClick={() => { setSelectedSessionId(null); setSessionAnalysis(null) }}
                          className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-500 hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all text-xs font-black"
                        >
                          ✕
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      {sessionAnalysisLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <LoadingSpinner text="Loading session analysis..." />
                        </div>
                      ) : sessionAnalysis ? (
                        <div className="space-y-6">
                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                              {
                                label: 'Stance Type',
                                value: sessionAnalysis.batting_metrics?.stance_type ?? 'N/A',
                                color: 'text-blue-400'
                              },
                              {
                                label: 'Bat Angle',
                                value: sessionAnalysis.batting_metrics?.bat_angle != null
                                  ? `${sessionAnalysis.batting_metrics.bat_angle.toFixed(1)}°`
                                  : 'N/A',
                                color: 'text-indigo-400'
                              },
                              {
                                label: 'Head Stillness',
                                value: sessionAnalysis.batting_metrics?.head_stillness != null
                                  ? `${sessionAnalysis.batting_metrics.head_stillness.toFixed(0)}/100`
                                  : 'N/A',
                                color: sessionAnalysis.batting_metrics?.head_stillness >= 70 ? 'text-green-400' : 'text-amber-400'
                              },
                              {
                                label: 'Weight Dist.',
                                value: sessionAnalysis.batting_metrics?.weight_distribution ?? 'N/A',
                                color: 'text-slate-500 dark:text-slate-600 dark:text-slate-300'
                              },
                            ].map((metric, i) => (
                              <div key={i} className="bg-slate-50 dark:bg-slate-950/50 rounded-xl p-4 border border-slate-200/50 dark:border-slate-800/50">
                                <p className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest mb-2">{metric.label}</p>
                                <p className={cn("text-xl font-black tracking-tight", metric.color)}>{metric.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Recommendations */}
                          {sessionAnalysis.batting_metrics?.recommendations?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Recommendations</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {sessionAnalysis.batting_metrics.recommendations.map((rec, i) => (
                                  <div key={i} className="flex items-start gap-3 bg-slate-950/30 rounded-lg p-3 border border-slate-800/30">
                                    <span className="text-blue-500 mt-0.5 flex-shrink-0">💡</span>
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-600 dark:text-slate-300 leading-relaxed">{rec}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-600">
                          <p className="text-sm font-black uppercase tracking-widest">Failed to load session analysis</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Section 3: Advanced Bowling Insights */}
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                    <Target className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Neural Pitch Map</h2>
                    <p className="text-[10px] font-black text-slate-500 dark:text-slate-600 tracking-[0.2em] uppercase">Aggregated Delivery Distribution & Frequency Analytics</p>
                  </div>
                </div>
              </div>

              <div className="max-w-4xl mx-auto w-full">
                <PitchHeatmap insights={insights} />
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
