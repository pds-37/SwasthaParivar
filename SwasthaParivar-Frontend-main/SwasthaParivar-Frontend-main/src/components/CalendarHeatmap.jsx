import React, { useMemo } from 'react';
import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';

const CalendarHeatmapView = ({ reminders }) => {
  // map reminders to counts per day
  const values = useMemo(() => {
    const map = {};
    reminders.forEach(r => {
      const d = new Date(r.nextRunAt);
      const key = d.toISOString().slice(0,10);
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([date, count]) => ({ date, count }));
  }, [reminders]);

  return (
    <div style={{ maxWidth: 900 }}>
      <CalendarHeatmap
        startDate={new Date(new Date().getFullYear(), 0, 1)}
        endDate={new Date()}
        values={values}
        classForValue={(value) => {
          if (!value) return 'color-empty';
          if (value.count >= 5) return 'color-github-4';
          if (value.count >= 3) return 'color-github-3';
          if (value.count >= 1) return 'color-github-2';
          return 'color-github-1';
        }}
        tooltipDataAttrs={value => value ? { 'data-tip': `${value.date} — ${value.count} reminders` } : {}}
        showWeekdayLabels
      />
    </div>
  );
};

export default CalendarHeatmapView;
