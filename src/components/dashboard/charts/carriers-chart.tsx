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

export interface CarrierDatum {
  carrier: string;
  count: number;
}

export function CarriersChart({ data }: { data: CarrierDatum[] }) {
  const colors = useMemo(() => getTokenColors(), []);
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.count - a.count).slice(0, 10),
    [data],
  );
  const empty = sorted.length === 0;

  return (
    <ChartCard
      title="Top carriers"
      description="Policies by insurance carrier (top 10)"
      delay={0.15}
      empty={empty}
    >
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            margin={{ top: 4, right: 12, left: 4, bottom: 50 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.border}
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="carrier"
              stroke={colors.mutedForeground}
              tick={{ fill: colors.mutedForeground, fontSize: 10 }}
              angle={-35}
              textAnchor="end"
              interval={0}
              height={60}
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
              fill={colors.primary}
              radius={[6, 6, 0, 0]}
              animationDuration={650}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
