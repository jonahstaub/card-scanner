'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Dot,
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

export default function CrystalBallGraph({
  predictions,
  currentPrice,
}: CrystalBallGraphProps) {
  const data = [
    {
      label: 'Now',
      bull: currentPrice,
      base: currentPrice,
      bear: currentPrice,
    },
    {
      label: '1yr',
      bull: predictions.bull.y1,
      base: predictions.base.y1,
      bear: predictions.bear.y1,
    },
    {
      label: '3yr',
      bull: predictions.bull.y3,
      base: predictions.base.y3,
      bear: predictions.bear.y3,
    },
    {
      label: '5yr',
      bull: predictions.bull.y5,
      base: predictions.base.y5,
      bear: predictions.bear.y5,
    },
  ];

  const CurrentPriceDot = (props: Record<string, unknown>) => {
    const { cx, cy, index } = props as { cx: number; cy: number; index: number };
    if (index === 0) {
      return <Dot cx={cx} cy={cy} r={5} fill="#fff" stroke="#fff" />;
    }
    return <></>;
  };

  return (
    <div className="rounded-xl p-4" style={{ background: '#1a1a1a' }}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
          <XAxis
            dataKey="label"
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
          <Line
            type="monotone"
            dataKey="bull"
            stroke="#4ade80"
            strokeWidth={2}
            dot={<CurrentPriceDot />}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="base"
            stroke="#888"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={false}
          />
          <Line
            type="monotone"
            dataKey="bear"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            activeDot={false}
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
