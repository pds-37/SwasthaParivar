import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  BrainCircuit,
  FileText,
  HeartPulse,
  Link2,
  Smartphone,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../auth-context";
import ProfileAvatar from "../common/ProfileAvatar";
import { Button, EmptyState, Input, PullToRefresh, Skeleton } from "../ui";
import { useReminders } from "../../hooks/useReminders";
import { useReports } from "../../hooks/useReports";
import notify from "../../lib/notify";
import { useFamilyStore } from "../../store/family-store";
import "../../pages/Dashboard.css";

const personalMetrics = [
  { key: "heartRate", label: "Heart rate", unit: "bpm" },
  { key: "bloodPressure", label: "Blood pressure", unit: "mmHg" },
  { key: "sleep", label: "Sleep", unit: "hrs" },
  { key: "steps", label: "Steps", unit: "steps" },
];

const getLatestValue = (member, metricKey) => {
  const entries = Array.isArray(member?.health?.[metricKey]) ? member.health[metricKey] : [];
  const latest = [...entries].sort((left, right) => new Date(right.date) - new Date(left.date))[0];
  return latest || null;
};

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not available";

const SelfDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    household,
    selfMember,
    loading: membersLoading,
    error: membersError,
    pendingInvites,
    acceptInvite,
    refreshMembers,
  } = useFamilyStore();
  const { reminders, loading: remindersLoading, mutate: refreshReminders } = useReminders();
  const { reports, loading: reportsLoading, mutate: refreshReports } = useReports();
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);

  const loading = membersLoading || remindersLoading || reportsLoading;
  const firstName = user?.fullName?.split(" ")?.[0] || "there";
  const refreshAll = async () => {
    await Promise.allSettled([refreshMembers?.(), refreshReminders?.(), refreshReports?.()]);
  };

  const personalReminders = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder?.memberId === selfMember?._id)
        .sort((left, right) => new Date(left.nextRunAt) - new Date(right.nextRunAt))
        .slice(0, 4),
    [reminders, selfMember?._id]
  );

  const personalReports = useMemo(
    () =>
      reports
        .filter((report) => report?.memberId === selfMember?._id)
        .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
        .slice(0, 4),
    [reports, selfMember?._id]
  );

  const readiness = useMemo(() => {
    const sleepHours = Number(getLatestValue(selfMember, "sleep")?.value || 0);
    const steps = Number(getLatestValue(selfMember, "steps")?.value || 0);
    const heartRate = Number(getLatestValue(selfMember, "heartRate")?.value || 0);

    let score = 52;
    if (sleepHours >= 7) score += 18;
    else if (sleepHours >= 6) score += 10;

    if (steps >= 7000) score += 16;
    else if (steps >= 4000) score += 8;

    if (heartRate > 0 && heartRate <= 72) score += 12;
    else if (heartRate > 90) score -= 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }, [selfMember]);

  const handleAcceptInvite = async () => {
    if (!inviteCode.trim()) {
      notify.error("Enter an invite code first");
      return;
    }

    setJoining(true);

    try {
      await acceptInvite(inviteCode.trim());
      setInviteCode("");
      notify.success("Joined household successfully");
    } catch (error) {
      notify.error(error.message || "Could not join that household");
    } finally {
      setJoining(false);
    }
  };

  if (!selfMember && loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-shell">
          <Skeleton variant="card" />
        </div>
      </div>
    );
  }

  if (!selfMember && membersError) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-shell">
          <EmptyState
            icon={<HeartPulse size={20} />}
            heading="We could not load your personal profile"
            description={membersError.message || "The server is taking longer than expected. Refresh to try again."}
            ctaLabel="Refresh"
            onCta={refreshAll}
          />
        </div>
      </div>
    );
  }

  if (!selfMember) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-shell">
          <EmptyState
            icon={<HeartPulse size={20} />}
            heading="Your profile is still getting ready"
            description="Refresh once and we will rebuild your self profile inside the household."
            ctaLabel="Refresh"
            onCta={refreshAll}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <PullToRefresh
        onRefresh={refreshAll}
      >
        <div className="dashboard-shell self-dashboard-shell">
          <section className="dashboard-overview self-dashboard-overview">
            <div className="dashboard-overview__copy">
              <span className="eyebrow">
                <Sparkles size={16} />
                Self View
              </span>
              <h1 className="text-h1">Welcome back, {firstName}</h1>
              <p className="text-body-lg">
                Personal care for {selfMember.name} inside {household?.name || "your household"}.
              </p>

              <div className="dashboard-summary-pills">
                <span className="badge badge--primary">{personalReminders.length} personal reminders</span>
                <span className="badge badge--success">{personalReports.length} saved reports</span>
                <span className="dashboard-summary-pill">
                  <Activity size={14} />
                  Readiness score {readiness}
                </span>
              </div>
            </div>

            <div className="dashboard-overview__visual">
              <div className="dashboard-orbit dashboard-orbit--one" />
              <div className="dashboard-orbit dashboard-orbit--two" />
              <div className="dashboard-overview__core card">
                <span>Self profile</span>
                <ProfileAvatar
                  name={selfMember.name}
                  src={selfMember.avatar}
                  size="lg"
                  className="dashboard-overview__profile-avatar"
                />
                <small>{selfMember.connectionStatus === "connected" ? "device connected" : "device pending"}</small>
              </div>
              <div className="dashboard-overview__node dashboard-overview__node--left">
                <span>Latest report</span>
                <strong>{personalReports[0] ? formatDateTime(personalReports[0].createdAt) : "None"}</strong>
              </div>
              <div className="dashboard-overview__node dashboard-overview__node--right">
                <span>Next reminder</span>
                <strong>{personalReminders[0] ? formatDateTime(personalReminders[0].nextRunAt) : "None"}</strong>
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-header dashboard-section__heading dashboard-section__heading--inset">
              <div>
                <h2 className="text-h3">My overview</h2>
                <p className="text-body-sm muted-copy">
                  The latest signals from your profile, reminders, and reports.
                </p>
              </div>
            </div>

            <div className="self-dashboard-metrics">
              {personalMetrics.map((metric) => {
                const latest = getLatestValue(selfMember, metric.key);
                return (
                  <article key={metric.key} className="dashboard-member-card card">
                    <div className="dashboard-member-card__identity">
                      <span className="avatar avatar--lg">{metric.label.charAt(0)}</span>
                      <div>
                        <strong>{metric.label}</strong>
                        <span>{latest ? formatDateTime(latest.date) : "No reading yet"}</span>
                      </div>
                    </div>
                    <div className="dashboard-member-card__meta">
                      <span>{latest ? `${latest.value} ${metric.unit}` : "Add a health snapshot to unlock this metric."}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-header dashboard-section__heading dashboard-section__heading--inset">
              <div>
                <h2 className="text-h3">Quick actions</h2>
                <p className="text-body-sm muted-copy">
                  The fastest path back into your own care flow.
                </p>
              </div>
            </div>

            <div className="dashboard-actions-grid">
              <button type="button" className="dashboard-action-tile card card-hover" onClick={() => navigate("/ai-chat")}>
                <span className="dashboard-action-tile__icon">
                  <BrainCircuit size={20} />
                </span>
                <strong>Talk to AI coach</strong>
                <span>Ask about symptoms, patterns, medicines, or recovery guidance.</span>
              </button>

              <button type="button" className="dashboard-action-tile card card-hover" onClick={() => navigate(`/health/${selfMember._id}`)}>
                <span className="dashboard-action-tile__icon">
                  <HeartPulse size={20} />
                </span>
                <strong>Update health</strong>
                <span>Add today&apos;s blood pressure, steps, sleep, or other vitals.</span>
              </button>

              <button type="button" className="dashboard-action-tile card card-hover" onClick={() => navigate("/reports")}>
                <span className="dashboard-action-tile__icon">
                  <FileText size={20} />
                </span>
                <strong>Open my reports</strong>
                <span>Review your own reports, summaries, and uploaded files.</span>
              </button>

              <button type="button" className="dashboard-action-tile card card-hover" onClick={() => navigate("/reminders")}>
                <span className="dashboard-action-tile__icon">
                  <Bell size={20} />
                </span>
                <strong>Check reminders</strong>
                <span>See medicine, follow-up, and personal care reminders.</span>
              </button>
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="dashboard-panel card">
              <div className="section-header">
                <div>
                  <h2 className="text-h4">My reminders</h2>
                  <p className="text-body-sm muted-copy">Only the reminders attached to your profile.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/reminders")}>
                  Open
                </Button>
              </div>

              {loading ? (
                <div className="dashboard-stack">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} variant="text" height={72} />
                  ))}
                </div>
              ) : personalReminders.length === 0 ? (
                <EmptyState
                  icon={<Bell size={18} />}
                  heading="No personal reminders yet"
                  description="Create your first reminder from Self View to keep medicines and follow-ups on track."
                  ctaLabel="Create reminder"
                  onCta={() => navigate("/reminders")}
                />
              ) : (
                <div className="dashboard-stack">
                  {personalReminders.map((reminder) => (
                    <article key={reminder._id} className="dashboard-activity-row">
                      <span className="dashboard-activity-row__type">{reminder.category}</span>
                      <div>
                        <strong>{reminder.title}</strong>
                        <p>{reminder.description || "Personal care reminder"}</p>
                      </div>
                      <span>{formatDateTime(reminder.nextRunAt)}</span>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-side-column">
              <article className="dashboard-panel dashboard-panel--premium card">
                <div className="section-header">
                  <div>
                    <h2 className="text-h4">My reports</h2>
                    <p className="text-body-sm muted-copy">The newest documents linked to your profile.</p>
                  </div>
                </div>

                {loading ? (
                  <div className="dashboard-stack">
                    {[1, 2].map((item) => (
                      <Skeleton key={item} variant="text" height={72} />
                    ))}
                  </div>
                ) : personalReports.length === 0 ? (
                  <EmptyState
                    icon={<FileText size={18} />}
                    heading="No reports linked yet"
                    description="Upload a report from Self View so your AI coach and history stay personal."
                    ctaLabel="Upload report"
                    onCta={() => navigate("/reports")}
                  />
                ) : (
                  <div className="dashboard-stack">
                    {personalReports.map((report) => (
                      <article key={report.id} className="dashboard-mini-row">
                        <div className="dashboard-mini-row__meta">
                          <span className="avatar avatar--sm">
                            <FileText size={14} />
                          </span>
                          <div>
                            <strong>{report.reportType}</strong>
                            <p>{report.originalName}</p>
                          </div>
                        </div>
                        <span>{formatDateTime(report.createdAt)}</span>
                      </article>
                    ))}
                  </div>
                )}
              </article>

              <article className="dashboard-panel dashboard-panel--premium card">
                <div className="section-header">
                  <div>
                    <h2 className="text-h4">Device connection</h2>
                    <p className="text-body-sm muted-copy">Personal device sync lives in Self View only.</p>
                  </div>
                </div>

                <div className="self-dashboard-device">
                  <div className="self-dashboard-device__icon">
                    <Smartphone size={20} />
                  </div>
                  <div>
                    <strong>{selfMember.connectionStatus === "connected" ? "Device connected" : "Phase 2 device sync"}</strong>
                    <p>
                      Wearable sync is reserved for your own profile. For now, keep using manual health snapshots from the Health page.
                    </p>
                  </div>
                </div>

                <Button variant="secondary" onClick={() => navigate(`/health/${selfMember._id}`)}>
                  Open my health timeline
                </Button>
              </article>

              <article className="dashboard-panel dashboard-panel--premium card">
                <div className="section-header">
                  <div>
                    <h2 className="text-h4">Join a household</h2>
                    <p className="text-body-sm muted-copy">Accept a family invite code to connect your account.</p>
                  </div>
                </div>

                <div className="self-dashboard-join">
                  <Input
                    label="Invite code"
                    placeholder="Enter household code"
                    value={inviteCode}
                    onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                    leftIcon={<Link2 size={16} />}
                  />
                  <Button onClick={handleAcceptInvite} loading={joining}>
                    Join household
                  </Button>
                </div>

                {pendingInvites.length ? (
                  <div className="dashboard-stack">
                    {pendingInvites.slice(0, 2).map((invite) => (
                      <article key={invite.id} className="dashboard-mini-row">
                        <div className="dashboard-mini-row__meta">
                          <ProfileAvatar name={invite.name || invite.email || "Invite"} size="sm" />
                          <div>
                            <strong>{invite.email}</strong>
                            <p>{invite.inviteType === "link_existing" ? "Link existing app user" : "Invite adult family member"}</p>
                          </div>
                        </div>
                        <span>{invite.code}</span>
                      </article>
                    ))}
                  </div>
                ) : null}
              </article>
            </section>
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
};

export default SelfDashboard;
