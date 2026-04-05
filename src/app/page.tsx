"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CardCandidate } from "@/lib/types";

type Status = "camera" | "captured" | "scanning" | "identifying" | "error" | "denied";

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const router = useRouter();
  const [status, setStatus] = useState<Status>("camera");
  const [statusText, setStatusText] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (!cancelled) setStatus("denied");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1024 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.85);

    // Snap the photo and show it immediately
    setCapturedImage(base64);
    setStatus("captured");
  }, []);

  const processImage = useCallback(async (base64: string) => {
    // Step 1: OCR with Tesseract
    setStatus("scanning");
    setStatusText("Reading card text...");

    let ocrText = "";
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const { data } = await worker.recognize(base64);
      ocrText = data.text;
      await worker.terminate();
    } catch {
      setStatus("error");
      return;
    }

    if (!ocrText.trim()) {
      setStatus("error");
      return;
    }

    // Step 2: Send OCR text to Groq for identification
    setStatus("identifying");
    setStatusText("Identifying card...");

    try {
      const res = await fetch("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrText }),
      });

      if (!res.ok) throw new Error("identify failed");

      const data: { candidates: CardCandidate[] } = await res.json();
      sessionStorage.setItem("scan_photo", base64);
      sessionStorage.setItem("scan_candidates", JSON.stringify(data.candidates));
      router.push("/confirm");
    } catch {
      setStatus("error");
    }
  }, [router]);

  const retake = useCallback(() => {
    setCapturedImage(null);
    setStatus("camera");
  }, []);

  if (status === "denied") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center" style={{ backgroundColor: "#111" }}>
        <div className="max-w-[430px]">
          <svg className="mx-auto mb-4" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5">
            <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">Camera Access Required</h2>
          <p className="mb-6" style={{ color: "#888" }}>
            Please enable camera access in your browser settings to scan cards.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 font-medium rounded-xl"
            style={{ backgroundColor: "#4ade80", color: "#000", minHeight: "44px" }}
          >
            Try Again
          </button>
          <button
            onClick={() => router.push("/manual")}
            className="block mx-auto mt-4 px-6 py-3 font-medium rounded-xl"
            style={{ border: "1px solid #333", color: "#888", minHeight: "44px" }}
          >
            Enter Manually
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col items-center" style={{ backgroundColor: "#111" }}>
      <div className="relative flex-1 w-full max-w-[430px] overflow-hidden">
        {/* Live camera (hidden when photo is captured) */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          style={{ display: capturedImage ? "none" : "block" }}
        />

        {/* Captured photo */}
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured card"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        {/* Card alignment overlay (camera mode only) */}
        {status === "camera" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div
              className="rounded-lg"
              style={{
                width: 280,
                height: 380,
                border: "2px dashed #4ade80",
              }}
            />
            <p className="mt-4 text-sm font-medium" style={{ color: "#4ade80" }}>
              Position card in frame
            </p>
          </div>
        )}

        {/* Processing overlay (shown over the captured image) */}
        {(status === "scanning" || status === "identifying") && (
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-20" style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
            <div className="rounded-2xl px-6 py-4 flex items-center gap-3" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
              <div
                className="w-5 h-5 rounded-full border-2 animate-spin"
                style={{ borderColor: "#333", borderTopColor: "#4ade80" }}
              />
              <p className="text-sm" style={{ color: "#ccc" }}>{statusText}</p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}>
            <p className="text-lg font-semibold mb-2">Couldn&apos;t identify this card</p>
            <p className="text-sm mb-6 text-center" style={{ color: "#888" }}>Try again with better lighting or enter the details manually</p>
            <div className="flex gap-3">
              <button
                onClick={retake}
                className="px-5 py-3 font-medium rounded-xl"
                style={{ border: "1px solid #333", minHeight: "44px" }}
              >
                Retake
              </button>
              <button
                onClick={() => router.push("/manual")}
                className="px-5 py-3 font-medium rounded-xl"
                style={{ backgroundColor: "#4ade80", color: "#000", minHeight: "44px" }}
              >
                Manual Entry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        className="w-full max-w-[430px] flex items-center justify-between px-6 py-4"
        style={{ backgroundColor: "#111" }}
      >
        {status === "camera" ? (
          <>
            <button
              onClick={() => router.push("/manual")}
              className="flex flex-col items-center justify-center gap-1"
              style={{ minWidth: "60px", minHeight: "44px", color: "#888" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
              <span className="text-xs">Type it</span>
            </button>

            <button
              onClick={capture}
              className="flex items-center justify-center rounded-full"
              style={{
                width: 72,
                height: 72,
                border: "4px solid #4ade80",
              }}
            >
              <div
                className="rounded-full"
                style={{ width: 56, height: 56, backgroundColor: "#4ade80" }}
              />
            </button>

            <button
              onClick={() => router.push("/collection")}
              className="flex flex-col items-center justify-center gap-1"
              style={{ minWidth: "60px", minHeight: "44px", color: "#888" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 6.878V6a2.25 2.25 0 012.25-2.25h7.5A2.25 2.25 0 0118 6v.878m-12 0c.235-.083.487-.128.75-.128h10.5c.263 0 .515.045.75.128m-12 0A2.25 2.25 0 004.5 9v.878m13.5-3A2.25 2.25 0 0119.5 9v.878m-15-3A2.25 2.25 0 003 9v9a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V9a2.25 2.25 0 00-1.5-2.122" />
              </svg>
              <span className="text-xs">Collection</span>
            </button>
          </>
        ) : status === "captured" ? (
          <>
            <button
              onClick={retake}
              className="px-5 py-3 font-medium rounded-xl"
              style={{ border: "1px solid #333", color: "#888", minHeight: "44px" }}
            >
              Retake
            </button>

            <button
              onClick={() => processImage(capturedImage!)}
              className="px-8 py-3 font-semibold rounded-xl"
              style={{ backgroundColor: "#4ade80", color: "#000", minHeight: "44px" }}
            >
              Scan Card
            </button>

            <button
              onClick={() => router.push("/collection")}
              className="px-5 py-3 font-medium rounded-xl"
              style={{ border: "1px solid #333", color: "#888", minHeight: "44px" }}
            >
              Collection
            </button>
          </>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}
