import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShieldAlert,
  Activity,
  Bed,
  Stethoscope,
  Ambulance,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Layers,
  MapPin,
} from "lucide-react";

import api from "../lib/api";
import notify from "../lib/notify";
import { useAuth } from "../components/auth-context";
import "./DistrictCommandCenter.css";

const DEFAULT_DISTRICTS = ["Gautam Buddha Nagar", "Ghaziabad", "Lucknow"];
const DEFAULT_PINCODES = [
  { value: "201306", label: "Greater Noida (201306)" },
  { value: "201301", label: "Noida Sector 1-10 (201301)" },
  { value: "201308", label: "Greater Noida West (201308)" },
];

const DistrictCommandCenter = () => {
  const { user } = useAuth();
  const scopedDistrict = user?.assignedScope?.district || "Gautam Buddha Nagar";
  const scopedPincode = user?.assignedScope?.pincode || "201306";

  const [district, setDistrict] = useState(scopedDistrict);
  const [pincode, setPincode] = useState(scopedPincode);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [data, setData] = useState(null);
  const [transitioningId, setTransitioningId] = useState(null);
  const [evaluatingFeedbackId, setEvaluatingFeedbackId] = useState(null);
  const [feedbackSeverities, setFeedbackSeverities] = useState({});

  const districtOptions = useMemo(
    () => Array.from(new Set([scopedDistrict, ...DEFAULT_DISTRICTS].filter(Boolean))),
    [scopedDistrict]
  );

  const pincodeOptions = useMemo(() => {
    const exists = DEFAULT_PINCODES.some((opt) => opt.value === scopedPincode);
    return exists || !scopedPincode
      ? DEFAULT_PINCODES
      : [{ value: scopedPincode, label: `Assigned (${scopedPincode})` }, ...DEFAULT_PINCODES];
  }, [scopedPincode]);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const overview = await api.get("/hierarchical/district/overview", {
        params: { district, pincode },
        suppressErrorToast: true,
      });
      setData(overview);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load command center data");
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
      const outcome = await api.post(`/hierarchical/states/${healthStateId}/transition`, {});
      const decision = outcome?.decision;
      notify.success(
        decision
          ? `FSM Decision: ${decision.transition} -> Level: ${decision.targetLevel}`
          : "State transition evaluated"
      );
      fetchOverview();
    } catch (error) {
      if (!error?.status) notify.error(error.message || "State transition failed");
    } finally {
      setTransitioningId(null);
    }
  };

  const getSliderValue = (inv) => {
    const id = inv?._id;
    if (id && feedbackSeverities[id] !== undefined) {
      return feedbackSeverities[id];
    }
    return 0.25;
  };

  const handleSliderChange = (interventionId, nextValue) => {
    const clamped = Math.min(1, Math.max(0, Number(nextValue)));
    setFeedbackSeverities((prev) => ({
      ...prev,
      [interventionId]: clamped,
    }));
  };

  const handleClosedLoopFeedback = async (inv) => {
    const interventionId = inv._id;
    const observedSeverity = getSliderValue(inv);

    try {
      setEvaluatingFeedbackId(interventionId);
      const result = await api.post(`/hierarchical/interventions/${interventionId}/feedback`, {
        observedSeverity,
      });
      notify.success(result?.message || "Feedback recorded successfully");
      fetchOverview();
    } catch (error) {
      if (!error?.status) notify.error(error.message || "Feedback evaluation failed");
    } finally {
      setEvaluatingFeedbackId(null);
    }
  };

  const handleTriggerConvergence = async () => {
    try {
      const outcome = await api.post("/hierarchical/convergence/evaluate", {
        pincode,
        district,
        windowHours: 72,
      });
      const count = outcome?.generatedCommunityStates?.length || 0;
      const evaluated = outcome?.totalSignalsEvaluated ?? 0;
      notify.success(`Evaluated ${evaluated} signals. Formed ${count} community cluster(s).`);
      fetchOverview();
    } catch (error) {
      if (!error?.status) notify.error(error.message || "Convergence evaluation failed");
    }
  };

  const metrics = data?.metrics || {};
  const deficitScore = metrics.capacityDeficitIndex ?? 0.25;
  const isHighDeficit = deficitScore >= 0.5;

  return (
    <div className="command-center-container">
      <div className="command-center-header">
        <div>
          <div className="command-center-badge">
            <ShieldAlert size={16} /> Hierarchical Public Health Intelligence &amp; Capacity Engine
          </div>
          <h1 className="command-center-title">District Health Command Center</h1>
          <p className="command-center-subtitle">
            Evidence-gated spatial-temporal aggregation, capacity deficit conditioning, and level-specific interventions
          </p>
        </div>

        <div className="command-center-controls">
          <div className="scope-selector">
            <MapPin size={16} />
            <select value={district} onChange={(e) => setDistrict(e.target.value)} aria-label="District">
              {districtOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="scope-selector">
            <select value={pincode} onChange={(e) => setPincode(e.target.value)} aria-label="Pincode">
              {pincodeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="btn-refresh" onClick={fetchOverview} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="command-center-alert" role="alert">
          <AlertTriangle size={18} />
          <span>{errorMessage}</span>
          <button type="button" className="btn-refresh" onClick={fetchOverview}>
            Retry
          </button>
        </div>
      ) : null}

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
            <span>Emergency Fleet &amp; Stock</span>
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

      <div className="action-strip">
        <div className="action-strip-text">
          <Layers size={18} />
          <span>
            <strong>Spatial-Temporal Correlation Engine:</strong> Evaluates converging multi-source signals across households, ASHA workers, and clinics.
          </span>
        </div>
        <button type="button" className="btn-action" onClick={handleTriggerConvergence}>
          Run Multi-Source Convergence
        </button>
      </div>

      <div className="content-grid">
        <div className="panel-card">
          <div className="panel-header">
            <h2>Active Health State Clusters ({data?.healthStates?.length || 0})</h2>
            <span className="panel-badge">Hierarchical State FSM</span>
          </div>

          <div className="clusters-list">
            {!data?.healthStates || data.healthStates.length === 0 ? (
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
                    <span>
                      <strong>Severity:</strong> {((st.severityScore ?? 0) * 100).toFixed(0)}% ({st.severity})
                    </span>
                    <span>
                      <strong>Convergence Confidence:</strong> {((st.confidence ?? 0) * 100).toFixed(0)}%
                    </span>
                    <span>
                      <strong>Evidence Signals:</strong> {st.evidenceCount}
                    </span>
                  </div>

                  <div className="cluster-sources">
                    <span>Sources:</span>
                    {(st.sources || []).map((src) => (
                      <span key={src} className="source-pill">
                        {src.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>

                  <div className="cluster-actions">
                    <button
                      type="button"
                      className="btn-fsm"
                      onClick={() => handleStateTransition(st._id)}
                      disabled={transitioningId === st._id}
                    >
                      {transitioningId === st._id ? "Evaluating FSM..." : "Execute State Transition FSM"}
                    </button>
                    {st.activeInterventionId ? (
                      <span className="intervention-linked">
                        <CheckCircle2 size={14} /> Intervention Dispatched
                      </span>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel-card">
          <div className="panel-header">
            <h2>Level-Specific Interventions ({data?.activeInterventions?.length || 0})</h2>
            <span className="panel-badge">Closed-Loop Feedback</span>
          </div>

          <div className="interventions-list">
            {!data?.activeInterventions || data.activeInterventions.length === 0 ? (
              <div className="empty-notice">No active dispatches currently active.</div>
            ) : (
              data.activeInterventions.map((inv) => {
                const sliderVal = getSliderValue(inv);

                return (
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

                    <div className="feedback-section">
                      <label htmlFor={`feedback-slider-${inv._id}`}>
                        Post-Intervention Observed Severity (0 to 1):
                      </label>
                      <div className="feedback-controls">
                        <input
                          id={`feedback-slider-${inv._id}`}
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={sliderVal}
                          onChange={(e) => handleSliderChange(inv._id, e.target.value)}
                        />
                        <span>{(sliderVal * 100).toFixed(0)}%</span>
                        <button
                          type="button"
                          className="btn-feedback"
                          onClick={() => handleClosedLoopFeedback(inv)}
                          disabled={evaluatingFeedbackId === inv._id}
                        >
                          Submit Closed-Loop &amp; Delta_H
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistrictCommandCenter;
