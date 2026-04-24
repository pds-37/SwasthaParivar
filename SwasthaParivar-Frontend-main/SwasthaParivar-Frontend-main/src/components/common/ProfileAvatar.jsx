import React, { useMemo, useState } from "react";

const getInitials = (name, fallback = "U") => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return fallback;

  if (parts.length === 1) {
    return parts[0].slice(0, Math.min(2, parts[0].length)).toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
};

const ProfileAvatar = ({ name = "", src = "", size = "md", className = "", alt }) => {
  const [failedSrc, setFailedSrc] = useState("");
  const initials = useMemo(() => getInitials(name), [name]);
  const avatarSrc = typeof src === "string" ? src.trim() : "";
  const showImage = avatarSrc && failedSrc !== avatarSrc;

  return (
    <span
      className={["avatar", `avatar--${size}`, className].filter(Boolean).join(" ")}
      aria-label={alt || name || "Profile avatar"}
    >
      {showImage ? (
        <img
          className="avatar__image"
          src={avatarSrc}
          alt={alt || `${name || "Profile"} avatar`}
          loading="lazy"
          onError={() => setFailedSrc(avatarSrc)}
        />
      ) : (
        initials
      )}
    </span>
  );
};

export default ProfileAvatar;
