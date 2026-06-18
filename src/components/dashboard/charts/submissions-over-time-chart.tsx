"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import { ChartCard } from "./chart-card";
import { getTokenColors } from "./chart-colors";

export interface MonthDatum {
  month: string;
  signed: number;
  pending: number;
}

export function SubmissionsOverTimeChart({ data }: { data: MonthDatum[] }) {
  const colors = useMemo(() => getTokenColors(), []);
  const empty = data.every((d) => d.signed === 0 && d.pending === 0);

  return (
    <ChartCard
      title="Submissions over time"
      description="Signed vs. pending by month"
      delay={0.25}
      empty={empty}
    >
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
            <defs>
              <linearGradient id="signedFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.primary} stopOpacity={0.6} />
                <stop offset="100%" stopColor={colors.primary} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="pendingFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.accent} stopOpacity={0.5} />
                <stop offset="100%" stopColor={colors.accent} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.border}
              strokeOpacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="month"
              stroke={colors.mutedForeground}
              tick={{ fill: colors.mutedForeground, fontSize: 11 }}
            />
            <YAxis
              stroke={colors.mutedForeground}
              tick={{ fill: colors.mutedForeground, fontSize: 11 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                color: colors.foreground,
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="signed"
              stroke={colors.primary}
              strokeWidth={2}
              fill="url(#signedFill)"
              animationDuration={750}
            />
            <Area
              type="monotone"
              dataKey="pending"
              stroke={colors.accent}
              strokeWidth={2}
              fill="url(#pendingFill)"
              animationDuration={750}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
