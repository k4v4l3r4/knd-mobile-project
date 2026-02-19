import React from 'react';
import { Maximize2, Volume2, VolumeX, AlertCircle, Play } from 'lucide-react';
import Hls from 'hls.js';

interface CctvPlayerProps {
  label: string;
  location?: string;
  isMini?: boolean;
  src?: string;
  status?: 'online' | 'offline' | 'maintenance';
}

export default function CctvPlayer({ label, location, isMini = false, src, status = 'online' }: CctvPlayerProps) {
  const [isMuted, setIsMuted] = React.useState(true);
  const [time, setTime] = React.useState<string>('');
  const [hasError, setHasError] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const hlsRef = React.useRef<Hls | null>(null);

  React.useEffect(() => {
    setTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    const video = videoRef.current;
    setHasError(false);
    setIsPlaying(false);
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, [src]);

  React.useEffect(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;

    return () => {
      if (video) {
        video.pause();
        video.removeAttribute('src');
      }
      if (hls) {
        hls.destroy();
      }
    };
  }, []);

  const startPlayback = async () => {
    if (!src || !videoRef.current || isPlaying) return;

    setHasError(false);

    const video = videoRef.current;
    const isHls = src.includes('.m3u8');

    try {
      if (isHls) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = src;
        } else {
          const hlsModule = await import('hls.js');
          const Hls = hlsModule.default;

          if (Hls.isSupported()) {
            if (hlsRef.current) {
              hlsRef.current.destroy();
              hlsRef.current = null;
            }
            const instance = new Hls();
            instance.loadSource(src);
            instance.attachMedia(video);
            instance.on('error', () => {
              setHasError(true);
            });
            hlsRef.current = instance;
          } else {
            setHasError(true);
            return;
          }
        }
      } else {
        video.src = src;
      }

      video.muted = isMuted;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise.catch(() => {});
      }
      setIsPlaying(true);
    } catch {
      setHasError(true);
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      const video = videoRef.current;
      if (video) {
        video.muted = next;
      }
      return next;
    });
  };

  return (
    <div className={`relative overflow-hidden bg-slate-900 rounded-2xl group ${isMini ? 'aspect-video' : 'aspect-video shadow-lg'}`}>
      {/* Video Placeholder / Image */}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
        {src && !hasError ? (
          <video
            ref={videoRef}
            muted={isMuted}
            playsInline
            loop
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            onError={() => setHasError(true)}
          />
        ) : (
          <div className="text-slate-600 flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full border-2 border-slate-600 flex items-center justify-center">
              <div className="w-2 h-2 bg-slate-600 rounded-full animate-pulse" />
            </div>
            <span className="text-xs font-mono">NO SIGNAL</span>
          </div>
        )}
        
        {/* Scanlines Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-10 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
      </div>

      {/* Overlay UI */}
      <div className="absolute inset-0 p-4 flex flex-col justify-between z-20 bg-gradient-to-t from-black/60 via-transparent to-black/30 opacity-100 transition-opacity">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className={`flex h-2 w-2 rounded-full ${status === 'online' ? 'bg-red-500 animate-pulse' : 'bg-slate-500'}`} />
            <span className="text-white/90 text-xs font-mono font-bold tracking-wider uppercase drop-shadow-md">
              {status === 'online' ? 'REC • LIVE' : status.toUpperCase()}
            </span>
          </div>
          <span className="text-white/70 text-[10px] font-mono bg-black/40 px-2 py-1 rounded backdrop-blur-sm min-w-[3rem] text-center">
            {time}
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between">
          <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            <h4 className={`text-white font-bold tracking-wide ${isMini ? 'text-xs' : 'text-sm'}`}>{label}</h4>
            {location && <p className="text-white/70 text-[10px] font-medium">{location}</p>}
          </div>

          <div className="flex items-center gap-2">
            {src && !hasError && (
              <button 
                onClick={startPlayback}
                disabled={isPlaying}
                className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/60 text-white transition-colors backdrop-blur-sm flex items-center gap-1 text-xs font-bold"
              >
                <Play size={14} />
                <span>{isPlaying ? 'Playing' : 'Play'}</span>
              </button>
            )}
            {!isMini && (
              <>
                <button 
                  onClick={handleToggleMute}
                  className="p-2 rounded-lg bg-black/40 hover:bg-white/20 text-white transition-colors backdrop-blur-sm"
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button className="p-2 rounded-lg bg-black/40 hover:bg-white/20 text-white transition-colors backdrop-blur-sm">
                  <Maximize2 size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Status Badge for Offline/Maintenance */}
      {status !== 'online' && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/60 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <AlertCircle size={32} />
            <span className="font-bold tracking-widest uppercase text-sm">{status}</span>
          </div>
        </div>
      )}
    </div>
  );
}
