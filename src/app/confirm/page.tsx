"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CardCandidate } from "@/lib/types";

export default function ConfirmPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<CardCandidate[]>([]);
  const [photo, setPhoto] = useState<string>("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const storedPhoto = sessionStorage.getItem("scan_photo");
    const storedCandidates = sessionStorage.getItem("scan_candidates");
    if (!storedPhoto || !storedCandidates) {
      router.replace("/");
      return;
    }
    setPhoto(storedPhoto);
    setCandidates(JSON.parse(storedCandidates));
  }, [router]);

  if (!candidates.length) return null;

  const candidate = candidates[index];

  function handleNo() {
    if (index < candidates.length - 1) {
      setIndex(index + 1);
    } else {
      // All rejected — go to manual with best guess pre-filled
      sessionStorage.setItem("manual_prefill", JSON.stringify(candidates[0]));
      router.push("/manual");
    }
  }

  function handleYes() {
    sessionStorage.setItem("selected_card", JSON.stringify(candidate));
    router.push("/card/new");
  }

  function handleCancel() {
    router.push("/manual");
  }

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center px-4 py-8"
      style={{ backgroundColor: "#111" }}
    >
      <div className="w-full max-w-[430px] flex flex-col items-center gap-6">
        {/* Card image */}
        {photo && (
          <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #222" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt="Scanned card"
              className="w-64 h-auto object-contain"
              style={{ backgroundColor: "#1a1a1a" }}
            />
          </div>
        )}

        {/* Candidate details */}
        <div
          className="w-full rounded-lg p-5 text-center"
          style={{ backgroundColor: "#1a1a1a", border: "1px solid #222" }}
        >
          <p className="text-2xl font-bold mb-1">{candidate.playerName}</p>
          <p className="text-sm mb-3" style={{ color: "#888" }}>
            {candidate.year} {candidate.cardSet} #{candidate.cardNumber}
          </p>
          <p className="text-sm" style={{ color: "#888" }}>
            Condition: {candidate.condition}
          </p>
          <p className="text-xs mt-2" style={{ color: "#666" }}>
            {Math.round(candidate.confidence * 100)}% confidence
          </p>
        </div>

        {/* Prompt */}
        <p className="text-lg font-semibold" style={{ color: "#4ade80" }}>
          Is this your card?
        </p>

        {/* Action buttons */}
        <div className="w-full flex items-center justify-between gap-3">
          <button
            onClick={handleCancel}
            className="flex items-center justify-center rounded-xl font-medium"
            style={{
              width: 56,
              height: 56,
              backgroundColor: "rgba(239,68,68,0.15)",
              color: "#ef4444",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            X
          </button>

          <button
            onClick={handleNo}
            className="flex-1 py-3 font-medium rounded-xl"
            style={{
              border: "1px solid #333",
              minHeight: "56px",
            }}
          >
            No{index < candidates.length - 1 ? ` (${index + 1}/${candidates.length})` : ""}
          </button>

          <button
            onClick={handleYes}
            className="flex-1 py-3 font-bold rounded-xl"
            style={{
              backgroundColor: "#4ade80",
              color: "#000",
              minHeight: "56px",
            }}
          >
            Yes, that&apos;s it!
          </button>
        </div>
      </div>
    </div>
  );
}
