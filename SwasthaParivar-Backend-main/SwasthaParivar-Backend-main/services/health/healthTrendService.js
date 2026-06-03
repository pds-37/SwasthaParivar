const METRICS = ["heartRate", "bloodSugar", "weight", "sleep", "steps"];

function sortEntries(entries = []) {
  return Array.isArray(entries)
    ? entries
        .filter((entry) => entry?.date)
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
    : [];
}

function numericValue(entry) {
  const value = Number(entry?.value);
  return Number.isFinite(value) ? value : null;
}

function parseBloodPressure(entry) {
  const match = String(entry?.value || "").match(/(\d+)\s*\/\s*(\d+)/);
  if (!match) return null;

  return {
    systolic: Number(match[1]),
    diastolic: Number(match[2]),
  };
}

function average(values = []) {
  const validValues = values.filter((value) => Number.isFinite(value));
  if (!validValues.length) return null;
  return Number((validValues.reduce((sum, value) => sum + value, 0) / validValues.length).toFixed(2));
}

function analyzeNumericMetric(metric, entries = []) {
  const sorted = sortEntries(entries);
  const latest = numericValue(sorted[0]);
  const previousValues = sorted.slice(1, 8).map(numericValue);
  const baseline = average(previousValues);

  if (latest === null) {
    return null;
  }

  const delta = baseline === null ? null : Number((latest - baseline).toFixed(2));
  let direction = "stable";

  if (delta !== null) {
    if (Math.abs(delta) < 1) {
      direction = "stable";
    } else {
      direction = delta > 0 ? "up" : "down";
    }
  }

  return {
    metric,
    latest,
    baseline,
    delta,
    direction,
    sampleSize: sorted.length,
    latestDate: sorted[0]?.date || null,
  };
}

function analyzeBloodPressure(entries = []) {
  const sorted = sortEntries(entries);
  const latest = parseBloodPressure(sorted[0]);
  const previous = sorted.slice(1, 8).map(parseBloodPressure).filter(Boolean);

  if (!latest) {
    return null;
  }

  const systolicBaseline = average(previous.map((item) => item.systolic));
  const diastolicBaseline = average(previous.map((item) => item.diastolic));

  return {
    metric: "bloodPressure",
    latest: `${latest.systolic}/${latest.diastolic}`,
    systolic: latest.systolic,
    diastolic: latest.diastolic,
    baseline:
      systolicBaseline !== null && diastolicBaseline !== null
        ? `${systolicBaseline}/${diastolicBaseline}`
        : null,
    systolicDelta:
      systolicBaseline === null ? null : Number((latest.systolic - systolicBaseline).toFixed(2)),
    diastolicDelta:
      diastolicBaseline === null ? null : Number((latest.diastolic - diastolicBaseline).toFixed(2)),
    sampleSize: sorted.length,
    latestDate: sorted[0]?.date || null,
  };
}

function buildFlags(trends = {}) {
  const flags = [];
  const bp = trends.bloodPressure;

  if (bp?.systolic >= 180 || bp?.diastolic >= 120) {
    flags.push({
      metric: "bloodPressure",
      severity: "high",
      message: `Latest BP ${bp.latest} is in a very high range.`,
    });
  } else if (bp?.systolic >= 140 || bp?.diastolic >= 90) {
    flags.push({
      metric: "bloodPressure",
      severity: "moderate",
      message: `Latest BP ${bp.latest} is elevated.`,
    });
  }

  if (trends.bloodSugar?.latest >= 200) {
    flags.push({
      metric: "bloodSugar",
      severity: "moderate",
      message: `Latest blood sugar ${trends.bloodSugar.latest} is high.`,
    });
  }

  if (trends.bloodSugar?.latest < 70) {
    flags.push({
      metric: "bloodSugar",
      severity: "high",
      message: `Latest blood sugar ${trends.bloodSugar.latest} is low.`,
    });
  }

  if (trends.sleep?.latest !== undefined && trends.sleep.latest < 5) {
    flags.push({
      metric: "sleep",
      severity: "moderate",
      message: `Latest sleep ${trends.sleep.latest} hours is low.`,
    });
  }

  if (trends.heartRate?.latest >= 120) {
    flags.push({
      metric: "heartRate",
      severity: "moderate",
      message: `Latest heart rate ${trends.heartRate.latest} is elevated.`,
    });
  }

  return flags;
}

export function buildHealthTrends(member = {}) {
  const health = member?.health || {};
  const trends = {};

  const bloodPressureTrend = analyzeBloodPressure(health.bloodPressure);
  if (bloodPressureTrend) {
    trends.bloodPressure = bloodPressureTrend;
  }

  METRICS.forEach((metric) => {
    const metricTrend = analyzeNumericMetric(metric, health[metric]);
    if (metricTrend) {
      trends[metric] = metricTrend;
    }
  });

  const flags = buildFlags(trends);

  return {
    metrics: trends,
    flags,
    summary: formatHealthTrends({ metrics: trends, flags }),
  };
}

export function formatHealthTrends(trends = {}) {
  const metrics = trends.metrics || {};
  const lines = Object.values(metrics).map((metric) => {
    const baseline = metric.baseline !== null && metric.baseline !== undefined
      ? `, recent baseline ${metric.baseline}`
      : "";
    const delta = metric.delta !== null && metric.delta !== undefined
      ? `, ${metric.direction} by ${Math.abs(metric.delta)}`
      : "";
    return `${metric.metric}: latest ${metric.latest}${baseline}${delta}`;
  });

  if (trends.flags?.length) {
    lines.push(`Flags: ${trends.flags.map((flag) => flag.message).join(" ")}`);
  }

  return lines.length ? lines.join("\n") : "No saved vitals trend data is available.";
}

export default {
  buildHealthTrends,
  formatHealthTrends,
};
