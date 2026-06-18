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

export interface StateDatum {
  state: string;
  count: number;
}

export function ClientsByStateChart({ data }: { data: StateDatum[] }) {
  const colors = useMemo(() => getTokenColors(), []);
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.count - a.count).slice(0, 12),
    [data],
  );
  const empty = sorted.length === 0;

  return (
    <ChartCard
      title="Clients by state"
      description="Top 12 US states by client count"
      delay={0.05}
      empty={empty}
    >
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.border}
              strokeOpacity={0.5}
              horizontal={false}
            />
            <XAxis
              type="number"
              stroke={colors.mutedForeground}
              tick={{ fill: colors.mutedForeground, fontSize: 11 }}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="state"
              stroke={colors.mutedForeground}
              tick={{ fill: colors.mutedForeground, fontSize: 11 }}
              width={36}
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
              fill={colors.primary}
              radius={[0, 6, 6, 0]}
              animationDuration={650}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
