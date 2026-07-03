import { MockEnvironment } from "../types";

export const mockEnvironments: MockEnvironment[] = [
  {
    id: "office",
    name: "Developer Workspace",
    category: "office",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80",
    simulatedObjects: [
      {
        label: "laptop",
        confidence: 0.96,
        bbox: [15, 30, 50, 40], // [x, y, width, height] as percentages
        vx: 0.1,
        vy: -0.05,
      },
      {
        label: "coffee cup",
        confidence: 0.88,
        bbox: [70, 55, 12, 18],
        vx: -0.05,
        vy: 0.05,
      },
      {
        label: "headphones",
        confidence: 0.94,
        bbox: [20, 5, 25, 22],
        vx: 0.02,
        vy: 0.02,
      },
      {
        label: "cell phone",
        confidence: 0.82,
        bbox: [55, 65, 10, 15],
        vx: 0.08,
        vy: -0.04,
      },
      {
        label: "keyboard",
        confidence: 0.91,
        bbox: [32, 50, 30, 10],
        vx: 0.0,
        vy: 0.0,
      }
    ],
  },
  {
    id: "kitchen",
    name: "Chef's Kitchen Counter",
    category: "kitchen",
    imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80",
    simulatedObjects: [
      {
        label: "bottle",
        confidence: 0.89,
        bbox: [10, 20, 8, 30],
        vx: 0.0,
        vy: 0.05,
      },
      {
        label: "bottle",
        confidence: 0.91,
        bbox: [20, 18, 7, 32],
        vx: 0.05,
        vy: 0.0,
      },
      {
        label: "bowl",
        confidence: 0.85,
        bbox: [42, 45, 20, 15],
        vx: -0.1,
        vy: 0.0,
      },
      {
        label: "potted plant",
        confidence: 0.78,
        bbox: [78, 15, 15, 35],
        vx: 0.02,
        vy: -0.02,
      },
      {
        label: "sink",
        confidence: 0.86,
        bbox: [35, 55, 45, 25],
        vx: 0.0,
        vy: 0.0,
      }
    ],
  },
  {
    id: "living",
    name: "Modern Living Room",
    category: "living",
    imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
    simulatedObjects: [
      {
        label: "couch",
        confidence: 0.98,
        bbox: [10, 45, 55, 35],
        vx: 0.0,
        vy: 0.0,
      },
      {
        label: "chair",
        confidence: 0.91,
        bbox: [70, 40, 22, 45],
        vx: -0.05,
        vy: 0.05,
      },
      {
        label: "vase",
        confidence: 0.84,
        bbox: [45, 15, 10, 20],
        vx: 0.08,
        vy: 0.08,
      },
      {
        label: "potted plant",
        confidence: 0.87,
        bbox: [3, 20, 15, 30],
        vx: -0.02,
        vy: 0.02,
      },
      {
        label: "book",
        confidence: 0.79,
        bbox: [35, 35, 8, 6],
        vx: 0.05,
        vy: -0.05,
      }
    ],
  },
  {
    id: "street",
    name: "Metropolitan Street",
    category: "street",
    imageUrl: "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=800&q=80",
    simulatedObjects: [
      {
        label: "car",
        confidence: 0.95,
        bbox: [15, 40, 30, 25],
        vx: 0.3,
        vy: 0.05,
      },
      {
        label: "car",
        confidence: 0.89,
        bbox: [55, 38, 25, 20],
        vx: -0.25,
        vy: 0.02,
      },
      {
        label: "traffic light",
        confidence: 0.92,
        bbox: [45, 10, 10, 18],
        vx: 0.0,
        vy: 0.0,
      },
      {
        label: "person",
        confidence: 0.84,
        bbox: [5, 45, 10, 35],
        vx: 0.12,
        vy: -0.05,
      },
      {
        label: "handbag",
        confidence: 0.72,
        bbox: [10, 60, 5, 10],
        vx: 0.12,
        vy: -0.05,
      }
    ],
  }
];
