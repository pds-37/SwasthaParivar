import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Brain,
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
import { motion as Motion } from "framer-motion";

import AddMemberModal from "../components/AddMemberModal";
import { useAuth } from "../components/auth-context";
import ProfileAvatar from "../components/common/ProfileAvatar";
import SelfDashboard from "../components/dashboard/SelfDashboard";
import InviteLink from "../components/household/InviteLink";
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

const formatListPreview = (items = [], emptyLabel = "None saved", maxItems = 2) => {
  const list = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!list.length) return emptyLabel;
  if (list.length <= maxItems) return list.join(", ");
  return `${list.slice(0, maxItems).join(", ")} +${list.length - maxItems}`;
};

const memberNeedsBasics = (member = {}) =>
  !String(member?.relation || "").trim() || !(Number(member?.age) > 0);

const FamilyDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    members,
    selectedMember,
    loading: membersLoading,
    createMember,
    createInvite,
    refreshMembers,
  } = useFamilyStore();
  const { reminders, loading: remindersLoading, mutate: refreshReminders } = useReminders();
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAlertDropdown, setShowAlertDropdown] = useState(false);
  const [pendingMedicationPrompt, setPendingMedicationPrompt] = useState(null);
  const [createdInvite, setCreatedInvite] = useState(null);
  const alertsMenuRef = useRef(null);
  const loading = membersLoading || remindersLoading;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const displayName =
    user?.fullName?.split(" ")?.[0] ||
    user?.email?.split("@")?.[0] ||
    "there";
  const dashboardHeading = `Hi, ${displayName}`;

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

  const memberById = useMemo(
    () => new Map(members.map((member) => [member._id, member])),
    [members]
  );

  const upcomingReminders = useMemo(
    () =>
      reminders
        .filter((item) => item?.nextRunAt)
        .sort((first, second) => new Date(first.nextRunAt) - new Date(second.nextRunAt))
        .slice(0, 3),
    [reminders]
  );

  const onboardingPrompt = useMemo(() => {
    if (members.length === 0) {
      return {
        kind: "add-member",
        label: "Add first member",
        message: "Add your first family profile to unlock reminders, alerts, and family-aware AI guidance.",
      };
    }

    const memberMissingBasics = members.find((member) => memberNeedsBasics(member));
    if (memberMissingBasics) {
      return {
        kind: "complete-profile",
        memberId: memberMissingBasics._id,
        label: "Complete profile",
        message: `Finish ${memberMissingBasics.name}'s profile so reminders, alerts, and records stay mapped to the right person.`,
      };
    }

    const memberMissingRecord = members.find((member) => !getMemberSnapshot(member).latestDate);
    if (memberMissingRecord) {
      return {
        kind: "add-record",
        memberId: memberMissingRecord._id,
        label: "Add first record",
        message: `Add ${memberMissingRecord.name}'s first health record so the dashboard can surface real household care context.`,
      };
    }

    return null;
  }, [members]);

  const showOnboardingCta = Boolean(onboardingPrompt && remindersToday.length === 0);
  const dashboardSubheading = showOnboardingCta
    ? onboardingPrompt.message
    : `${today} - ${remindersToday.length} due today`;

  const recentActivity = useMemo(() => {
    const reminderEvents = reminders
      .filter((item) => item?.nextRunAt)
      .map((item) => ({
        id: `reminder-${item._id}`,
        type: "Reminder",
        title: item.title,
        subtitle: item.memberName || "Family reminder",
        date: item.nextRunAt,
        memberName: memberById.get(item.memberId)?.name || item.memberName || "Family member",
        memberAvatar: memberById.get(item.memberId)?.avatar || "",
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
          memberName: member.name,
          memberAvatar: member.avatar || "",
        },
      ];
    });

    return [...reminderEvents, ...recordEvents]
      .sort((first, second) => new Date(second.date) - new Date(first.date))
      .slice(0, 5);
  }, [memberById, members, reminders]);

  const healthAlerts = useMemo(() => {
    const overdueReminders = reminders
      .filter((item) => item?.nextRunAt && new Date(item.nextRunAt) < new Date())
      .map((item) => ({
        id: `reminder-${item._id}`,
        title: item.title,
        subtitle: `${memberById.get(item.memberId)?.name || item.memberName || "Family member"} missed a scheduled reminder that should be reviewed now.`,
        level: "danger",
        memberName: memberById.get(item.memberId)?.name || item.memberName || "Family member",
        memberAvatar: memberById.get(item.memberId)?.avatar || "",
        actionLabel: "Open reminders",
        target: "/reminders",
      }));

    const staleProfiles = members
      .filter((member) => !getMemberSnapshot(member).latestDate)
      .map((member) => ({
        id: `profile-${member._id}`,
        title: `${member.name} needs a first health record`,
        subtitle: "Add a health snapshot so future guidance uses real family history.",
        level: "warning",
        memberName: member.name,
        memberAvatar: member.avatar || "",
        actionLabel: "Add record",
        target: `/health/${member._id}`,
      }));

    return [...overdueReminders, ...staleProfiles].slice(0, 6);
  }, [memberById, members, reminders]);

  const profilesWithFreshContext = useMemo(
    () => members.filter((member) => Boolean(getMemberSnapshot(member).latestDate)).length,
    [members]
  );

  const careRailTone = healthAlerts.length > 0 ? "watch" : remindersToday.length > 0 ? "focus" : "steady";
  const careRailTitle =
    healthAlerts.length > 0
      ? "Household attention is needed"
      : remindersToday.length > 0
        ? "Care flow is active today"
        : "Household care is looking steady";
  const careRailSummary =
    healthAlerts.length > 0
      ? `${healthAlerts.length} health alert${healthAlerts.length === 1 ? "" : "s"} need a closer look.`
      : remindersToday.length > 0
        ? `${remindersToday.length} reminder${remindersToday.length === 1 ? "" : "s"} are lined up for today.`
        : "No urgent gaps are showing right now, so this is a good moment to review upcoming care.";
  const nextReminderLabel = upcomingReminders[0]?.nextRunAt
    ? new Date(upcomingReminders[0].nextRunAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "No reminder queued";

  const addMember = async (form) => {
    try {
      if (form.mode === "adult_invite" || form.mode === "link_existing") {
        const invite = await createInvite({
          inviteType: form.mode,
          email: form.email,
          name: form.name,
          relation: form.relation,
        });
        setShowAddMember(false);
        setCreatedInvite(invite);
        notify.success("Invite created");
        return;
      }

      const createdMember = await createMember({
        name: form.name,
        relation: form.relation,
        age: Number(form.age),
        gender: form.gender,
        avatar: form.avatar,
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
      notify.error(form.mode === "dependent" ? "Could not add family member" : "Could not create invite");
    }
  };

  const quickActions = [
    {
      icon: Brain,
      label: "Ask AI",
      description: "Get context-aware family care guidance.",
      onClick: () => navigate("/ai-chat"),
    },
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
      icon: UserPlus,
      label: "Add member",
      description: "Create a new household care profile.",
      onClick: () => setShowAddMember(true),
    },
  ];

  useEffect(() => {
    if (!showAlertDropdown) return undefined;

    const handlePointerDown = (event) => {
      if (!alertsMenuRef.current?.contains(event.target)) {
        setShowAlertDropdown(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [showAlertDropdown]);

  const handleOnboardingAction = () => {
    if (!onboardingPrompt) return;

    if (onboardingPrompt.kind === "add-member") {
      setShowAddMember(true);
      return;
    }

    if (onboardingPrompt.kind === "complete-profile") {
      navigate(`/family/${onboardingPrompt.memberId}`);
      return;
    }

    if (onboardingPrompt.kind === "add-record") {
      navigate(`/health/${onboardingPrompt.memberId}`);
    }
  };

  const openAlertDropdown = () => {
    setShowAlertDropdown((previous) => !previous);
  };

  return (
    <div className="dashboard-page">
      <PullToRefresh
        onRefresh={async () => {
          await Promise.all([refreshMembers?.(), refreshReminders?.()]);
        }}
      >
        <div className="dashboard-shell family-dashboard-shell">
        <section className="dashboard-overview">
          <Motion.div
            className="dashboard-overview__copy"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="eyebrow">
              <Sparkles size={16} />
              Care snapshot
            </span>
            <h1 className="text-h1">{dashboardHeading}</h1>
            <p className="text-body-lg">{dashboardSubheading}</p>
            {showOnboardingCta ? (
              <Button
                variant="secondary"
                className="dashboard-overview__cta"
                leftIcon={<UserPlus size={16} />}
                onClick={handleOnboardingAction}
              >
                {onboardingPrompt.label}
              </Button>
            ) : null}

            <Motion.div
              className="dashboard-summary-pills"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <span className="badge badge--primary">{members.length} family profiles</span>
              <span className="badge badge--success">{upcomingReminders.length} upcoming tasks</span>
              <div className="dashboard-alert-menu" ref={alertsMenuRef}>
                <button type="button" className="dashboard-summary-pill" onClick={openAlertDropdown}>
                  <TriangleAlert size={14} />
                  {healthAlerts.length} health alerts
                </button>

                {showAlertDropdown ? (
                  <div className="dashboard-alert-dropdown card">
                    <div className="dashboard-alert-dropdown__header">
                      <strong>Household health alerts</strong>
                      <span>{healthAlerts.length ? "Tap an item to act on it" : "All clear right now"}</span>
                    </div>

                    {healthAlerts.length === 0 ? (
                      <div className="dashboard-alert-dropdown__empty">
                        <Sparkles size={16} />
                        <span>No active household alerts.</span>
                      </div>
                    ) : (
                      <div className="dashboard-stack">
                        {healthAlerts.map((alert) => (
                          <button
                            key={alert.id}
                            type="button"
                            className={`dashboard-alert-dropdown__item ${alert.level === "danger" ? "is-danger" : "is-warning"}`}
                            onClick={() => {
                              setShowAlertDropdown(false);
                              if (alert.target) {
                                navigate(alert.target);
                              }
                            }}
                          >
                            <ProfileAvatar
                              name={alert.memberName}
                              src={alert.memberAvatar}
                              size="sm"
                            />
                            <div>
                              <strong>{alert.title}</strong>
                              <p>{alert.subtitle}</p>
                              <span>{alert.actionLabel}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </Motion.div>
          </Motion.div>

          <div className="dashboard-overview__visual">
            <Motion.div
              className="dashboard-orbit dashboard-orbit--one"
              initial={{ rotateX: 70, rotateZ: 0, y: -10 }}
              animate={{ rotateX: 70, rotateZ: 360, y: -10 }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            />
            <Motion.div
              className="dashboard-orbit dashboard-orbit--two"
              initial={{ rotateX: 70, rotateZ: 0, y: -10 }}
              animate={{ rotateX: 70, rotateZ: -360, y: -10 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            />
            <Motion.div
              className="dashboard-overview__core card"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
            >
              <span>Family care brain</span>
              <strong>{members.length || 0}</strong>
              <small>active household profiles</small>
            </Motion.div>
            <Motion.div
              className="dashboard-overview__node dashboard-overview__node--left"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1, y: [0, -8, 0] }}
              transition={{
                x: { delay: 0.4, type: "spring" },
                opacity: { delay: 0.4 },
                y: { delay: 0.8, duration: 4, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <span>Reports</span>
              <strong>{recentActivity.filter((item) => item.type === "Health record").length}</strong>
            </Motion.div>
            <Motion.div
              className="dashboard-overview__node dashboard-overview__node--right"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1, y: [0, -8, 0] }}
              transition={{
                x: { delay: 0.5, type: "spring" },
                opacity: { delay: 0.5 },
                y: { delay: 1, duration: 4.5, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <span>Today</span>
              <strong>{remindersToday.length}</strong>
            </Motion.div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="section-header dashboard-section__heading dashboard-section__heading--inset">
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
                      <ProfileAvatar name={member.name} src={member.avatar} size="lg" />
                      <div>
                        <strong>{member.name}</strong>
                        <span>{member.relation || "Family member"}</span>
                      </div>
                    </div>

                    <div className="dashboard-member-card__meta">
                      <span>{member.age ? `${member.age} years` : "Age pending"}</span>
                      <span>{snapshot.latestDate ? `Last checkup ${formatRelativeTime(snapshot.latestDate)}` : "No checkup recorded"}</span>
                    </div>

                    <div className="dashboard-member-card__details">
                      <div>
                        <strong>Conditions</strong>
                        <span>{formatListPreview(member.conditions, "No conditions saved")}</span>
                      </div>
                      <div>
                        <strong>Medicines</strong>
                        <span>{formatListPreview(member.medications, "No medicines saved")}</span>
                      </div>
                    </div>

                    <div className="dashboard-member-card__actions">
                      <Button variant="ghost" onClick={() => navigate(`/health/${member._id}`)} fullWidth>
                        Add record
                      </Button>
                      <Button
                        variant="secondary"
                        rightIcon={<ChevronRight size={16} />}
                        onClick={() => navigate(`/family/${member._id}`)}
                        fullWidth
                      >
                        Open profile
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="dashboard-section">
          <div className="section-header dashboard-section__heading dashboard-section__heading--inset">
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
                  <action.icon size={24} />
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
                    <div className="dashboard-activity-row__content">
                      <ProfileAvatar
                        name={item.memberName || item.title}
                        src={item.memberAvatar}
                        size="sm"
                      />
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.subtitle}</p>
                      </div>
                    </div>
                    <span>{formatRelativeTime(item.date)}</span>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="dashboard-side-column">
            <article className={`dashboard-rail-hero dashboard-rail-hero--${careRailTone}`}>
              <div className="dashboard-rail-hero__glow" aria-hidden="true" />
              <div className="dashboard-rail-hero__copy">
                <span className="dashboard-rail-hero__eyebrow">
                  <Sparkles size={14} />
                  Premium care rail
                </span>
                <h2 className="text-h4">{careRailTitle}</h2>
                <p>{careRailSummary}</p>
              </div>

              <div className="dashboard-rail-hero__metrics">
                <article>
                  <span>Profiles ready</span>
                  <strong>
                    {profilesWithFreshContext}/{members.length || 0}
                  </strong>
                </article>
                <article>
                  <span>Next reminder</span>
                  <strong>{nextReminderLabel}</strong>
                </article>
                <article>
                  <span>AI context</span>
                  <strong>{selectedMember?.name || "Whole family"}</strong>
                </article>
              </div>

              <div className="dashboard-rail-hero__actions">
                <Button leftIcon={<BrainCircuit size={16} />} onClick={() => navigate("/ai-chat")}>
                  Open AI advisor
                </Button>
                <Button variant="secondary" leftIcon={<Bell size={16} />} onClick={() => navigate("/reminders")}>
                  Review reminders
                </Button>
              </div>
            </article>

            <article className="dashboard-panel dashboard-panel--premium card">
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
                        <ProfileAvatar
                          name={memberById.get(reminder.memberId)?.name || reminder.memberName || "Family member"}
                          src={memberById.get(reminder.memberId)?.avatar || ""}
                          size="sm"
                        />
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

            <article className="dashboard-panel dashboard-panel--premium card">
              <div className="section-header">
                <div>
                  <h2 className="text-h4">Health alerts</h2>
                  <p className="text-body-sm muted-copy">Overdue reminders or profiles that need fresh attention.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={openAlertDropdown}>
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
                      <ProfileAvatar name={alert.memberName} src={alert.memberAvatar} size="sm" />
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
        open={Boolean(createdInvite)}
        onClose={() => setCreatedInvite(null)}
        title="Invite ready"
        description="Share this code with the family member so they can join the same household from their own account."
        footer={
          <Button variant="secondary" onClick={() => setCreatedInvite(null)}>
            Close
          </Button>
        }
      >
        {createdInvite ? (
          <InviteLink
            initialCode={createdInvite.code}
            inviteType={createdInvite.inviteType}
            email={createdInvite.email}
            name={createdInvite.name}
            relation={createdInvite.relation}
          />
        ) : null}
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

const Dashboard = () => {
  const { activeView } = useFamilyStore();
  return activeView === "self" ? <SelfDashboard /> : <FamilyDashboard />;
};

export default Dashboard;
