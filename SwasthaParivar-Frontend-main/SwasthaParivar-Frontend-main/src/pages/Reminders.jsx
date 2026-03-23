import React, { useMemo, useState } from "react";
import { Bell, CalendarDays, LayoutList, Plus } from "lucide-react";

import CreateReminder from "../components/CreateReminder";
import ReminderCard from "../components/ReminderCard";
import { Button, EmptyState, Modal, PullToRefresh, Skeleton } from "../components/ui";
import { useReminders } from "../hooks/useReminders";
import notify from "../lib/notify";
import { readReminderDraft } from "../lib/reminderDraft";
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

const Reminders = () => {
  const { members, loading: membersLoading } = useFamilyStore();
  const { reminders: rawReminders, loading: remindersLoading, deleteReminder, mutate } = useReminders();
  const [viewMode, setViewMode] = useState("calendar");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreate, setShowCreate] = useState(() => Boolean(readReminderDraft()));
  const [editing, setEditing] = useState(null);
  const loading = membersLoading || remindersLoading;
  const reminders = useMemo(() => {
    const byId = new Map(members.map((member) => [member._id, member]));
    return rawReminders.map((reminder) => ({
      ...reminder,
      memberName: byId.get(reminder.memberId)?.name || reminder.memberName || "Family member",
    }));
  }, [members, rawReminders]);

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

  const handleDelete = async (id) => {
    try {
      await deleteReminder(id);
      notify.success("Reminder deleted");
    } catch {
      notify.error("Could not delete reminder");
    }
  };

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
              Switch between calendar and list views, keep overdue tasks visible, and create one reminder for one or many family members.
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
                  >
                    <span>{date.getDate()}</span>
                    <small>{count ? `${count} items` : "Free"}</small>
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
                    : "Every scheduled care reminder across your household."}
                </p>
              </div>
            </div>

            {(viewMode === "calendar" ? filteredByDate : reminders).length === 0 ? (
              <EmptyState
                icon={<Bell size={18} />}
                heading="No reminders for this view"
                description="Create a new reminder to start organizing medicines, checkups, and family follow-ups."
                ctaLabel="Create reminder"
                onCta={() => setShowCreate(true)}
              />
            ) : (
              <div className="reminders-list">
                {(viewMode === "calendar" ? filteredByDate : reminders)
                  .sort((first, second) => new Date(first.nextRunAt) - new Date(second.nextRunAt))
                  .map((reminder) => (
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
