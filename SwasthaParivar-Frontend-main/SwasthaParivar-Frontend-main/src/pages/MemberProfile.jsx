import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../lib/api";
import { saveReminderDraft } from "../lib/reminderDraft";
import { Button, EmptyState, Skeleton } from "../components/ui";
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
  const [member, setMember] = useState(null);
  const [records, setRecords] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [insights, setInsights] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="member-profile-page">
      <div className="member-profile-shell">
        <section className="member-profile-hero">
          <div className="member-profile-hero__identity">
            <span className="avatar avatar--lg">{member.name?.charAt(0) || "U"}</span>
            <div>
              <span className="eyebrow">{member.relation || "Family profile"}</span>
              <h1 className="text-h2">{member.name}</h1>
              <p className="text-body-md">
                {member.age ? `${member.age} years` : "Age not added"} | {member.gender}
              </p>
            </div>
          </div>

          <Button variant="secondary" leftIcon={<ArrowLeft size={18} />} onClick={() => navigate("/family")}>
            Back to family
          </Button>
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
      </div>
    </div>
  );
};

export default MemberProfile;
