"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useMemo } from "react";
import { ChartCard } from "./chart-card";
import { getTokenColors } from "./chart-colors";

export interface StatusDatum {
  status: string;
  count: number;
}

const STATUS_COLORS = ["primary", "secondary", "accent", "warning"] as const;

export function SubmissionStatusChart({ data }: { data: StatusDatum[] }) {
  const colors = useMemo(() => getTokenColors(), []);
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const empty = total === 0;
  const fillFor = (i: number) => {
    const key = STATUS_COLORS[i % STATUS_COLORS.length];
    if (key === "primary") return colors.primary;
    if (key === "secondary") return colors.secondary;
    if (key === "accent") return colors.accent;
    return colors.warning;
  };

  return (
    <ChartCard
      title="Submissions by status"
      description="Breakdown of form submissions"
      delay={0.2}
      empty={empty}
    >
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
              animationDuration={700}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={fillFor(i)} stroke={colors.card} strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: colors.card,
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                color: colors.foreground,
                fontSize: 12,
              }}
            />
            <Legend
              iconType="circle"
              wrapperStyle={{ color: colors.foreground, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
