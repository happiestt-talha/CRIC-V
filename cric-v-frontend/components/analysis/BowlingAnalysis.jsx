import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertTriangle, Info, Lightbulb, Activity, Target, Zap, RotateCcw, Ruler } from 'lucide-react';
import MetricCard from './MetricCard';
import DeliveryCard from './DeliveryCard';
import { cn } from '@/lib/utils';

const BowlingAnalysis = ({ analysis, deliveries, onDeliveryClick, selectedDeliveryId, sessionId }) => {
  const metrics = analysis?.bowling_metrics;
  
  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 dark:text-slate-500">
        <Activity className="w-12 h-12 mb-4 opacity-20" />
        <p>No bowling analysis data available for this session.</p>
      </div>
    );
  }

  const {
    icc_compliant,
    violations = [],
    elbow_extension,
    arm_type,
    swing_type,
    release_height,
    release_speed,
    accuracy_score,
    recommendations = []
  } = metrics;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Section A - ICC Compliance Banner */}
      <div className={cn(
        "p-4 rounded-xl border flex items-start gap-4 shadow-lg",
        icc_compliant === true ? "bg-green-500/10 border-green-500/50 text-green-500" :
        icc_compliant === false ? "bg-red-500/10 border-red-500/50 text-red-500" :
        "bg-slate-500/10 border-slate-500/50 text-slate-500 dark:text-slate-500"
      )}>
        <div className="p-2 rounded-full bg-current/10">
          {icc_compliant === true ? <CheckCircle2 className="w-6 h-6" /> :
           icc_compliant === false ? <AlertTriangle className="w-6 h-6" /> :
           <Info className="w-6 h-6" />}
        </div>
        <div>
          <h3 className="font-black text-lg">
            {icc_compliant === true ? "ICC Compliant — Action meets standards" :
             icc_compliant === false ? "Illegal Action Detected" :
             "ICC compliance check pending — run analysis to evaluate bowling action."}
          </h3>
          {icc_compliant === false && Array.isArray(violations) && violations.length > 0 && (
            <ul className="mt-2 space-y-1 list-disc list-inside text-sm font-medium opacity-90">
              {violations.map((v, i) => <li key={i}>{v}</li>)}
            </ul>
          )}
        </div>
      </div>

      {/* Section B - Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <MetricCard 
          icon={RotateCcw} 
          label="Elbow Extension" 
          value={elbow_extension != null ? elbow_extension.toFixed(1) : 'N/A'} 
          unit={elbow_extension != null ? "°" : ""} 
          colorStatus={elbow_extension != null ? (elbow_extension >= 15 ? 'bad' : 'good') : 'neutral'} 
        />
        <MetricCard 
          icon={Target} 
          label="Arm Type" 
          value={arm_type ? arm_type.replace(/_/g, ' ') : 'N/A'} 
          colorStatus="neutral" 
        />
        <MetricCard 
          icon={Zap} 
          label="Swing Type" 
          value={swing_type || 'N/A'} 
          colorStatus="neutral" 
        />
        <MetricCard 
          icon={Ruler} 
          label="Release Height" 
          value={release_height != null ? release_height.toFixed(2) : 'N/A'} 
          unit={release_height != null ? "m" : ""} 
          colorStatus="neutral" 
        />
        <MetricCard 
          icon={Activity} 
          label="Release Speed" 
          value={release_speed != null ? release_speed.toFixed(1) : 'N/A'} 
          unit={release_speed != null ? "km/h" : ""} 
          colorStatus={release_speed != null ? (release_speed > 120 ? 'good' : release_speed > 90 ? 'warning' : 'neutral') : 'neutral'} 
        />
        <MetricCard 
          icon={Target} 
          label="Accuracy" 
          value={accuracy_score != null ? accuracy_score.toFixed(0) : 'N/A'} 
          unit={accuracy_score != null ? "%" : ""} 
          colorStatus={accuracy_score != null ? (accuracy_score > 70 ? 'good' : accuracy_score > 40 ? 'warning' : 'bad') : 'neutral'} 
        />
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

      {/* Section D - Deliveries Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            DELIVERIES
            <Badge variant="secondary" className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-500 dark:text-slate-400 font-black">
              {deliveries?.length || 0}
            </Badge>
          </h3>
        </div>
        
        {(!Array.isArray(deliveries) || deliveries.length === 0) ? (
          <div className="p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-500 dark:text-slate-500 italic text-sm">
            No delivery-level data available for this session.
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-6 pt-2 gap-4 no-scrollbar -mx-4 px-4 mask-fade-right">
            {deliveries.map((delivery) => (
              <DeliveryCard 
                key={delivery.id} 
                delivery={delivery} 
                isSelected={selectedDeliveryId === delivery.id}
                onView={onDeliveryClick}
                sessionId={sessionId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pitch Location Chart */}
      {deliveries?.length > 0 && (
        <div className="space-y-4">
           <h3 className="text-sm font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Pitch Location Map</h3>
           <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-8 flex justify-center">
             <div className="relative w-48 h-80 bg-green-900/10 rounded border-2 border-green-800/30 overflow-hidden">
                {/* Wickets */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-700/50 rounded-full" />
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-700/50 rounded-full" />
                
                {/* Crease */}
                <div className="absolute top-10 left-0 right-0 h-px bg-white/20" />
                <div className="absolute bottom-10 left-0 right-0 h-px bg-white/20" />
                
                {/* Pitch dots */}
                {deliveries.map((d) => (
                  <div 
                    key={d.id}
                    className={cn(
                      "absolute w-3 h-3 rounded-full border border-white/50 shadow-sm transition-all transform hover:scale-150 cursor-help",
                      d.ball_speed_kph > 120 ? "bg-green-500" : d.ball_speed_kph > 90 ? "bg-yellow-500" : "bg-slate-500",
                      selectedDeliveryId === d.id && "ring-4 ring-white ring-offset-2 ring-offset-slate-900 z-10"
                    )}
                    style={{ 
                      left: `${d.pitch_location_x * 100}%`, 
                      top: `${d.pitch_location_y * 100}%` 
                    }}
                    title={`#${d.delivery_number}: ${d.ball_speed_kph} km/h`}
                  />
                ))}
             </div>
           </Card>
        </div>
      )}
    </div>
  );
};

export default BowlingAnalysis;
