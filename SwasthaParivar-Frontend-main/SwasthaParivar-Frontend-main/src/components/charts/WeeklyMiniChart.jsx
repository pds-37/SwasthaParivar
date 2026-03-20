import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
} from "recharts";

const WeeklyMiniChart = ({ data, color }) => {
  if (!data || data.length === 0)
    return <div className="empty-chart small">No data</div>;

  return (
    <ResponsiveContainer width="100%" height={70}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.6} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>

        <XAxis dataKey="label" hide />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill={`url(#grad-${color})`}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default WeeklyMiniChart;
