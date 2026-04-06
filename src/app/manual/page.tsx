"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const CONDITIONS = [
  "Gem Mint",
  "Mint",
  "Near Mint",
  "Excellent",
  "Very Good",
  "Good",
  "Fair",
  "Poor",
];

const COMMON_PARALLELS = [
  "Base",
  "Refractor",
  "Gold Refractor",
  "Pink Refractor",
  "Aqua Refractor",
  "Purple Refractor",
  "Sepia Refractor",
  "Prism Refractor",
  "Gold",
  "Silver",
  "Foil",
  "Chrome",
  "Rainbow Foil",
  "Mojo Refractor",
  "1st Bowman Chrome",
  "Sapphire",
  "Ice",
  "Shimmer",
  "Vintage Stock",
  "Independence Day",
  "Printing Plate",
];

export default function ManualEntryPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [year, setYear] = useState("");
  const [cardSet, setCardSet] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [condition, setCondition] = useState("Near Mint");
  const [parallel, setParallel] = useState("Base");
  const [customParallel, setCustomParallel] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    const prefill = sessionStorage.getItem("manual_prefill");
    if (prefill) {
      const data = JSON.parse(prefill);
      setPlayerName(data.playerName || "");
      setYear(data.year?.toString() || "");
      setCardSet(data.cardSet || "");
      setCardNumber(data.cardNumber || "");
      setCondition(data.condition || "Near Mint");
      setParallel(data.parallel || "Base");
      sessionStorage.removeItem("manual_prefill");
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalParallel = showCustom ? customParallel || "Base" : parallel;
    sessionStorage.setItem(
      "selectedCandidate",
      JSON.stringify({
        playerName,
        year: parseInt(year, 10),
        cardSet,
        cardNumber,
        condition,
        parallel: finalParallel,
        confidence: 0,
      })
    );
    sessionStorage.setItem("capturedPhoto", "");
    router.push("/card/new");
  }

  const inputStyle = {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    color: "#fff",
    minHeight: "44px",
  };

  return (
    <div
      className="flex flex-1 flex-col items-center px-4 py-8"
      style={{ backgroundColor: "#111" }}
    >
      <div className="w-full max-w-[430px]">
        <h1 className="text-2xl font-bold mb-6">Enter Card Details</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm mb-1" style={{ color: "#888" }}>
              Player Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-base"
              style={inputStyle}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm mb-1" style={{ color: "#888" }}>
                Year
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                required
                min={1900}
                max={2099}
                className="w-full px-3 py-2 rounded-lg text-base"
                style={inputStyle}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1" style={{ color: "#888" }}>
                Card Number
              </label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg text-base"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: "#888" }}>
              Card Set
            </label>
            <input
              type="text"
              value={cardSet}
              onChange={(e) => setCardSet(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-base"
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: "#888" }}>
              Card Type / Parallel
            </label>
            {!showCustom ? (
              <div className="flex gap-2">
                <select
                  value={parallel}
                  onChange={(e) => setParallel(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-base appearance-none"
                  style={inputStyle}
                >
                  {COMMON_PARALLELS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCustom(true)}
                  className="px-3 py-2 rounded-lg text-sm whitespace-nowrap"
                  style={{ border: "1px solid #333", color: "#888" }}
                >
                  Custom
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customParallel}
                  onChange={(e) => setCustomParallel(e.target.value)}
                  placeholder="e.g. Gold /2023, Sapphire /50"
                  className="flex-1 px-3 py-2 rounded-lg text-base"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowCustom(false);
                    setCustomParallel("");
                  }}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{ border: "1px solid #333", color: "#888" }}
                >
                  List
                </button>
              </div>
            )}
            {parallel !== "Base" && !showCustom && (
              <p className="text-xs mt-1" style={{ color: "#666" }}>
                Numbered? Add it to notes after lookup
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1" style={{ color: "#888" }}>
              Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-base appearance-none"
              style={inputStyle}
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-3 font-bold rounded-xl mt-2"
            style={{
              backgroundColor: "#4ade80",
              color: "#000",
              minHeight: "48px",
            }}
          >
            Look Up Card
          </button>
        </form>

        <button
          onClick={() => router.push("/")}
          className="block mx-auto mt-6 text-sm"
          style={{ color: "#888" }}
        >
          Back to Scanner
        </button>
      </div>
    </div>
  );
}
