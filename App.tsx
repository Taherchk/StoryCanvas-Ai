
import React, { useState, useRef, useEffect } from 'react';
import { StoryScene, StoryState } from './types';
import { analyzeStoryToScenes, generateSceneImage } from './services/geminiService';
import { SceneCard } from './components/SceneCard';

const CURRENT_PROJECT_KEY = 'storycanvas_active_session';
const ARCHIVE_KEY = 'storycanvas_archives';

interface ArchivedProject {
  id: string;
  timestamp: number;
  story: string;
  style: string;
  scenes: StoryScene[];
}

const App: React.FC = () => {
  const [storyInput, setStoryInput] = useState('');
  const [styleInput, setStyleInput] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [showHistory, setShowHistory] = useState(false);
  const [archives, setArchives] = useState<ArchivedProject[]>([]);
  
  const [state, setState] = useState<StoryState>({
    originalStory: '',
    styleInput: '',
    aspectRatio: '16:9',
    scenes: [],
    isAnalyzing: false,
    isGenerating: false,
  });

  // Load Archive and Active Session on mount
  useEffect(() => {
    const savedArchive = localStorage.getItem(ARCHIVE_KEY);
    if (savedArchive) setArchives(JSON.parse(savedArchive));

    const savedActive = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (savedActive) {
      try {
        const parsed = JSON.parse(savedActive);
        setState(prev => ({ ...prev, ...parsed }));
        setStoryInput(parsed.originalStory || '');
        setStyleInput(parsed.styleInput || '');
        setAspectRatio(parsed.aspectRatio || '16:9');
      } catch (e) {
        console.error("Session recovery failed", e);
      }
    }
  }, []);

  // Persist current session
  useEffect(() => {
    if (!state.isAnalyzing && !state.isGenerating && state.scenes.length > 0) {
      localStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify({
        ...state,
        originalStory: storyInput,
        styleInput: styleInput,
        aspectRatio: aspectRatio
      }));
    }
  }, [state, storyInput, styleInput, aspectRatio]);

  const saveToArchive = () => {
    if (state.scenes.length === 0) return;
    const newProject: ArchivedProject = {
      id: `proj-${Date.now()}`,
      timestamp: Date.now(),
      story: storyInput,
      style: styleInput,
      scenes: state.scenes
    };
    const updated = [newProject, ...archives].slice(0, 10); // Keep last 10
    setArchives(updated);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(updated));
  };

  const loadFromArchive = (proj: ArchivedProject) => {
    if (state.scenes.length > 0 && !confirm("Discard current work and load this project?")) return;
    setState({
      originalStory: proj.story,
      styleInput: proj.style,
      aspectRatio: '16:9',
      scenes: proj.scenes,
      isAnalyzing: false,
      isGenerating: false
    });
    setStoryInput(proj.story);
    setStyleInput(proj.style);
    setShowHistory(false);
  };

  const deleteFromArchive = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = archives.filter(a => a.id !== id);
    setArchives(updated);
    localStorage.setItem(ARCHIVE_KEY, JSON.stringify(updated));
  };

  const handleGenerate = async () => {
    if (!storyInput.trim()) return;

    setState(prev => ({ ...prev, scenes: [], isAnalyzing: true }));
    const analysis = await analyzeStoryToScenes(storyInput, styleInput);
    
    if (analysis.length === 0) {
      setState(prev => ({ ...prev, isAnalyzing: false }));
      alert("Analysis failed. Check your API key or connection.");
      return;
    }

    const initialScenes: StoryScene[] = analysis.map((a, i) => ({
      id: `scene-${i}-${Date.now()}`,
      originalText: a.text,
      imagePrompt: a.prompt,
      motionPrompt: a.motionPrompt,
      shotType: a.shotType,
      status: 'pending'
    }));

    setState(prev => ({
      ...prev,
      scenes: initialScenes,
      isAnalyzing: false,
      isGenerating: true
    }));

    for (let i = 0; i < initialScenes.length; i++) {
      await processScene(i, initialScenes[i].imagePrompt);
    }

    setState(prev => ({ ...prev, isGenerating: false }));
    saveToArchive();
  };

  const processScene = async (index: number, prompt: string) => {
    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map((s, idx) => idx === index ? { ...s, status: 'generating' } : s)
    }));

    const url = await generateSceneImage(prompt, aspectRatio);

    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map((s, idx) => idx === index ? { 
        ...s, 
        imageUrl: url || undefined, 
        status: url ? 'completed' : 'failed' 
      } : s)
    }));
  };

  const handleRetry = async (id: string) => {
    const sceneIndex = state.scenes.findIndex(s => s.id === id);
    if (sceneIndex === -1) return;
    const scene = state.scenes[sceneIndex];
    await processScene(sceneIndex, scene.imagePrompt);
  };

  const handleClear = () => {
    if (confirm("Reset current session? History is preserved in the Archive.")) {
        localStorage.removeItem(CURRENT_PROJECT_KEY);
        setStoryInput('');
        setStyleInput('');
        setState({
            originalStory: '',
            styleInput: '',
            aspectRatio: '16:9',
            scenes: [],
            isAnalyzing: false,
            isGenerating: false
        });
    }
  };

  const handleDownloadAll = async () => {
    // @ts-ignore
    if (typeof JSZip === 'undefined') {
        alert("Zip library loading... please wait.");
        return;
    }
    // @ts-ignore
    const zip = new JSZip();
    const mainFolder = zip.folder("01_Main_Scenes");
    const brollFolder = zip.folder("02_B_Roll_Shots");
    const notes: string[] = [];
    
    notes.push("STORYCANVAS PRODUCTION NOTES");
    notes.push("============================\n");
    notes.push(`Story: ${storyInput}\n`);

    const downloadPromises = state.scenes
      .filter(s => s.imageUrl)
      .map(async (scene, index) => {
        try {
            const response = await fetch(scene.imageUrl!);
            const blob = await response.blob();
            const targetFolder = scene.shotType === 'main' ? mainFolder : brollFolder;
            targetFolder.file(`shot-${index + 1}.png`, blob);
            notes.push(`[SHOT ${index + 1}] ${scene.originalText}\n`);
        } catch (err) { console.error(err); }
      });

    zip.file("manifest.txt", notes.join('\n'));
    await Promise.all(downloadPromises);
    const content = await zip.generateAsync({ type: "blob" });
    // @ts-ignore
    if (window.saveAs) {
        // @ts-ignore
        window.saveAs(content, `storycanvas-export-${Date.now()}.zip`);
    }
  };

  const allCompleted = state.scenes.length > 0 && state.scenes.every(s => s.status === 'completed' || s.status === 'failed');

  return (
    <div className="min-h-screen pb-64 md:pb-80 flex flex-col items-center bg-[#03060c] text-slate-100 selection:bg-blue-500/30">
      <header className="w-full max-w-5xl px-6 py-4 flex items-center justify-between sticky top-0 z-[60] glass-effect rounded-b-[2rem] md:rounded-full mt-0 md:mt-6 shadow-2xl border-b border-white/5 ring-1 ring-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <i className="fa-solid fa-clapperboard text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter leading-none uppercase">StoryCanvas <span className="text-blue-500">PRO</span></h1>
            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1 block">Production Engine v3.2</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button onClick={() => setShowHistory(!showHistory)} className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border border-white/5 ${showHistory ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                <i className="fa-solid fa-clock-rotate-left text-xs"></i>
            </button>
            {state.scenes.length > 0 && (
                <button onClick={handleClear} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:text-red-400 transition-all border border-white/5">
                    <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
            )}
            {allCompleted && (
                <button onClick={handleDownloadAll} className="hidden md:flex items-center gap-2 text-[9px] font-black text-white bg-blue-600 px-5 py-2.5 rounded-xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20">
                    <i className="fa-solid fa-file-zipper"></i> EXPORT
                </button>
            )}
        </div>
      </header>

      {/* History Slide-over */}
      {showHistory && (
        <div className="fixed inset-0 z-[70] flex justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
            <div className="relative w-full max-w-md bg-[#080d1a] border-l border-white/10 p-8 flex flex-col shadow-2xl animate-slide-in">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black uppercase tracking-tight">Production Archive</h2>
                    <button onClick={() => setShowHistory(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {archives.length === 0 ? (
                        <div className="text-center py-20 opacity-30 italic text-sm">No archived productions found.</div>
                    ) : archives.map(proj => (
                        <div key={proj.id} onClick={() => loadFromArchive(proj)} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 cursor-pointer group transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                                    {new Date(proj.timestamp).toLocaleDateString()}
                                </span>
                                <button onClick={(e) => deleteFromArchive(proj.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1">
                                    <i className="fa-solid fa-trash text-[10px]"></i>
                                </button>
                            </div>
                            <p className="text-xs text-slate-300 font-medium line-clamp-2 leading-relaxed mb-3">"{proj.story}"</p>
                            <div className="flex items-center gap-2 text-[9px] text-slate-500 font-black uppercase">
                                <i className="fa-solid fa-images"></i> {proj.scenes.length} Scenes
                                <span className="ml-auto flex items-center gap-1 group-hover:text-blue-400 transition-colors">Load Project <i className="fa-solid fa-arrow-right"></i></span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      <main className="w-full max-w-3xl px-6 py-12 flex-1">
        {state.scenes.length === 0 && !state.isAnalyzing ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <div className="relative mb-12 animate-pulse-slow">
                <div className="absolute inset-0 bg-blue-600/10 blur-[120px] rounded-full"></div>
                <div className="relative w-32 h-32 bg-slate-900/50 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl rotate-3">
                    <i className="fa-solid fa-wand-magic-sparkles text-5xl text-blue-500/40"></i>
                </div>
            </div>
            <h2 className="text-3xl font-black mb-4 tracking-tight">Direct Your Vision</h2>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed font-medium">
              Transform scripts into consistent cinematic shots. Paste your story below to begin.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {state.isAnalyzing && (
              <div className="glass-effect p-20 rounded-[3rem] flex flex-col items-center justify-center text-center border border-blue-500/10">
                <div className="w-16 h-16 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h3 className="font-black text-xl mb-3 uppercase tracking-tighter">Analyzing Script</h3>
                <p className="text-[11px] text-slate-500 uppercase tracking-widest leading-loose">Mapping character genomes and environmental anchors...</p>
              </div>
            )}
            {state.scenes.map((scene, idx) => (
              <SceneCard key={scene.id} scene={scene} index={idx} onRetry={() => handleRetry(scene.id)} />
            ))}
          </div>
        )}
      </main>

      {/* Control Deck */}
      <div className="fixed bottom-0 left-0 right-0 p-4 md:p-10 z-50 pointer-events-none">
        <div className="max-w-5xl mx-auto w-full pointer-events-auto">
          <div className="glass-effect rounded-[3rem] p-5 shadow-2xl bg-[#080d1a]/95 backdrop-blur-3xl border border-white/10 ring-1 ring-white/5">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
                <div className="w-10 h-10 bg-black/40 rounded-xl flex items-center justify-center text-blue-400">
                    <i className="fa-solid fa-desktop text-[10px]"></i>
                </div>
                <div className="flex-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Ratio</p>
                    <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="bg-transparent border-none w-full text-[11px] font-bold text-slate-200 focus:ring-0 cursor-pointer p-0 appearance-none">
                        <option value="16:9">16:9 Cinema</option>
                        <option value="9:16">9:16 Vertical</option>
                        <option value="1:1">1:1 Square</option>
                    </select>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/5">
                <div className="w-10 h-10 bg-black/40 rounded-xl flex items-center justify-center text-purple-400">
                    <i className="fa-solid fa-palette text-[10px]"></i>
                </div>
                <div className="flex-1">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Style</p>
                    <input type="text" value={styleInput} onChange={(e) => setStyleInput(e.target.value)} placeholder="Cinematic Noir..." className="bg-transparent border-none text-[11px] font-bold text-slate-200 w-full focus:ring-0 p-0 placeholder:text-slate-800" />
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 bg-black/40 rounded-[2rem] border border-white/5 p-4 focus-within:border-blue-500/30 transition-all">
                  <textarea value={storyInput} onChange={(e) => setStoryInput(e.target.value)} placeholder="Describe the scene or paste your story..." className="w-full bg-transparent border-none focus:ring-0 text-slate-200 placeholder:text-slate-800 resize-none min-h-[50px] max-h-24 text-sm font-medium" />
              </div>
              <button onClick={handleGenerate} disabled={state.isAnalyzing || state.isGenerating || !storyInput.trim()} className={`w-20 h-20 rounded-[2rem] flex flex-col items-center justify-center transition-all ${state.isAnalyzing || state.isGenerating ? 'bg-slate-800 text-slate-500' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30 active:scale-95'}`}>
                {state.isAnalyzing || state.isGenerating ? <i className="fa-solid fa-spinner animate-spin"></i> : <><i className="fa-solid fa-play mb-1"></i><span className="text-[9px] font-black uppercase">Direct</span></>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
