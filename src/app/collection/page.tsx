"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Card } from "@/lib/types";
import { getAllCards, deleteCard } from "@/lib/storage";

export default function CollectionPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    const allCards = await getAllCards();
    setCards(allCards);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const totalValue = cards.reduce((sum, c) => sum + c.currentPrice, 0);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this card from your collection?")) return;
    setDeletingId(id);
    await deleteCard(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
    setDeletingId(null);
  };

  function getBullBearIndicator(card: Card) {
    const bullDelta = card.predictions.bull.y1 - card.currentPrice;
    const bearDelta = card.currentPrice - card.predictions.bear.y1;
    if (bullDelta >= bearDelta) {
      return (
        <span className="text-xs text-[#4ade80]">
          ↑ Bull: ${card.predictions.bull.y1.toLocaleString()}
        </span>
      );
    }
    return (
      <span className="text-xs text-red-500">
        ↓ Bear: ${card.predictions.bear.y1.toLocaleString()}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111]">
        <div className="mx-auto max-w-[430px] px-4 pt-12 pb-24">
          <div className="skeleton h-8 w-40 mb-2" />
          <div className="skeleton h-4 w-56 mb-6" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-[#1a1a1a] py-3">
              <div className="skeleton flex-shrink-0" style={{ width: 48, height: 67 }} />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-2/3" />
                <div className="skeleton h-3 w-1/2" />
              </div>
              <div className="skeleton h-5 w-14" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111]">
      <div className="mx-auto max-w-[430px] px-4 pt-12 pb-24">
        {/* Header */}
        <h1 className="text-2xl font-bold text-white">My Collection</h1>
        {cards.length > 0 && (
          <p className="mt-1 text-sm text-[#888]">
            {cards.length} card{cards.length !== 1 && "s"} · Est. value:{" "}
            <span className="text-[#4ade80] font-semibold">
              ${totalValue.toLocaleString()}
            </span>
          </p>
        )}

        {/* Card list or empty state */}
        {cards.length === 0 ? (
          <div className="mt-32 flex flex-col items-center text-center">
            <p className="text-[#888] text-base">No cards yet</p>
            <Link
              href="/"
              className="mt-4 rounded-lg bg-[#4ade80] px-6 py-3 text-sm font-semibold text-black"
            >
              Scan your first card
            </Link>
          </div>
        ) : (
          <div className="mt-6">
            {cards.map((card) => (
              <Link key={card.id} href={`/card/${card.id}`}>
                <div className="flex items-center gap-3 border-b border-[#1a1a1a] py-3 group">
                  {/* Thumbnail */}
                  <div className="relative h-[67px] w-[48px] flex-shrink-0 overflow-hidden rounded bg-[#222]">
                    {card.photo ? (
                      <Image
                        src={card.photo}
                        alt={card.playerName}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[#666] text-xs">
                        ?
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">
                      {card.playerName}
                    </p>
                    <p className="text-xs text-[#888] truncate">
                      {card.cardSet} · {card.year}
                    </p>
                  </div>

                  {/* Price + indicator */}
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <span className="text-base font-bold text-[#4ade80]">
                      ${card.currentPrice.toLocaleString()}
                    </span>
                    {getBullBearIndicator(card)}
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, card.id)}
                    disabled={deletingId === card.id}
                    className="ml-1 flex-shrink-0 p-1.5 text-[#666] opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                    aria-label="Delete card"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  </button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <Link
        href="/"
        className="fixed bottom-[30px] right-[20px] z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#4ade80] shadow-lg active:scale-95 transition-transform"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="black"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>
    </div>
  );
}
