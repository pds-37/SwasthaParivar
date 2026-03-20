import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/auth-context";
import api from "../lib/api";

import AddMemberModal from "../components/AddMemberModal";

import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";

import { Bell, Calendar, Heart, Sparkles, Trash2, UserPlus } from "lucide-react";

import "./Dashboard.css";

const safeArray = (res) => {
  try {
    if (!res) return [];
    if (Array.isArray(res)) return res;

    const picks = ["data", "items", "records", "list", "reminders"];
    for (const key of picks) {
      if (Array.isArray(res[key])) return res[key];
    }

    for (const value of Object.values(res)) {
      if (Array.isArray(value)) return value;
    }
  } catch {
    return [];
  }

  return [];
};

const safeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const daysBetween = (d1, d2) => {
  if (!d1 || !d2) return Infinity;
  const a = new Date(d1).setHours(0, 0, 0, 0);
  const b = new Date(d2).setHours(0, 0, 0, 0);
  return Math.round((b - a) / 86400000);
};

const inNextDays = (iso, days) => {
  const date = safeDate(iso);
  if (!date) return false;

  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);

  return date >= now && date <= future;
};

const buildRecordsFromMembers = (memberList = []) =>
  memberList.flatMap((member) => {
    const dates = new Set();

    Object.values(member?.health || {}).forEach((entries) => {
      if (!Array.isArray(entries)) return;
      entries.forEach((entry) => {
        if (entry?.date) dates.add(entry.date);
      });
    });

    return Array.from(dates).map((date) => ({
      memberId: member._id,
      createdAt: date,
    }));
  });

const memberAvatarColor = (name = "U") => `hsl(${name.charCodeAt(0) * 7}, 68%, 58%)`;

const Dashboard = () => {
  useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState({ open: false, member: null });
  const [deletingId, setDeletingId] = useState(null);
  const prevMembersRef = useRef(null);

  const [aiMessage, setAiMessage] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const records = useMemo(() => buildRecordsFromMembers(members), [members]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      try {
        const memberResponse = await api.get("/members");
        setMembers(safeArray(memberResponse));
      } catch {
        setMembers([]);
      }

      try {
        const reminderResponse = await api.get("/reminders");
        setReminders(safeArray(reminderResponse));
      } catch {
        setReminders([]);
      }

      setTimeout(() => setLoading(false), 300);
    };

    load();
  }, []);

  const addMember = async (form) => {
    try {
      const newMember = await api.post("/members", {
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
      });

      setMembers((previous) => [...previous, newMember]);
      setShowAddModal(false);
    } catch {
      alert("Error adding member");
    }
  };

  const openConfirmDelete = (member) => {
    setConfirmDelete({ open: true, member });
  };

  const closeConfirmDelete = () => {
    setConfirmDelete({ open: false, member: null });
  };

  const handleConfirmDelete = async () => {
    const member = confirmDelete.member;
    if (!member) return;

    prevMembersRef.current = members.slice();
    setDeletingId(member._id);
    setMembers((previous) => previous.filter((entry) => entry._id !== member._id));
    closeConfirmDelete();

    try {
      await api.delete(`/members/${member._id}`);
    } catch {
      alert("Delete failed. Restoring member.");
      setMembers(prevMembersRef.current || []);
    } finally {
      setTimeout(() => setDeletingId(null), 400);
    }
  };

  const handleAiChat = async (event) => {
    event.preventDefault();
    if (!aiMessage.trim()) return;

    setAiLoading(true);

    try {
      const response = await api.post("/ai/chat", { message: aiMessage });
      setAiResponse(response?.reply || response?.response || "No response");
      setAiMessage("");
    } catch {
      setAiResponse("The AI assistant is unavailable right now.");
    } finally {
      setAiLoading(false);
    }
  };

  const membersWithoutRecords = useMemo(() => {
    const recordSet = new Set(records.map((record) => record.memberId));
    return members.filter((member) => !recordSet.has(member._id));
  }, [members, records]);

  const latestRecordByMember = useMemo(() => {
    const map = {};
    records.forEach((record) => {
      const id = record.memberId;
      const recordDate = safeDate(record.createdAt) || new Date(0);

      if (!map[id] || new Date(map[id].createdAt) < recordDate) {
        map[id] = record;
      }
    });

    return map;
  }, [records]);

  const needsAttention = useMemo(() => {
    const now = new Date();

    return members.reduce((result, member) => {
      const age = Number(member.age || 0);
      const last = latestRecordByMember[member._id];
      const gap = last ? daysBetween(last.createdAt, now) : Infinity;

      if ((age >= 60 && gap > 90) || gap > 180 || (age < 12 && gap > 180)) {
        result.push({
          member,
          reason:
            age >= 60
              ? "Senior family member due for a routine check"
              : age < 12
                ? "Child profile needs a fresh growth or wellness update"
                : "No recent health records saved",
          daysSince: Number.isFinite(gap) ? gap : null,
        });
      }

      return result;
    }, []);
  }, [latestRecordByMember, members]);

  const upcoming = useMemo(
    () =>
      reminders
        .filter((reminder) => reminder.nextRunAt && inNextDays(reminder.nextRunAt, 7))
        .sort((a, b) => new Date(a.nextRunAt) - new Date(b.nextRunAt)),
    [reminders]
  );

  const tasksThisWeek = useMemo(() => {
    const list = [];

    upcoming.forEach((reminder) => {
      const member = members.find((entry) => entry._id === reminder.memberId);
      if (!member) return;

      list.push({
        id: reminder._id,
        type: "reminder",
        title: reminder.title,
        datetime: reminder.nextRunAt,
        member,
      });
    });

    membersWithoutRecords.forEach((member) => {
      list.push({
        id: `record-${member._id}`,
        type: "record",
        title: "Add a health record",
        member,
      });
    });

    needsAttention.forEach((entry) => {
      list.push({
        id: `attention-${entry.member._id}`,
        type: "attention",
        title: entry.reason,
        member: entry.member,
      });
    });

    return list;
  }, [members, membersWithoutRecords, needsAttention, upcoming]);

  const stats = [
    { label: "Family members", value: members.length },
    { label: "Health records", value: records.length },
    { label: "Care tasks this week", value: tasksThisWeek.length },
  ];

  const SkeletonList = () => (
    <List className="dashboard-list">
      {[1, 2, 3].map((item) => (
        <ListItem key={item} className="dashboard-list-item">
          <ListItemAvatar>
            <Skeleton variant="circular" width={44} height={44} />
          </ListItemAvatar>
          <ListItemText
            primary={<Skeleton width="60%" />}
            secondary={<Skeleton width="40%" />}
          />
        </ListItem>
      ))}
    </List>
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <section className="dashboard-hero hero-parallax">
          <div className="dashboard-hero-pattern" />
          <div className="dashboard-hero-glow" />

          <div className="dashboard-hero-copy">
            <span className="dashboard-badge">Family Wellness Hub</span>
            <h1>Family Health Tracker</h1>
            <p>
              Monitor records, upcoming medical tasks, and AI-supported wellness
              guidance in one calm place for the whole family.
            </p>

            <div className="dashboard-hero-stats">
              {stats.map((stat) => (
                <div key={stat.label} className="dashboard-stat">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="dashboard-container">
          <Box className="two-col">
            <Paper className="dashboard-card">
              <Box className="card-header">
                <div>
                  <Typography className="section-title">
                    <Heart size={20} />
                    Family Health Overview
                  </Typography>
                  <Typography className="section-subtitle">
                    Recent wellness signals and members who may need attention.
                  </Typography>
                </div>

                <Box className="header-badges">
                  <Chip className="dashboard-chip dashboard-chip--accent" label={`${members.length} members`} />
                  <Chip className="dashboard-chip" label={`${records.length} records`} />
                  <Badge badgeContent={needsAttention.length} color="error">
                    <IconButton size="small" onClick={() => setShowDrawer(true)}>
                      <Bell size={16} />
                    </IconButton>
                  </Badge>
                </Box>
              </Box>

              <Divider className="divider" />

              <Typography className="section-mini-title">Who needs attention</Typography>

              {loading ? (
                <SkeletonList />
              ) : needsAttention.length === 0 ? (
                <Typography className="empty-copy">
                  Everyone looks stable right now.
                </Typography>
              ) : (
                <List className="dashboard-list">
                  {needsAttention.map((entry) => (
                    <ListItem key={entry.member._id} className="dashboard-list-item">
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: memberAvatarColor(entry.member.name) }}>
                          {entry.member.name?.[0]}
                        </Avatar>
                      </ListItemAvatar>

                      <ListItemText
                        primary={entry.member.name}
                        secondary={`${entry.reason}${entry.daysSince ? ` - ${entry.daysSince} days ago` : ""}`}
                      />

                      <Button
                        className="dashboard-btn dashboard-btn--ghost"
                        size="small"
                        onClick={() => navigate(`/health/${entry.member._id}`)}
                      >
                        Open
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}

              <Divider className="divider" />

              <Typography className="section-mini-title">Members with no records</Typography>

              {loading ? (
                <SkeletonList />
              ) : membersWithoutRecords.length === 0 ? (
                <Typography className="empty-copy">
                  Every member already has at least one saved record.
                </Typography>
              ) : (
                <List className="dashboard-list">
                  {membersWithoutRecords.map((member) => (
                    <ListItem key={member._id} className="dashboard-list-item">
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: memberAvatarColor(member.name) }}>
                          {member.name?.[0]}
                        </Avatar>
                      </ListItemAvatar>

                      <ListItemText
                        primary={member.name}
                        secondary={`${member.age} years`}
                      />

                      <Button
                        className="dashboard-btn dashboard-btn--ghost"
                        size="small"
                        onClick={() => navigate(`/health/${member._id}`)}
                      >
                        Add Record
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            <Paper className="dashboard-card">
              <Box className="card-header">
                <div>
                  <Typography className="section-title">
                    <Calendar size={20} />
                    This Week Medical Tasks
                  </Typography>
                  <Typography className="section-subtitle">
                    Reminders, missing records, and quick follow-up items.
                  </Typography>
                </div>

                <Button
                  className="dashboard-btn dashboard-btn--ghost"
                  variant="outlined"
                  onClick={() => navigate("/reminders")}
                >
                  Manage Reminders
                </Button>
              </Box>

              <Divider className="divider" />

              {loading ? (
                <SkeletonList />
              ) : tasksThisWeek.length === 0 ? (
                <Typography className="empty-copy">No tasks are scheduled for this week.</Typography>
              ) : (
                <List className="dashboard-list">
                  {tasksThisWeek.map((task) => (
                    <ListItem key={task.id} className="dashboard-list-item">
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: memberAvatarColor(task.member.name) }}>
                          {task.member.name?.[0]}
                        </Avatar>
                      </ListItemAvatar>

                      <ListItemText
                        primary={task.title}
                        secondary={
                          task.datetime
                            ? `${task.member.name} - ${safeDate(task.datetime)?.toLocaleString() || ""}`
                            : task.member.name
                        }
                      />

                      <Button
                        className="dashboard-btn dashboard-btn--ghost"
                        size="small"
                        onClick={() =>
                          task.type === "reminder"
                            ? navigate("/reminders")
                            : navigate(`/health/${task.member._id}`)
                        }
                      >
                        Open
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Box>

          <Box className="two-col">
            <Paper className="dashboard-card">
              <Box className="card-header">
                <div>
                  <Typography className="section-title">
                    <UserPlus size={20} />
                    Family Members
                  </Typography>
                  <Typography className="section-subtitle">
                    Add profiles and keep health tracking organized by person.
                  </Typography>
                </div>

                <Button
                  className="dashboard-btn dashboard-btn--primary"
                  variant="contained"
                  startIcon={<UserPlus size={18} />}
                  onClick={() => setShowAddModal(true)}
                >
                  Add Member
                </Button>
              </Box>

              <Divider className="divider" />

              {loading ? (
                <SkeletonList />
              ) : members.length === 0 ? (
                <div className="dashboard-empty-panel">
                  <h3>No family members yet</h3>
                  <p>Create the first profile to start tracking health records and remedies.</p>
                  <Button
                    className="dashboard-btn dashboard-btn--primary"
                    variant="contained"
                    onClick={() => setShowAddModal(true)}
                  >
                    Add First Member
                  </Button>
                </div>
              ) : (
                <List className="dashboard-list">
                  {members.map((member) => (
                    <ListItem
                      key={member._id}
                      className={`dashboard-list-item ${deletingId === member._id ? "deleting" : ""}`}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: memberAvatarColor(member.name) }}>
                          {member.name?.[0]}
                        </Avatar>
                      </ListItemAvatar>

                      <ListItemText
                        primary={member.name}
                        secondary={`${member.age} years`}
                      />

                      <Button
                        className="dashboard-btn dashboard-btn--ghost"
                        size="small"
                        onClick={() => navigate(`/health/${member._id}`)}
                      >
                        Open
                      </Button>

                      <IconButton
                        size="small"
                        aria-label="delete member"
                        onClick={() => openConfirmDelete(member)}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>

            <Paper className="dashboard-card dashboard-card--assistant">
              <Box className="card-header">
                <div>
                  <Typography className="section-title">
                    <Sparkles size={20} />
                    AI Assistant
                  </Typography>
                  <Typography className="section-subtitle">
                    Ask a quick wellness question and get guided support.
                  </Typography>
                </div>
              </Box>

              <form className="dashboard-ai-form" onSubmit={handleAiChat}>
                <TextField
                  placeholder="Ask a health question..."
                  fullWidth
                  value={aiMessage}
                  onChange={(event) => setAiMessage(event.target.value)}
                />

                <Button
                  className="dashboard-btn dashboard-btn--primary"
                  type="submit"
                  variant="contained"
                >
                  {aiLoading ? "Thinking..." : "Ask"}
                </Button>
              </form>

              {aiResponse && (
                <Paper className="ai-response">
                  <Typography sx={{ fontWeight: 700 }}>AI Response</Typography>
                  <Typography sx={{ mt: 1 }}>{aiResponse}</Typography>
                </Paper>
              )}
            </Paper>
          </Box>
        </div>
      </div>

      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSave={addMember}
        />
      )}

      <Dialog open={confirmDelete.open} onClose={closeConfirmDelete}>
        <DialogTitle>Delete family member</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete <strong>{confirmDelete.member?.name}</strong>? This action cannot
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirmDelete}>Cancel</Button>
          <Button color="error" onClick={handleConfirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {showDrawer && (
        <>
          <div className="drawer-backdrop" onClick={() => setShowDrawer(false)} />

          <div className="drawer-panel">
            <div className="drawer-header">
              <h3>Family Health Alerts</h3>
              <button className="drawer-close" onClick={() => setShowDrawer(false)}>
                x
              </button>
            </div>

            <div className="drawer-content">
              {needsAttention.length === 0 ? (
                <p className="drawer-empty">No urgent follow-up items right now.</p>
              ) : (
                <List className="dashboard-list">
                  {needsAttention.map((entry) => (
                    <ListItem key={entry.member._id} className="drawer-item">
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: memberAvatarColor(entry.member.name) }}>
                          {entry.member.name?.[0]}
                        </Avatar>
                      </ListItemAvatar>

                      <ListItemText
                        primary={entry.member.name}
                        secondary={entry.reason}
                      />

                      <Button
                        className="dashboard-btn dashboard-btn--ghost"
                        size="small"
                        onClick={() => navigate(`/health/${entry.member._id}`)}
                      >
                        Open
                      </Button>
                    </ListItem>
                  ))}
                </List>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
