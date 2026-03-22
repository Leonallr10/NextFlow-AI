import { GoogleGenerativeAI } from "@google/generative-ai";
import { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-defaults";

export { DEFAULT_GEMINI_MODEL } from "@/lib/gemini-defaults";

export type GeminiCallInput = {
  model: string;
  systemInstruction?: string;
  userMessage: string;
  imageUrls: string[];
};

export type GeminiCallResult = {
  text: string;
};

async function fetchImagePart(url: string): Promise<{ mimeType: string; data: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${url} (${res.status})`);
  }
  const mimeType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { mimeType, data: buf.toString("base64") };
}

/**
 * Calls Google Gemini (used by Trigger.dev task `run-llm-node` and optional API fallback).
 * Requires GOOGLE_AI_API_KEY in the environment where this runs (Next server or Trigger worker).
 */
export async function callGemini(input: GeminiCallInput): Promise<GeminiCallResult> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: input.model || DEFAULT_GEMINI_MODEL,
    systemInstruction: input.systemInstruction?.trim() || undefined,
  });

  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

  if (input.userMessage.trim()) {
    parts.push({ text: input.userMessage });
  }

  const urls = input.imageUrls.filter((u) => u?.trim());
  if (urls.length > 0) {
    const imageParts = await Promise.all(urls.map((url) => fetchImagePart(url)));
    for (const { mimeType, data } of imageParts) {
      parts.push({ inlineData: { mimeType, data } });
    }
  }

  if (parts.length === 0) {
    parts.push({ text: "Respond helpfully." });
  }

  const result = await model.generateContent(parts);
  const text = result.response.text();
  return { text };
}
