import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BrainCircuit,
  CalendarClock,
  ChevronRight,
  FileText,
  HeartPulse,
  Sparkles,
  TriangleAlert,
  UserPlus,
  Users,
} from "lucide-react";

import AddMemberModal from "../components/AddMemberModal";
import { useAuth } from "../components/auth-context";
import { Button, EmptyState, Modal, PullToRefresh, Skeleton } from "../components/ui";
import { useReminders } from "../hooks/useReminders";
import notify from "../lib/notify";
import { saveReminderDraft } from "../lib/reminderDraft";
import { useFamilyStore } from "../store/family-store";
import "./Dashboard.css";

const formatRelativeTime = (value) => {
  if (!value) return "Just now";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString();
};

const getMemberSnapshot = (member = {}) => {
  const allDates = Object.values(member.health || {}).flatMap((entries) =>
    Array.isArray(entries) ? entries.map((entry) => entry?.date).filter(Boolean) : []
  );

  if (!allDates.length) {
    return {
      latestDate: null,
      label: "No health records yet",
    };
  }

  const latestDate = allDates.sort((first, second) => new Date(second) - new Date(first))[0];
  return {
    latestDate,
    label: `Updated ${formatRelativeTime(latestDate)}`,
  };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { members, loading: membersLoading, createMember, refreshMembers } = useFamilyStore();
  const { reminders, loading: remindersLoading, mutate: refreshReminders } = useReminders();
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [pendingMedicationPrompt, setPendingMedicationPrompt] = useState(null);
  const loading = membersLoading || remindersLoading;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const firstName = user?.fullName?.split(" ")?.[0] || "there";
  const dashboardHeading = user?.fullName ? `Welcome back, ${firstName}` : "Welcome back";

  const remindersToday = useMemo(
    () =>
      reminders.filter((item) => {
        if (!item?.nextRunAt) return false;
        const nextRun = new Date(item.nextRunAt);
        const now = new Date();
        return nextRun.toDateString() === now.toDateString();
      }),
    [reminders]
  );

  const upcomingReminders = useMemo(
    () =>
      reminders
        .filter((item) => item?.nextRunAt)
        .sort((first, second) => new Date(first.nextRunAt) - new Date(second.nextRunAt))
        .slice(0, 3),
    [reminders]
  );

  const recentActivity = useMemo(() => {
    const reminderEvents = reminders
      .filter((item) => item?.nextRunAt)
      .map((item) => ({
        id: `reminder-${item._id}`,
        type: "Reminder",
        title: item.title,
        subtitle: item.memberName || "Family reminder",
        date: item.nextRunAt,
      }));

    const recordEvents = members.flatMap((member) => {
      const snapshot = getMemberSnapshot(member);
      if (!snapshot.latestDate) return [];
      return [
        {
          id: `record-${member._id}`,
          type: "Health record",
          title: `Updated ${member.name}`,
          subtitle: snapshot.label,
          date: snapshot.latestDate,
        },
      ];
    });

    return [...reminderEvents, ...recordEvents]
      .sort((first, second) => new Date(second.date) - new Date(first.date))
      .slice(0, 5);
  }, [members, reminders]);

  const healthAlerts = useMemo(() => {
    const overdueReminders = reminders
      .filter((item) => item?.nextRunAt && new Date(item.nextRunAt) < new Date())
      .map((item) => ({
        id: `reminder-${item._id}`,
        title: item.title,
        subtitle: `${item.memberName || "Family member"} missed a scheduled reminder`,
        level: "danger",
      }));

    const staleProfiles = members
      .filter((member) => !getMemberSnapshot(member).latestDate)
      .map((member) => ({
        id: `profile-${member._id}`,
        title: `${member.name} needs a first health record`,
        subtitle: "Add a health snapshot so future guidance uses real family history.",
        level: "warning",
      }));

    return [...overdueReminders, ...staleProfiles].slice(0, 4);
  }, [members, reminders]);

  const addMember = async (form) => {
    try {
      const createdMember = await createMember({
        name: form.name,
        relation: form.relation,
        age: Number(form.age),
        gender: form.gender,
        conditions: form.conditions,
        allergies: form.allergies,
        medications: form.medications,
        childSensitive: form.childSensitive,
      });
      setShowAddMember(false);
      notify.success("Family member added");
      if (createdMember?.medications?.length) {
        setPendingMedicationPrompt({
          memberId: createdMember._id,
          memberName: createdMember.name,
          medication: createdMember.medications[0],
        });
      }
    } catch {
      notify.error("Could not add family member");
    }
  };

  const quickActions = [
    {
      icon: Bell,
      label: "Add reminder",
      description: "Schedule a medicine or checkup task.",
      onClick: () => navigate("/reminders"),
    },
    {
      icon: FileText,
      label: "Upload report",
      description: "Save a report and generate an AI summary.",
      onClick: () => navigate("/reports"),
    },
    {
      icon: BrainCircuit,
      label: "Ask AI",
      description: "Get context-aware family care guidance.",
      onClick: () => navigate("/ai-chat"),
    },
    {
      icon: UserPlus,
      label: "Add member",
      description: "Create a new household care profile.",
      onClick: () => setShowAddMember(true),
    },
  ];

  return (
    <div className="dashboard-page">
      <PullToRefresh
        onRefresh={async () => {
          await Promise.all([refreshMembers?.(), refreshReminders?.()]);
        }}
      >
        <div className="dashboard-shell">
        <section className="dashboard-overview">
          <div className="dashboard-overview__copy">
            <span className="eyebrow">
              <Sparkles size={16} />
              Household command center
            </span>
            <h1 className="text-h1">{dashboardHeading}</h1>
            <p className="text-body-lg">
              {today} - {remindersToday.length} reminder{remindersToday.length === 1 ? "" : "s"} due today
            </p>

            <div className="dashboard-summary-pills">
              <span className="badge badge--primary">{members.length} family profiles</span>
              <span className="badge badge--success">{upcomingReminders.length} upcoming tasks</span>
              <button type="button" className="dashboard-summary-pill" onClick={() => setShowAlerts(true)}>
                <TriangleAlert size={14} />
                {healthAlerts.length} health alerts
              </button>
            </div>
          </div>

          <div className="dashboard-overview__visual">
            <div className="dashboard-orbit dashboard-orbit--one" />
            <div className="dashboard-orbit dashboard-orbit--two" />
            <div className="dashboard-overview__core card">
              <span>Family care brain</span>
              <strong>{members.length || 0}</strong>
              <small>active household profiles</small>
            </div>
            <div className="dashboard-overview__node dashboard-overview__node--left">
              <span>Reports</span>
              <strong>{recentActivity.filter((item) => item.type === "Health record").length}</strong>
            </div>
            <div className="dashboard-overview__node dashboard-overview__node--right">
              <span>Today</span>
              <strong>{remindersToday.length}</strong>
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-header">
            <div>
              <h2 className="text-h3">Family members</h2>
              <p className="text-body-sm muted-copy">Quickly jump into each profile, record, or reminder flow.</p>
            </div>
            <Button variant="secondary" leftIcon={<Users size={18} />} onClick={() => navigate("/family")}>
              View all members
            </Button>
          </div>

          {loading ? (
            <div className="dashboard-member-row">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} variant="card" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <EmptyState
              icon={<Users size={20} />}
              heading="No family profiles yet"
              description="Create your first family member to start organizing reminders, records, and care guidance."
              ctaLabel="Add first member"
              onCta={() => setShowAddMember(true)}
            />
          ) : (
            <div className="dashboard-member-row">
              {members.map((member) => {
                const snapshot = getMemberSnapshot(member);
                return (
                  <article key={member._id} className="dashboard-member-card card card-hover">
                    <div className="dashboard-member-card__identity">
                      <span className="avatar avatar--lg">{member.name?.charAt(0) || "U"}</span>
                      <div>
                        <strong>{member.name}</strong>
                        <span>{member.relation || "Family member"}</span>
                      </div>
                    </div>

                    <div className="dashboard-member-card__meta">
                      <span>{member.age ? `${member.age} years` : "Age pending"}</span>
                      <span>{snapshot.label}</span>
                    </div>

                    <Button
                      variant="ghost"
                      rightIcon={<ChevronRight size={16} />}
                      onClick={() => navigate(`/family/${member._id}`)}
                      fullWidth
                    >
                      Open profile
                    </Button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-header">
            <div>
              <h2 className="text-h3">Quick actions</h2>
              <p className="text-body-sm muted-copy">The tasks families use every day, kept one tap away.</p>
            </div>
          </div>

          <div className="dashboard-actions-grid">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                className="dashboard-action-tile card card-hover"
                onClick={action.onClick}
              >
                <span className="dashboard-action-tile__icon">
                  <action.icon size={20} />
                </span>
                <strong>{action.label}</strong>
                <span>{action.description}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="dashboard-grid">
          <section className="dashboard-panel card">
            <div className="section-header">
              <div>
                <h2 className="text-h3">Recent activity</h2>
                <p className="text-body-sm muted-copy">The latest household reminders and health updates.</p>
              </div>
            </div>

            {loading ? (
              <div className="dashboard-stack">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} variant="text" height={72} />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={18} />}
                heading="No recent activity yet"
                description="As reminders and records are created, the latest household actions will show up here."
              />
            ) : (
              <div className="dashboard-stack">
                {recentActivity.map((item) => (
                  <article key={item.id} className="dashboard-activity-row">
                    <span className="dashboard-activity-row__type">{item.type}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.subtitle}</p>
                    </div>
                    <span>{formatRelativeTime(item.date)}</span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-side-column">
            <article className="dashboard-panel card">
              <div className="section-header">
                <div>
                  <h2 className="text-h4">Upcoming reminders</h2>
                  <p className="text-body-sm muted-copy">The next care tasks due across the family.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate("/reminders")}>
                  Open
                </Button>
              </div>

              {loading ? (
                <div className="dashboard-stack">
                  {[1, 2, 3].map((item) => (
                    <Skeleton key={item} variant="text" height={64} />
                  ))}
                </div>
              ) : upcomingReminders.length === 0 ? (
                <EmptyState
                  icon={<CalendarClock size={18} />}
                  heading="No upcoming reminders"
                  description="Create a reminder to keep medicine, reports, and follow-ups on track."
                  ctaLabel="Create reminder"
                  onCta={() => navigate("/reminders")}
                />
              ) : (
                <div className="dashboard-stack">
                  {upcomingReminders.map((reminder) => (
                    <article key={reminder._id} className="dashboard-mini-row">
                      <div className="dashboard-mini-row__meta">
                        <span className="avatar avatar--sm">
                          {(reminder.memberName || "F").charAt(0)}
                        </span>
                        <div>
                          <strong>{reminder.title}</strong>
                          <p>{reminder.memberName || "Family member"}</p>
                        </div>
                      </div>
                      <span>{new Date(reminder.nextRunAt).toLocaleString("en-IN", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })}</span>
                    </article>
                  ))}
                </div>
              )}
            </article>

            <article className="dashboard-panel card">
              <div className="section-header">
                <div>
                  <h2 className="text-h4">Health alerts</h2>
                  <p className="text-body-sm muted-copy">Overdue reminders or profiles that need fresh attention.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowAlerts(true)}>
                  Review
                </Button>
              </div>

              {loading ? (
                <div className="dashboard-stack">
                  {[1, 2].map((item) => (
                    <Skeleton key={item} variant="text" height={72} />
                  ))}
                </div>
              ) : healthAlerts.length === 0 ? (
                <EmptyState
                  icon={<TriangleAlert size={18} />}
                  heading="No active alerts"
                  description="The household looks well covered right now."
                />
              ) : (
                <div className="dashboard-stack">
                  {healthAlerts.slice(0, 3).map((alert) => (
                    <article
                      key={alert.id}
                      className={`dashboard-alert-row ${alert.level === "danger" ? "is-danger" : "is-warning"}`}
                    >
                      <TriangleAlert size={16} />
                      <div>
                        <strong>{alert.title}</strong>
                        <p>{alert.subtitle}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        </div>
        </div>
      </PullToRefresh>

      {showAddMember ? <AddMemberModal onClose={() => setShowAddMember(false)} onSave={addMember} /> : null}

      <Modal
        open={showAlerts}
        onClose={() => setShowAlerts(false)}
        title="Household health alerts"
        description="Review the items that need follow-up right now."
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setShowAlerts(false)}>
            Close
          </Button>
        }
      >
        {healthAlerts.length === 0 ? (
          <EmptyState
            icon={<TriangleAlert size={18} />}
            heading="No alerts at the moment"
            description="As overdue reminders or missing records appear, they will show up here."
          />
        ) : (
          <div className="dashboard-stack">
            {healthAlerts.map((alert) => (
              <article
                key={alert.id}
                className={`dashboard-alert-row ${alert.level === "danger" ? "is-danger" : "is-warning"}`}
              >
                <TriangleAlert size={16} />
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.subtitle}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(pendingMedicationPrompt)}
        onClose={() => setPendingMedicationPrompt(null)}
        title="Create a medication reminder?"
        description="This member already has a medication saved, so we can prefill the reminder for you."
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingMedicationPrompt(null)}>
              Not now
            </Button>
            <Button
              onClick={() => {
                if (!pendingMedicationPrompt) return;
                saveReminderDraft({
                  title: pendingMedicationPrompt.medication,
                  description: `Daily medication reminder for ${pendingMedicationPrompt.memberName}.`,
                  category: "medicine",
                  frequency: "daily",
                  selectedMembers: [pendingMedicationPrompt.memberId],
                  memberName: pendingMedicationPrompt.memberName,
                });
                setPendingMedicationPrompt(null);
                navigate("/reminders");
              }}
            >
              Create reminder
            </Button>
          </>
        }
      >
        {pendingMedicationPrompt ? (
          <p className="text-body-md muted-copy">
            "{pendingMedicationPrompt.medication}" was added to {pendingMedicationPrompt.memberName}&apos;s profile.
          </p>
        ) : null}
      </Modal>
    </div>
  );
};

export default Dashboard;
