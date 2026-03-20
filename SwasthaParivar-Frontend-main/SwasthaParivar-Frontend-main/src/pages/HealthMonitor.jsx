// client/src/pages/HealthMonitor.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../lib/api"; // axios/fetch wrapper
import "./HealthMonitor.css";

/* lucide icons */
import {
  Activity,
  Heart,
  Droplet,
  Weight,
  Moon,
  Footprints,
  Plus,
  Edit2,
} from "lucide-react";

/* Charts + utils: keep your existing components */
import TrendLineChart from "../components/charts/TrendLineChart";
import DonutChart from "../components/charts/DonutChart";
import WeeklyMiniChart from "../components/charts/WeeklyMiniChart";
import {
  buildTrendData,
  buildDonutData,
  buildWeeklySeries,
} from "../components/charts/chartUtils";

/* --- constants --- */
const METRICS = [
  { key: "bloodPressure", label: "Blood Pressure", unit: "mmHg", icon: Activity, color: "#3b82f6" },
  { key: "heartRate",     label: "Heart Rate",     unit: "bpm",   icon: Heart,    color: "#ef4444" },
  { key: "bloodSugar",    label: "Blood Sugar",    unit: "mg/dL",icon: Droplet,  color: "#eab308" },
  { key: "weight",        label: "Weight",         unit: "kg",   icon: Weight,   color: "#10b981" },
  { key: "sleep",         label: "Sleep",          unit: "hours",icon: Moon,     color: "#8b5cf6" },
  { key: "steps",         label: "Steps",          unit: "steps",icon: Footprints,color: "#f97316" },
];

const emptyHealthObj = () => {
  const h = {};
  METRICS.forEach(m => (h[m.key] = []));
  return h;
};

const defaultFormValues = () => {
  const base = {};
  METRICS.forEach(m => (base[m.key] = ""));
  return base;
};

/* --- component --- */
export default function HealthMonitor() {
  const navigate = useNavigate();
  const { id: routeId } = useParams();

  const [members, setMembers] = useState([]);
  const [selectedId, setSelectedId] = useState(routeId || "");
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);

  /* modal/form state (consistent names) */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0,16));
  const [formValues, setFormValues] = useState(() => defaultFormValues());
  const [editingDate, setEditingDate] = useState(null); // ISO string if editing

  /* --- fetch all members --- */
  useEffect(() => {
    let cancelled = false;
    const fetchMembers = async () => {
      try {
        const res = await api.get("/members");
        // assume res is array (adjust if your wrapper returns res.data)
        const list = res || [];
        if (cancelled) return;
        setMembers(list);
        // Leave selection manual so the screen respects the current route and user choice.
      } catch (err) {
        console.error("Failed to fetch members", err);
        if (!cancelled) setMembers([]);
      }
    };
    fetchMembers();
    return () => { cancelled = true; };
  }, []);

  /* keep routeId in sync with selectedId */
  useEffect(() => {
    if (routeId && routeId !== selectedId) setSelectedId(routeId);
  }, [routeId, selectedId]);

  /* load selected member doc */
  useEffect(() => {
    let cancelled = false;
    const loadMember = async (idToLoad) => {
      if (!idToLoad) {
        setMember(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get(`/members/${idToLoad}`);
        const doc = res || {};
        // ensure health shape
        doc.health = doc.health || emptyHealthObj();
        METRICS.forEach(m => { if (!Array.isArray(doc.health[m.key])) doc.health[m.key] = []; });
        if (!cancelled) setMember(doc);
      } catch (err) {
        console.error("Failed to load member", err);
        if (!cancelled) setMember(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (selectedId) loadMember(selectedId);
    else {
      setMember(null);
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, [selectedId]);

  /* push selectedId into URL (but avoid loop) */
  useEffect(() => {
    if (selectedId) {
      if (routeId !== selectedId) navigate(`/health/${selectedId}`, { replace: true });
    } else {
      if (routeId) navigate("/health", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  /* --- form helpers --- */
  const handleFormChange = (key, value) => setFormValues(prev => ({ ...prev, [key]: value }));

  /* Save record and update member.health arrays through the backend. */
  const saveRecord = async () => {
    if (!selectedId) return alert("Select a member first.");
    if (!formDate) return alert("Provide date & time.");
    // convert to ISO for storage (normalize)
    const iso = new Date(formDate).toISOString();

    // safe clone
    const nextMember = {
      ...(member || {}),
      health: { ...(member?.health || emptyHealthObj()) }
    };

    METRICS.forEach(m => {
      if (!Array.isArray(nextMember.health[m.key])) nextMember.health[m.key] = [];
      // remove existing entry same date (support edit)
      nextMember.health[m.key] = nextMember.health[m.key].filter(r => r.date !== iso);
      const raw = formValues[m.key];
      if (raw !== "" && raw != null) {
        const value = m.key === "bloodPressure" ? String(raw) : Number(raw);
        nextMember.health[m.key].push({ value, date: iso });
      }
      // sort each metric by date ascending (optional)
      if (nextMember.health[m.key].length > 1) {
   nextMember.health[m.key].sort((a,b) => new Date(a.date) - new Date(b.date));
}
  });

    try {
      const updated = await api.put(`/members/${selectedId}`, {
  health: nextMember.health
});

      // assume updated is full doc returned
      setMember(updated);
      setMembers(prev => prev.map(x => (x._id === updated._id ? updated : x)));
      setIsModalOpen(false);
      setEditingDate(null);
    } catch (err) {
      console.error("Failed to save record", err);
      alert("Failed to save record. Check server logs.");
    }
  };

  /* delete all metric entries on a given date */
  const deleteAllEntriesOnDate = async (dateISO) => {
    if (!member) return;
    if (!window.confirm("Delete all metric entries recorded on this date?")) return;
    const nextMember = { ...member, health: { ...(member.health || emptyHealthObj()) } };
    METRICS.forEach(m => {
      nextMember.health[m.key] = (nextMember.health[m.key] || []).filter(r => r.date !== dateISO);
    });
    try {
      const updated = await api.put(`/members/${selectedId}`, {
  health: nextMember.health
});

      setMember(updated);
      setMembers(prev => prev.map(x => x._id === updated._id ? updated : x));
    } catch (err) {
      console.error("Failed to delete date entries", err);
      alert("Delete failed.");
    }
  };

  /* derive unique recordDates (descending) from all metric arrays */
  const recordDates = useMemo(() => {
    if (!member) return [];
    const s = new Set();
    METRICS.forEach(m => (member.health?.[m.key] || []).forEach(r => s.add(r.date)));
    return Array.from(s).sort((a,b) => new Date(b) - new Date(a));
  }, [member]);

  const insights = useMemo(() => {
    if (!member) return [];
    if (recordDates.length < 2) return ["Add at least 2 snapshots to get insights."];
    const latest = recordDates[0];
    const prev = recordDates[1];
    const out = [];
    METRICS.forEach(m => {
      const last = (member.health?.[m.key] || []).find(r => r.date === latest);
      const p = (member.health?.[m.key] || []).find(r => r.date === prev);
      if (last && p && typeof last.value === "number" && typeof p.value === "number") {
        const diff = last.value - p.value;
        const pct = p.value === 0 ? 0 : Math.round((diff / p.value) * 100);
        if (diff > 0) out.push(`${m.label} increased by ${diff} ${m.unit} (${pct}%) since last.`);
        else if (diff < 0) out.push(`${m.label} decreased by ${Math.abs(diff)} ${m.unit} (${Math.abs(pct)}%) since last.`);
        else out.push(`${m.label} no change since last.`);
      }
    });
    return out.length ? out : ["No comparable numeric metric changes found."];
  }, [member, recordDates]);

  /* open add modal */
  const openAddModal = () => {
    setEditingDate(null);
    setFormDate(new Date().toISOString().slice(0,16));
    setFormValues(defaultFormValues());
    setIsModalOpen(true);
  };

  /* open edit modal for a specific date */
  const openEditModal = (recordDateISO) => {
    const vals = {};
    METRICS.forEach(m => {
      const found = (member?.health?.[m.key] || []).find(r => r.date === recordDateISO);
      vals[m.key] = found ? String(found.value) : "";
    });
    setEditingDate(recordDateISO);
    setFormDate(recordDateISO.slice(0,16));
    setFormValues(vals);
    setIsModalOpen(true);
  };

  if (loading) return <div className="hm-loading">Loading member...</div>;

  return (
    <div className="hm-page">
      {/* Top bar */}
      <div className="hm-top">
        <div className="hm-title">
          <Activity size={28} color="#2563eb" />
          <div>
            <h1>Health Monitor</h1>
            <p className="muted">Track vital health metrics</p>
          </div>
        </div>

        <div className="hm-controls">
          <select
            className="member-select"
            value={selectedId || ""}
            onChange={(e) => setSelectedId(e.target.value || "")}
          >
            <option value="">Select member</option>
            {members.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>

          <button className="btn primary" onClick={openAddModal} title="Add metric snapshot">
            <Plus size={16} /> Add Record
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="metrics-grid">
        {METRICS.map(m => {
          const lastArr = member?.health?.[m.key] ?? [];
          const last = lastArr.length ? lastArr[lastArr.length - 1] : null;
          const weeklySeries = buildWeeklySeries(member, m.key);
          return (
            <div className="metric-card" key={m.key}>
              <div className="metric-top">
                <span className="metric-title">{m.label}</span>
                <div className="metric-icon" style={{ background: m.color + "15" }}>
                  <m.icon size={18} color={m.color} />
                </div>
              </div>

              <div className="metric-body">
                <div className="metric-value">{last ? String(last.value) : "--"}</div>
                <div className="metric-unit">{m.unit}</div>
                <div className="metric-meta">
                  <small className="muted">{last ? new Date(last.date).toLocaleString() : "No data"}</small>
                </div>

                <div style={{ marginTop: 10 }}>
                  <WeeklyMiniChart data={weeklySeries} color={m.color} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main grid */}
      <div className="hm-main-grid">
        <div className="hm-left-col card">
          <h3>Trends</h3>
          <div className="chart-area">
            <TrendLineChart data={buildTrendData(member, METRICS)} metrics={METRICS.slice(1,4)} />
          </div>

          <div style={{ marginTop: 16 }}>
            <h3>Latest Snapshot Distribution</h3>
            <div style={{ marginTop: 12 }}>
              <DonutChart data={buildDonutData(member, METRICS)} />
            </div>
          </div>

          <div className="snapshots">
            <h3 style={{ marginTop: 18 }}>Snapshots</h3>
            {recordDates.length === 0 && <div className="muted">No snapshots yet</div>}
            <div className="snapshot-list">
              {recordDates.map(dateISO => (
                <div className="snapshot-row" key={dateISO}>
                  <div>
                    <div className="snapshot-date">{new Date(dateISO).toLocaleString()}</div>
                    <div className="muted small">
                      {(METRICS.map(m => {
                        const rec = member?.health?.[m.key]?.find(r => r.date === dateISO);
                        return rec ? `${m.label.split(" ")[0]} ${rec.value}${m.unit}` : null;
                      }).filter(Boolean).slice(0,3).join(" - "))}
                    </div>
                  </div>

                  <div className="snapshot-actions">
                    <button className="link" onClick={() => openEditModal(dateISO)}><Edit2 size={14} /></button>
                    <button className="link danger" onClick={() => deleteAllEntriesOnDate(dateISO)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="hm-right-col">
          <div className="card">
            <h4>Insights</h4>
            <div className="insights">
              {insights.map((ins, i) => <div key={i} className="ins-item">{ins}</div>)}
            </div>
          </div>

          <div className="card">
            <h4>Latest snapshot quick view</h4>
            {member && recordDates.length ? (
              <div className="quick-grid">
                {METRICS.map(m => {
                  const last = member?.health?.[m.key]?.find(r => r.date === recordDates[0]);
                  return (
                    <div key={m.key} className="quick-item">
                      <div className="qi-left" style={{ background: m.color + "15" }}>
                        <m.icon size={18} color={m.color} />
                      </div>
                      <div>
                        <div className="qi-val">{last ? last.value : "--"}</div>
                        <div className="muted small">{m.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div className="muted">No latest snapshot</div>}
          </div>
        </aside>
      </div>

      {/* Add/Edit modal */}
      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal card">
            <h3>{editingDate ? "Edit Record" : "Add Record"}</h3>

            <label>Date & time</label>
            <input
              type="datetime-local"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
            />

            <div className="form-grid">
              {METRICS.map(m => (
                <div key={m.key} className="form-item">
                  <label>{m.label} ({m.unit})</label>
                  <input
                    type={m.key === "bloodPressure" ? "text" : "number"}
                    placeholder={m.unit}
                    value={formValues[m.key]}
                    onChange={(e) => handleFormChange(m.key, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={() => { setIsModalOpen(false); setEditingDate(null); }}>Cancel</button>
              <button className="btn primary" onClick={saveRecord}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
