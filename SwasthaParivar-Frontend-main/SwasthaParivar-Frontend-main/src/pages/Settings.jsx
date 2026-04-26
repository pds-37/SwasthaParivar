import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Download, Gift, Link2, Moon, Shield, Sparkles, SunMedium, Trash2, UserCircle2, Users } from "lucide-react";

import { useAuth } from "../components/auth-context";
import ProfileAvatar from "../components/common/ProfileAvatar";
import { Button, Input, Modal, Select, Toggle } from "../components/ui";
import api, { apiClient } from "../lib/api";
import { buildJoinHouseholdPath, normalizeInviteCode } from "../lib/householdInvites";
import notify from "../lib/notify";
import { useFeatureFlags } from "../hooks/useFeatureFlags";
import { useThemeMode } from "../theme/theme-context";
import { trackEvent } from "../utils/analytics";
import "./Settings.css";

const Settings = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { preference, setThemePreference } = useThemeMode();
  const { privacyPolicyVersion } = useFeatureFlags();
  const [notificationSettings, setNotificationSettings] = useState({
    familyReminders: true,
    medicine: true,
    vaccination: true,
    reports: true,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [applyingReferral, setApplyingReferral] = useState(false);
  const [householdInviteCode, setHouseholdInviteCode] = useState("");
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const currentPlan = String(user?.plan || "free").toLowerCase();
  const planLabel = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
  const proExpiryLabel = user?.proExpiresAt
    ? new Date(user.proExpiresAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const handleExport = async () => {
    setExportingData(true);

    try {
      const response = await apiClient.get("/account/me/export", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "my-swasthaparivar-data.json";
      link.click();
      URL.revokeObjectURL(url);
      trackEvent("account_data_export_requested", {
        plan: currentPlan,
      });
      notify.success("Data export started");
    } catch (error) {
      notify.error(error.message || "Could not export your data");
    } finally {
      setExportingData(false);
    }
  };

  const handleCopyReferralCode = async () => {
    if (!user?.referralCode) {
      notify.error("Referral code is not ready yet");
      return;
    }

    await navigator.clipboard.writeText(user.referralCode);
    trackEvent("referral_code_copied", {
      plan: currentPlan,
    });
    notify.success("Referral code copied");
  };

  const handleApplyReferral = async () => {
    const nextCode = referralCodeInput.trim().toUpperCase();
    if (!nextCode) {
      notify.error("Enter a referral code first");
      return;
    }

    setApplyingReferral(true);

    try {
      const response = await api.post(`/referral/apply/${encodeURIComponent(nextCode)}`, {}, {
        suppressErrorToast: true,
      });
      if (response?.user) {
        updateUser(response.user);
      }
      trackEvent("referral_code_applied", {
        plan_before: currentPlan,
      });
      notify.success(response?.message || "Referral applied");
      setReferralCodeInput("");
    } catch (error) {
      notify.error(error.message || "Could not apply referral code");
    } finally {
      setApplyingReferral(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);

    try {
      await api.delete("/account/me", {
        suppressErrorToast: true,
      });
      trackEvent("account_deleted", {
        plan: currentPlan,
      });
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      navigate("/", { replace: true });
      window.location.reload();
    } catch (error) {
      notify.error(error.message || "Could not delete your account");
    } finally {
      setDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleJoinHousehold = () => {
    const nextCode = normalizeInviteCode(householdInviteCode);

    if (!nextCode) {
      notify.error("Enter a family invite code first");
      return;
    }

    trackEvent("household_join_started", {
      entrypoint: "settings",
      invite_code: nextCode,
    });
    navigate(buildJoinHouseholdPath(nextCode));
  };

  return (
    <div className="settings-page">
      <div className="app-shell settings-shell">
        <section className="settings-hero">
          <span className="eyebrow">
            <UserCircle2 size={16} />
            Account settings
          </span>
          <div className="settings-hero__identity">
            <ProfileAvatar name={user?.fullName} src={user?.avatarUrl} size="lg" />
            <div className="settings-hero__copy">
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
            <div className="settings-row">
              <span>Plan</span>
              <strong>{planLabel}</strong>
            </div>
            {proExpiryLabel ? (
              <div className="settings-row">
                <span>Pro valid until</span>
                <strong>{proExpiryLabel}</strong>
              </div>
            ) : null}
          </section>

          <section className="settings-section card">
            <div className="settings-section__head">
              <div>
                <h2 className="text-h4">Plan & referrals</h2>
                <p className="text-body-sm muted-copy">
                  Unlock premium care features or share your code to earn a month of Pro.
                </p>
              </div>
              <span className={`badge ${currentPlan === "free" ? "badge--warning" : "badge--success"}`}>
                <Sparkles size={14} />
                {planLabel}
              </span>
            </div>

            <div className="settings-plan-card">
              <div>
                <strong>
                  {currentPlan === "free"
                    ? "Free plan active"
                    : `${planLabel} plan active`}
                </strong>
                <p>
                  {currentPlan === "free"
                    ? "Launch access currently includes unlimited AI chats, family profiles, and AI report tools while paid plans are being finalized."
                    : "Premium care is unlocked for your account, including AI reports and deeper history access."}
                </p>
              </div>
              <Button
                variant={currentPlan === "free" ? "primary" : "secondary"}
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("show-upgrade-prompt", {
                      detail: { feature: "plan" },
                    })
                  )
                }
                >
                {currentPlan === "free" ? "See upcoming plans" : "Review plans"}
              </Button>
            </div>

            <div className="settings-referral-grid">
              <Input
                label="Your referral code"
                value={user?.referralCode || ""}
                readOnly
                helperText={`Successful referrals: ${user?.referralCount || 0}`}
                rightSlot={
                  <button type="button" className="settings-inline-action" onClick={handleCopyReferralCode}>
                    <Copy size={14} />
                  </button>
                }
              />

              <div className="settings-referral-help">
                <Gift size={18} />
                <p>When someone signs up with your code, both of you get 1 month of Pro.</p>
              </div>
            </div>

            {!user?.referredBy ? (
              <div className="settings-referral-apply">
                <Input
                  label="Apply a referral code"
                  placeholder="Enter a friend's code"
                  value={referralCodeInput}
                  onChange={(event) => setReferralCodeInput(event.target.value.toUpperCase())}
                />
                <Button
                  variant="secondary"
                  onClick={handleApplyReferral}
                  loading={applyingReferral}
                >
                  Apply code
                </Button>
              </div>
            ) : (
              <p className="text-body-sm muted-copy">
                A referral code has already been applied to this account.
              </p>
            )}
          </section>

          <section className="settings-section card">
            <div className="settings-section__head">
              <div>
                <h2 className="text-h4">Join a family</h2>
                <p className="text-body-sm muted-copy">
                  Paste a household invite code here if someone invited you into their family workspace.
                </p>
              </div>
              <span className="badge badge--primary settings-section__badge-lifted">
                <Users size={14} />
                Household
              </span>
            </div>

            <div className="settings-household-join">
              <Input
                label="Family invite code"
                placeholder="Enter household code"
                value={householdInviteCode}
                onChange={(event) => setHouseholdInviteCode(normalizeInviteCode(event.target.value))}
                leftIcon={<Link2 size={16} />}
                helperText="Works for adult and existing-user family invites."
              />
              <Button onClick={handleJoinHousehold}>
                Join family
              </Button>
            </div>

            <div className="settings-privacy-note">
              <strong>What happens next</strong>
              <p>
                We&apos;ll validate the code and connect your account to that household. If this account already manages
                another active family, the app will explain what needs to happen before moving.
              </p>
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

            <div className="settings-privacy-note">
              <strong>Your Data Rights (DPDP Act 2023)</strong>
              <p>
                Consent is recorded under privacy policy version {privacyPolicyVersion}. You can
                export your data or permanently delete your account at any time.
              </p>
            </div>
          </section>

          <section className="settings-section card">
            <div className="settings-section__head">
              <div>
                <h2 className="text-h4">Account</h2>
                <p className="text-body-sm muted-copy">Export data or manage critical account actions.</p>
              </div>
            </div>

            <div className="settings-actions">
              <Button
                variant="secondary"
                leftIcon={<Download size={18} />}
                onClick={handleExport}
                loading={exportingData}
              >
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
              onClick={handleDeleteAccount}
              loading={deletingAccount}
            >
              Confirm delete
            </Button>
          </>
        }
      >
        <p className="text-body-md muted-copy">
          Account deletion is permanent and irreversible. All health records, members, reminders,
          reports, and saved AI conversations tied to your account will be erased.
        </p>
      </Modal>
    </div>
  );
};

export default Settings;
