'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import type { Card, CardCandidate, PriceResponse, PredictResponse } from '@/lib/types';
import { getCard, saveCard, updateCardNotes } from '@/lib/storage';
import CrystalBallGraph from '@/components/CrystalBallGraph';

type LoadingStage = 'init' | 'price' | 'predict' | 'done';

export default function CardDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const isNew = id === 'new';

  const [card, setCard] = useState<Card | null>(null);
  const [stage, setStage] = useState<LoadingStage>('init');
  const [notes, setNotes] = useState('');
  const [priceError, setPriceError] = useState(false);
  const [predictError, setPredictError] = useState(false);
  const [manualPrice, setManualPrice] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const hasStarted = useRef(false);

  // Load existing card
  useEffect(() => {
    if (isNew) return;
    getCard(id).then((c) => {
      if (c) {
        setCard(c);
        setNotes(c.notes);
        setStage('done');
      } else {
        router.replace('/collection');
      }
    });
  }, [id, isNew, router]);

  // Process new card
  const processNewCard = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const raw = sessionStorage.getItem('selectedCandidate');
    const photo = sessionStorage.getItem('capturedPhoto') || '';
    if (!raw) {
      router.replace('/');
      return;
    }

    const candidate: CardCandidate = JSON.parse(raw);
    const cardId = uuidv4();

    const partialCard: Card = {
      id: cardId,
      photo,
      playerName: candidate.playerName,
      year: candidate.year,
      cardSet: candidate.cardSet,
      cardNumber: candidate.cardNumber,
      condition: candidate.condition,
      parallel: candidate.parallel || 'Base',
      currentPrice: 0,
      priceRange: { low: 0, high: 0 },
      priceSources: [],
      predictions: {
        bull: { y1: 0, y3: 0, y5: 0, reasoning: '' },
        base: { y1: 0, y3: 0, y5: 0, reasoning: '' },
        bear: { y1: 0, y3: 0, y5: 0, reasoning: '' },
      },
      notes: '',
      scannedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      manualEntry: false,
      schemaVersion: 1,
    };

    setCard(partialCard);
    setStage('price');

    // Fetch price
    let priceData: PriceResponse | null = null;
    try {
      const priceRes = await fetch('/api/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: candidate.playerName,
          year: candidate.year,
          cardSet: candidate.cardSet,
          cardNumber: candidate.cardNumber,
          condition: candidate.condition,
          parallel: candidate.parallel || 'Base',
        }),
      });
      if (!priceRes.ok) throw new Error('Price fetch failed');
      priceData = await priceRes.json();
    } catch {
      setPriceError(true);
      setStage('done');
      await saveCard(partialCard);
      return;
    }

    // Use corrected name if available
    const correctedName = priceData!.correctedName || candidate.playerName;

    const withPrice: Card = {
      ...partialCard,
      playerName: correctedName,
      currentPrice: priceData!.estimatedPrice,
      priceRange: priceData!.priceRange,
      priceSources: priceData!.sources,
    };
    setCard(withPrice);
    setStage('predict');

    // Fetch predictions
    let predictData: PredictResponse | null = null;
    try {
      const predictRes = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: correctedName,
          year: candidate.year,
          cardSet: candidate.cardSet,
          cardNumber: candidate.cardNumber,
          condition: candidate.condition,
          currentPrice: priceData!.estimatedPrice,
        }),
      });
      if (!predictRes.ok) throw new Error('Predict fetch failed');
      predictData = await predictRes.json();
    } catch {
      setPredictError(true);
      setStage('done');
      await saveCard(withPrice);
      return;
    }

    const completeCard: Card = {
      ...withPrice,
      predictions: predictData!,
    };
    setCard(completeCard);
    setStage('done');
    await saveCard(completeCard);
    sessionStorage.removeItem('selectedCandidate');
    sessionStorage.removeItem('capturedPhoto');
  }, [router]);

  useEffect(() => {
    if (isNew) processNewCard();
  }, [isNew, processNewCard]);

  const handleManualPriceSubmit = useCallback(async () => {
    const price = parseFloat(manualPrice);
    if (!card || isNaN(price) || price <= 0) return;

    const withPrice: Card = {
      ...card,
      currentPrice: price,
      manualEntry: true,
    };
    setCard(withPrice);
    setPriceError(false);
    setShowManualInput(false);
    setStage('predict');

    try {
      const predictRes = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerName: card.playerName,
          year: card.year,
          cardSet: card.cardSet,
          cardNumber: card.cardNumber,
          condition: card.condition,
          currentPrice: price,
        }),
      });
      if (!predictRes.ok) throw new Error('Predict fetch failed');
      const predictData: PredictResponse = await predictRes.json();
      const completeCard: Card = { ...withPrice, predictions: predictData };
      setCard(completeCard);
      setStage('done');
      await saveCard(completeCard);
    } catch {
      setPredictError(true);
      setStage('done');
      await saveCard(withPrice);
    }
  }, [card, manualPrice]);

  const handleNotesBlur = useCallback(async () => {
    if (card) {
      await updateCardNotes(card.id, notes);
    }
  }, [card, notes]);

  const formatPrice = (n: number) =>
    n >= 1 ? `$${Math.round(n).toLocaleString()}` : `$${n.toFixed(2)}`;

  if (!card) {
    return (
      <div className="min-h-screen" style={{ background: '#111' }}>
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="skeleton h-8 w-8" />
        </div>
        <div className="flex gap-4 px-5 mb-5">
          <div className="skeleton flex-shrink-0" style={{ width: 80, height: 112 }} />
          <div className="flex flex-col justify-center gap-2 flex-1">
            <div className="skeleton h-6 w-3/4" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-1/2" />
          </div>
        </div>
        <div className="px-5 mb-6">
          <div className="skeleton h-10 w-32 mb-1" />
          <div className="skeleton h-3 w-24" />
        </div>
        <div className="px-5">
          <div className="skeleton h-[260px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const hasPredictions =
    stage === 'done' && !predictError && card.predictions.bull.y5 > 0;

  return (
    <div className="min-h-screen pb-8" style={{ background: '#111', color: '#fff' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <button
          onClick={() => router.push('/collection')}
          className="text-2xl"
          style={{ color: '#888' }}
        >
          &larr;
        </button>
        {stage === 'done' && (
          <button
            className="px-4 py-1.5 rounded-full text-sm font-medium"
            style={{ background: '#4ade80', color: '#000' }}
          >
            In Collection
          </button>
        )}
      </div>

      {/* Card Info */}
      <div className="flex gap-4 px-5 mb-5">
        <div
          className="rounded-lg overflow-hidden flex-shrink-0"
          style={{ width: 80, height: 112, background: '#1a1a1a' }}
        >
          {card.photo && (
            <Image
              src={card.photo}
              alt={card.playerName}
              width={80}
              height={112}
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-xl font-bold truncate">{card.playerName}</h1>
          <p className="text-sm truncate" style={{ color: '#888' }}>
            {card.year} {card.cardSet} #{card.cardNumber}
          </p>
          <p className="text-sm" style={{ color: '#888' }}>
            {card.parallel && card.parallel !== 'Base' ? `${card.parallel} · ` : ''}{card.condition}
          </p>
        </div>
      </div>

      {/* Price Section */}
      <div className="px-5 mb-6">
        {stage === 'price' ? (
          <div className="rounded-xl p-5" style={{ background: '#1a1a1a' }}>
            <div
              className="skeleton h-10 w-32"
            />
            <p className="text-xs mt-2" style={{ color: '#888' }}>
              Checking market price...
            </p>
          </div>
        ) : priceError && !card.manualEntry ? (
          <div className="rounded-xl p-5" style={{ background: '#1a1a1a' }}>
            <p className="text-sm mb-2" style={{ color: '#888' }}>
              No recent sales found
            </p>
            {showManualInput ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Enter price"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg text-sm"
                  style={{
                    background: '#222',
                    color: '#fff',
                    border: '1px solid #333',
                  }}
                />
                <button
                  onClick={handleManualPriceSubmit}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: '#4ade80', color: '#000' }}
                >
                  Set
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowManualInput(true)}
                className="text-sm font-medium"
                style={{ color: '#4ade80' }}
              >
                Enter price manually
              </button>
            )}
          </div>
        ) : card.currentPrice > 0 ? (
          <div>
            <p className="text-4xl font-bold" style={{ color: '#4ade80' }}>
              {formatPrice(card.currentPrice)}
            </p>
            <p
              className="text-xs mt-1 uppercase tracking-wider"
              style={{ color: '#888' }}
            >
              Est. Market Value
            </p>
          </div>
        ) : null}
      </div>

      {/* Predictions Loading */}
      {stage === 'predict' && (
        <div className="px-5 mb-6">
          <div className="rounded-xl p-5" style={{ background: '#1a1a1a' }}>
            <div className="skeleton h-[220px] flex items-center justify-center">
              <p className="text-xs" style={{ color: '#888' }}>
                Generating predictions...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Crystal Ball Section */}
      {hasPredictions && (
        <div className="px-5 mb-6">
          <h2 className="text-lg font-bold mb-0.5">Crystal Ball</h2>
          <p className="text-xs mb-3" style={{ color: '#888' }}>
            5-year value projection by scenario
          </p>
          <CrystalBallGraph
            predictions={card.predictions}
            currentPrice={card.currentPrice}
          />

          {/* Scenario Breakdown */}
          <div className="mt-4 space-y-3">
            <div
              className="flex items-start justify-between rounded-xl px-4 py-3"
              style={{ background: '#1a1a1a' }}
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium" style={{ color: '#4ade80' }}>
                  Best case
                </p>
                <p className="text-xs" style={{ color: '#888' }}>
                  {card.predictions.bull.reasoning}
                </p>
              </div>
              <p
                className="text-sm font-bold flex-shrink-0"
                style={{ color: '#4ade80' }}
              >
                {formatPrice(card.predictions.bull.y5)}
              </p>
            </div>
            <div
              className="flex items-start justify-between rounded-xl px-4 py-3"
              style={{ background: '#1a1a1a' }}
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium" style={{ color: '#888' }}>
                  Base case
                </p>
                <p className="text-xs" style={{ color: '#666' }}>
                  {card.predictions.base.reasoning}
                </p>
              </div>
              <p
                className="text-sm font-bold flex-shrink-0"
                style={{ color: '#888' }}
              >
                {formatPrice(card.predictions.base.y5)}
              </p>
            </div>
            <div
              className="flex items-start justify-between rounded-xl px-4 py-3"
              style={{ background: '#1a1a1a' }}
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm font-medium" style={{ color: '#ef4444' }}>
                  Worst case
                </p>
                <p className="text-xs" style={{ color: '#888' }}>
                  {card.predictions.bear.reasoning}
                </p>
              </div>
              <p
                className="text-sm font-bold flex-shrink-0"
                style={{ color: '#ef4444' }}
              >
                {formatPrice(card.predictions.bear.y5)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Predictions Unavailable */}
      {stage === 'done' && predictError && card.currentPrice > 0 && (
        <div className="px-5 mb-6">
          <div
            className="rounded-xl p-5 text-center"
            style={{ background: '#1a1a1a' }}
          >
            <p className="text-sm" style={{ color: '#888' }}>
              Predictions unavailable
            </p>
          </div>
        </div>
      )}

      {/* Notes */}
      {stage === 'done' && (
        <div className="px-5">
          <h2 className="text-sm font-medium mb-2" style={{ color: '#888' }}>
            Notes
          </h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add notes about this card..."
            rows={3}
            className="w-full rounded-xl p-4 text-sm resize-none"
            style={{
              background: '#1a1a1a',
              color: '#fff',
              border: '1px solid #222',
              outline: 'none',
            }}
          />
        </div>
      )}
    </div>
  );
}
