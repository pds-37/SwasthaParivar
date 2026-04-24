import { useEffect, useMemo, useState } from "react";
import { Copy, Link2, Share2 } from "lucide-react";

import api from "../../lib/api";
import notify from "../../lib/notify";
import { Button, Input } from "../ui";
import "./InviteLink.css";

export default function InviteLink({
  initialCode = "",
  inviteType = "adult_invite",
  email = "",
  name = "",
  relation = "",
  onGenerated,
}) {
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setCode(initialCode || "");
  }, [initialCode]);

  const buildInviteUrl = (inviteCode) =>
    inviteCode ? `${window.location.origin}/join/${inviteCode}` : "";

  const link = useMemo(
    () => buildInviteUrl(code),
    [code]
  );

  const generateLink = async () => {
    setBusy(true);

    try {
      const invite = await api.post("/households/invitations", {
        inviteType,
        email,
        name,
        relation,
      });
      setCode(invite?.code || "");
      onGenerated?.(invite);
      notify.success("Invite link ready");
      return invite;
    } catch (error) {
      notify.error(error.message || "Could not generate invite link");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const ensureInviteUrl = async () => {
    if (link) {
      return link;
    }

    const invite = await generateLink();
    return buildInviteUrl(invite?.code);
  };

  const copyLink = async () => {
    const shareUrl = await ensureInviteUrl();
    if (!shareUrl) return;

    await navigator.clipboard.writeText(shareUrl);
    notify.success("Invite link copied");
  };

  const shareLink = async () => {
    const shareUrl = await ensureInviteUrl();
    if (!shareUrl) return;

    if (navigator.share) {
      await navigator.share({
        title: "Join my family on SwasthaParivar",
        text: "Track our family's health together in one shared care space.",
        url: shareUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    notify.success("Invite link copied");
  };

  return (
    <div className="invite-link">
      <div className="invite-link__meta">
        <p className="text-body-sm muted-copy">
          Share this invite link so another family member can join the same household.
        </p>
        <p className="text-body-sm muted-copy">
          They can open the link directly, or paste the invite code on the sign-in screen or in Settings &gt; Join a family.
        </p>
        {email ? (
          <p className="text-body-sm">
            Invitee: <strong>{email}</strong>
          </p>
        ) : null}
      </div>

      {!code ? (
        <Button leftIcon={<Link2 size={16} />} onClick={generateLink} loading={busy}>
          Generate invite link
        </Button>
      ) : (
        <>
          <Input label="Invite code" value={code} readOnly />
          <Input label="Shareable link" value={link} readOnly />
          <div className="invite-link__actions">
            <Button
              variant="secondary"
              leftIcon={<Copy size={16} />}
              onClick={copyLink}
              disabled={busy}
            >
              Copy
            </Button>
            <Button leftIcon={<Share2 size={16} />} onClick={shareLink} disabled={busy}>
              Share
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
