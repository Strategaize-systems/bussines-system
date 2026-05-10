import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVoiceCapture } from "../useVoiceCapture";

class MockMediaRecorder {
  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  static isTypeSupported(): boolean {
    return true;
  }
  constructor(_stream: MediaStream, _opts?: object) {}
  start(_timeslice?: number) {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio-bytes"], { type: "audio/webm" }) });
    this.onstop?.();
  }
}

class MockMediaStream {
  getTracks() {
    return [{ stop: vi.fn() }];
  }
}

function stubMediaDevices(getUserMedia: () => Promise<MediaStream>) {
  Object.defineProperty(global.navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
}

describe("useVoiceCapture", () => {
  beforeEach(() => {
    vi.stubGlobal("MediaRecorder", MockMediaRecorder);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("happy path: start, stop, returns transcribed text", async () => {
    stubMediaDevices(async () => new MockMediaStream() as unknown as MediaStream);
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ text: "transkribierter Text" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useVoiceCapture());

    await act(async () => {
      await result.current.start();
    });
    expect(result.current.isRecording).toBe(true);
    expect(result.current.error).toBeNull();

    let transcript = "";
    await act(async () => {
      transcript = await result.current.stop();
    });

    expect(transcript).toBe("transkribierter Text");
    expect(result.current.isRecording).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/transcribe");
  });

  it("denied permission: sets error, isRecording stays false", async () => {
    stubMediaDevices(async () => {
      throw new Error("NotAllowedError");
    });

    const { result } = renderHook(() => useVoiceCapture());
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.error).toBe("Mikrofon-Zugriff verweigert");
    expect(result.current.isRecording).toBe(false);
  });

  it("network error during transcribe: sets error, returns empty string", async () => {
    stubMediaDevices(async () => new MockMediaStream() as unknown as MediaStream);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const { result } = renderHook(() => useVoiceCapture());
    await act(async () => {
      await result.current.start();
    });

    let transcript = "x";
    await act(async () => {
      transcript = await result.current.stop();
    });

    expect(transcript).toBe("");
    expect(result.current.error).toBe("Verbindungsfehler bei Transkription");
    expect(result.current.isRecording).toBe(false);
  });
});
