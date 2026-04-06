'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { ScenarioPrediction } from '@/lib/types';

interface CrystalBallGraphProps {
  predictions: {
    bull: ScenarioPrediction;
    base: ScenarioPrediction;
    bear: ScenarioPrediction;
  };
  currentPrice: number;
}

// Interpolate between known price points to generate weekly data
function interpolateWeekly(
  currentPrice: number,
  scenario: ScenarioPrediction
): number[] {
  // Key points: week 0, week 52 (1yr), week 156 (3yr), week 260 (5yr)
  const points = [
    { week: 0, price: currentPrice },
    { week: 52, price: scenario.y1 },
    { week: 156, price: scenario.y3 },
    { week: 260, price: scenario.y5 },
  ];

  const weeks: number[] = [];
  for (let w = 0; w <= 260; w++) {
    // Find which two key points we're between
    let i = 0;
    while (i < points.length - 1 && points[i + 1].week < w) i++;
    if (i >= points.length - 1) {
      weeks.push(points[points.length - 1].price);
      continue;
    }

    const p0 = points[i];
    const p1 = points[i + 1];
    const t = (w - p0.week) / (p1.week - p0.week);
    // Smooth interpolation (ease in-out)
    const smooth = t * t * (3 - 2 * t);
    weeks.push(Math.round((p0.price + (p1.price - p0.price) * smooth) * 100) / 100);
  }
  return weeks;
}

function formatWeekLabel(week: number): string {
  if (week === 0) return 'Now';
  if (week < 52) return `${week}w`;
  const years = Math.floor(week / 52);
  const remainingWeeks = week % 52;
  if (remainingWeeks === 0) return `${years}yr`;
  return `${years}yr ${remainingWeeks}w`;
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length || label === undefined) return null;

  return (
    <div className="rounded-lg px-3 py-2" style={{ background: '#222', border: '1px solid #333' }}>
      <p className="text-xs font-medium mb-1" style={{ color: '#ccc' }}>
        {formatWeekLabel(label)}
      </p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span style={{ color: '#888' }}>
            {entry.dataKey === 'bull' ? 'Elite' : entry.dataKey === 'base' ? 'Base' : 'Decline'}:
          </span>
          <span className="font-medium" style={{ color: entry.color }}>
            ${entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function CrystalBallGraph({
  predictions,
  currentPrice,
}: CrystalBallGraphProps) {
  const bullWeeks = interpolateWeekly(currentPrice, predictions.bull);
  const baseWeeks = interpolateWeekly(currentPrice, predictions.base);
  const bearWeeks = interpolateWeekly(currentPrice, predictions.bear);

  const data = bullWeeks.map((_, i) => ({
    week: i,
    bull: bullWeeks[i],
    base: baseWeeks[i],
    bear: bearWeeks[i],
  }));

  // Show ticks at 0, 1yr, 2yr, 3yr, 4yr, 5yr
  const yearTicks = [0, 52, 104, 156, 208, 260];

  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1a' }}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
          <XAxis
            dataKey="week"
            ticks={yearTicks}
            tickFormatter={(w: number) => {
              if (w === 0) return 'Now';
              return `${w / 52}yr`;
            }}
            tick={{ fill: '#888', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#888', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v}`}
            width={50}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: '#444', strokeDasharray: '4 4' }}
          />
          <Line
            type="monotone"
            dataKey="bull"
            stroke="#4ade80"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#4ade80', stroke: '#4ade80' }}
          />
          <Line
            type="monotone"
            dataKey="base"
            stroke="#888"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4, fill: '#888', stroke: '#888' }}
          />
          <Line
            type="monotone"
            dataKey="bear"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#ef4444', stroke: '#ef4444' }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex justify-center gap-5 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#4ade80' }} />
          <span className="text-xs" style={{ color: '#888' }}>Becomes Elite</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#888' }} />
          <span className="text-xs" style={{ color: '#888' }}>Base Case</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444' }} />
          <span className="text-xs" style={{ color: '#888' }}>Declines</span>
        </div>
      </div>
    </div>
  );
}
