import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileDown, Pencil, Trash2 } from "lucide-react";
import api from "../lib/api";
import ProfileAvatar from "../components/common/ProfileAvatar";
import EditMemberProfileModal from "../components/member-profile/EditMemberProfileModal";
import { saveReminderDraft } from "../lib/reminderDraft";
import notify from "../lib/notify";
import { useFamilyStore } from "../store/family-store";
import { exportDoctorSharePdf } from "../utils/doctorSharePdf";
import { trackEvent } from "../utils/analytics";
import { Button, EmptyState, Modal, Skeleton } from "../components/ui";
import "./MemberProfile.css";

const OverviewTab = lazy(() => import("../components/member-profile/OverviewTab"));
const HealthRecordsTab = lazy(() => import("../components/member-profile/HealthRecordsTab"));
const MedicationsTab = lazy(() => import("../components/member-profile/MedicationsTab"));
const RemindersTab = lazy(() => import("../components/member-profile/RemindersTab"));
const ReportsTab = lazy(() => import("../components/member-profile/ReportsTab"));

const tabs = [
  { id: "overview", label: "Overview", Component: OverviewTab },
  { id: "health", label: "Health Records", Component: HealthRecordsTab },
  { id: "medications", label: "Medications", Component: MedicationsTab },
  { id: "reminders", label: "Reminders", Component: RemindersTab },
  { id: "reports", label: "Reports", Component: ReportsTab },
];

const MemberProfile = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { deleteMember, refreshMembers } = useFamilyStore();
  const [member, setMember] = useState(null);
  const [records, setRecords] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [insights, setInsights] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [memberData, healthData, remindersData, insightsData] = await Promise.all([
          api.get(`/members/${id}`),
          api.get(`/health/${id}`).catch(() => []),
          api.get("/reminders").catch(() => []),
          api.get("/ai/insights", { params: { memberId: id } }).catch(() => []),
        ]);

        if (!cancelled) {
          setMember(memberData);
          setRecords(Array.isArray(healthData) ? healthData : []);
          const reminderList = Array.isArray(remindersData)
            ? remindersData
            : remindersData?.reminders || [];
          setReminders(reminderList.filter((item) => item.memberId === id));
          setInsights(Array.isArray(insightsData) ? insightsData : insightsData?.data || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const currentTab = useMemo(
    () => tabs.find((item) => item.id === activeTab) || tabs[0],
    [activeTab]
  );

  const handleSuggestReminder = (medication) => {
    if (!member?._id || !medication) return;

    saveReminderDraft({
      title: medication,
      description: `Daily medication reminder for ${member.name}.`,
      category: "medicine",
      frequency: "daily",
      selectedMembers: [member._id],
      memberName: member.name,
    });
    navigate("/reminders");
  };

  const handleDoctorShare = () => {
    if (!member) {
      return;
    }

    exportDoctorSharePdf({
      member,
      records,
      reminders,
      insights,
    });
    trackEvent("doctor_share_pdf_exported", {
      member_id: member._id,
      record_count: records.length,
      reminder_count: reminders.length,
    });
    notify.success("Doctor-share PDF downloaded");
  };

  const handleSaveProfile = async (payload) => {
    if (!member?._id) return;

    setSavingProfile(true);
    try {
      const updated = await api.patch(`/members/${member._id}/profile`, payload);
      setMember(updated);
      await refreshMembers?.();
      setShowEditModal(false);
      notify.success("Member profile updated");
    } catch (error) {
      notify.error(error?.message || "Could not update member profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!member?._id) return;

    setDeletingProfile(true);
    try {
      await deleteMember(member._id);
      notify.success("Member removed from household");
      navigate("/family");
    } catch (error) {
      notify.error(error?.message || "Could not delete member");
    } finally {
      setDeletingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="member-profile-shell">
        <Skeleton variant="card" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="member-profile-shell">
        <EmptyState
          heading="Member not found"
          description="The requested family profile could not be loaded."
          ctaLabel="Back to family"
          onCta={() => navigate("/family")}
        />
      </div>
    );
  }

  const TabComponent = currentTab.Component;
  const canDeleteMember = member.profileType !== "self" && !member.linkedUserId;

  return (
    <div className="member-profile-page">
      <div className="member-profile-shell">
        <section className="member-profile-hero">
          <div className="member-profile-hero__identity">
            <ProfileAvatar name={member.name} src={member.avatar} size="lg" />
            <div>
              <span className="eyebrow">{member.relation || "Family profile"}</span>
              <h1 className="text-h2">{member.name}</h1>
              <p className="text-body-md">
                {member.age ? `${member.age} years` : "Age not added"} | {member.gender}
              </p>
            </div>
          </div>

          <div className="member-profile-hero__actions">
            <Button variant="secondary" leftIcon={<Pencil size={18} />} onClick={() => setShowEditModal(true)}>
              Edit profile
            </Button>
            <Button variant="secondary" leftIcon={<FileDown size={18} />} onClick={handleDoctorShare}>
              Doctor share PDF
            </Button>
            {canDeleteMember ? (
              <Button variant="danger" leftIcon={<Trash2 size={18} />} onClick={() => setShowDeleteConfirm(true)}>
                Delete member
              </Button>
            ) : null}
            <Button variant="secondary" leftIcon={<ArrowLeft size={18} />} onClick={() => navigate("/family")}>
              Back to family
            </Button>
          </div>
        </section>

        <div className="member-profile-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`member-profile-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Suspense fallback={<Skeleton variant="card" />}>
          <TabComponent
            member={member}
            records={records}
            reminders={reminders}
            insights={insights}
            onSuggestReminder={handleSuggestReminder}
          />
        </Suspense>

        {showEditModal ? (
          <EditMemberProfileModal
            member={member}
            saving={savingProfile}
            onClose={() => {
              if (savingProfile) return;
              setShowEditModal(false);
            }}
            onSave={handleSaveProfile}
          />
        ) : null}

        <Modal
          open={showDeleteConfirm}
          onClose={() => {
            if (deletingProfile) return;
            setShowDeleteConfirm(false);
          }}
          title="Delete member?"
          description="This removes the member from the active household directory and archives the profile."
          footer={
            <>
              <Button
                variant="secondary"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deletingProfile}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                leftIcon={<Trash2 size={16} />}
                onClick={handleDeleteProfile}
                loading={deletingProfile}
              >
                Delete member
              </Button>
            </>
          }
        >
          <p className="text-body-md muted-copy">
            This will archive <strong>{member.name}</strong> and remove them from active family views.
          </p>
        </Modal>
      </div>
    </div>
  );
};

export default MemberProfile;
