import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Activity, Bluetooth, Heart, Moon, Plus, Scale, Syringe, Waves, Wind, Footprints } from "lucide-react";

import api from "../lib/api";
import BleDeviceModal from "../components/BleDeviceModal";
import RecordTimeline from "../components/records/RecordTimeline";
import { showUnlockedBadges } from "../lib/badges";
import notify from "../lib/notify";
import { Button, EmptyState, Input, Modal, Select, Skeleton } from "../components/ui";
import { useFamilyStore } from "../store/family-store";
import "./HealthMonitor.css";

const metrics = [
  { key: "bloodPressure", label: "Blood pressure", unit: "mmHg", normalRange: "90/60 to 120/80", icon: Activity },
  { key: "heartRate", label: "Heart rate", unit: "bpm", normalRange: "60 to 100 bpm", icon: Heart },
  { key: "spO2", label: "SpO2", unit: "%", normalRange: "95% to 100%", icon: Wind },
  { key: "bloodSugar", label: "Blood sugar", unit: "mg/dL", normalRange: "70 to 140 mg/dL", icon: Syringe },
  { key: "weight", label: "Weight", unit: "kg", normalRange: "Personal BMI target", icon: Scale },
  { key: "sleep", label: "Sleep", unit: "hours", normalRange: "7 to 9 hours", icon: Moon },
  { key: "steps", label: "Steps", unit: "steps", normalRange: "6,000 to 10,000 steps", icon: Footprints },
];

const toLocalDateTimeInputValue = (date = new Date()) => {
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
};

const getDefaultValues = () =>
  metrics.reduce((accumulator, metric) => ({ ...accumulator, [metric.key]: "" }), {});

const HealthMonitor = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { members, selfMember, selectedMember, activeView, loading: familyLoading } = useFamilyStore();
  const [selectedId, setSelectedId] = useState(id || "");
  const [member, setMember] = useState(null);
  const [records, setRecords] = useState([]);
  const [memberLoading, setMemberLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBleModal, setShowBleModal] = useState(false);
  const [formDate, setFormDate] = useState(() => toLocalDateTimeInputValue());
  const [formValues, setFormValues] = useState(getDefaultValues());
  const [readingSource, setReadingSource] = useState("manual");
  const [bleDeviceLabel, setBleDeviceLabel] = useState(null);

  const availableMembers = useMemo(() => {
    const combined = [];
    const seen = new Set();

    [selfMember, ...(Array.isArray(members) ? members : [])].forEach((entry) => {
      if (!entry?._id || seen.has(entry._id)) return;
      seen.add(entry._id);
      combined.push(entry);
    });

    return combined;
  }, [members, selfMember]);

  useEffect(() => {
    const preferredId =
      id ||
      (activeView === "self" ? selfMember?._id : selectedMember?._id) ||
      availableMembers[0]?._id ||
      "";

    setSelectedId((previous) => {
      if (previous && availableMembers.some((entry) => entry._id === previous)) {
        return previous;
      }

      return preferredId;
    });
  }, [activeView, availableMembers, id, selectedMember?._id, selfMember?._id]);

  useEffect(() => {
    let cancelled = false;

    const loadMember = async () => {
      if (!selectedId) {
        setMember(null);
        setRecords([]);
        setMemberLoading(false);
        return;
      }

      setMemberLoading(true);
      try {
        const [memberResponse, recordsResponse] = await Promise.all([
          api.get(`/members/${selectedId}`),
          api.get(`/health/${selectedId}`).catch(() => []),
        ]);
        if (!cancelled) {
          setMember(memberResponse);
          setRecords(Array.isArray(recordsResponse) ? recordsResponse : []);
        }
      } catch {
        if (!cancelled) {
          setMember(null);
          setRecords([]);
        }
      } finally {
        if (!cancelled) setMemberLoading(false);
      }
    };

    loadMember();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  useEffect(() => {
    if (selectedId && id !== selectedId) {
      navigate(`/health/${selectedId}`, { replace: true });
    }
  }, [id, navigate, selectedId]);

  const loading = familyLoading || memberLoading;

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

  const insights = useMemo(() => {
    if (!records.length) {
      return ["Add the first health snapshot to start seeing household care insights."];
    }

    return latestValues.map((metric) =>
      metric.latest
        ? `${metric.label} last recorded ${new Date(metric.latest.date).toLocaleDateString("en-IN")}.`
        : `${metric.label} has no saved entries yet.`
    );
  }, [latestValues, records.length]);

  const handleOpenManualModal = () => {
    setReadingSource("manual");
    setBleDeviceLabel(null);
    setFormDate(toLocalDateTimeInputValue());
    setFormValues(getDefaultValues());
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setReadingSource("manual");
    setBleDeviceLabel(null);
    setFormValues(getDefaultValues());
  };

  const handleBleReading = (vitals) => {
    if (!vitals) return;

    setFormValues((previous) => ({
      ...previous,
      ...(vitals.bloodPressure !== undefined && { bloodPressure: String(vitals.bloodPressure) }),
      ...(vitals.heartRate != null && { heartRate: String(vitals.heartRate) }),
      ...(vitals.spO2 != null && { spO2: String(vitals.spO2) }),
      ...(vitals.bloodSugar != null && { bloodSugar: String(vitals.bloodSugar) }),
    }));
    setFormDate(toLocalDateTimeInputValue());
    setReadingSource(vitals.source === "ble_simulated" ? "ble_simulated" : "ble_device");
    setBleDeviceLabel(vitals.deviceName || "Connected device");
    setShowModal(true);
    notify.success(`Reading from ${vitals.deviceName || "Bluetooth device"} loaded`);
  };

  const handleSave = async () => {
    if (!selectedId) {
      notify.error("Select a family member first");
      return;
    }

    try {
      const payload = {
        date: new Date(formDate).toISOString(),
        source: readingSource,
        ...Object.fromEntries(
          metrics
            .filter((metric) => formValues[metric.key] !== "")
            .map((metric) => [
              metric.key,
              metric.key === "bloodPressure"
                ? String(formValues[metric.key]).trim()
                : Number(formValues[metric.key]),
            ])
        ),
      };
      const response = await api.post(`/health/${selectedId}`, payload);
      const updatedMember = response?.member || member;
      setMember(updatedMember);
      setRecords(Array.isArray(response?.records) ? response.records : records);
      handleCloseModal();
      notify.success("Health snapshot saved");
      showUnlockedBadges(response?.newBadges || []);
    } catch (error) {
      notify.error(error.message || "Could not save health snapshot");
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
              {availableMembers.length === 0 ? <option value="">No profiles yet</option> : null}
              {availableMembers.map((entry) => (
                <option key={entry?._id} value={entry?._id}>
                  {entry?.name}
                </option>
              ))}
            </Select>
            <Button
              variant="secondary"
              leftIcon={<Bluetooth size={17} />}
              onClick={() => setShowBleModal(true)}
              disabled={!member}
              title="Pair a Bluetooth health monitor to auto-fill vitals"
            >
              Sync device
            </Button>
            <Button leftIcon={<Plus size={18} />} onClick={handleOpenManualModal} disabled={!member}>
              Log vitals
            </Button>
          </div>
        </section>

        {!member ? (
          <EmptyState
            icon={<Waves size={18} />}
            heading={availableMembers.length === 0 ? "No health profiles yet" : "No member selected"}
            description={
              availableMembers.length === 0
                ? "Add or finish setting up a family profile before recording health snapshots."
                : "Choose a family member to view and update health records."
            }
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
                  <span className="health-metric__range">Normal: {metric.normalRange}</span>
                  <p>{metric.latest ? new Date(metric.latest.date).toLocaleString("en-IN") : "No entries yet"}</p>
                </article>
              ))}
            </section>

            <section className="health-panel card">
              <div className="section-header">
                <div>
                  <h2 className="text-h4">Health timeline</h2>
                  <p className="text-body-sm muted-copy">
                    Spot trends across the latest 30 readings before they turn into surprises.
                  </p>
                </div>
              </div>

              <RecordTimeline records={records} />
            </section>

            <div className={`health-content ${records.length === 0 ? "health-content--empty" : ""}`}>
              <section className="health-panel card">
                <div className="section-header">
                  <div>
                    <h2 className="text-h4">Recent snapshots</h2>
                    <p className="text-body-sm muted-copy">Each saved date bundles that member&apos;s health measurements.</p>
                  </div>
                </div>

                {records.length === 0 ? (
                  <EmptyState
                    type="records"
                    onAction={handleOpenManualModal}
                    ctaLabel="Log vitals"
                  />
                ) : (
                  <div className="health-snapshot-list">
                    {records.map((snapshot) => (
                      <article key={snapshot.date} className="health-snapshot-row">
                        <div className="health-snapshot-row__body">
                          <div className="health-snapshot-row__title">
                            <strong>{new Date(snapshot.date).toLocaleString("en-IN")}</strong>
                            {snapshot.source && snapshot.source !== "manual" ? (
                              <span className="badge badge--primary health-ble-badge">
                                <Bluetooth size={12} />
                                {snapshot.source === "ble_device" ? "BLE synced" : "BLE simulated"}
                              </span>
                            ) : null}
                          </div>
                          <p>
                            {metrics
                              .map((metric) => {
                                return snapshot?.[metric.key] !== undefined
                                  ? `${metric.label}: ${snapshot[metric.key]} ${metric.unit}`
                                  : null;
                              })
                              .filter(Boolean)
                              .slice(0, 4)
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
        onClose={handleCloseModal}
        title="Log vitals"
        description="Record multiple vital values for the same date and member."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save vitals
            </Button>
          </>
        }
      >
        <div className="health-form-grid">
          {readingSource !== "manual" ? (
            <div className="health-form-grid__wide health-ble-prefill">
              <span className="badge badge--primary">
                <Bluetooth size={14} />
                Prefilled from {bleDeviceLabel || "Bluetooth device"}
              </span>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  setShowModal(false);
                  setShowBleModal(true);
                }}
              >
                Re-sync device
              </Button>
            </div>
          ) : null}

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

      <BleDeviceModal
        open={showBleModal}
        onClose={() => setShowBleModal(false)}
        onReadingConfirmed={handleBleReading}
      />
    </div>
  );
};

export default HealthMonitor;
