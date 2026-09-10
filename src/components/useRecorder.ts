"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Microphone capture, and nothing else: start, stop, keep the take, throw it
   away. Saving is the caller's business — the entry page saves at once, the
   Add a word form keeps the take until the word itself exists.

   Toggle rather than press-and-hold: press-and-hold cannot be operated from a
   keyboard, and a record button that only works with a mouse is no use to
   half the people who might contribute. */

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];

function pickMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return MIME_CANDIDATES.find((m) => {
    try {
      return MediaRecorder.isTypeSupported(m);
    } catch {
      return false;
    }
  });
}

/* MediaRecorder hands back a full type like "audio/webm;codecs=opus", but the
   storage bucket's allowed_mime_types list holds bare types. Sending the
   parameterised string gets the upload rejected, so strip it. */
export function baseMime(mime: string) {
  return mime.split(";")[0].trim();
}

export function extFor(mime: string) {
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

export interface Take {
  blob: Blob;
  url: string;
  seconds: number;
}

export function useRecorder() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [take, setTake] = useState<Take | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);

  useEffect(() => {
    setSupported(
      typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && !!pickMime()
    );
  }, []);

  const release = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => release, [release]);

  // The preview URL goes with the take; this covers leaving the page with a
  // take still waiting.
  useEffect(() => {
    return () => {
      if (take) URL.revokeObjectURL(take.url);
    };
  }, [take]);

  const start = useCallback(async () => {
    setError(null);
    const mime = pickMime();
    if (!mime) {
      setError("This browser cannot record audio. Try Chrome, Safari or Firefox.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream, { mimeType: mime });
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        setTake({ blob, url: URL.createObjectURL(blob), seconds: Math.round(secondsRef.current * 100) / 100 });
        release();
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      secondsRef.current = 0;
      setSeconds(0);
      tickRef.current = setInterval(() => {
        secondsRef.current += 0.1;
        setSeconds(secondsRef.current);
      }, 100);
    } catch (e: any) {
      release();
      setError(
        e?.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser settings and try again."
          : "Could not start recording."
      );
    }
  }, [release]);

  const stop = useCallback(() => {
    if (recRef.current?.state === "recording") recRef.current.stop();
    setRecording(false);
  }, []);

  const discard = useCallback(() => {
    setTake((t) => {
      if (t) URL.revokeObjectURL(t.url);
      return null;
    });
    setSeconds(0);
    setError(null);
  }, []);

  return { supported, recording, take, seconds, error, start, stop, discard };
}
