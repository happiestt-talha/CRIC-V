import React, { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const VideoPlayer = ({ src, seekToSeconds, label }) => {
  const videoRef = useRef(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (videoRef.current && seekToSeconds !== undefined && seekToSeconds !== null && seekToSeconds > 0) {
      videoRef.current.currentTime = seekToSeconds;
      videoRef.current.play().catch(e => console.log("Auto-play prevented or failed", e));
    }
  }, [seekToSeconds]);

  // Reset error state when src changes
  useEffect(() => {
    setVideoError(false);
  }, [src]);

  return (
    <div className="w-full bg-white dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-2xl backdrop-blur-sm">
      {/* Premium Header */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
           <span className="text-[10px] font-black text-slate-500 dark:text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{label || 'VIDEO FEED'}</span>
        </div>
        <div className="flex gap-1">
           <div className="w-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800" />
           <div className="w-1.5 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>

      <div className="relative aspect-video w-full bg-black flex items-center justify-center group">
        {src && !videoError ? (
          <video
            ref={videoRef}
            src={src}
            controls
            preload="metadata"
            className="w-full h-full object-contain"
            playsInline
            onError={() => setVideoError(true)}
            onLoadStart={() => setVideoError(false)}
          >
            Your browser does not support the video tag.
          </video>
        ) : null}

        {/* Premium Error/Empty State Overlay */}
        {(videoError || !src) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-500 dark:text-slate-500 gap-4 p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center shadow-inner">
               <AlertCircle className="w-8 h-8 text-red-500/30" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-slate-500 dark:text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                {videoError ? "CRITICAL: DECODE ERROR" : "WAITING FOR SOURCE"}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 max-w-[200px] leading-relaxed font-medium">
                {videoError 
                  ? "The video file format is unsupported or the link has expired." 
                  : "No media source has been linked to this session yet."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
