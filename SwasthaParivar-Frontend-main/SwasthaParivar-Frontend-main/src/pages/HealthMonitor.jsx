import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Activity, Heart, Moon, Plus, Scale, Syringe, Waves, Footprints } from "lucide-react";

import api from "../lib/api";
import notify from "../lib/notify";
import { Button, EmptyState, Input, Modal, Select, Skeleton } from "../components/ui";
import { useFamilyStore } from "../store/family-store";
import "./HealthMonitor.css";

const metrics = [
  { key: "bloodPressure", label: "Blood pressure", unit: "mmHg", icon: Activity },
  { key: "heartRate", label: "Heart rate", unit: "bpm", icon: Heart },
  { key: "bloodSugar", label: "Blood sugar", unit: "mg/dL", icon: Syringe },
  { key: "weight", label: "Weight", unit: "kg", icon: Scale },
  { key: "sleep", label: "Sleep", unit: "hours", icon: Moon },
  { key: "steps", label: "Steps", unit: "steps", icon: Footprints },
];

const getDefaultValues = () =>
  metrics.reduce((accumulator, metric) => ({ ...accumulator, [metric.key]: "" }), {});

const HealthMonitor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { selfMember, activeView } = useFamilyStore();
  const [members, setMembers] = useState([]);
  const [selectedId, setSelectedId] = useState(id || "");
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().slice(0, 16));
  const [formValues, setFormValues] = useState(getDefaultValues());

  useEffect(() => {
    if (activeView === "self" && selfMember?._id) {
      setSelectedId(selfMember._id);
    }
  }, [activeView, selfMember?._id]);

  useEffect(() => {
    let cancelled = false;

    const loadMembers = async () => {
      try {
        const response = await api.get("/members");
        const memberList = Array.isArray(response) ? response : response?.members || [];
        if (cancelled) return;
        setMembers(memberList);
        if (!selectedId && memberList[0]?._id) {
          setSelectedId(memberList[0]._id);
        }
      } catch {
        if (!cancelled) setMembers([]);
      }
    };

    loadMembers();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;

    const loadMember = async () => {
      if (!selectedId) {
        setMember(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await api.get(`/members/${selectedId}`);
        if (!cancelled) setMember(response);
      } catch {
        if (!cancelled) setMember(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMember();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (id && id !== selectedId) {
      setSelectedId(id);
    }
  }, [id, selectedId]);

  useEffect(() => {
    if (selectedId && id !== selectedId) {
      navigate(`/health/${selectedId}`, { replace: true });
    }
  }, [id, navigate, selectedId]);

  const latestValues = useMemo(
    () =>
      metrics.map((metric) => {
        const entries = member?.health?.[metric.key] || [];
        const latest = [...entries].sort((first, second) => new Date(second.date) - new Date(first.date))[0];
        return {
          ...metric,
          latest,
        };
      }),
    [member]
  );

  const snapshots = useMemo(() => {
    const allDates = new Set();
    Object.values(member?.health || {}).forEach((entries) => {
      if (Array.isArray(entries)) {
        entries.forEach((entry) => {
          if (entry?.date) allDates.add(entry.date);
        });
      }
    });

    return [...allDates].sort((first, second) => new Date(second) - new Date(first));
  }, [member]);

  const insights = useMemo(() => {
    if (!snapshots.length) {
      return ["Add the first health snapshot to start seeing household care insights."];
    }

    return latestValues.map((metric) =>
      metric.latest
        ? `${metric.label} last recorded ${new Date(metric.latest.date).toLocaleDateString("en-IN")}.`
        : `${metric.label} has no saved entries yet.`
    );
  }, [latestValues, snapshots.length]);

  const handleSave = async () => {
    if (!selectedId) {
      notify.error("Select a family member first");
      return;
    }

    const nextHealth = { ...(member?.health || {}) };
    const isoDate = new Date(formDate).toISOString();

    metrics.forEach((metric) => {
      const existingEntries = Array.isArray(nextHealth[metric.key]) ? nextHealth[metric.key] : [];
      const filtered = existingEntries.filter((entry) => entry.date !== isoDate);
      if (formValues[metric.key] !== "") {
        filtered.push({
          value: metric.key === "bloodPressure" ? String(formValues[metric.key]) : Number(formValues[metric.key]),
          date: isoDate,
        });
      }
      nextHealth[metric.key] = filtered;
    });

    try {
      const updated = await api.put(`/members/${selectedId}`, { health: nextHealth });
      setMember(updated);
      setMembers((previous) => previous.map((entry) => (entry._id === updated._id ? updated : entry)));
      setShowModal(false);
      setFormValues(getDefaultValues());
      notify.success("Health snapshot saved");
    } catch {
      notify.error("Could not save health snapshot");
    }
  };

  if (loading) {
    return (
      <div className="health-page">
        <div className="app-shell health-shell">
          <Skeleton variant="card" />
        </div>
      </div>
    );
  }

  return (
    <div className="health-page">
      <div className="app-shell health-shell">
        <section className="health-header">
          <div>
            <span className="eyebrow">
              <Waves size={16} />
              Health records
            </span>
            <h1 className="text-h2">Track health snapshots member by member.</h1>
            <p className="text-body-md">
              {activeView === "self"
                ? "Save your own vitals over time so reminders, reports, and AI guidance stay grounded in your data."
                : "Save vitals over time so reminders, records, and future AI guidance stay grounded in real household data."}
            </p>
          </div>

          <div className="health-header__actions">
            <Select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              label={activeView === "self" ? "Profile" : "Member"}
              disabled={activeView === "self"}
            >
              {(activeView === "self" && selfMember ? [selfMember] : (Array.isArray(members) ? members : [])).map((entry) => (
                <option key={entry?._id} value={entry?._id}>
                  {entry?.name}
                </option>
              ))}
            </Select>
            <Button leftIcon={<Plus size={18} />} onClick={() => setShowModal(true)}>
              Add snapshot
            </Button>
          </div>
        </section>

        {!member ? (
          <EmptyState
            icon={<Waves size={18} />}
            heading="No member selected"
            description="Choose a family member to view and update health records."
          />
        ) : (
          <>
            <section className="health-grid">
              {latestValues.map((metric) => (
                <article key={metric.key} className="health-metric card">
                  <div className="health-metric__top">
                    <span>{metric.label}</span>
                    <metric.icon size={18} />
                  </div>
                  <strong>{metric.latest?.value ?? "--"}</strong>
                  <small>{metric.unit}</small>
                  <p>{metric.latest ? new Date(metric.latest.date).toLocaleString("en-IN") : "No entries yet"}</p>
                </article>
              ))}
            </section>

            <div className="health-content">
              <section className="health-panel card">
                <div className="section-header">
                  <div>
                    <h2 className="text-h4">Recent snapshots</h2>
                    <p className="text-body-sm muted-copy">Each saved date bundles that member’s health measurements.</p>
                  </div>
                </div>

                {snapshots.length === 0 ? (
                  <EmptyState
                    icon={<Activity size={18} />}
                    heading="No snapshots yet"
                    description="Add the first blood pressure, sleep, or sugar snapshot to begin the health timeline."
                    ctaLabel="Add snapshot"
                    onCta={() => setShowModal(true)}
                  />
                ) : (
                  <div className="health-snapshot-list">
                    {snapshots.map((snapshot) => (
                      <article key={snapshot} className="health-snapshot-row">
                        <div>
                          <strong>{new Date(snapshot).toLocaleString("en-IN")}</strong>
                          <p>
                            {metrics
                              .map((metric) => {
                                const match = (member.health?.[metric.key] || []).find((entry) => entry.date === snapshot);
                                return match ? `${metric.label}: ${match.value} ${metric.unit}` : null;
                              })
                              .filter(Boolean)
                              .slice(0, 3)
                              .join(" - ")}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="health-panel card">
                <div className="section-header">
                  <div>
                    <h2 className="text-h4">Quick insights</h2>
                    <p className="text-body-sm muted-copy">A simple summary of what has or has not been recorded.</p>
                  </div>
                </div>

                <div className="health-insights">
                  {insights.map((insight) => (
                    <article key={insight} className="health-insight-row">
                      <Activity size={16} />
                      <p>{insight}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add health snapshot"
        description="Record multiple vital values for the same date and member."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save snapshot
            </Button>
          </>
        }
      >
        <div className="health-form-grid">
          <Input
            label="Date and time"
            type="datetime-local"
            value={formDate}
            onChange={(event) => setFormDate(event.target.value)}
            wrapperClassName="health-form-grid__wide"
          />

          {metrics.map((metric) => (
            <Input
              key={metric.key}
              label={`${metric.label} (${metric.unit})`}
              value={formValues[metric.key]}
              onChange={(event) =>
                setFormValues((previous) => ({
                  ...previous,
                  [metric.key]: event.target.value,
                }))
              }
              placeholder={metric.unit}
            />
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default HealthMonitor;
