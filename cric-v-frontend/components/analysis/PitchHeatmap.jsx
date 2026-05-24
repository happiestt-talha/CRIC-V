import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

const PITCH_LINES = ['outside_off', 'off_stump', 'middle_stump', 'leg_stump', 'outside_leg'];
const PITCH_LENGTHS = ['yorker', 'full', 'good_length', 'short_of_length', 'short'];

const lineLabels = {
  outside_off: 'Out Off',
  off_stump: 'Off',
  middle_stump: 'Middle',
  leg_stump: 'Leg',
  outside_leg: 'Out Leg',
};

const lengthLabels = {
  yorker: 'Yorker',
  full: 'Full',
  good_length: 'Good',
  short_of_length: 'Short+',
  short: 'Short',
};

const PitchHeatmap = ({ insights }) => {
  if (!insights) {
    return (
      <div className="p-10 text-center text-slate-500 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50">
        <Activity className="w-10 h-10 mx-auto mb-4 opacity-10" />
        <p className="text-sm font-medium">No advanced bowling insights available yet.</p>
      </div>
    );
  }

  const { speed_consistency, line_length_heatmap } = insights;
  const heatmapData = line_length_heatmap?.heatmap || {};
  
  // Calculate max for normalization
  let maxFreq = 1;
  Object.values(heatmapData).forEach(row => {
    Object.values(row).forEach(val => {
      if (val > maxFreq) maxFreq = val;
    });
  });

  const getHeatColor = (val) => {
    if (!val || val === 0) return 'bg-slate-50 dark:bg-slate-800/30';
    const intensity = val / maxFreq;
    if (intensity > 0.8) return 'bg-green-400';
    if (intensity > 0.6) return 'bg-green-500';
    if (intensity > 0.4) return 'bg-green-600';
    if (intensity > 0.2) return 'bg-green-700';
    return 'bg-green-900';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* Speed Consistency Stats */}
      {speed_consistency && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Avg Speed', value: speed_consistency.avg_speed, unit: 'km/h' },
            { label: 'Max Speed', value: speed_consistency.max_speed, unit: 'km/h' },
            { label: 'Consistency', value: speed_consistency.consistency_score, unit: '%' },
            { label: 'Total Deliveries', value: speed_consistency.total_deliveries, unit: '' },
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-3 rounded-lg ring-1 ring-slate-800/50">
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-700 dark:text-slate-200 tabular-nums tracking-tighter">{stat.value}</span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-600">{stat.unit}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap Grid */}
      <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 -mr-32 -mt-32 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col items-center relative z-10">
          <div className="w-full flex justify-between items-center mb-10">
            <h3 className="text-sm font-black text-slate-500 dark:text-slate-500 dark:text-slate-400 uppercase tracking-widest">Pitch Distribution Map</h3>
            <div className="flex gap-2">
               <Badge className="bg-green-500/10 text-green-400 border-green-900/30 font-black text-[10px]">HEATMAP ACTIVE</Badge>
            </div>
          </div>

          {/* Stumps indicator */}
          <div className="flex gap-1.5 mb-6 opacity-30">
            <div className="w-1 h-10 bg-amber-600 rounded-full shadow-[0_0_8px_rgba(217,119,6,0.5)]" />
            <div className="w-1 h-10 bg-amber-600 rounded-full shadow-[0_0_8px_rgba(217,119,6,0.5)]" />
            <div className="w-1 h-10 bg-amber-600 rounded-full shadow-[0_0_8px_rgba(217,119,6,0.5)]" />
          </div>

          <div className="w-full max-w-sm">
            {/* Header Labels (Lines) */}
            <div className="grid grid-cols-[80px_1fr] mb-4">
              <div />
              <div className="grid grid-cols-5 text-center px-1">
                {PITCH_LINES.map(line => (
                  <span key={line} className="text-[8px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-tighter transform -rotate-12">
                    {lineLabels[line]}
                  </span>
                ))}
              </div>
            </div>

            {/* Heatmap Rows (Lengths) */}
            <div className="space-y-1.5">
              {PITCH_LENGTHS.map(length => (
                <div key={length} className="grid grid-cols-[80px_1fr] items-center gap-3">
                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-500 text-right uppercase tracking-tighter">
                    {lengthLabels[length]}
                  </span>
                  <div className="grid grid-cols-5 gap-1.5">
                    {PITCH_LINES.map(line => {
                      const val = heatmapData[line]?.[length] || 0;
                      return (
                        <div 
                          key={line} 
                          className={cn(
                            "aspect-square rounded-sm transition-all hover:scale-125 cursor-help flex items-center justify-center ring-1 ring-white/5 shadow-inner",
                            getHeatColor(val)
                          )}
                          title={`${lineLabels[line]} / ${lengthLabels[length]}: ${val} balls`}
                        >
                          {val > 0 && <span className="text-[10px] font-black text-black/40">{val}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legend & Summary */}
          <div className="w-full flex flex-col md:flex-row items-center justify-between mt-12 pt-8 border-t border-slate-200 dark:border-slate-900 gap-8">
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest">Frequency</span>
              <div className="flex gap-1">
                {['bg-green-900', 'bg-green-700', 'bg-green-600', 'bg-green-500', 'bg-green-400'].map(c => (
                  <div key={c} className={cn("w-3 h-3 rounded-px shadow-sm", c)} />
                ))}
              </div>
              <span className="text-[8px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest">High</span>
            </div>

            <div className="flex gap-6">
              <div className="flex flex-col items-end">
                 <p className="text-[8px] font-black text-slate-500 dark:text-slate-600 uppercase mb-1.5 tracking-widest">Top Line</p>
                 <Badge variant="outline" className="bg-white dark:bg-slate-900/80 text-green-500 dark:text-green-400 border-green-200 dark:border-green-900/50 font-black px-3">
                   {lineLabels[line_length_heatmap?.most_common_line] || 'N/A'}
                 </Badge>
              </div>
              <div className="flex flex-col items-end">
                 <p className="text-[8px] font-black text-slate-500 dark:text-slate-600 uppercase mb-1.5 tracking-widest">Top Length</p>
                 <Badge variant="outline" className="bg-white dark:bg-slate-900/80 text-blue-500 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 font-black px-3">
                   {lengthLabels[line_length_heatmap?.most_common_length] || 'N/A'}
                 </Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PitchHeatmap;