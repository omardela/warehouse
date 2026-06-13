"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface ChartDataPoint {
  date: string;
  value: number;
  value2?: number;
}

interface SalesChartProps {
  data: ChartDataPoint[];
  label?: string;
  label2?: string;
  color?: string;
  color2?: string;
  formatValue?: (v: number) => string;
  title?: string;
}

function defaultFormat(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

const CustomTooltip = ({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatValue: (v: number) => string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: "#1a2540",
        border: "1px solid #2d3449",
        borderRadius: "8px",
        padding: "10px 14px",
        fontSize: "12px",
      }}
    >
      <p style={{ color: "#8c90a2", margin: "0 0 6px", fontWeight: 600 }}>
        {label}
      </p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, margin: "2px 0", fontWeight: 600 }}>
          {p.name}: {formatValue(p.value)}
        </p>
      ))}
    </div>
  );
};

export function SalesChart({
  data,
  label = "Revenue",
  label2,
  color = "#0062ff",
  color2 = "#62df7d",
  formatValue = defaultFormat,
  title,
}: SalesChartProps) {
  if (!data.length) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "220px",
          color: "#4a5068",
          fontSize: "13px",
        }}
      >
        No data for selected period
      </div>
    );
  }

  return (
    <div>
      {title && (
        <p
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "#8c90a2",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            margin: "0 0 12px",
          }}
        >
          {title}
        </p>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid
            stroke="#222a3e"
            strokeDasharray="4 4"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{ fill: "#8c90a2", fontSize: 11 }}
            axisLine={{ stroke: "#222a3e" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatValue}
            tick={{ fill: "#8c90a2", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip
            content={<CustomTooltip formatValue={formatValue} />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          {label2 && <Legend wrapperStyle={{ color: "#8c90a2", fontSize: 12 }} />}
          <Bar
            dataKey="value"
            name={label}
            fill={color}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
          {label2 && (
            <Bar
              dataKey="value2"
              name={label2}
              fill={color2}
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
