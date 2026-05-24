import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDeliveryClipUrl } from '@/lib/api/analysis';

const DeliveryCard = ({ delivery, isSelected, onView, sessionId }) => {
  const isIllegal = delivery.elbow_angle >= 15;
  const clipUrl = getDeliveryClipUrl(sessionId, delivery.id);

  return (
    <Card 
      className={cn(
        "min-w-[200px] p-4 cursor-pointer transition-all border-2 relative overflow-hidden group",
        isSelected 
          ? "border-green-500 bg-slate-100 dark:bg-slate-800 shadow-[0_0_15px_rgba(34,197,94,0.2)]" 
          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
      )}
      onClick={() => onView(delivery)}
    >
      {isSelected && (
        <div className="absolute top-0 right-0 w-20 h-20 -mr-10 -mt-10 bg-green-500/10 rounded-full blur-2xl pointer-events-none" />
      )}
      
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-slate-500 dark:text-slate-500">DELIVERY</span>
          <span className="text-sm font-black text-slate-700 dark:text-slate-200">#{delivery.delivery_number}</span>
        </div>
        {delivery.is_no_ball && (
          <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-black animate-pulse">NO BALL</Badge>
        )}
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tabular-nums">{delivery.ball_speed_kph}</span>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 tracking-tighter uppercase">KM/H</span>
        </div>
        
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 p-2 rounded-md ring-1 ring-slate-800">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tighter">Elbow Angle</span>
            <span className={cn(
              "text-base font-black tabular-nums",
              isIllegal ? "text-red-500" : "text-green-500"
            )}>
              {delivery.elbow_angle}°
            </span>
          </div>
          {isIllegal && (
            <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
          )}
        </div>

        <Button 
          size="sm" 
          variant={isSelected ? "default" : "outline"}
          className={cn(
            "w-full h-8 text-xs font-bold gap-2",
            isSelected ? "bg-green-600 hover:bg-green-700 text-slate-900 dark:text-white" : "border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:bg-slate-800"
          )}
          onClick={(e) => {
            e.stopPropagation();
            onView(delivery);
          }}
        >
          <Play className={cn("w-3 h-3", isSelected ? "fill-white" : "fill-slate-400")} />
          VIEW REPLAY
        </Button>
      </div>

      {isSelected && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-300">
           <p className="text-[9px] font-bold text-slate-500 dark:text-slate-500 uppercase mb-2 tracking-tighter">Quick Clip</p>
           <div className="rounded-md overflow-hidden bg-black aspect-video ring-1 ring-slate-700">
             <video 
               src={clipUrl} 
               autoPlay
               muted
               loop
               playsInline
               className="w-full h-full object-cover"
               onError={(e) => { e.target.parentElement.style.display = 'none'; }}
             />
           </div>
        </div>
      )}
    </Card>
  );
};

export default DeliveryCard;
