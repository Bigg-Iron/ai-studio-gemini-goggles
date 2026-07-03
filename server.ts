import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 image uploads
app.use(express.json({ limit: "15mb" }));

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// REST API endpoint for advanced Gemini Visual Recognition
app.post("/api/analyze-image", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        error: "Gemini API key is not configured. Please add GEMINI_API_KEY in the Secrets panel.",
      });
    }

    const { image } = req.body; // base64 encoded image
    if (!image) {
      return res.status(400).json({ error: "Missing image data in request body" });
    }

    // Strip out base64 prefix if present (e.g. "data:image/jpeg;base64,...")
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const imagePart = {
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Data,
      },
    };

    const promptPart = {
      text: "Analyze this image and identify the prominent objects. For each identified object, provide its label, confidence score (0.0 to 1.0), bounding box coordinates, a brief description, estimated main material, and dominant color. The bounding box coordinates MUST be represented as [ymin, xmin, ymax, xmax] where each value is an integer percentage from 0 to 100 relative to the image bounds (0,0 is top-left, 100,100 is bottom-right). Return a concise overall description of the scene as well.",
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, promptPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sceneDescription: {
              type: Type.STRING,
              description: "A summary of the environment or scene depicted in the image.",
            },
            objects: {
              type: Type.ARRAY,
              description: "List of identified objects in the image.",
              items: {
                type: Type.OBJECT,
                properties: {
                  label: {
                    type: Type.STRING,
                    description: "The common name of the object (e.g. Laptop, Coffee Cup, Chair).",
                  },
                  confidence: {
                    type: Type.NUMBER,
                    description: "The probability/confidence rating of the detection (0.0 to 1.0).",
                  },
                  boundingBox: {
                    type: Type.ARRAY,
                    description: "Bounding box coordinates as percentages: [ymin, xmin, ymax, xmax] (0 to 100).",
                    items: { type: Type.INTEGER },
                  },
                  description: {
                    type: Type.STRING,
                    description: "A short, helpful description of the object's state or what it is.",
                  },
                  material: {
                    type: Type.STRING,
                    description: "Likely material of the object (e.g. plastic, ceramic, wood, glass).",
                  },
                  color: {
                    type: Type.STRING,
                    description: "Dominant color of the object.",
                  },
                },
                required: ["label", "confidence", "boundingBox", "description"],
              },
            },
          },
          required: ["sceneDescription", "objects"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response received from Gemini API");
    }

    const data = JSON.parse(resultText.trim());
    return res.json(data);
  } catch (error: any) {
    console.error("Gemini Image Analysis Error:", error);
    return res.status(500).json({
      error: "Failed to analyze image",
      details: error.message || error,
    });
  }
});

// Configure Vite or serve static assets
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
