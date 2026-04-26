import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Box, ToggleButton, ToggleButtonGroup, Tooltip as MuiTooltip, Typography } from "@mui/material";

const parseBloodPressure = (value) => {
  const match = String(value || "")
    .trim()
    .match(/^(\d{2,3})\s*\/\s*(\d{2,3})$/);

  if (!match) {
    return null;
  }

  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
};

const toNumericValue = (value) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const METRICS = {
  bp_systolic: {
    label: "BP Systolic",
    unit: "mmHg",
    color: "#ef5350",
    high: 130,
    low: 90,
    accessor: (record) => parseBloodPressure(record?.bloodPressure)?.systolic ?? null,
  },
  bp_diastolic: {
    label: "BP Diastolic",
    unit: "mmHg",
    color: "#e91e63",
    high: 80,
    low: 60,
    accessor: (record) => parseBloodPressure(record?.bloodPressure)?.diastolic ?? null,
  },
  blood_sugar: {
    label: "Blood Sugar",
    unit: "mg/dL",
    color: "#ff9800",
    high: 140,
    low: 70,
    accessor: (record) => toNumericValue(record?.bloodSugar),
  },
  weight: {
    label: "Weight",
    unit: "kg",
    color: "#2196f3",
    high: null,
    low: null,
    accessor: (record) => toNumericValue(record?.weight),
  },
  heart_rate: {
    label: "Heart Rate",
    unit: "bpm",
    color: "#9c27b0",
    high: 100,
    low: 60,
    accessor: (record) => toNumericValue(record?.heartRate),
  },
};

const normalizeValue = (value) => (Number.isFinite(value) ? value : null);

export default function RecordTimeline({ records = [] }) {
  const [metric, setMetric] = useState("bp_systolic");

  const metricData = useMemo(() => {
    const sortedRecords = [...records]
      .sort((left, right) => new Date(left.date) - new Date(right.date))
      .map((record) => ({
        ...record,
        chartDate: new Date(record.date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        }),
      }));

    return Object.fromEntries(
      Object.entries(METRICS).map(([key, item]) => [
        key,
        sortedRecords
          .map((record) => ({
            date: record.chartDate,
            value: normalizeValue(item.accessor(record)),
          }))
          .filter((record) => record.value !== null)
          .slice(-30),
      ])
    );
  }, [records]);

  const firstMetricWithData = Object.keys(METRICS).find((key) => metricData[key]?.length > 0);

  useEffect(() => {
    if (metricData[metric]?.length || !firstMetricWithData) return;
    setMetric(firstMetricWithData);
  }, [firstMetricWithData, metric, metricData]);

  const config = METRICS[metric];
  const data = metricData[metric] || [];

  return (
    <Box>
      <ToggleButtonGroup
        value={metric}
        exclusive
        size="small"
        onChange={(_, value) => value && setMetric(value)}
        sx={{ flexWrap: "wrap", gap: 0.75, mb: 2 }}
      >
        {Object.entries(METRICS).map(([key, item]) => {
          const isEmpty = !metricData[key]?.length;

          return (
            <MuiTooltip
              key={key}
              title={isEmpty ? `No ${item.label} records yet` : ""}
              disableHoverListener={!isEmpty}
              arrow
            >
              <span>
                <ToggleButton value={key} disabled={isEmpty} sx={{ fontSize: 11 }}>
                  {item.label}
                </ToggleButton>
              </span>
            </MuiTooltip>
          );
        })}
      </ToggleButtonGroup>

      {data.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={4}>
          No {config.label} records yet
        </Typography>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} unit={` ${config.unit}`} />
            <RechartsTooltip formatter={(value) => [`${value} ${config.unit}`, config.label]} />
            {config.high ? (
              <ReferenceLine
                y={config.high}
                stroke="#ef5350"
                strokeDasharray="4 4"
                label={{ value: "High", fontSize: 10, fill: "#ef5350" }}
              />
            ) : null}
            {config.low ? (
              <ReferenceLine
                y={config.low}
                stroke="#2196f3"
                strokeDasharray="4 4"
                label={{ value: "Low", fontSize: 10, fill: "#2196f3" }}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Box>
  );
}
