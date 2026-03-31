import { useState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";

interface VideoPlayerProps {
  streamUrl: string;
  isFlagged?: boolean;
}

export default function VideoPlayer({ streamUrl, isFlagged }: VideoPlayerProps) {
  const [showWarning, setShowWarning] = useState(isFlagged);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setShowWarning(isFlagged);
  }, [isFlagged]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex flex-col justify-center border border-zinc-800 shadow-2xl">
      {showWarning ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-3 tracking-tight">Sensitive Content Warning</h3>
          <p className="text-zinc-400 max-w-md mb-8 leading-relaxed">
            This video has been flagged for potentially sensitive content by our automated analysis system. Viewer discretion is advised.
          </p>
          <button
            onClick={() => setShowWarning(false)}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors focus-ring"
          >
            Acknowledge & Watch
          </button>
        </div>
      ) : null}

      <video
        ref={videoRef}
        controls
        className="w-full h-full object-contain"
        src={streamUrl}
        controlsList="nodownload"
      >
        <p>Your browser doesn't support HTML video.</p>
      </video>
    </div>
  );
}
