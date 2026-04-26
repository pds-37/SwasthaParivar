import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Pill, Plus, ShieldAlert, Trash2, Users } from "lucide-react";
import AddMemberModal from "../components/AddMemberModal";
import ProfileAvatar from "../components/common/ProfileAvatar";
import InviteLink from "../components/household/InviteLink";
import notify from "../lib/notify";
import { saveReminderDraft } from "../lib/reminderDraft";
import { Button, EmptyState, Modal, PullToRefresh, Skeleton } from "../components/ui";
import { useFamilyStore } from "../store/family-store";
import "./FamilyMembers.css";

const getMemberRisk = (member = {}) => {
  if (member.childSensitive || member.allergies?.length) {
    return { level: "high", label: "Elevated care risk" };
  }

  if (member.conditions?.length || member.medications?.length) {
    return { level: "medium", label: "Moderate care risk" };
  }

  return { level: "low", label: "Stable care profile" };
};

const FamilyMembers = () => {
  const navigate = useNavigate();
  const { members, loading, createMember, createInvite, deleteMember, refreshMembers } = useFamilyStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingMedicationPrompt, setPendingMedicationPrompt] = useState(null);
  const [createdInvite, setCreatedInvite] = useState(null);
  const [memberToDelete, setMemberToDelete] = useState(null);
  const [deletingMember, setDeletingMember] = useState(false);

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
        avatar: form.avatar,
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

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;

    setDeletingMember(true);
    try {
      await deleteMember(memberToDelete._id);
      notify.success("Member removed from household");
      setMemberToDelete(null);
    } catch (error) {
      notify.error(error?.message || "Could not delete member");
    } finally {
      setDeletingMember(false);
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
            type="members"
            onAction={() => setShowAddModal(true)}
          />
        ) : (
          <div className="family-grid">
            {members.map((member) => {
              const canDeleteMember = member.profileType !== "self" && !member.linkedUserId;
              const risk = getMemberRisk(member);

              return (
                <article key={member._id} className="family-card card card-hover">
                  <div className="family-card__top">
                    <div className="family-card__identity">
                      <ProfileAvatar name={member.name} src={member.avatar} size="lg" />
                      <div>
                        <strong>{member.name}</strong>
                        <span>{member.relation || "Family member"}</span>
                      </div>
                    </div>

                    <div className="family-card__status">
                      <span
                        className={`family-risk-dot family-risk-dot--${risk.level}`}
                        aria-label={risk.label}
                        title={risk.label}
                      />
                      {member.childSensitive ? <span className="badge badge--warning">Sensitive</span> : null}
                    </div>
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
                    <Button variant="secondary" onClick={() => navigate(`/health/${member._id}`)}>
                      Health records
                    </Button>
                    <Button variant="primary" onClick={() => navigate(`/family/${member._id}`)}>
                      Open profile
                    </Button>
                    {canDeleteMember ? (
                      <Button
                        variant="danger"
                        className="family-card__delete"
                        leftIcon={<Trash2 size={16} />}
                        onClick={() => setMemberToDelete(member)}
                      >
                        Delete member
                      </Button>
                    ) : null}
                  </div>
                </article>
              );
            })}
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

      <Modal
        open={Boolean(memberToDelete)}
        onClose={() => {
          if (deletingMember) return;
          setMemberToDelete(null);
        }}
        title="Delete member?"
        description="This removes the member from the active household directory. Their profile will be archived and no longer appear in family care flows."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setMemberToDelete(null)}
              disabled={deletingMember}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              leftIcon={<Trash2 size={16} />}
              onClick={handleDeleteMember}
              loading={deletingMember}
            >
              Delete member
            </Button>
          </>
        }
      >
        {memberToDelete ? (
          <p className="text-body-md muted-copy">
            You are deleting <strong>{memberToDelete.name}</strong>. You can only delete dependent profiles from family management.
          </p>
        ) : null}
      </Modal>
    </div>
  );
};

export default FamilyMembers;
