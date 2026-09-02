import React, { useState } from 'react';
import { AITool } from '../types';
import { X, Play, Pause, Volume2, VolumeX, Sparkles, ExternalLink } from 'lucide-react';

interface VideoPreviewModalProps {
  tool: AITool | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectTool: (tool: AITool) => void;
}

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
  tool,
  isOpen,
  onClose,
  onSelectTool,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  if (!isOpen || !tool) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <img
              src={tool.logoUrl}
              alt={tool.name}
              className="w-8 h-8 rounded-lg object-cover border border-slate-200"
            />
            <div>
              <h3 className="font-heading text-base font-bold text-slate-900 flex items-center gap-2">
                {tool.name} <span className="text-xs text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 font-semibold">Video Breakdown</span>
              </h3>
              <p className="text-xs text-slate-500">{tool.tagline}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Canvas / Player */}
        <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden group">
          <img
            src={tool.thumbnailVideoUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80'}
            alt={`${tool.name} Demo`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
          />

          {/* Center Play/Pause Pulsing Trigger */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="absolute z-10 w-16 h-16 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg hover:scale-110 hover:bg-white transition-all cursor-pointer"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5 text-indigo-600" />}
          </button>

          {/* Live Progress Bar and Video Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex items-center justify-between text-white text-xs z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="hover:text-indigo-400 transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="hover:text-indigo-400 transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <span className="font-mono text-[11px] text-slate-300">01:24 / {tool.videoDuration || '04:15'}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-semibold text-slate-200 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-700">
                HD 4K 60FPS
              </span>
              <button
                onClick={() => {
                  onClose();
                  onSelectTool(tool);
                }}
                className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <span>Full Tool Page</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-white flex items-center justify-between text-xs text-slate-600 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Demonstrating real-time model outputs and feature workflows.</span>
          </div>
          <button
            onClick={() => {
              onClose();
              onSelectTool(tool);
            }}
            className="text-indigo-600 hover:underline font-semibold cursor-pointer"
          >
            Explore Pricing & Reviews →
          </button>
        </div>
      </div>
    </div>
  );
};
