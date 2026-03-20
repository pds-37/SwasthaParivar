// Converts Option A DB format into chart-friendly structures

export const buildTrendData = (member, METRICS) => {
  if (!member || !member.health) return [];

  // Combine dates across all metrics → unique sorted ascending
  const dateSet = new Set();
  METRICS.forEach((m) =>
    (member.health[m.key] || []).forEach((r) => dateSet.add(r.date))
  );

  const dates = Array.from(dateSet).sort(
    (a, b) => new Date(a) - new Date(b)
  );

  return dates.map((date) => {
    const row = {
      date,
      label: new Date(date).toLocaleDateString(),
    };

    METRICS.forEach((m) => {
      const rec = (member.health[m.key] || []).find((r) => r.date === date);
      row[m.key] =
        rec && typeof rec.value === "number" ? rec.value : null;
    });

    return row;
  });
};

/* Latest snapshot donut data */
export const buildDonutData = (member, METRICS) => {
  if (!member || !member.health) return [];

  // get latest date in all metrics
  let dates = [];
  METRICS.forEach((m) => {
    (member.health[m.key] || []).forEach((r) => dates.push(r.date));
  });
  if (!dates.length) return [];

  const latest = dates.sort((a, b) => new Date(b) - new Date(a))[0];

  return METRICS.map((m) => {
    const rec = (member.health[m.key] || []).find((r) => r.date === latest);
    return rec && typeof rec.value === "number"
      ? { name: m.label, value: rec.value, color: m.color }
      : null;
  }).filter(Boolean);
};

/* Weekly mini trend per metric */
export const buildWeeklySeries = (member, metricKey) => {
  if (!member || !member.health) return [];

  const arr = member.health[metricKey] || [];
  if (!arr.length) return [];

  const last7 = arr
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7);

  return last7.map((r) => ({
    label: new Date(r.date).toLocaleDateString(),
    value: typeof r.value === "number" ? r.value : null,
  }));
};
