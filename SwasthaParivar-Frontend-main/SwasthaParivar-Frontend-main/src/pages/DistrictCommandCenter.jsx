import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  ShieldAlert,
  Activity,
  Bed,
  Stethoscope,
  Pill,
  Ambulance,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Send,
  Layers,
  MapPin,
} from "lucide-react";
import "./DistrictCommandCenter.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const DistrictCommandCenter = () => {
  const [district, setDistrict] = useState("Gautam Buddha Nagar");
  const [pincode, setPincode] = useState("201306");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [transitioningId, setTransitioningId] = useState(null);
  const [evaluatingFeedbackId, setEvaluatingFeedbackId] = useState(null);
  const [feedbackObservedSeverity, setFeedbackObservedSeverity] = useState(0.25);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/hierarchical/district/overview`, {
        params: { district, pincode },
        withCredentials: true,
      });
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load command center data");
    } finally {
      setLoading(false);
    }
  }, [district, pincode]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleStateTransition = async (healthStateId) => {
    try {
      setTransitioningId(healthStateId);
      const res = await axios.post(
        `${API_BASE}/hierarchical/states/${healthStateId}/transition`,
        {},
        { withCredentials: true }
      );
      if (res.data?.success) {
        const decision = res.data.data.decision;
        toast.success(`FSM Decision: ${decision.transition} -> Level: ${decision.targetLevel}`);
        fetchOverview();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "State transition failed");
    } finally {
      setTransitioningId(null);
    }
  };

  const handleClosedLoopFeedback = async (interventionId) => {
    try {
      setEvaluatingFeedbackId(interventionId);
      const res = await axios.post(
        `${API_BASE}/hierarchical/interventions/${interventionId}/feedback`,
        { observedSeverity: Number(feedbackObservedSeverity) },
        { withCredentials: true }
      );
      if (res.data?.success) {
        toast.success(res.data.message || "Feedback recorded successfully");
        fetchOverview();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Feedback evaluation failed");
    } finally {
      setEvaluatingFeedbackId(null);
    }
  };

  const handleTriggerConvergence = async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/hierarchical/convergence/evaluate`,
        { pincode, district, windowHours: 72 },
        { withCredentials: true }
      );
      if (res.data?.success) {
        const count = res.data.data.generatedCommunityStates?.length || 0;
        toast.success(`Evaluated ${res.data.data.totalSignalsEvaluated} signals. Formed ${count} community cluster(s).`);
        fetchOverview();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Convergence evaluation failed");
    }
  };

  const metrics = data?.metrics || {};
  const deficitScore = metrics.capacityDeficitIndex ?? 0.25;
  const isHighDeficit = deficitScore >= 0.5;

  return (
    <div className="command-center-container">
      {/* Header */}
      <div className="command-center-header">
        <div>
          <div className="command-center-badge">
            <ShieldAlert size={16} /> Hierarchical Public Health Intelligence & Capacity Engine
          </div>
          <h1 className="command-center-title">District Health Command Center</h1>
          <p className="command-center-subtitle">
            Evidence-gated spatial-temporal aggregation, capacity deficit conditioning, and level-specific interventions
          </p>
        </div>

        <div className="command-center-controls">
          <div className="scope-selector">
            <MapPin size={16} />
            <select value={district} onChange={(e) => setDistrict(e.target.value)}>
              <option value="Gautam Buddha Nagar">Gautam Buddha Nagar</option>
              <option value="Ghaziabad">Ghaziabad</option>
              <option value="Lucknow">Lucknow</option>
            </select>
          </div>
          <div className="scope-selector">
            <select value={pincode} onChange={(e) => setPincode(e.target.value)}>
              <option value="201306">Greater Noida (201306)</option>
              <option value="201301">Noida Sector 1-10 (201301)</option>
              <option value="201308">Greater Noida West (201308)</option>
            </select>
          </div>
          <button className="btn-refresh" onClick={fetchOverview} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="metrics-grid">
        <div className={`metric-card ${isHighDeficit ? "danger" : "normal"}`}>
          <div className="metric-header">
            <span>Capacity Deficit Index (D_c)</span>
            <AlertTriangle size={18} />
          </div>
          <div className="metric-value">{(deficitScore * 100).toFixed(0)}%</div>
          <div className="metric-bar">
            <div className="metric-bar-fill" style={{ width: `${deficitScore * 100}%` }} />
          </div>
          <span className="metric-caption">
            {isHighDeficit ? "High Deficit: Escalation threshold breached" : "Adequate baseline local capacity"}
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Hospital Bed Availability</span>
            <Bed size={18} />
          </div>
          <div className="metric-value">
            {metrics.availableBeds ?? 0} <span className="metric-sub">/ {metrics.totalBeds ?? 0}</span>
          </div>
          <span className="metric-caption">ICU Available: {metrics.icuAvailable ?? 0} units</span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Doctors on Active Shift</span>
            <Stethoscope size={18} />
          </div>
          <div className="metric-value">{metrics.doctorsOnDuty ?? 0}</div>
          <span className="metric-caption">Diagnostic Capacity: ~50 tests/day</span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>Emergency Fleet & Stock</span>
            <Ambulance size={18} />
          </div>
          <div className="metric-value">
            {metrics.ambulancesAvailable ?? 0} <span className="metric-sub">Ambulances</span>
          </div>
          <span className="metric-caption">
            Medicine Stock: {((metrics.medicineStockIndex ?? 0.8) * 100).toFixed(0)}% adequacy
          </span>
        </div>
      </div>

      {/* Action Strip */}
      <div className="action-strip">
        <div className="action-strip-text">
          <Layers size={18} />
          <span>
            <strong>Spatial-Temporal Correlation Engine:</strong> Evaluates converging multi-source signals across households, ASHA workers, and clinics.
          </span>
        </div>
        <button className="btn-action" onClick={handleTriggerConvergence}>
          Run Multi-Source Convergence
        </button>
      </div>

      {/* Main Grid: Clusters & Interventions */}
      <div className="content-grid">
        {/* Left: Active Health State Clusters */}
        <div className="panel-card">
          <div className="panel-header">
            <h2>Active Health State Clusters ({data?.healthStates?.length || 0})</h2>
            <span className="panel-badge">Hierarchical State FSM</span>
          </div>

          <div className="clusters-list">
            {(!data?.healthStates || data.healthStates.length === 0) ? (
              <div className="empty-notice">No active anomaly clusters in this geographic zone.</div>
            ) : (
              data.healthStates.map((st) => (
                <div key={st._id} className={`cluster-item severity-${st.severity?.toLowerCase()}`}>
                  <div className="cluster-top">
                    <div>
                      <span className="cluster-level-tag">{st.level.toUpperCase()} LEVEL</span>
                      <h3 className="cluster-title">{st.category.replace(/_/g, " ")}</h3>
                    </div>
                    <span className={`badge-status status-${st.stateStatus?.toLowerCase()}`}>
                      {st.stateStatus}
                    </span>
                  </div>

                  <div className="cluster-meta">
                    <span><strong>Severity:</strong> {(st.severityScore * 100).toFixed(0)}%</span>
                    <span><strong>Convergence Confidence:</strong> {(st.confidence * 100).toFixed(0)}%</span>
                    <span><strong>Evidence Signals:</strong> {st.evidenceCount}</span>
                  </div>

                  <div className="cluster-sources">
                    <span>Sources:</span>
                    {(st.sources || []).map((src) => (
                      <span key={src} className="source-pill">{src.replace(/_/g, " ")}</span>
                    ))}
                  </div>

                  <div className="cluster-actions">
                    <button
                      className="btn-fsm"
                      onClick={() => handleStateTransition(st._id)}
                      disabled={transitioningId === st._id}
                    >
                      {transitioningId === st._id ? "Evaluating FSM..." : "Execute State Transition FSM"}
                    </button>
                    {st.activeInterventionId && (
                      <span className="intervention-linked">
                        <CheckCircle2 size={14} /> Intervention Dispatched
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Active Interventions & Closed-Loop Feedback */}
        <div className="panel-card">
          <div className="panel-header">
            <h2>Level-Specific Interventions ({data?.activeInterventions?.length || 0})</h2>
            <span className="panel-badge">Closed-Loop Feedback</span>
          </div>

          <div className="interventions-list">
            {(!data?.activeInterventions || data.activeInterventions.length === 0) ? (
              <div className="empty-notice">No active dispatches currently active.</div>
            ) : (
              data.activeInterventions.map((inv) => (
                <div key={inv._id} className="intervention-item">
                  <div className="inv-top">
                    <span className={`priority-tag priority-${inv.priority?.toLowerCase()}`}>
                      {inv.priority} PRIORITY
                    </span>
                    <span className="inv-type">{inv.interventionType.replace(/_/g, " ")}</span>
                  </div>

                  <h3 className="inv-title">{inv.title}</h3>

                  <ul className="inv-recommendations">
                    {(inv.recommendations || []).map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>

                  <div className="inv-resources">
                    <span>Personnel: {inv.allocatedResources?.personnelAssigned ?? 2}</span>
                    <span>Med Kits: {inv.allocatedResources?.medicineKits ?? 10}</span>
                    <span>Ambulances: {inv.allocatedResources?.ambulanceUnits ?? 0}</span>
                  </div>

                  {/* Closed Loop Feedback Controls */}
                  <div className="feedback-section">
                    <label>Post-Intervention Observed Severity (0 to 1):</label>
                    <div className="feedback-controls">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={feedbackObservedSeverity}
                        onChange={(e) => setFeedbackObservedSeverity(e.target.value)}
                      />
                      <span>{(feedbackObservedSeverity * 100).toFixed(0)}%</span>
                      <button
                        className="btn-feedback"
                        onClick={() => handleClosedLoopFeedback(inv._id)}
                        disabled={evaluatingFeedbackId === inv._id}
                      >
                        Submit Closed-Loop & Delta_H
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistrictCommandCenter;
