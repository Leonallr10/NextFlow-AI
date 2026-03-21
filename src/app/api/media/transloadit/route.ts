import { NextResponse } from "next/server";
import { buildTransloaditSignature } from "@/lib/transloadit";

export async function POST(request: Request) {
  if (!process.env.TRANSLOADIT_KEY || !process.env.TRANSLOADIT_SECRET) {
    return NextResponse.json(
      {
        ok: false,
        error: "TRANSLOADIT_KEY and TRANSLOADIT_SECRET are required",
      },
      { status: 400 },
    );
  }

  const body = (await request.json()) as {
    templateId?: string;
    inputUrl?: string;
  };

  if (!body.templateId || !body.inputUrl) {
    return NextResponse.json(
      { ok: false, error: "templateId and inputUrl are required" },
      { status: 400 },
    );
  }

  const params = {
    templateId: body.templateId,
    inputUrl: body.inputUrl,
    notifyUrl: process.env.TRANSLOADIT_NOTIFY_URL,
  };
  const { paramsJson, signature } = buildTransloaditSignature(params);

  const formData = new FormData();
  formData.append("params", paramsJson);
  formData.append("signature", signature);

  const ffmpegCommand =
    "ffmpeg -i input.mp4 -vf fps=24,scale=1024:1024 -c:v libx264 -preset medium output.mp4";

  const response = await fetch("https://api2.transloadit.com/assemblies", {
    method: "POST",
    body: formData,
  });

  const assemblyResponse = await response.json();

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to create Transloadit assembly",
        details: assemblyResponse,
      },
      { status: response.status },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Transloadit assembly created successfully.",
    assembly: assemblyResponse,
    ffmpegCommand,
  });
}
