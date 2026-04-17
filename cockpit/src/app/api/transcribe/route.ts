import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTranscriptionProvider } from "@/lib/ai/transcription";

export async function POST(request: NextRequest) {
  // Auth check — only authenticated users can transcribe
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: "Keine Audio-Datei" }, { status: 400 });
    }

    // Convert File to Buffer for the provider adapter
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = audioFile.name || "recording.webm";

    // Use the transcription adapter (provider selected via ENV)
    const provider = getTranscriptionProvider();
    const result = await provider.transcribe(buffer, filename);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 502 },
      );
    }

    return NextResponse.json({
      text: result.text,
      language: result.language,
      duration: result.duration,
      provider: result.provider,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Transkription fehlgeschlagen" },
      { status: 500 },
    );
  }
}
