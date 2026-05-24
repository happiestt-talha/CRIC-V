import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const MetricCard = ({ icon: Icon, label, value, unit, colorStatus = 'neutral' }) => {
  const statusColors = {
    good: 'text-green-500',
    warning: 'text-yellow-500',
    bad: 'text-red-500',
    neutral: 'text-slate-700 dark:text-slate-200'
  };

  return (
    <Card className="bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 backdrop-blur-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
      <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
        <div className="p-2 rounded-full bg-white dark:bg-slate-900/50 mb-1 ring-1 ring-slate-700/50">
          {Icon && <Icon className="w-5 h-5 text-slate-500 dark:text-slate-500 dark:text-slate-400" />}
        </div>
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">{label}</p>
        <div className="flex items-baseline space-x-1">
          <span className={cn("text-2xl font-black tabular-nums", statusColors[colorStatus])}>
            {value}
          </span>
          {unit && <span className="text-xs font-bold text-slate-500 dark:text-slate-600">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
