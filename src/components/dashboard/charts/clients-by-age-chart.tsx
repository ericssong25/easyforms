"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import { ChartCard } from "./chart-card";
import { getTokenColors } from "./chart-colors";
import { AGE_BUCKETS } from "./age-buckets";

export interface AgeDatum {
  range: string;
  count: number;
}

export function ClientsByAgeChart({ data }: { data: AgeDatum[] }) {
  const colors = useMemo(() => getTokenColors(), []);
  const ordered = useMemo(() => {
    const order = AGE_BUCKETS.map((b) => b.label);
    const byLabel = new Map(data.map((d) => [d.range, d.count]));
    return order.map((label) => ({ range: label, count: byLabel.get(label) ?? 0 }));
  }, [data]);
  const empty = ordered.every((d) => d.count === 0);

  return (
    <ChartCard
      title="Clients by age range"
      description="Distribution across age buckets"
      delay={0.1}
      empty={empty}
    >
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ordered} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.border}
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="range"
              stroke={colors.mutedForeground}
              tick={{ fill: colors.mutedForeground, fontSize: 11 }}
            />
            <YAxis
              stroke={colors.mutedForeground}
              tick={{ fill: colors.mutedForeground, fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={false}
              contentStyle={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                color: colors.foreground,
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="count"
              fill={colors.secondary}
              radius={[6, 6, 0, 0]}
              animationDuration={650}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
