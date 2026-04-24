import notify from "./notify";

export const showUnlockedBadges = (badges = []) => {
  const seen = new Set();

  badges.forEach((badge) => {
    if (!badge?.id || seen.has(badge.id)) {
      return;
    }

    seen.add(badge.id);
    notify.success(`Badge unlocked: ${badge.label}`, badge.desc);
  });
};

export default showUnlockedBadges;
