import { z } from "zod";

export const nodeKindSchema = z.enum([
  "text",
  "upload_image",
  "upload_video",
  "llm",
  "crop_image",
  "extract_frame",
]);

export const workflowNodeSchema = z.object({
  id: z.string(),
  type: nodeKindSchema,
  label: z.string().min(1),
  description: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const workflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema),
});

export type WorkflowInput = z.infer<typeof workflowSchema>;
