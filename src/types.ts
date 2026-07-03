export interface BoundingBox {
  x: number; // percentage or pixel x
  y: number; // percentage or pixel y
  width: number;
  height: number;
}

// Client-side local Coco-SSD detection
export interface LocalDetection {
  id: string;
  label: string;
  confidence: number;
  // Bounding box as standard [x, y, width, height] relative to video container width/height
  bbox: [number, number, number, number];
}

// Server-side Gemini AI detection
export interface GeminiDetection {
  label: string;
  confidence: number;
  // ymin, xmin, ymax, xmax in percentages (0-100)
  boundingBox: [number, number, number, number];
  description: string;
  material?: string;
  color?: string;
}

// API response from backend Gemini call
export interface GeminiAnalysisResponse {
  sceneDescription: string;
  objects: GeminiDetection[];
  error?: string;
  details?: string;
}

// History of captures/detections
export interface DetectionHistoryItem {
  id: string;
  timestamp: Date;
  imageUrl: string;
  source: "local" | "gemini";
  sceneDescription?: string;
  detections: Array<{
    label: string;
    confidence: number;
    description?: string;
    material?: string;
    color?: string;
  }>;
}

// Fallback mock environments for users without webcams or restricted iframe camera permissions
export interface MockEnvironment {
  id: string;
  name: string;
  category: "office" | "kitchen" | "living" | "street";
  imageUrl: string;
  // List of pre-configured moving/static boxes to simulate real-time tracking
  simulatedObjects: Array<{
    label: string;
    confidence: number;
    bbox: [number, number, number, number]; // [x, y, width, height] in percentages
    // Vector movement per tick
    vx?: number;
    vy?: number;
  }>;
}

export interface AppSettings {
  confidenceThreshold: number;
  voiceEnabled: boolean;
  boxStyle: "solid" | "dashed" | "neon";
  boxColor: string;
  detectionRate: number; // detections per second
  activeEngine: "local" | "gemini";
  theme: "teal" | "amber" | "indigo" | "crimson";
}
