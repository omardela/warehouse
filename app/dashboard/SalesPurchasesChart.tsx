"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export type ChartPoint = {
  label: string;
  sales: number;
  purchases: number;
};

const currencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function yAxisFmt(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
}

export function SalesPurchasesChart({
  data,
  showSales,
  showPurchases,
}: {
  data: ChartPoint[];
  showSales: boolean;
  showPurchases: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2940" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#4a5068" }}
          tickLine={false}
          axisLine={false}
          interval={4}
        />
        <YAxis
          tickFormatter={yAxisFmt}
          tick={{ fontSize: 11, fill: "#4a5068" }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#171f33",
            border: "1px solid #222a3e",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#dbe2fd",
            padding: "8px 12px",
          }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(value: any, name: any) => [
            currencyFmt.format(Number(value)),
            name === "sales" ? "Sales" : "Purchases",
          ]}
          labelStyle={{ color: "#8c90a2", marginBottom: "6px", fontSize: "11px" }}
          cursor={{ stroke: "#2d3449", strokeWidth: 1 }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: "#8c90a2", fontSize: "11px" }}>
              {value === "sales" ? "Sales" : "Purchases"}
            </span>
          )}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ paddingTop: "10px" }}
        />
        {showSales && (
          <Line
            type="monotone"
            dataKey="sales"
            stroke="#62df7d"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#62df7d", stroke: "#0b1326" }}
          />
        )}
        {showPurchases && (
          <Line
            type="monotone"
            dataKey="purchases"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#60a5fa", stroke: "#0b1326" }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
