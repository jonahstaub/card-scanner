"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

// Each parallel has a display name, optional /numbered, and search keywords
interface ParallelOption {
  name: string;
  keywords: string[]; // extra terms someone might search
}

const PARALLELS: ParallelOption[] = [
  // Base
  { name: "Base", keywords: ["regular", "common", "standard", "normal"] },
  { name: "Base Image Variation", keywords: ["SP", "short print", "photo variation", "SSP", "image", "variation"] },

  // Refractors (Topps Chrome / Bowman Chrome)
  { name: "Refractor", keywords: ["chrome", "shiny", "ref"] },
  { name: "Gold Refractor /50", keywords: ["chrome", "gold ref", "numbered"] },
  { name: "Blue Refractor /150", keywords: ["chrome", "blue ref"] },
  { name: "Green Refractor /99", keywords: ["chrome", "green ref"] },
  { name: "Purple Refractor /250", keywords: ["chrome", "purple ref"] },
  { name: "Pink Refractor", keywords: ["chrome", "pink ref"] },
  { name: "Aqua Refractor /199", keywords: ["chrome", "aqua ref", "teal"] },
  { name: "Sepia Refractor /75", keywords: ["chrome", "sepia ref", "brown"] },
  { name: "Orange Refractor /25", keywords: ["chrome", "orange ref"] },
  { name: "Red Refractor /5", keywords: ["chrome", "red ref"] },
  { name: "Superfractor /1", keywords: ["chrome", "super", "1/1", "one of one"] },
  { name: "Prism Refractor", keywords: ["chrome", "prism ref", "prizm"] },
  { name: "X-Fractor", keywords: ["chrome", "xfractor", "x fractor"] },
  { name: "Mojo Refractor", keywords: ["bowman", "mojo"] },
  { name: "Atomic Refractor", keywords: ["chrome", "atomic"] },
  { name: "Wave Refractor", keywords: ["chrome", "wave", "wavy"] },
  { name: "Negative Refractor", keywords: ["chrome", "negative", "neg"] },
  { name: "Black Refractor /75", keywords: ["chrome", "black ref"] },

  // Bowman specific
  { name: "1st Bowman", keywords: ["bowman", "first", "prospect", "1st"] },
  { name: "1st Bowman Chrome", keywords: ["bowman", "chrome", "first", "prospect", "1st"] },
  { name: "1st Bowman Chrome Refractor", keywords: ["bowman", "chrome", "first", "ref", "1st"] },
  { name: "1st Bowman Chrome Auto", keywords: ["bowman", "chrome", "first", "autograph", "1st", "auto"] },
  { name: "Bowman Sapphire /50", keywords: ["bowman", "sapphire", "blue", "online exclusive"] },
  { name: "Bowman Sterling Auto", keywords: ["bowman", "sterling", "autograph"] },

  // Prizm (Panini)
  { name: "Prizm Base", keywords: ["panini", "prizm", "base prizm"] },
  { name: "Silver Prizm", keywords: ["panini", "silver", "prizm"] },
  { name: "Gold Prizm /10", keywords: ["panini", "gold", "prizm"] },
  { name: "Green Prizm /75", keywords: ["panini", "green", "prizm"] },
  { name: "Blue Prizm /199", keywords: ["panini", "blue", "prizm"] },
  { name: "Red Prizm /299", keywords: ["panini", "red", "prizm"] },
  { name: "Orange Prizm /49", keywords: ["panini", "orange", "prizm"] },
  { name: "Purple Prizm /49", keywords: ["panini", "purple", "prizm"] },
  { name: "Black Prizm /1", keywords: ["panini", "black", "prizm", "one of one", "1/1"] },
  { name: "Mojo Prizm", keywords: ["panini", "mojo", "prizm"] },
  { name: "Tiger Stripe Prizm", keywords: ["panini", "tiger", "prizm", "stripe"] },
  { name: "Camo Prizm", keywords: ["panini", "camo", "prizm", "camouflage"] },
  { name: "Snakeskin Prizm", keywords: ["panini", "snake", "prizm"] },
  { name: "Fast Break Prizm", keywords: ["panini", "fast break", "prizm", "neon"] },

  // Topps base parallels
  { name: "Gold /2023", keywords: ["topps", "gold", "numbered"] },
  { name: "Rainbow Foil", keywords: ["topps", "rainbow", "foil", "foilboard"] },
  { name: "Vintage Stock /99", keywords: ["topps", "vintage", "stock", "old school"] },
  { name: "Independence Day /76", keywords: ["topps", "independence", "flag", "patriotic"] },
  { name: "Advanced Stats /300", keywords: ["topps", "advanced", "stats", "sabermetrics"] },
  { name: "Father's Day Blue /50", keywords: ["topps", "father", "blue", "holiday"] },
  { name: "Memorial Day Camo", keywords: ["topps", "memorial", "camo", "military"] },
  { name: "Walmart Blue", keywords: ["topps", "walmart", "blue", "exclusive", "retail"] },
  { name: "Target Red", keywords: ["topps", "target", "red", "exclusive", "retail"] },
  { name: "Black /71", keywords: ["topps", "black", "numbered"] },
  { name: "Platinum /1", keywords: ["topps", "platinum", "one of one", "1/1"] },
  { name: "Clear /10", keywords: ["topps", "clear", "acetate", "transparent"] },
  { name: "Printing Plate /1", keywords: ["plate", "1/1", "one of one", "cyan", "magenta", "yellow", "black plate"] },

  // Sapphire / special releases
  { name: "Sapphire", keywords: ["topps", "sapphire", "blue", "online exclusive"] },
  { name: "Ice", keywords: ["topps", "ice", "winter", "frozen"] },
  { name: "Shimmer", keywords: ["topps", "shimmer", "sparkle"] },
  { name: "Lava", keywords: ["topps", "lava", "red orange"] },

  // Autos
  { name: "Auto", keywords: ["autograph", "signature", "signed", "on card", "auto"] },
  { name: "Auto /25", keywords: ["autograph", "signature", "numbered auto", "short print auto"] },
  { name: "Auto /10", keywords: ["autograph", "signature", "low numbered", "rare auto"] },
  { name: "Auto /5", keywords: ["autograph", "signature", "super short print"] },
  { name: "Auto /1", keywords: ["autograph", "signature", "1/1", "one of one"] },
  { name: "Chrome Auto", keywords: ["chrome", "autograph", "signature", "refractor auto"] },
  { name: "Chrome Auto Refractor", keywords: ["chrome", "autograph", "refractor", "ref auto"] },
  { name: "Gold Auto /50", keywords: ["gold", "autograph", "numbered auto"] },
  { name: "Red Auto /5", keywords: ["red", "autograph", "short print"] },
  { name: "Sticker Auto", keywords: ["sticker", "autograph", "not on card"] },

  // Relics / Memorabilia
  { name: "Relic", keywords: ["jersey", "patch", "memorabilia", "game used", "game worn", "swatch", "material"] },
  { name: "Patch Relic", keywords: ["patch", "memorabilia", "multi-color", "game used patch"] },
  { name: "Patch Auto", keywords: ["patch", "autograph", "relic auto", "game used auto", "RPA"] },
  { name: "Relic Auto /25", keywords: ["jersey auto", "patch auto", "numbered", "memorabilia auto", "RPA"] },
  { name: "Bat Relic", keywords: ["bat", "game used", "wood", "memorabilia"] },
  { name: "Jumbo Relic", keywords: ["jumbo", "oversized", "big patch", "large swatch"] },
  { name: "Dual Relic", keywords: ["dual", "double", "two swatch", "two player"] },
  { name: "Triple Relic", keywords: ["triple", "three swatch", "three player"] },
  { name: "Nameplate Relic /1", keywords: ["nameplate", "letter", "1/1", "one of one", "tag"] },
  { name: "Laundry Tag /1", keywords: ["laundry", "tag", "1/1", "one of one"] },
  { name: "MLB Logo Patch /1", keywords: ["logo", "patch", "1/1", "logoman", "one of one"] },

  // Inserts
  { name: "Insert", keywords: ["insert", "subset", "special"] },
  { name: "Short Print (SP)", keywords: ["SP", "short print", "rare base", "hard to find"] },
  { name: "Super Short Print (SSP)", keywords: ["SSP", "super short print", "very rare"] },
  { name: "Rookie Debut", keywords: ["debut", "rookie", "RC", "first"] },
  { name: "All-Star Rookie", keywords: ["all star", "rookie", "cup"] },

  // Numbered generics
  { name: "Numbered /999", keywords: ["numbered", "serial", "/999"] },
  { name: "Numbered /500", keywords: ["numbered", "serial", "/500"] },
  { name: "Numbered /299", keywords: ["numbered", "serial", "/299"] },
  { name: "Numbered /199", keywords: ["numbered", "serial", "/199"] },
  { name: "Numbered /150", keywords: ["numbered", "serial", "/150"] },
  { name: "Numbered /99", keywords: ["numbered", "serial", "/99"] },
  { name: "Numbered /75", keywords: ["numbered", "serial", "/75"] },
  { name: "Numbered /50", keywords: ["numbered", "serial", "/50"] },
  { name: "Numbered /25", keywords: ["numbered", "serial", "/25"] },
  { name: "Numbered /10", keywords: ["numbered", "serial", "/10"] },
  { name: "Numbered /5", keywords: ["numbered", "serial", "/5"] },
  { name: "1/1", keywords: ["one of one", "one of 1", "super rare", "only one"] },
];

export default function ManualEntryPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState("");
  const [year, setYear] = useState("");
  const [cardSet, setCardSet] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [condition, setCondition] = useState("Near Mint");
  const [parallel, setParallel] = useState("Base");
  const [parallelSearch, setParallelSearch] = useState("");
  const [showParallelDropdown, setShowParallelDropdown] = useState(false);
  const parallelInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        parallelInputRef.current &&
        !parallelInputRef.current.contains(e.target as Node)
      ) {
        setShowParallelDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredParallels = useMemo(() => {
    if (!parallelSearch.trim()) return PARALLELS;
    const terms = parallelSearch.toLowerCase().split(/\s+/);
    return PARALLELS.filter((p) => {
      const searchable = [
        p.name.toLowerCase(),
        ...p.keywords.map((k) => k.toLowerCase()),
      ].join(" ");
      return terms.every((term) => searchable.includes(term));
    });
  }, [parallelSearch]);

  function selectParallel(name: string) {
    setParallel(name);
    setParallelSearch("");
    setShowParallelDropdown(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    sessionStorage.setItem(
      "selectedCandidate",
      JSON.stringify({
        playerName,
        year: parseInt(year, 10),
        cardSet,
        cardNumber,
        condition,
        parallel,
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

          <div className="relative">
            <label className="block text-sm mb-1" style={{ color: "#888" }}>
              Card Type / Parallel
            </label>
            <div
              className="w-full px-3 py-2 rounded-lg text-base cursor-pointer flex items-center justify-between"
              style={inputStyle}
              onClick={() => {
                setShowParallelDropdown(true);
                setTimeout(() => parallelInputRef.current?.focus(), 50);
              }}
            >
              <span>{parallel}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="#888">
                <path d="M2 4l4 4 4-4" stroke="#888" strokeWidth="1.5" fill="none" />
              </svg>
            </div>

            {showParallelDropdown && (
              <div
                ref={dropdownRef}
                className="absolute z-50 w-full mt-1 rounded-lg overflow-hidden"
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333",
                  maxHeight: "320px",
                }}
              >
                <div className="sticky top-0 p-2" style={{ backgroundColor: "#1a1a1a" }}>
                  <input
                    ref={parallelInputRef}
                    type="text"
                    value={parallelSearch}
                    onChange={(e) => setParallelSearch(e.target.value)}
                    placeholder="Search... (e.g. gold, auto, /25, jersey, 1/1)"
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: "#222",
                      border: "1px solid #444",
                      color: "#fff",
                    }}
                  />
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: "264px" }}>
                  {filteredParallels.length === 0 ? (
                    <div className="px-3 py-4 text-center">
                      <p className="text-sm" style={{ color: "#888" }}>
                        No match found
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setParallel(parallelSearch);
                          setParallelSearch("");
                          setShowParallelDropdown(false);
                        }}
                        className="mt-2 text-sm font-medium"
                        style={{ color: "#4ade80" }}
                      >
                        Use &quot;{parallelSearch}&quot; as custom type
                      </button>
                    </div>
                  ) : (
                    filteredParallels.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => selectParallel(p.name)}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-[#222] flex items-center justify-between"
                        style={{
                          color: parallel === p.name ? "#4ade80" : "#ccc",
                          borderBottom: "1px solid #222",
                        }}
                      >
                        <span>{p.name}</span>
                        {parallel === p.name && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="#4ade80">
                            <path d="M11.5 3.5L5.5 10.5L2.5 7.5" stroke="#4ade80" strokeWidth="2" fill="none" />
                          </svg>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
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
