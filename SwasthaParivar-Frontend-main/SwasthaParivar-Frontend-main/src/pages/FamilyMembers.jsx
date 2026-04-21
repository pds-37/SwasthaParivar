import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Pill, Plus, ShieldAlert, Users } from "lucide-react";
import AddMemberModal from "../components/AddMemberModal";
import notify from "../lib/notify";
import { saveReminderDraft } from "../lib/reminderDraft";
import { Button, EmptyState, Modal, PullToRefresh, Skeleton } from "../components/ui";
import { useFamilyStore } from "../store/family-store";
import "./FamilyMembers.css";

const FamilyMembers = () => {
  const navigate = useNavigate();
  const { members, loading, createMember, createInvite, refreshMembers } = useFamilyStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingMedicationPrompt, setPendingMedicationPrompt] = useState(null);
  const [createdInvite, setCreatedInvite] = useState(null);

  const addMember = async (form) => {
    try {
      if (form.mode === "adult_invite" || form.mode === "link_existing") {
        const invite = await createInvite({
          inviteType: form.mode,
          email: form.email,
          name: form.name,
          relation: form.relation,
        });
        setShowAddModal(false);
        setCreatedInvite(invite);
        notify.success("Invite created");
        return;
      }

      const createdMember = await createMember({
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        relation: form.relation,
        conditions: form.conditions,
        allergies: form.allergies,
        medications: form.medications,
        childSensitive: form.childSensitive,
      });
      setShowAddModal(false);
      notify.success("Member added");
      if (createdMember?.medications?.length) {
        setPendingMedicationPrompt({
          memberId: createdMember._id,
          memberName: createdMember.name,
          medication: createdMember.medications[0],
        });
      }
    } catch {
      notify.error(form.mode === "dependent" ? "Could not add member" : "Could not create invite");
    }
  };

  return (
    <div className="family-page">
      <PullToRefresh onRefresh={() => refreshMembers?.()}>
        <div className="family-shell">
        <section className="family-header">
          <div>
            <span className="eyebrow">Family directory</span>
            <h1 className="text-h2">Family members</h1>
            <p className="text-body-md">
              See each member at a glance, then open a full profile for records, medications, reminders, and reports.
            </p>
          </div>

          <Button leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
            Add member
          </Button>
        </section>

        {loading ? (
          <div className="family-grid">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} variant="card" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            heading="No family members yet"
            description="Create the first profile to start organizing records, medications, and reminders by person."
            ctaLabel="Add first member"
            onCta={() => setShowAddModal(true)}
          />
        ) : (
          <div className="family-grid">
            {members.map((member) => (
              <article key={member._id} className="family-card card card-hover">
                <div className="family-card__top">
                  <div className="family-card__identity">
                    <span className="avatar avatar--lg">{member.name?.charAt(0) || "U"}</span>
                    <div>
                      <strong>{member.name}</strong>
                      <span>{member.relation || "Family member"}</span>
                    </div>
                  </div>

                  {member.childSensitive ? <span className="badge badge--warning">Sensitive</span> : null}
                </div>

                <div className="family-card__meta">
                  {member.age ? `${member.age} years old` : "Age not added"} | {member.gender}
                </div>

                <div className="family-card__counts">
                  <div>
                    <Activity size={16} />
                    <strong>{member.conditions?.length || 0}</strong>
                    <span>conditions</span>
                  </div>
                  <div>
                    <Pill size={16} />
                    <strong>{member.medications?.length || 0}</strong>
                    <span>medications</span>
                  </div>
                  <div>
                    <ShieldAlert size={16} />
                    <strong>{member.allergies?.length || 0}</strong>
                    <span>allergies</span>
                  </div>
                </div>

                <div className="family-card__actions">
                  <Button variant="ghost" onClick={() => navigate(`/health/${member._id}`)}>
                    Health records
                  </Button>
                  <Button variant="secondary" onClick={() => navigate(`/family/${member._id}`)}>
                    Open profile
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
        </div>
      </PullToRefresh>

      <Button className="family-fab" leftIcon={<Plus size={18} />} onClick={() => setShowAddModal(true)}>
        Add
      </Button>

      {showAddModal ? <AddMemberModal onClose={() => setShowAddModal(false)} onSave={addMember} /> : null}

      <Modal
        open={Boolean(createdInvite)}
        onClose={() => setCreatedInvite(null)}
        title="Invite ready"
        description="Share this household code so the person can join from their own login."
        footer={
          <Button variant="secondary" onClick={() => setCreatedInvite(null)}>
            Close
          </Button>
        }
      >
        {createdInvite ? (
          <div>
            <p className="text-body-md">
              <strong>{createdInvite.email}</strong>
            </p>
            <p className="text-body-sm muted-copy">
              {createdInvite.inviteType === "link_existing"
                ? "Link existing app user"
                : "Invite adult family member"}
            </p>
            <p className="text-body-md">
              Invite code: <strong>{createdInvite.code}</strong>
            </p>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(pendingMedicationPrompt)}
        onClose={() => setPendingMedicationPrompt(null)}
        title="Create a medication reminder?"
        description="We can turn the saved medication into a prefilled daily reminder for this member."
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

export default FamilyMembers;
