import React, { useMemo, useState } from "react";
import { Bell, CalendarDays, LayoutList, Plus } from "lucide-react";

import CreateReminder from "../components/CreateReminder";
import ReminderCard from "../components/ReminderCard";
import { Button, EmptyState, Modal, PullToRefresh, Skeleton } from "../components/ui";
import { useReminders } from "../hooks/useReminders";
import notify from "../lib/notify";
import { readReminderDraft, saveReminderDraft } from "../lib/reminderDraft";
import { useFamilyStore } from "../store/family-store";
import "./Reminders.css";

const startOfDay = (value) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

const buildMobileWeek = () => {
  const today = startOfDay(new Date());
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return date;
  });
};

const buildMonthGrid = () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const start = new Date(monthStart);
  start.setDate(monthStart.getDate() - monthStart.getDay());

  const days = [];
  const cursor = new Date(start);
  while (cursor <= monthEnd || cursor.getDay() !== 0) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

const isSameDay = (first, second) =>
  new Date(first).toDateString() === new Date(second).toDateString();

const reminderSuggestions = [
  {
    title: "Morning medicine",
    description: "Daily medicine reminder after breakfast.",
    category: "medicine",
    frequency: "daily",
    hour: 9,
  },
  {
    title: "Doctor follow-up",
    description: "One-time follow-up visit reminder.",
    category: "followup",
    frequency: "once",
    hour: 11,
  },
  {
    title: "Vaccination check",
    description: "Monthly vaccination and preventive care check.",
    category: "vaccination",
    frequency: "monthly",
    hour: 10,
  },
];

const toSuggestedDateTime = (hour) => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  next.setHours(hour, 0, 0, 0);
  return next.toISOString().slice(0, 16);
};

const Reminders = () => {
  const { members, selfMember, activeView, loading: membersLoading } = useFamilyStore();
  const { reminders: rawReminders, loading: remindersLoading, deleteReminder, mutate } = useReminders();
  const [viewMode, setViewMode] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(() => Boolean(readReminderDraft()));
  const [editing, setEditing] = useState(null);
  const loading = membersLoading || remindersLoading;
  const selfMemberId = selfMember?._id || null;
  const reminders = useMemo(() => {
    const byId = new Map(members.map((member) => [member._id, member]));
    const decorated = rawReminders.map((reminder) => ({
      ...reminder,
      memberName: byId.get(reminder.memberId)?.name || reminder.memberName || "Family member",
    }));

    if (activeView === "self" && selfMemberId) {
      return decorated.filter((reminder) => reminder.memberId === selfMemberId);
    }

    return decorated;
  }, [activeView, members, rawReminders, selfMemberId]);

  const overdue = useMemo(
    () =>
      reminders
        .filter((item) => new Date(item.nextRunAt) < new Date())
        .sort((first, second) => new Date(first.nextRunAt) - new Date(second.nextRunAt)),
    [reminders]
  );

  const filteredByDate = useMemo(
    () =>
      reminders
        .filter((item) => isSameDay(item.nextRunAt, selectedDate))
        .sort((first, second) => new Date(first.nextRunAt) - new Date(second.nextRunAt)),
    [reminders, selectedDate]
  );

  const mobileWeek = useMemo(() => buildMobileWeek(), []);
  const monthGrid = useMemo(() => buildMonthGrid(), []);
  const monthLabel = useMemo(
    () => new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    []
  );
  const visibleReminders = useMemo(() => {
    const source = viewMode === "calendar" ? filteredByDate : reminders;
    return [...source].sort((first, second) => new Date(first.nextRunAt) - new Date(second.nextRunAt));
  }, [filteredByDate, reminders, viewMode]);

  const handleDelete = async (id) => {
    try {
      await deleteReminder(id);
      notify.success("Reminder deleted");
    } catch {
      notify.error("Could not delete reminder");
    }
  };

  const startSuggestedReminder = (suggestion) => {
    const selectedMembers =
      activeView === "self" && selfMemberId
        ? [selfMemberId]
        : members.length === 1
          ? [members[0]._id]
          : [];

    saveReminderDraft({
      title: suggestion.title,
      description: suggestion.description,
      category: suggestion.category,
      frequency: suggestion.frequency,
      nextRunAt: toSuggestedDateTime(suggestion.hour),
      selectedMembers,
    });
    setShowCreate(true);
  };

  const renderReminderEmpty = () => (
    <div className="reminders-empty">
      <EmptyState
        type="reminders"
        onAction={() => setShowCreate(true)}
      />
      <div className="reminders-suggestions" aria-label="Suggested reminders">
        <span>Suggested reminders</span>
        <div>
          {reminderSuggestions.map((suggestion) => (
            <Button
              key={suggestion.title}
              variant="secondary"
              size="sm"
              onClick={() => startSuggestedReminder(suggestion)}
            >
              {suggestion.title}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="reminders-page">
      <PullToRefresh
        onRefresh={async () => {
          await Promise.all([mutate?.(), Promise.resolve()]);
        }}
      >
        <div className="app-shell reminders-shell">
        <section className="reminders-hero">
          <div>
            <span className="eyebrow">
              <Bell size={16} />
              Care scheduling
            </span>
            <h1 className="text-h2">Stay ahead of household care with a calmer reminder timeline.</h1>
            <p className="text-body-md">
              {activeView === "self"
                ? "See only your own reminders, follow-ups, and medicine tasks from Self View."
                : "Switch between calendar and list views, keep overdue tasks visible, and create one reminder for one or many family members."}
            </p>
          </div>

          <div className="reminders-hero__actions">
            <div className="reminders-view-toggle">
              <button
                type="button"
                className={viewMode === "calendar" ? "is-active" : ""}
                onClick={() => setViewMode("calendar")}
              >
                <CalendarDays size={16} />
                Calendar
              </button>
              <button
                type="button"
                className={viewMode === "list" ? "is-active" : ""}
                onClick={() => setViewMode("list")}
              >
                <LayoutList size={16} />
                List
              </button>
            </div>

            <Button leftIcon={<Plus size={18} />} onClick={() => setShowCreate(true)}>
              Create reminder
            </Button>
          </div>
        </section>

        {loading ? (
          <div className="reminders-loading">
            <Skeleton variant="card" />
            <Skeleton variant="card" />
          </div>
        ) : null}

        {!loading && overdue.length > 0 ? (
          <section className="reminders-overdue card">
            <div className="section-header">
              <div>
                <h2 className="text-h4">Overdue reminders</h2>
                <p className="text-body-sm muted-copy">These tasks need attention first.</p>
              </div>
            </div>

            <div className="reminders-list">
              {overdue.map((reminder) => (
                <ReminderCard key={reminder._id} reminder={reminder} onDelete={handleDelete} onEdit={setEditing} />
              ))}
            </div>
          </section>
        ) : null}

        {!loading && viewMode === "calendar" ? (
          <section className="reminders-calendar card">
            <div className="reminders-calendar__header">
              <h2 className="text-h4">{monthLabel}</h2>
              <span>{reminders.length} scheduled</span>
            </div>

            <div className="reminders-mobile-week">
              {mobileWeek.map((date) => (
                <button
                  key={date.toISOString()}
                  type="button"
                  className={`reminders-day-pill ${isSameDay(date, selectedDate) ? "is-active" : ""}`}
                  onClick={() => setSelectedDate(date)}
                >
                  <span>{date.toLocaleDateString("en-IN", { weekday: "short" })}</span>
                  <strong>{date.getDate()}</strong>
                </button>
              ))}
            </div>

            <div className="reminders-month-grid">
              {monthGrid.map((date) => {
                const active = isSameDay(date, selectedDate);
                const count = reminders.filter((item) => isSameDay(item.nextRunAt, date)).length;
                return (
                  <button
                    key={date.toISOString()}
                    type="button"
                    className={`reminders-month-day ${active ? "is-active" : ""}`}
                    onClick={() => setSelectedDate(date)}
                    aria-label={`${date.toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}${count ? `, ${count} reminders` : ", add reminder"}`}
                  >
                    <span>{date.getDate()}</span>
                    <small className={count ? "" : "reminders-month-day__add"}>
                      {count ? `${count} ${count === 1 ? "item" : "items"}` : "+"}
                    </small>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {!loading && (
          <section className="reminders-list-section">
            <div className="section-header">
              <div>
                <h2 className="text-h4">
                  {viewMode === "calendar" ? `Tasks for ${selectedDate.toLocaleDateString("en-IN", { day: "numeric", month: "long" })}` : "All reminders"}
                </h2>
                <p className="text-body-sm muted-copy">
                  {viewMode === "calendar"
                    ? "Reminders scheduled for the selected day."
                    : activeView === "self"
                      ? "Every scheduled reminder attached to your own profile."
                      : "Every scheduled care reminder across your household."}
                </p>
              </div>
            </div>

            {visibleReminders.length === 0 ? (
              renderReminderEmpty()
            ) : (
              <div className="reminders-list">
                {visibleReminders.map((reminder) => (
                  <ReminderCard
                    key={reminder._id}
                    reminder={reminder}
                    onDelete={handleDelete}
                    onEdit={setEditing}
                  />
                ))}
              </div>
            )}
          </section>
        )}
        </div>
      </PullToRefresh>

      {showCreate || editing ? (
        <Modal
          open
          onClose={() => {
            setShowCreate(false);
            setEditing(null);
          }}
          title={editing ? "Edit reminder" : "Create reminder"}
          description="Schedule medicine, vaccination, checkup, or custom family care tasks."
          size="lg"
        >
          <CreateReminder
            existing={editing}
            refresh={() => {
              setShowCreate(false);
              setEditing(null);
              mutate();
            }}
            cancel={() => {
              setShowCreate(false);
              setEditing(null);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
};

export default Reminders;
