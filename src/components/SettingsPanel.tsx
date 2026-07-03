import React from "react";
import { X, Volume2, ShieldAlert, Square, Layers, Palette, Sliders, RefreshCw, Smartphone } from "lucide-react";
import { AppSettings } from "../types";

interface SettingsPanelProps {
  settings: AppSettings;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onClose: () => void;
}

const COLOR_OPTIONS = [
  { name: "Material Teal", hex: "#0d9488" },
  { name: "Neon Emerald", hex: "#10b981" },
  { name: "Vibrant Amber", hex: "#f59e0b" },
  { name: "Flutter Blue", hex: "#0ea5e9" },
  { name: "Deep Indigo", hex: "#6366f1" },
  { name: "Cyber Crimson", hex: "#f43f5e" },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  return (
    <div className="flex flex-col h-full bg-white font-sans text-neutral-800" id="settings-panel">
      {/* Drawer Header styled like Material AppBar */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between" id="settings-header">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-teal-600" />
          <h3 className="font-bold text-sm tracking-tight text-neutral-900">Flutter Engine Preferences</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-200/60 rounded-full transition-all text-neutral-500"
          id="close-settings-btn"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Settings list styled like Flutter's SettingsList */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6" id="settings-body">
        {/* Section 1: Detection Settings */}
        <div className="space-y-4" id="section-detection">
          <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5" />
            Detector Constants
          </h4>

          {/* Slider for Confidence Threshold */}
          <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-700">Confidence Threshold</span>
              <span className="text-xs font-bold font-mono text-teal-600">
                {Math.round(settings.confidenceThreshold * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="0.95"
              step="0.05"
              value={settings.confidenceThreshold}
              onChange={(e) => onUpdateSettings({ confidenceThreshold: parseFloat(e.target.value) })}
              className="w-full accent-teal-600 cursor-pointer h-1 bg-gray-200 rounded-lg appearance-none"
              id="confidence-range-slider"
            />
            <p className="text-[10px] text-neutral-400 leading-normal font-mono">
              Ignore local object detections below this confidence score. Decreasing captures more but increases noise.
            </p>
          </div>
        </div>

        {/* Section 2: Audio Preferences */}
        <div className="space-y-4" id="section-audio">
          <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            Accessibility & Speech
          </h4>

          {/* Speech synthesis toggle */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-neutral-700">Voice Narrator</span>
              <p className="text-[10px] text-neutral-400 leading-normal max-w-[200px]">
                Speak the names of recognized items automatically using Text-to-Speech.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer" id="narrator-toggle">
              <input
                type="checkbox"
                checked={settings.voiceEnabled}
                onChange={(e) => onUpdateSettings({ voiceEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
            </label>
          </div>
        </div>

        {/* Section 3: Visual Styling */}
        <div className="space-y-4" id="section-visuals">
          <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            Overlay Aesthetics
          </h4>

          {/* Bounding box design selector */}
          <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <span className="text-xs font-semibold text-neutral-700 block mb-1">Bounding Box Format</span>
            <div className="grid grid-cols-3 gap-2" id="box-style-selectors">
              {(["solid", "dashed", "neon"] as const).map((style) => (
                <button
                  key={style}
                  onClick={() => onUpdateSettings({ boxStyle: style })}
                  className={`py-2 text-xs font-bold rounded-lg border capitalize transition-all ${
                    settings.boxStyle === style
                      ? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/10"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100"
                  }`}
                  id={`box-style-${style}`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Box color picker */}
          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <span className="text-xs font-semibold text-neutral-700 block mb-1">Target Reticle Accent</span>
            <div className="grid grid-cols-3 gap-2" id="box-color-selectors">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.hex}
                  onClick={() => onUpdateSettings({ boxColor: opt.hex })}
                  className={`p-2 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    settings.boxColor === opt.hex
                      ? "border-neutral-800 bg-white shadow-sm ring-2 ring-neutral-800/20"
                      : "border-gray-100 bg-white hover:border-gray-300"
                  }`}
                  id={`color-${opt.hex}`}
                >
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: opt.hex }} />
                  <span className="text-[9px] font-bold font-mono text-neutral-500 whitespace-nowrap overflow-hidden text-ellipsis max-w-[65px]">
                    {opt.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Flutter Theme styling */}
        <div className="space-y-4" id="section-flutter-branding">
          <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            Material 3 Theme Palette
          </h4>

          <div className="grid grid-cols-2 gap-2" id="theme-selectors">
            {([
              { id: "teal", label: "M3 Teal", color: "bg-teal-600" },
              { id: "amber", label: "M3 Amber", color: "bg-amber-500" },
              { id: "indigo", label: "M3 Indigo", color: "bg-indigo-600" },
              { id: "crimson", label: "M3 Crimson", color: "bg-rose-600" },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => onUpdateSettings({ theme: t.id })}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  settings.theme === t.id
                    ? "bg-neutral-900 border-neutral-900 text-white shadow-md"
                    : "bg-gray-50 border-gray-100 text-neutral-600 hover:bg-gray-100"
                }`}
                id={`theme-btn-${t.id}`}
              >
                <div className={`w-3.5 h-3.5 rounded-full ${t.color}`} />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer credits */}
      <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 text-center" id="settings-footer">
        <span className="text-[10px] font-mono text-neutral-400 font-bold tracking-widest uppercase block">
          Flutter SDK Simulated Environment
        </span>
      </div>
    </div>
  );
};
