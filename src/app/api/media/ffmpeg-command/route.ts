import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    command:
      "ffmpeg -i input.mp4 -vf scale=1280:720 -c:v libx264 -preset medium -crf 23 output.mp4",
    note: "Install FFmpeg locally and run this command in your worker runtime.",
  });
}
