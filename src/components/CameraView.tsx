import React, { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, AlertTriangle, Play, Pause, Sparkles, Volume2, Info, Eye } from "lucide-react";
import { AppSettings, LocalDetection, GeminiDetection, MockEnvironment } from "../types";
import { mockEnvironments } from "../data/mockEnvironments";
import { motion, AnimatePresence } from "motion/react";

// Expand window type for CDN script globals
declare global {
  interface Window {
    tf: any;
    cocoSsd: any;
  }
}

interface CameraViewProps {
  settings: AppSettings;
  onSelectEngine: (engine: "local" | "gemini") => void;
  onAddHistoryItem: (item: {
    source: "local" | "gemini";
    imageUrl: string;
    detections: any[];
    sceneDescription?: string;
  }) => void;
  activeTab: string;
}

export const CameraView: React.FC<CameraViewProps> = ({
  settings,
  onSelectEngine,
  onAddHistoryItem,
  activeTab,
}) => {
  const [modelLoading, setModelLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [cameraActive, setCameraActive] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);

  // Engines or source choices
  const [isDemoMode, setIsDemoMode] = useState(true); // Default to true so users can see active simulation immediately!
  const [selectedMockEnv, setSelectedMockEnv] = useState<MockEnvironment>(mockEnvironments[0]);

  // Current states
  const [localDetections, setLocalDetections] = useState<LocalDetection[]>([]);
  const [geminiDetections, setGeminiDetections] = useState<GeminiDetection[]>([]);
  const [sceneDescription, setSceneDescription] = useState<string>("");

  const [simulatedMockObjects, setSimulatedMockObjects] = useState(mockEnvironments[0].simulatedObjects);

  // Refs for elements and tracking
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const localLoopIdRef = useRef<number | null>(null);
  const lastSpokenRef = useRef<{ [key: string]: number }>({});

  // TTS Helper
  const speakText = (text: string) => {
    if (!settings.voiceEnabled) return;
    try {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        // Debounce speech per object to avoid spamming
        const now = Date.now();
        const lastSpoken = lastSpokenRef.current[text] || 0;
        if (now - lastSpoken < 4000) return; // Wait 4s before speaking the exact same label

        window.speechSynthesis.cancel(); // Interrupt current speech
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1;
        window.speechSynthesis.speak(utterance);
        lastSpokenRef.current[text] = now;
      }
    } catch (e) {
      console.error("Speech Synthesis failed:", e);
    }
  };

  // Helper to load external scripts dynamically
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = (e) => reject(new Error(`Failed to load script: ${src}`));
      document.body.appendChild(script);
    });
  };

  // 1. Load CocoSSD model on component mount if in webcam mode
  useEffect(() => {
    const initializeModel = async () => {
      if (modelLoaded || modelLoading) return;
      setModelLoading(true);
      setModelError(null);
      try {
        // Load TFJS first, then Coco-SSD
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js");

        if (window.cocoSsd) {
          const loadedModel = await window.cocoSsd.load({
            base: "lite_mobilenet_v2", // Faster loading & lightweight for web
          });
          modelRef.current = loadedModel;
          setModelLoaded(true);
        } else {
          throw new Error("COCO-SSD script loaded but global namespace cocoSsd not found.");
        }
      } catch (err: any) {
        console.error("Model Loading Error:", err);
        setModelError(err.message || "Failed to download model dependencies.");
      } finally {
        setModelLoading(false);
      }
    };

    initializeModel();
  }, []);

  // 2. Start/Stop webcam stream
  const startCamera = async () => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      setPermissionState("granted");
      setIsDemoMode(false); // Disable demo mode once camera is connected
    } catch (err: any) {
      console.warn("Camera initialization failed:", err);
      setPermissionState("denied");
      setIsDemoMode(true); // Fall back to demo mode on permission error
    }
  };

  const stopCamera = () => {
    if (localLoopIdRef.current) {
      cancelAnimationFrame(localLoopIdRef.current);
      localLoopIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  // Toggle camera active state
  const handleToggleCamera = () => {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  // Switch between Demo mode and Camera mode
  const handleToggleDemoMode = (demo: boolean) => {
    setIsDemoMode(demo);
    if (demo) {
      stopCamera();
      setGeminiDetections([]);
    } else {
      startCamera();
    }
  };

  // Selected mock environment changed
  const handleSelectMockEnv = (envId: string) => {
    const env = mockEnvironments.find((e) => e.id === envId);
    if (env) {
      setSelectedMockEnv(env);
      // Reset position states
      setSimulatedMockObjects(JSON.parse(JSON.stringify(env.simulatedObjects)));
      setGeminiDetections([]);
    }
  };

  // 3. Real-time Object Detection Loop
  useEffect(() => {
    // If we're using local on-device camera and camera is active
    if (cameraActive && modelLoaded && !isDemoMode && settings.activeEngine === "local") {
      const detectFrame = async () => {
        if (!videoRef.current || !modelRef.current || videoRef.current.readyState < 2) {
          localLoopIdRef.current = requestAnimationFrame(detectFrame);
          return;
        }

        try {
          const predictions = await modelRef.current.detect(videoRef.current);

          // Convert predictions to LocalDetection objects
          const filtered = predictions
            .filter((p: any) => p.score >= settings.confidenceThreshold)
            .map((p: any, idx: number) => ({
              id: `${p.class}-${idx}`,
              label: p.class,
              confidence: p.score,
              bbox: p.bbox, // [x, y, width, height]
            }));

          setLocalDetections(filtered);

          // Voice narration for highest confidence item if voice enabled
          if (filtered.length > 0) {
            const sorted = [...filtered].sort((a, b) => b.confidence - a.confidence);
            speakText(`I see a ${sorted[0].label}`);
          }
        } catch (e) {
          console.error("Local object detection error:", e);
        }

        localLoopIdRef.current = requestAnimationFrame(detectFrame);
      };

      localLoopIdRef.current = requestAnimationFrame(detectFrame);
    } else {
      if (localLoopIdRef.current) {
        cancelAnimationFrame(localLoopIdRef.current);
        localLoopIdRef.current = null;
      }
      setLocalDetections([]);
    }

    return () => {
      if (localLoopIdRef.current) {
        cancelAnimationFrame(localLoopIdRef.current);
      }
    };
  }, [cameraActive, modelLoaded, isDemoMode, settings.activeEngine, settings.confidenceThreshold]);

  // 4. Mock simulation loop for Demo Mode
  useEffect(() => {
    if (!isDemoMode) return;

    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      setSimulatedMockObjects((prev) =>
        prev.map((obj) => {
          if (!obj.vx && !obj.vy) return obj;

          // Compute new bounding box coordinates with slight drifting bounds
          const vx = obj.vx || 0;
          const vy = obj.vy || 0;

          let nextX = obj.bbox[0] + vx * Math.sin(tick * 0.05);
          let nextY = obj.bbox[1] + vy * Math.cos(tick * 0.05);

          // Boundaries clamp
          if (nextX < 2) nextX = 2;
          if (nextX + obj.bbox[2] > 98) nextX = 98 - obj.bbox[2];
          if (nextY < 2) nextY = 2;
          if (nextY + obj.bbox[3] > 98) nextY = 98 - obj.bbox[3];

          // Confidence fluctuates slightly
          const confidenceShift = (Math.random() - 0.5) * 0.02;
          const nextConfidence = Math.max(0.5, Math.min(1.0, obj.confidence + confidenceShift));

          return {
            ...obj,
            confidence: parseFloat(nextConfidence.toFixed(2)),
            bbox: [nextX, nextY, obj.bbox[2], obj.bbox[3]],
          };
        })
      );

      // Speak highest confidence item periodically
      if (settings.voiceEnabled && Math.random() > 0.8) {
        const sorted = [...simulatedMockObjects]
          .filter((o) => o.confidence >= settings.confidenceThreshold)
          .sort((a, b) => b.confidence - a.confidence);
        if (sorted.length > 0) {
          speakText(`Mock sensor detects ${sorted[0].label}`);
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isDemoMode, selectedMockEnv, settings.confidenceThreshold, settings.voiceEnabled]);

  // 5. Advanced Gemini AI Vision snapshot trigger
  const handleGeminiAnalysis = async () => {
    setIsAiAnalyzing(true);
    setGeminiDetections([]);
    setSceneDescription("");

    try {
      let imageBase64 = "";

      if (isDemoMode) {
        // For demo mode, fetch the selected mock image and convert to base64
        const response = await fetch(selectedMockEnv.imageUrl);
        const blob = await response.blob();
        imageBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } else {
        // Capture snapshot from live camera feed using canvas
        if (!videoRef.current) throw new Error("Video element is not active");
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Could not acquire 2D canvas context");
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        imageBase64 = canvas.toDataURL("image/jpeg", 0.85);
      }

      // Send to Express Backend proxy endpoint
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64 }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.details || "API Call Failed");
      }

      const data = await response.json();

      setGeminiDetections(data.objects || []);
      setSceneDescription(data.sceneDescription || "Objects detected successfully.");
      onSelectEngine("gemini"); // Set engine mode to Gemini to display its bounding boxes

      // Add item to history list
      onAddHistoryItem({
        source: "gemini",
        imageUrl: imageBase64,
        detections: data.objects || [],
        sceneDescription: data.sceneDescription,
      });

      // Narrate overall scene summary
      if (settings.voiceEnabled && data.sceneDescription) {
        speakText(data.sceneDescription);
      }
    } catch (err: any) {
      console.error("Gemini Vision Failure:", err);
      alert(`AI Recognition Failed: ${err.message || err}`);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  // Convert bounding box relative values
  const getBboxStyle = (obj: any, type: "local" | "mock" | "gemini") => {
    let left = 0, top = 0, width = 0, height = 0;

    if (type === "mock") {
      [left, top, width, height] = obj.bbox;
    } else if (type === "local") {
      const videoWidth = videoRef.current?.videoWidth || 640;
      const videoHeight = videoRef.current?.videoHeight || 480;
      left = (obj.bbox[0] / videoWidth) * 100;
      top = (obj.bbox[1] / videoHeight) * 100;
      width = (obj.bbox[2] / videoWidth) * 100;
      height = (obj.bbox[3] / videoHeight) * 100;
    } else if (type === "gemini") {
      // coordinates are [ymin, xmin, ymax, xmax] in percentages (0-100)
      const [ymin, xmin, ymax, xmax] = obj.boundingBox;
      left = xmin;
      top = ymin;
      width = xmax - xmin;
      height = ymax - ymin;
    }

    // Border and background coloring based on config
    const isSolid = settings.boxStyle === "solid";
    const isNeon = settings.boxStyle === "neon";
    const color = settings.boxColor;

    return {
      left: `${left}%`,
      top: `${top}%`,
      width: `${width}%`,
      height: `${height}%`,
      borderWidth: "2px",
      borderStyle: isSolid ? "solid" : isNeon ? "solid" : "dashed",
      borderColor: color,
      boxShadow: isNeon ? `0 0 12px ${color}, inset 0 0 4px ${color}` : "none",
    };
  };

  return (
    <div className="flex flex-col flex-1 h-full select-none" id="flutter-camera-view-container">
      {/* Simulation Toggle and Switch Selector - Fully Frosted Glass */}
      <div className="p-4 bg-white/5 backdrop-blur-xl border-b border-white/10 flex flex-wrap items-center justify-between gap-3" id="camera-modes-bar">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleDemoMode(false)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
              !isDemoMode
                ? "bg-white/15 text-white border border-white/20 shadow-lg shadow-white/5"
                : "bg-transparent text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
            }`}
            id="camera-select-btn"
          >
            <Camera className="w-3.5 h-3.5" />
            Live Device Camera
          </button>
          <button
            onClick={() => handleToggleDemoMode(true)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
              isDemoMode
                ? "bg-white/15 text-white border border-white/20 shadow-lg shadow-white/5"
                : "bg-transparent text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent"
            }`}
            id="demo-select-btn"
          >
            <Eye className="w-3.5 h-3.5" />
            Simulated Environments
          </button>
        </div>

        {/* Mock Environment Selection dropdown (only visible in Demo Mode) */}
        {isDemoMode && (
          <div className="flex items-center gap-2" id="mock-env-selector">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest font-mono">Scene:</span>
            <select
              value={selectedMockEnv.id}
              onChange={(e) => handleSelectMockEnv(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white/10 backdrop-blur-lg border border-white/15 text-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
              id="scene-dropdown"
            >
              {mockEnvironments.map((env) => (
                <option key={env.id} value={env.id} className="bg-slate-900 text-white">
                  {env.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Stream Canvas Area */}
      <div className="relative flex-1 bg-transparent overflow-hidden flex items-center justify-center p-2" ref={containerRef} id="camera-viewport">
        {/* Absolute Background Flutter Style grid lines */}
        <div className="absolute inset-0 pointer-events-none opacity-10 grid grid-cols-12 grid-rows-12 border border-white/10" />

        {/* 1. Live Camera Mode */}
        {!isDemoMode && (
          <div className="w-full h-full relative flex items-center justify-center max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden bg-neutral-950/40 shadow-2xl border border-white/10">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-xl"
              style={{ transform: "scaleX(-1)" }} // Mirror webcam feed for natural usability
            />

            {/* Displaying Local Coco-SSD Bounding Boxes with Frosted Theme corner accents */}
            {settings.activeEngine === "local" && (
              <div className="absolute inset-0 pointer-events-none">
                {localDetections.map((obj) => (
                  <motion.div
                    key={obj.id}
                    className="absolute rounded-xl transition-all duration-75 flex flex-col justify-start"
                    style={{
                      ...getBboxStyle(obj, "local"),
                      boxShadow: `0 0 20px ${settings.boxColor}33`,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Bounding box label pill styled like the design spec */}
                    <div className="absolute -top-12 left-0">
                      <div 
                        className="backdrop-blur-2xl border rounded-xl px-3.5 py-1.5 flex items-center space-x-3 shadow-2xl"
                        style={{
                          backgroundColor: `${settings.boxColor}22`,
                          borderColor: `${settings.boxColor}66`,
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="text-white/40 text-[8px] font-bold uppercase tracking-widest leading-none">On-Device</span>
                          <span className="text-white font-bold text-[11px] uppercase tracking-wide leading-tight mt-0.5">{obj.label}</span>
                        </div>
                        <div className="h-6 w-px bg-white/20"></div>
                        <div className="text-white font-mono font-bold text-xs">{Math.round(obj.confidence * 100)}%</div>
                      </div>
                    </div>
                    {/* Corner Accents */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-lg"></div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* If camera is inactive, show state placeholder */}
            {!cameraActive && (
              <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6" id="camera-fallback-screen">
                <Camera className="w-12 h-12 text-white/30 mb-3 animate-pulse" />
                <h3 className="text-white font-bold text-sm mb-1 uppercase tracking-wider">Camera Sensor Offline</h3>
                <p className="text-white/40 text-xs max-w-sm mb-5 leading-relaxed font-mono">
                  Grant permission to access hardware camera, or play around inside Simulated Environments mode instantly.
                </p>
                <button
                  onClick={handleToggleCamera}
                  className="px-6 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs rounded-xl shadow-lg hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
                  id="activate-camera-btn"
                >
                  <Play className="w-3.5 h-3.5" />
                  Connect Lens Stream
                </button>
              </div>
            )}
          </div>
        )}

        {/* 2. Simulated Environment Mode */}
        {isDemoMode && (
          <div className="w-full h-full relative flex items-center justify-center max-w-2xl max-h-[80vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-neutral-950/40">
            <img
              src={selectedMockEnv.imageUrl}
              alt={selectedMockEnv.name}
              className="w-full h-full object-cover rounded-xl opacity-90 transition-all duration-500"
              referrerPolicy="no-referrer"
            />

            {/* Displaying Simulated Bounding Boxes */}
            {settings.activeEngine === "local" && (
              <div className="absolute inset-0 pointer-events-none">
                {simulatedMockObjects
                  .filter((obj) => obj.confidence >= settings.confidenceThreshold)
                  .map((obj, idx) => (
                    <motion.div
                      key={`${obj.label}-${idx}`}
                      className="absolute rounded-xl transition-all duration-100 flex flex-col justify-start"
                      style={{
                        ...getBboxStyle(obj, "mock"),
                        boxShadow: `0 0 20px ${settings.boxColor}33`,
                      }}
                    >
                      {/* Bounding box label pill styled like the design spec */}
                      <div className="absolute -top-12 left-0">
                        <div 
                          className="backdrop-blur-2xl border rounded-xl px-3.5 py-1.5 flex items-center space-x-3 shadow-2xl"
                          style={{
                            backgroundColor: `${settings.boxColor}22`,
                            borderColor: `${settings.boxColor}66`,
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="text-white/40 text-[8px] font-bold uppercase tracking-widest leading-none">Mock Sensor</span>
                            <span className="text-white font-bold text-[11px] uppercase tracking-wide leading-tight mt-0.5">{obj.label}</span>
                          </div>
                          <div className="h-6 w-px bg-white/20"></div>
                          <div className="text-white font-mono font-bold text-xs">{Math.round(obj.confidence * 100)}%</div>
                        </div>
                      </div>
                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-lg"></div>
                    </motion.div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* 3. Overlaying Advanced Gemini AI Cloud Bounding Boxes */}
        {settings.activeEngine === "gemini" && geminiDetections.length > 0 && (
          <div className="absolute inset-x-0 inset-y-0 max-w-2xl max-h-[80vh] mx-auto my-auto pointer-events-none p-2 rounded-2xl overflow-hidden">
            {geminiDetections.map((obj, idx) => (
              <motion.div
                key={`gemini-box-${idx}`}
                className="absolute rounded-xl flex flex-col justify-start transition-all duration-500"
                style={{
                  ...getBboxStyle(obj, "gemini"),
                  boxShadow: `0 0 25px ${settings.boxColor}44`,
                }}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
              >
                {/* Advanced Multi-property tag chip */}
                <div className="absolute -top-12 left-0">
                  <div 
                    className="backdrop-blur-3xl border rounded-xl px-3.5 py-1.5 flex items-center space-x-3 shadow-2xl"
                    style={{
                      backgroundColor: `${settings.boxColor}33`,
                      borderColor: `${settings.boxColor}88`,
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-amber-300 text-[8px] font-bold uppercase tracking-widest leading-none flex items-center gap-1">
                        <Sparkles className="w-2 h-2 text-yellow-300" /> Gemini
                      </span>
                      <span className="text-white font-bold text-[11px] uppercase tracking-wide leading-tight mt-0.5">{obj.label}</span>
                    </div>
                    <div className="h-6 w-px bg-white/20"></div>
                    <div className="text-white font-mono font-bold text-xs">{Math.round(obj.confidence * 100)}%</div>
                  </div>
                </div>
                {/* Corner Accents */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-lg"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-lg"></div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 4. Model Loading / Initializing Overlay */}
        {!modelLoaded && modelLoading && (
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6" id="model-loader-overlay">
            <RefreshCw className="w-10 h-10 text-teal-400 animate-spin mb-4" />
            <h3 className="text-white font-medium text-sm mb-1 font-sans">Downloading Neural Weights</h3>
            <p className="text-gray-400 text-xs max-w-xs text-center font-mono">
              Fetching MobileNet on-device computer vision engine (approx 2MB)...
            </p>
          </div>
        )}

        {/* 5. Error Overlay */}
        {modelError && (
          <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center text-center p-6" id="model-error-overlay">
            <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
            <h3 className="text-white font-medium text-sm mb-1">On-Device Model Failed to Initialize</h3>
            <p className="text-amber-300 text-xs max-w-sm font-mono mb-4 bg-amber-900/20 p-2 rounded border border-amber-800/30">
              {modelError}
            </p>
            <p className="text-gray-400 text-xs mb-4">
              Real-time local tracking is inactive. You can still use the Cloud-based Gemini Vision AI engine!
            </p>
          </div>
        )}

        {/* 6. AI Vision analysis spinner overlay */}
        <AnimatePresence>
          {isAiAnalyzing && (
            <motion.div
              className="absolute inset-0 bg-teal-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 z-30 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              id="ai-loader"
            >
              <div className="relative mb-6">
                <Sparkles className="w-14 h-14 text-teal-300 animate-pulse" />
                <RefreshCw className="w-16 h-16 text-teal-500 animate-spin absolute -top-1 -left-1 opacity-60" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Gemini Cloud Intelligence</h3>
              <p className="text-teal-200 text-xs max-w-sm leading-relaxed font-mono">
                Capturing high-resolution viewport snapshot and transmitting to Gemini-3.5-Flash for deep environmental analysis...
              </p>
              <div className="mt-6 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-teal-900/50 border border-teal-800/60 text-teal-300 text-[10px] font-semibold tracking-wider uppercase font-mono animate-bounce">
                Running Visual Segmentation
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Control Bar or Drawer Actions representing Flutter elements - Frosted Glass style */}
      <div className="p-4 bg-white/5 backdrop-blur-xl border-t border-white/10 flex flex-col gap-3 md:flex-row md:items-center md:justify-between" id="viewport-control-bar">
        <div className="flex items-center gap-2">
          {/* Active Mode status badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold font-mono">
            {settings.activeEngine === "local" ? (
              <>
                <Eye className="w-3.5 h-3.5 text-teal-400" />
                <span>On-Device Active</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Cloud AI Active</span>
              </>
            )}
          </div>

          {settings.activeEngine === "gemini" && (
            <button
              onClick={() => onSelectEngine("local")}
              className="px-3.5 py-1.5 text-[10px] font-bold tracking-wider uppercase text-teal-400 hover:text-teal-300 hover:bg-white/5 border border-teal-500/30 rounded-xl transition-all cursor-pointer"
              id="restore-local-btn"
            >
              Reset to Live Feed
            </button>
          )}
        </div>

        {/* Primary Action Trigger: Gemini Cloud Recognition Button */}
        <div className="flex items-center gap-2 self-end w-full md:w-auto md:self-center" id="vision-primary-actions">
          <button
            onClick={handleGeminiAnalysis}
            disabled={isAiAnalyzing}
            className="flex-1 md:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl border border-white/20 hover:border-white/30 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            id="cloud-gemini-btn"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            Analyze Snapshot with Gemini
          </button>
        </div>
      </div>

      {/* Cloud Analysis Results panel (when engine === 'gemini') - Beautifully Frosted Glass */}
      {settings.activeEngine === "gemini" && geminiDetections.length > 0 && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white/5 backdrop-blur-2xl border-t border-white/10 p-5 overflow-y-auto max-h-[25vh] font-sans"
          id="gemini-results-drawer"
        >
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-white/10 rounded-xl border border-white/10 text-white">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white font-bold text-sm leading-tight flex items-center gap-2 uppercase tracking-wider font-mono">
                  Gemini Scene Segmentation
                  <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                    CLOUD
                  </span>
                </h4>
                <p className="text-white/70 text-xs leading-relaxed mt-1 font-mono italic">
                  "{sceneDescription}"
                </p>
              </div>
            </div>

            {/* Structured Item List Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="segmented-items-grid">
              {geminiDetections.map((item, idx) => (
                <div
                  key={`res-card-${idx}`}
                  className="bg-white/5 rounded-xl p-3 border border-white/10 shadow-lg flex flex-col gap-1.5 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                  onClick={() => speakText(`${item.label}. It is ${item.description}`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: settings.boxColor }} />
                      {item.label}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-teal-400 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded">
                      {Math.round(item.confidence * 100)}% Match
                    </span>
                  </div>
                  <p className="text-white/60 text-[11px] leading-snug">
                    {item.description}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 pt-1.5 border-t border-white/5 text-[9px] font-mono font-semibold text-white/40">
                    {item.material && (
                      <span className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded uppercase">
                        Mat: {item.material}
                      </span>
                    )}
                    {item.color && (
                      <span className="bg-white/5 border border-white/5 px-1.5 py-0.5 rounded uppercase">
                        Clr: {item.color}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
