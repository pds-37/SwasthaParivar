import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Bell, CalendarClock, Plus } from "lucide-react";
import CreateReminder from "../components/CreateReminder";
import ReminderCard from "../components/ReminderCard";
import api from "../lib/api";
import "./Reminders.css";

const GROUPS = {
  TODAY: "Today",
  THIS_WEEK: "This Week",
  LATER: "Later",
};

const categories = ["all", "medicine", "vaccination", "checkup", "custom"];

function groupByTimeline(reminders = []) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - startOfToday.getDay()));

  const groups = {
    [GROUPS.TODAY]: [],
    [GROUPS.THIS_WEEK]: [],
    [GROUPS.LATER]: [],
  };

  reminders.forEach((reminder) => {
    if (!reminder?.nextRunAt) return;
    const next = new Date(reminder.nextRunAt);

    if (next >= startOfToday && next <= endOfToday) {
      groups[GROUPS.TODAY].push(reminder);
    } else if (next > endOfToday && next <= endOfWeek) {
      groups[GROUPS.THIS_WEEK].push(reminder);
    } else {
      groups[GROUPS.LATER].push(reminder);
    }
  });

  return groups;
}

const Reminders = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const remindersRef = useRef([]);

  const syncReminders = (nextReminders) => {
    remindersRef.current = nextReminders;
    setReminders(nextReminders);
  };

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const response = await api.get("/reminders");
      syncReminders(Array.isArray(response) ? response : response?.reminders || []);
    } catch (error) {
      console.error("fetchReminders error:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const loadTimer = setTimeout(() => {
      fetchReminders();
    }, 0);

    const timer = setInterval(() => setReminders((current) => [...current]), 60000);

    return () => {
      clearTimeout(loadTimer);
      clearInterval(timer);
    };
  }, []);

  const handleDelete = async (id) => {
    const previous = remindersRef.current;
    const item = previous.find((reminder) => reminder._id === id);

    if (!item) return;

    syncReminders(previous.filter((entry) => entry._id !== id));

    toast(
      (toastInstance) => (
        <div className="reminders-toast">
          <span>Deleted "{item.title}"</span>
          <button
            className="reminders-toast__undo"
            onClick={() => {
              toast.dismiss(toastInstance.id);
              syncReminders([item, ...remindersRef.current]);
            }}
          >
            Undo
          </button>
        </div>
      ),
      { duration: 5000 }
    );

    setTimeout(async () => {
      const stillDeleted = !remindersRef.current.some((entry) => entry._id === id);
      if (!stillDeleted) return;

      try {
        await api.delete(`/reminders/${id}`);
      } catch (error) {
        console.error("delete error:", error);
        toast.error("Delete failed. Restoring reminder.");
        syncReminders(previous);
      }
    }, 5200);
  };

  const handleEdit = (reminder) => {
    setEditing(reminder);
    setShowCreate(true);
  };

  const handleCreatedOrUpdated = () => {
    setEditing(null);
    setShowCreate(false);
    fetchReminders();
  };

  const filtered = useMemo(() => {
    const byCategory = reminders.filter((reminder) => {
      if (categoryFilter === "all") return true;
      return reminder.category?.toLowerCase() === categoryFilter;
    });

    if (tab === "upcoming") {
      return byCategory.filter((reminder) => new Date(reminder.nextRunAt) >= new Date());
    }

    return byCategory;
  }, [categoryFilter, reminders, tab]);

  const groups = useMemo(() => groupByTimeline(filtered), [filtered]);

  return (
    <div className="reminders-page">
      <div className="app-shell reminders-shell">
        <section className="reminders-hero">
          <div>
            <span className="eyebrow">
              <Bell size={16} />
              Care Scheduling
            </span>
            <h1>Medical reminders that feel organized, not overwhelming.</h1>
            <p>
              Schedule medicine, vaccination, and checkup tasks in a timeline that keeps the whole family on track.
            </p>
          </div>

          <div className="reminders-hero__stats surface-card">
            <div>
              <strong>{reminders.length}</strong>
              <span>Total reminders</span>
            </div>
            <div>
              <strong>{groups[GROUPS.TODAY]?.length || 0}</strong>
              <span>Due today</span>
            </div>
            <div>
              <strong>{groups[GROUPS.THIS_WEEK]?.length || 0}</strong>
              <span>This week</span>
            </div>
          </div>
        </section>

        <section className="surface-card reminders-toolbar">
          <div className="reminders-toolbar__left">
            <div className="reminders-tab-group">
              <button
                type="button"
                className={`pill-button ${tab === "upcoming" ? "active" : ""}`}
                onClick={() => {
                  setTab("upcoming");
                  setShowCreate(false);
                  setEditing(null);
                }}
              >
                Upcoming
              </button>
              <button
                type="button"
                className={`pill-button ${tab === "all" ? "active" : ""}`}
                onClick={() => {
                  setTab("all");
                  setShowCreate(false);
                  setEditing(null);
                }}
              >
                All reminders
              </button>
            </div>

            <div className="reminders-categories">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={`reminders-category ${categoryFilter === category ? "active" : ""}`}
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="reminders-create-btn"
            onClick={() => {
              setShowCreate(true);
              setEditing(null);
            }}
          >
            <Plus size={16} />
            Create reminder
          </button>
        </section>

        {showCreate && (
          <CreateReminder
            key={editing?._id || "new"}
            existing={editing}
            refresh={handleCreatedOrUpdated}
            cancel={() => {
              setEditing(null);
              setShowCreate(false);
            }}
          />
        )}

        {!loading && filtered.length === 0 && !showCreate && (
          <section className="surface-card reminders-empty">
            <CalendarClock size={34} />
            <h3>No reminders found</h3>
            <p>Create your first reminder to start organizing care tasks by person and date.</p>
          </section>
        )}

        {!loading && !showCreate && filtered.length > 0 && (
          <div className="reminders-groups">
            {[GROUPS.TODAY, GROUPS.THIS_WEEK, GROUPS.LATER].map((groupKey) => {
              const items = groups[groupKey] || [];
              if (items.length === 0) return null;

              return (
                <section key={groupKey} className="reminders-group">
                  <div className="reminders-group__head">
                    <h2>{groupKey}</h2>
                    <span>{items.length} items</span>
                  </div>

                  <div className="reminders-group__list">
                    {items.map((reminder) => (
                      <ReminderCard
                        key={reminder._id}
                        reminder={reminder}
                        onDelete={handleDelete}
                        onEdit={handleEdit}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reminders;
