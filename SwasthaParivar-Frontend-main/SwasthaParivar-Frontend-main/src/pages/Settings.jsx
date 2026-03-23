import React, { useMemo, useState } from "react";
import { Download, Moon, Shield, SunMedium, Trash2, UserCircle2 } from "lucide-react";

import { useAuth } from "../components/auth-context";
import { Button, Modal, Select, Toggle } from "../components/ui";
import notify from "../lib/notify";
import { useThemeMode } from "../theme/theme-context";
import "./Settings.css";

const Settings = () => {
  const { user, logout } = useAuth();
  const { preference, setThemePreference } = useThemeMode();
  const [notificationSettings, setNotificationSettings] = useState({
    familyReminders: true,
    medicine: true,
    vaccination: true,
    reports: true,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const initials = useMemo(() => user?.fullName?.charAt(0) || "U", [user]);

  const handleExport = () => {
    const payload = {
      user,
      notificationSettings,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "swastha-parivar-data.json";
    link.click();
    URL.revokeObjectURL(url);
    notify.success("Data export started");
  };

  return (
    <div className="settings-page">
      <div className="app-shell settings-shell">
        <section className="settings-hero">
          <div className="settings-hero__identity">
            <span className="avatar avatar--lg">{initials}</span>
            <div>
              <span className="eyebrow">
                <UserCircle2 size={16} />
                Account settings
              </span>
              <h1 className="text-h2">Manage profile, privacy, notifications, and theme.</h1>
              <p className="text-body-md">
                Everything that shapes the SwasthaParivar experience for you and your household lives here.
              </p>
            </div>
          </div>
        </section>

        <div className="settings-grid">
          <section className="settings-section card">
            <div className="settings-section__head">
              <div>
                <h2 className="text-h4">Profile</h2>
                <p className="text-body-sm muted-copy">Basic account information for your family workspace.</p>
              </div>
            </div>

            <div className="settings-row">
              <span>Name</span>
              <strong>{user?.fullName || "Family account"}</strong>
            </div>
            <div className="settings-row">
              <span>Email</span>
              <strong>{user?.email || "Not available"}</strong>
            </div>
          </section>

          <section className="settings-section card">
            <div className="settings-section__head">
              <div>
                <h2 className="text-h4">Theme</h2>
                <p className="text-body-sm muted-copy">Change appearance instantly with no reload.</p>
              </div>
            </div>

            <div className="settings-theme-grid">
              {[
                { value: "light", label: "Light", icon: SunMedium },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Shield },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`settings-theme-card ${preference === option.value ? "is-active" : ""}`}
                  onClick={() => setThemePreference(option.value)}
                >
                  <option.icon size={18} />
                  <strong>{option.label}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="settings-section card">
            <div className="settings-section__head">
              <div>
                <h2 className="text-h4">Notifications</h2>
                <p className="text-body-sm muted-copy">Tune which reminder types stay active.</p>
              </div>
            </div>

            <div className="settings-toggle-list">
              <Toggle
                label="Family reminders"
                helperText="Enable daily household scheduling prompts."
                checked={notificationSettings.familyReminders}
                onChange={(event) =>
                  setNotificationSettings((previous) => ({
                    ...previous,
                    familyReminders: event.target.checked,
                  }))
                }
              />
              <Toggle
                label="Medicine reminders"
                helperText="Alert for medication schedules and missed doses."
                checked={notificationSettings.medicine}
                onChange={(event) =>
                  setNotificationSettings((previous) => ({
                    ...previous,
                    medicine: event.target.checked,
                  }))
                }
              />
              <Toggle
                label="Vaccinations"
                helperText="Show family immunization and preventive-care prompts."
                checked={notificationSettings.vaccination}
                onChange={(event) =>
                  setNotificationSettings((previous) => ({
                    ...previous,
                    vaccination: event.target.checked,
                  }))
                }
              />
              <Toggle
                label="Report processing"
                helperText="Notify when uploaded reports are ready with AI summaries."
                checked={notificationSettings.reports}
                onChange={(event) =>
                  setNotificationSettings((previous) => ({
                    ...previous,
                    reports: event.target.checked,
                  }))
                }
              />
            </div>
          </section>

          <section className="settings-section card">
            <div className="settings-section__head">
              <div>
                <h2 className="text-h4">Privacy</h2>
                <p className="text-body-sm muted-copy">Controls that affect how household data is handled.</p>
              </div>
            </div>

            <Select label="Reminder visibility" defaultValue="household">
              <option value="household">Household only</option>
              <option value="member">By selected member</option>
            </Select>

            <Select label="Data retention" defaultValue="standard">
              <option value="standard">Standard retention</option>
              <option value="extended">Extended history</option>
            </Select>
          </section>

          <section className="settings-section card">
            <div className="settings-section__head">
              <div>
                <h2 className="text-h4">Account</h2>
                <p className="text-body-sm muted-copy">Export data or manage critical account actions.</p>
              </div>
            </div>

            <div className="settings-actions">
              <Button variant="secondary" leftIcon={<Download size={18} />} onClick={handleExport}>
                Download all my data as JSON
              </Button>
              <Button variant="danger" leftIcon={<Trash2 size={18} />} onClick={() => setShowDeleteConfirm(true)}>
                Delete account
              </Button>
              <Button variant="ghost" onClick={logout}>
                Sign out
              </Button>
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete account"
        description="This action is irreversible and will remove access to your SwasthaParivar workspace."
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setShowDeleteConfirm(false);
                notify.error("Account deletion is not wired yet. This is a protected placeholder.");
              }}
            >
              Confirm delete
            </Button>
          </>
        }
      >
        <p className="text-body-md muted-copy">
          For now this is a safeguarded confirmation flow so the action cannot happen accidentally while the backend delete endpoint is still being finalized.
        </p>
      </Modal>
    </div>
  );
};

export default Settings;
