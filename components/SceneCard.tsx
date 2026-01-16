
import React, { useState } from 'react';
import { StoryScene } from '../types';

interface SceneCardProps {
  scene: StoryScene;
  index: number;
  onRetry?: () => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({ scene, index, onRetry }) => {
  const [copiedType, setCopiedType] = useState<'image' | 'motion' | null>(null);

  const handleDownload = () => {
    if (!scene.imageUrl) return;
    const link = document.createElement('a');
    link.href = scene.imageUrl;
    link.download = `${scene.shotType}-scene-${index + 1}.png`;
    link.click();
  };

  const copyToClipboard = (text: string, type: 'image' | 'motion') => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const isBRoll = scene.shotType === 'b-roll';
  const isFailed = scene.status === 'failed';
  const isGenerating = scene.status === 'generating';

  return (
    <div className={`glass-effect rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 mb-10 border ${isBRoll ? 'border-purple-500/20 scale-[0.98]' : 'border-white/5'} ${isFailed ? 'ring-2 ring-red-500/20' : ''}`}>
      <div className="relative bg-slate-900 flex items-center justify-center overflow-hidden min-h-[250px]">
        {isGenerating && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-[10px] font-black tracking-widest text-white animate-pulse uppercase">Studio Rendering {scene.shotType}</p>
          </div>
        )}
        
        {scene.imageUrl ? (
          <img 
            src={scene.imageUrl} 
            alt={`Scene ${index + 1}`} 
            className="w-full h-auto object-cover max-h-[600px] hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
        ) : (
          <div className="aspect-video w-full flex flex-col items-center justify-center text-slate-700 bg-slate-900/80 p-8 text-center">
            {isFailed ? (
                <>
                    <i className="fa-solid fa-triangle-exclamation text-3xl mb-3 text-red-500/40"></i>
                    <span className="text-[10px] uppercase font-black tracking-widest text-red-400/60">Cinematography Failed</span>
                </>
            ) : (
                <>
                    <i className={`fa-solid ${isBRoll ? 'fa-film' : 'fa-clapperboard'} text-3xl mb-3 opacity-10`}></i>
                    <span className="text-[10px] uppercase font-black tracking-widest opacity-20 italic">Awaiting Cinematography</span>
                </>
            )}
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
           <div className={`px-3 py-1 rounded-full text-[9px] font-black border backdrop-blur-md shadow-lg ${isBRoll ? 'bg-purple-600/70 border-purple-400/30 text-white' : 'bg-blue-600/70 border-blue-400/30 text-white'}`}>
            {scene.shotType.toUpperCase()}
          </div>
          <div className="bg-black/60 px-3 py-1 rounded-full text-[9px] font-black border border-white/10 backdrop-blur-md text-slate-300">
            SHOT #{index + 1}
          </div>
        </div>

        <div className="absolute bottom-4 right-4 flex gap-2">
            {onRetry && !isGenerating && (
                <button 
                    onClick={onRetry}
                    title="Retry generation"
                    className={`w-12 h-12 ${isFailed ? 'bg-red-600/80 hover:bg-red-500' : 'bg-black/50 hover:bg-white/10'} backdrop-blur-xl rounded-2xl flex items-center justify-center text-white border border-white/10 transition-all active:scale-90 shadow-2xl`}
                >
                    <i className="fa-solid fa-rotate-right"></i>
                </button>
            )}
            {scene.imageUrl && (
                <button 
                    onClick={handleDownload}
                    className="w-12 h-12 bg-black/50 hover:bg-blue-600 backdrop-blur-xl rounded-2xl flex items-center justify-center text-white border border-white/10 transition-all active:scale-90 shadow-2xl"
                >
                    <i className="fa-solid fa-cloud-arrow-down"></i>
                </button>
            )}
        </div>
      </div>
      
      <div className="p-6">
        <div className={`mb-6 p-4 rounded-2xl bg-white/5 border-l-4 ${isBRoll ? 'border-purple-500/50' : 'border-blue-500/50'}`}>
          <p className="text-slate-300 leading-relaxed italic text-sm">
            "{scene.originalText}"
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="group relative">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-image text-[8px]"></i> Image Prompt
                </span>
                <button 
                    onClick={() => copyToClipboard(scene.imagePrompt, 'image')}
                    className="text-[10px] font-bold text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                    {copiedType === 'image' ? <><i className="fa-solid fa-check text-green-400"></i> Copied</> : <><i className="fa-solid fa-copy"></i> Copy Prompt</>}
                </button>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-white/5 text-[11px] text-slate-400 font-mono leading-relaxed group-hover:border-blue-500/30 transition-all">
                {scene.imagePrompt}
            </div>
          </div>

          <div className="group relative">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                    <i className="fa-solid fa-video text-[8px]"></i> Motion Direction
                </span>
                <button 
                    onClick={() => copyToClipboard(scene.motionPrompt, 'motion')}
                    className="text-[10px] font-bold text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors"
                >
                    {copiedType === 'motion' ? <><i className="fa-solid fa-check text-green-400"></i> Copied</> : <><i className="fa-solid fa-copy"></i> Copy Motion</>}
                </button>
            </div>
            <div className="bg-black/40 rounded-xl p-4 border border-white/5 text-[11px] text-slate-400 font-mono leading-relaxed group-hover:border-purple-500/30 transition-all">
                {scene.motionPrompt}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
