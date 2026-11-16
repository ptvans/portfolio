// Voice-to-text for the chat composers.
//
// Transcription comes from the browser's Web Speech API (`SpeechRecognition`,
// prefixed `webkitSpeechRecognition` in Safari and Chrome). That keeps the
// prototype free of a backend, but it means it only works where the browser
// ships the API — `supported` is false elsewhere (e.g. Firefox) and callers
// should hide the voice control.
//
// A second, independent stream from `getUserMedia` feeds a live level meter.
// It is best-effort: if it can't be opened (permission, or a browser that won't
// share the mic between the two) transcription carries on and `meterLive` is
// false so the UI can fall back to an idle animation.
//
// Dictation is continuous. Browsers end a recognition session on a pause, so an
// unexpected end restarts it until the caller stops or cancels.

import { useCallback, useEffect, useRef, useState } from "react";

// lib.dom doesn't declare the recognizer constructor, so just what we use.
interface Recognizer {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type RecognizerCtor = new () => Recognizer;

// Looked up per use rather than once at load, so late-registered or polyfilled
// implementations are found too.
function getCtor(): RecognizerCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognizerCtor;
    webkitSpeechRecognition?: RecognizerCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export type VoiceError = "denied" | "no-speech" | "unavailable" | null;

export function useSpeechRecognition(lang = "en-US") {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState(""); // final + interim, live
  const [level, setLevel] = useState(0); // 0..1 mic loudness
  const [meterLive, setMeterLive] = useState(false);
  const [error, setError] = useState<VoiceError>(null);

  const recognizer = useRef<Recognizer | null>(null);
  const wanted = useRef(false); // true until stop/cancel, so onend knows to restart
  const finalText = useRef("");
  const interimText = useRef("");
  const meter = useRef<{ ctx: AudioContext; stream: MediaStream; raf: number } | null>(null);

  const stopMeter = useCallback(() => {
    const m = meter.current;
    meter.current = null;
    if (!m) return;
    cancelAnimationFrame(m.raf);
    m.stream.getTracks().forEach((t) => t.stop());
    void m.ctx.close();
    setLevel(0);
    setMeterLive(false);
  }, []);

  const startMeter = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Cancelled while the permission prompt was open.
      if (!wanted.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize);
      const state = { ctx, stream, raf: 0 };
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (const v of data) sum += ((v - 128) / 128) ** 2;
        // Speech sits well below full scale; boost so the meter uses its range.
        setLevel(Math.min(1, Math.sqrt(sum / data.length) * 4));
        state.raf = requestAnimationFrame(tick);
      };
      state.raf = requestAnimationFrame(tick);
      meter.current = state;
      setMeterLive(true);
    } catch {
      /* Meter is optional; transcription still runs. */
    }
  }, []);

  const teardown = useCallback(() => {
    wanted.current = false;
    const r = recognizer.current;
    recognizer.current = null;
    if (r) {
      r.onresult = r.onerror = r.onend = null;
      try {
        r.abort();
      } catch {
        /* already stopped */
      }
    }
    stopMeter();
    setListening(false);
  }, [stopMeter]);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor || wanted.current) return;
    finalText.current = "";
    interimText.current = "";
    setTranscript("");
    setError(null);
    wanted.current = true;

    const open = () => {
      const r = new Ctor();
      r.continuous = true;
      r.interimResults = true;
      r.lang = lang;
      r.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (res.isFinal) finalText.current += `${res[0].transcript.trim()} `;
          else interim += res[0].transcript;
        }
        interimText.current = interim;
        setTranscript((finalText.current + interim).trim());
      };
      r.onerror = (e) => {
        // `no-speech` and `aborted` are routine; onend restarts for those.
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          teardown();
          setError("denied");
        } else if (e.error === "audio-capture" || e.error === "network") {
          teardown();
          setError("unavailable");
        }
      };
      r.onend = () => {
        // The browser ends a session on a pause; keep dictating until told to stop.
        if (!wanted.current) return;
        try {
          open();
        } catch {
          teardown();
          setError("unavailable");
        }
      };
      recognizer.current = r;
      r.start();
    };

    try {
      open();
      setListening(true);
      void startMeter();
    } catch {
      teardown();
      setError("unavailable");
    }
  }, [lang, startMeter, teardown]);

  // Ends dictation and returns everything heard, interim included.
  const stop = useCallback(() => {
    const text = (finalText.current + interimText.current).trim();
    teardown();
    return text;
  }, [teardown]);

  const cancel = useCallback(() => {
    teardown();
    finalText.current = interimText.current = "";
    setTranscript("");
  }, [teardown]);

  // Never leave the mic open behind an unmounted screen.
  useEffect(() => teardown, [teardown]);

  return { supported: Boolean(getCtor()), listening, transcript, level, meterLive, error, start, stop, cancel };
}
