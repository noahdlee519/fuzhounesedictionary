"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useL } from "./LangProvider";

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

/* A take shorter than this is a slip — Record and Stop pressed together — and
   was being saved as a silent recording (audit, 11 Oct 2026). */
const MIN_SECONDS = 0.5;
/* A take is stopped by itself at this length: a recording left running would
   otherwise grow until the upload limit refused it, minutes later. */
const MAX_SECONDS = 120;

export interface Take {
  blob: Blob;
  url: string;
  seconds: number;
}

export function useRecorder() {
  const L = useL();
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

  /* Set while the microphone is being asked for. The Record button stays
     pressable during that wait (the browser's permission prompt can take a
     while), and a second press started a second recorder: Stop then stopped
     only one, the microphone stayed on, and the take's length doubled
     (audit, 26 Sep 2026). */
  const startingRef = useRef(false);
  /* Set from Stop until the take is in (onstop). The recorder reads as
     inactive the moment stop() is called, but its last data and onstop come
     later: a second Stop in that gap used to show Record with no take, and a
     Record pressed then had the old recorder's data and release() land on
     the new one (review, 11 Oct 2026). */
  const stoppingRef = useRef(false);
  const requestStop = () => {
    if (recRef.current?.state !== "recording") return false;
    stoppingRef.current = true;
    recRef.current.stop();
    return true;
  };

  const start = useCallback(async () => {
    if (startingRef.current || stoppingRef.current || recRef.current?.state === "recording") return;
    startingRef.current = true;
    setError(null);
    const mime = pickMime();
    if (!mime) {
      setError(L("This browser cannot record audio. Try Chrome, Safari or Firefox.", "這個瀏覽器無法錄音。請改用 Chrome、Safari 或 Firefox。"));
      startingRef.current = false;
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // This recorder's own list, so nothing of it can end up in another take.
      const chunks: Blob[] = [];
      chunksRef.current = chunks;
      const rec = new MediaRecorder(stream, { mimeType: mime });
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: mime });
        const secs = Math.round(secondsRef.current * 100) / 100;
        release();
        stoppingRef.current = false;
        // The button changes back only now that the take is in, so Record
        // does not flash up for a moment between Stop and the take.
        setRecording(false);
        if (secs < MIN_SECONDS || blob.size === 0) {
          setError(L("That was too short. Press Record, say the word, then press Stop.", "錄得太短了。按「錄音」，講完再按「停止」。"));
          return;
        }
        setTake({ blob, url: URL.createObjectURL(blob), seconds: secs });
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      secondsRef.current = 0;
      setSeconds(0);
      tickRef.current = setInterval(() => {
        secondsRef.current += 0.1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= MAX_SECONDS) requestStop();
      }, 100);
    } catch (e: any) {
      release();
      setError(
        e?.name === "NotAllowedError"
          ? L("Microphone access was blocked. Allow it in your browser settings and try again.", "麥克風權限被封鎖了。請在瀏覽器設定中允許後再試一次。")
          : e?.name === "NotFoundError" || e?.name === "OverconstrainedError"
            ? L("No microphone was found. Connect one, or try on a phone.", "找不到麥克風。請接上麥克風，或改用手機。")
            : e?.name === "NotReadableError"
              ? L("The microphone is being used by another app. Close it and try again.", "麥克風正被其他應用程式使用。請先關閉它再試一次。")
              : L("Could not start recording.", "無法開始錄音。")
      );
    } finally {
      startingRef.current = false;
    }
  }, [release]);

  const stop = useCallback(() => {
    // While recording, onstop (above) turns the button back once the take is
    // in; while a stop is already on its way, wait for it; otherwise there is
    // nothing to wait for.
    if (stoppingRef.current) return;
    if (!requestStop()) setRecording(false);
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
