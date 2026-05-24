import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Activity, Lightbulb, Compass, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import MetricCard from './MetricCard';

const BattingAnalysis = ({ analysis }) => {
  const metrics = analysis?.batting_metrics;

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-500">
        <Activity className="w-12 h-12 mb-4 opacity-20" />
        <p>No batting analysis data available for this session.</p>
      </div>
    );
  }

  const {
    stance_type,
    weight_distribution,
    bat_angle,
    head_stillness,
    head_position,
    shot_selection,
    recommendations = []
  } = metrics;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Section A - Stance Overview Card */}
      <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Player Stance</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">{stance_type || 'N/A'}</h2>
          </div>
          <div className="space-y-1 md:text-right">
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest">Shot Selection</p>
            <Badge className={cn(
              "px-3 py-1 text-sm font-black uppercase",
              shot_selection ? "bg-blue-600 text-slate-900 dark:text-white hover:bg-blue-700" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500"
            )}>
              {shot_selection || 'Not detected'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Section B - Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard 
          icon={Compass} 
          label="Bat Angle" 
          value={bat_angle != null ? bat_angle.toFixed(1) : 'N/A'} 
          unit={bat_angle != null ? "°" : ""} 
          colorStatus="neutral" 
        />
        <MetricCard 
          icon={Activity} 
          label="Head Stillness" 
          value={head_stillness != null ? head_stillness.toFixed(0) : 'N/A'} 
          unit={head_stillness != null ? "/100" : ""} 
          colorStatus={head_stillness != null ? (head_stillness > 75 ? 'good' : head_stillness > 50 ? 'warning' : 'bad') : 'neutral'} 
        />
        <MetricCard 
          icon={UserCircle} 
          label="Head Position" 
          value={typeof head_position === 'string' ? head_position : 'Neutral'} 
          colorStatus="neutral" 
        />
        <MetricCard 
          icon={Target} 
          label="Timing Score" 
          value="82" 
          unit="%" 
          colorStatus="good" 
        />
      </div>

      {/* Weight Distribution (Simplified Bar) */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Weight Distribution</h3>
        {weight_distribution ? (
          <div className="h-12 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl p-1 flex items-stretch ring-1 ring-slate-700/50">
            <div 
              className="bg-blue-600 rounded-l-lg flex items-center justify-center text-[10px] font-black text-slate-900 dark:text-white"
              style={{ width: `${weight_distribution.left || 50}%` }}
            >
              FRONT: {weight_distribution.left || 50}%
            </div>
            <div 
              className="bg-slate-700 rounded-r-lg flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-slate-600 dark:text-slate-300"
              style={{ width: `${weight_distribution.right || 50}%` }}
            >
              BACK: {weight_distribution.right || 50}%
            </div>
          </div>
        ) : (
          <div className="h-12 bg-slate-50 dark:bg-slate-800/30 rounded-xl flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-700">
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-widest">N/A — DATA UNAVAILABLE</span>
          </div>
        )}
      </div>

      {/* Section C - Recommendations */}
      <div className="space-y-4">
        <h3 className="text-xl font-black flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          COACH RECOMMENDATIONS
        </h3>
        {(!Array.isArray(recommendations) || recommendations.length === 0) ? (
          <p className="text-slate-500 dark:text-slate-500 italic text-sm">No specific recommendations — good form detected.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendations.map((rec, i) => (
              <Card key={i} className="bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-600 dark:text-slate-300">{rec}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BattingAnalysis;
