import React, { useState, useEffect } from "react";
import { 
  Camera, 
  History, 
  Sliders, 
  Sparkles, 
  Eye, 
  Trash2, 
  Volume2, 
  VolumeX, 
  Info, 
  Clock, 
  ExternalLink,
  ChevronRight,
  Monitor
} from "lucide-react";
import { AppSettings, DetectionHistoryItem } from "./types";
import { CameraView } from "./components/CameraView";
import { SettingsPanel } from "./components/SettingsPanel";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [settings, setSettings] = useState<AppSettings>({
    confidenceThreshold: 0.55,
    voiceEnabled: false,
    boxStyle: "solid",
    boxColor: "#0ea5e9", // Flutter Blue by default
    detectionRate: 5,
    activeEngine: "local",
    theme: "indigo",
  });

  const [history, setHistory] = useState<DetectionHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("flutter_object_detector_history");
      if (saved) {
        // Parse dates correctly
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (e) {
      console.warn("Could not load local history:", e);
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState<"camera" | "history">("camera");
  const [showSettings, setShowSettings] = useState(false);
  const [systemAlert, setSystemAlert] = useState<string | null>("System initialized successfully. Ready to run AR lens.");

  // Save history changes
  useEffect(() => {
    try {
      localStorage.setItem("flutter_object_detector_history", JSON.stringify(history));
    } catch (e) {
      console.warn("Could not save history to localStorage:", e);
    }
  }, [history]);

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const handleAddHistoryItem = (item: {
    source: "local" | "gemini";
    imageUrl: string;
    detections: any[];
    sceneDescription?: string;
  }) => {
    const newItem: DetectionHistoryItem = {
      id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date(),
      imageUrl: item.imageUrl,
      source: item.source,
      sceneDescription: item.sceneDescription,
      detections: item.detections.map((d) => ({
        label: d.label,
        confidence: d.confidence,
        description: d.description || `Detected using ${item.source} model.`,
        material: d.material,
        color: d.color,
      })),
    };
    setHistory((prev) => [newItem, ...prev]);
    setSystemAlert(`New snapshot analyzed: ${newItem.detections.length} objects segmentated.`);
  };

  const clearHistory = () => {
    setHistory([]);
    setSystemAlert("History logs purged.");
  };

  return (
    <div 
      className="min-h-screen w-full overflow-hidden flex flex-col font-sans relative text-white antialiased selection:bg-white/20 select-none"
      style={{
        background: "radial-gradient(circle at 20% 30%, #1e293b 0%, #0f172a 100%)",
      }}
      id="app-root-container"
    >
      {/* Dynamic Ambient Blur Spheres representing the Frosted Theme glow backgrounds */}
      <div className="absolute inset-0 z-0 opacity-30 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500 rounded-full blur-[140px]"
          animate={{
            scale: [1, 1.15, 1],
            x: [0, 40, 0],
            y: [0, -30, 0]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-emerald-500 rounded-full blur-[160px]"
          animate={{
            scale: [1.1, 0.9, 1.1],
            x: [0, -50, 0],
            y: [0, 40, 0]
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div 
          className="absolute top-1/2 right-10 w-72 h-72 bg-amber-400 rounded-full blur-[110px]"
          animate={{
            scale: [0.9, 1.1, 0.9],
            x: [0, 20, 0],
            y: [0, 30, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* AR Lens Viewfinder Grid Lines Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-10">
        <div className="h-full w-px bg-white absolute left-1/3"></div>
        <div className="h-full w-px bg-white absolute left-2/3"></div>
        <div className="w-full h-px bg-white absolute top-1/3"></div>
        <div className="w-full h-px bg-white absolute top-2/3"></div>
      </div>

      {/* Header Bar - Frosted Capsule Glass Style */}
      <header className="relative z-20 px-6 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4" id="app-header">
        <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-5 py-3 shadow-2xl">
          <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse"></div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-xs uppercase tracking-widest font-mono">
              FLUTTER LIVE LENS • ON-DEVICE
            </span>
            <span className="text-white/40 text-[9px] font-mono tracking-tight leading-none mt-0.5">
              POWERED BY COCO-SSD & GEMINI 3.5
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3" id="header-action-controls">
          {/* Quick Info Alert status pills */}
          {systemAlert && (
            <div 
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-white/5 backdrop-blur-lg border border-white/10 rounded-full text-[10px] text-white/60 font-mono"
              onClick={() => setSystemAlert(null)}
            >
              <span>{systemAlert}</span>
            </div>
          )}

          {/* Settings button */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-11 h-11 flex items-center justify-center bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 hover:border-white/20 rounded-xl text-white transition-all shadow-xl cursor-pointer"
            title="Configure model parameters"
            id="header-settings-btn"
          >
            <Sliders className="w-4 h-4 text-white/80" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-20 flex-1 flex flex-col md:flex-row gap-6 p-6 overflow-hidden max-w-[1400px] w-full mx-auto" id="app-main-view">
        {/* Left Side: Dynamic AR Video Feed & Detections (Takes most space) */}
        <div className="flex-1 flex flex-col bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative" id="ar-feed-container">
          {activeTab === "camera" ? (
            <CameraView 
              settings={settings}
              onSelectEngine={(engine) => handleUpdateSettings({ activeEngine: engine })}
              onAddHistoryItem={handleAddHistoryItem}
              activeTab={activeTab}
            />
          ) : (
            /* History Viewer Tab */
            <div className="flex flex-col h-full p-6 overflow-y-auto" id="history-container">
              <div className="flex items-center justify-between mb-6" id="history-header">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-teal-400" />
                    Classification Archive
                  </h3>
                  <p className="text-white/40 text-xs">Past detections and scene summaries</p>
                </div>

                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    id="clear-history-btn"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Logs
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-white/40" id="empty-history">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <History className="w-8 h-8 text-white/20" />
                  </div>
                  <h4 className="font-bold text-sm text-white/60 mb-1">No Captures Recorded</h4>
                  <p className="text-xs max-w-xs leading-relaxed">
                    Trigger a Cloud AI Analysis or wait for on-device detections to capture items.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="history-grid">
                  {history.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 shadow-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${item.source === "gemini" ? "bg-amber-400" : "bg-teal-400"}`} />
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-white/80">
                            {item.source === "gemini" ? "Cloud AI" : "Local Engine"}
                          </span>
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">
                          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Snap image preview */}
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-white/5 bg-neutral-900">
                        <img 
                          src={item.imageUrl} 
                          alt="Capture preview" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {item.sceneDescription && (
                          <div className="absolute bottom-0 inset-x-0 p-2.5 bg-black/60 backdrop-blur-md text-[10px] text-white/90 font-mono italic">
                            "{item.sceneDescription}"
                          </div>
                        )}
                      </div>

                      {/* List of segmentated items */}
                      <div className="space-y-1.5 mt-1">
                        <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest font-mono">
                          Segmented Objects ({item.detections.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5" id={`history-tags-${item.id}`}>
                          {item.detections.map((det, index) => (
                            <div 
                              key={index}
                              className="px-2.5 py-1 bg-white/5 border border-white/5 hover:border-white/20 rounded-lg text-xs flex flex-col gap-0.5 cursor-help transition-all"
                              title={`${det.description || ""}${det.material ? ` | Material: ${det.material}` : ""}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-bold text-white/90">{det.label}</span>
                                <span className="font-mono text-[10px] text-teal-400 font-bold">
                                  {Math.round(det.confidence * 100)}%
                                </span>
                              </div>
                              {det.description && (
                                <span className="text-[9px] text-white/40 max-w-[150px] truncate">
                                  {det.description}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Environment / Diagnostics Card styled like the Sidebar of the Frosted Design */}
        <div className="w-full md:w-80 flex flex-col gap-4">
          {/* Quick HUD Card */}
          <div className="p-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl space-y-6 shadow-3xl text-white">
            <div>
              <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 font-mono flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                Diagnostic Mode
              </h3>
              <p className="text-white font-semibold text-base">Studio Live HUD</p>
              <p className="text-white/40 text-xs italic mt-0.5">High contrast frosted overlay</p>
            </div>

            <div className="h-px bg-white/10"></div>

            <div>
              <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3 font-mono">
                Environment Properties
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Detector Engine</span>
                  <span className="text-white font-mono uppercase bg-white/10 px-2 py-0.5 rounded font-bold text-[10px]">
                    {settings.activeEngine}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Audio Synthesis</span>
                  <button 
                    onClick={() => handleUpdateSettings({ voiceEnabled: !settings.voiceEnabled })}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                      settings.voiceEnabled 
                        ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" 
                        : "bg-white/5 text-white/50 border border-white/5"
                    }`}
                  >
                    {settings.voiceEnabled ? (
                      <>
                        <Volume2 className="w-3 h-3" />
                        Speech On
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3 h-3" />
                        Muted
                      </>
                    )}
                  </button>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Active Targets</span>
                  <span className="text-white font-mono font-bold">
                    {settings.activeEngine === "local" ? "Real-time Tracker" : "Dynamic Segmenter"}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-px bg-white/10"></div>

            <div>
              <h3 className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2 font-mono">
                Session Telemetry
              </h3>
              <div className="space-y-2 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-white/55">Inference Delay</span>
                  <span className="text-teal-400 font-bold">~14ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/55">Confidence Min</span>
                  <span className="text-white font-semibold">{Math.round(settings.confidenceThreshold * 100)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/55">Buffer Snapshot</span>
                  <span className="text-white font-semibold">{history.length} frames</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick instructions capsule card */}
          <div className="p-5 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl text-[11px] text-white/60 leading-relaxed font-mono">
            <div className="flex items-center gap-1.5 text-white/90 font-bold mb-1">
              <Info className="w-3.5 h-3.5 text-teal-400" />
              <span>Did you know?</span>
            </div>
            Trigger the Cloud AI Analysis to let Gemini perform advanced material recognition, color assessment, and state description.
          </div>
        </div>
      </main>

      {/* Floating Bottom Navigator Bar & Action Circle */}
      <footer className="relative z-20 pb-8 pt-3 flex flex-col items-center space-y-5" id="app-footer">
        {/* Tab Selector Mode toggles */}
        <div className="flex items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-2xl">
          <button 
            onClick={() => setActiveTab("camera")}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
              activeTab === "camera" 
                ? "bg-white/15 text-white shadow-inner border border-white/10" 
                : "text-white/45 hover:text-white/70"
            }`}
            id="tab-camera"
          >
            <Camera className="w-3.5 h-3.5" />
            AR Viewfinder
          </button>
          <button 
            onClick={() => setActiveTab("history")}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 ${
              activeTab === "history" 
                ? "bg-white/15 text-white shadow-inner border border-white/10" 
                : "text-white/45 hover:text-white/70"
            }`}
            id="tab-history"
          >
            <History className="w-3.5 h-3.5" />
            Saved Captures
            {history.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-teal-500 text-white font-bold text-[9px] rounded-full">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Center - Big Capture Button representation */}
        <div className="flex items-center gap-8">
          {/* Settings button shortcut */}
          <button 
            onClick={() => setShowSettings(true)}
            className="w-12 h-12 bg-white/10 hover:bg-white/15 backdrop-blur-lg border border-white/20 rounded-2xl flex items-center justify-center text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
            id="quick-settings-launcher"
            title="Open camera configuration drawer"
          >
            <Sliders className="w-4 h-4 text-white/80" />
          </button>
          
          {/* The majestic big circular trigger button representing the camera capture action */}
          <button 
            onClick={() => {
              if (activeTab !== "camera") {
                setActiveTab("camera");
                setSystemAlert("Redirected to camera viewport.");
              } else {
                // If on camera, trigger cloud detection instantly
                const triggerBtn = document.getElementById("cloud-gemini-btn");
                if (triggerBtn) triggerBtn.click();
              }
            }}
            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 cursor-pointer shadow-[0_0_30px_rgba(255,255,255,0.35)] hover:scale-105 active:scale-95 transition-all bg-transparent"
            title="Trigger instant cloud detection"
            id="main-capture-trigger"
          >
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center text-neutral-900 shadow-lg">
              <Sparkles className="w-6 h-6 text-teal-600 animate-pulse" />
            </div>
          </button>

          {/* Quick switch environment shortcut or reset */}
          <button 
            onClick={() => {
              handleUpdateSettings({ activeEngine: settings.activeEngine === "local" ? "gemini" : "local" });
              setSystemAlert(`Engine swapped to ${settings.activeEngine === "local" ? "Gemini Cloud" : "Local on-device"}`);
            }}
            className="w-12 h-12 bg-white/10 hover:bg-white/15 backdrop-blur-lg border border-white/20 rounded-2xl flex items-center justify-center text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
            id="quick-engine-switcher"
            title="Toggle Local vs Gemini AI model"
          >
            <Eye className="w-4 h-4 text-white/80" />
          </button>
        </div>
      </footer>

      {/* Floating Settings Drawer Panel */}
      <AnimatePresence>
        {showSettings && (
          <>
            {/* Backdrop cover overlay */}
            <motion.div 
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              id="settings-drawer-backdrop"
            />
            {/* Sliding Panel */}
            <motion.div 
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              id="settings-drawer-container"
            >
              <SettingsPanel 
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onClose={() => setShowSettings(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
