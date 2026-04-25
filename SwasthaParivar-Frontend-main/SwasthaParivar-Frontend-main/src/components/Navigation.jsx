import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Bell,
  BellRing,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  FileText,
  HeartPulse,
  Home,
  Leaf,
  LogOut,
  Menu,
  MessageSquareText,
  Moon,
  Settings,
  SunMedium,
  Users,
} from "lucide-react";

import ProfileAvatar from "./common/ProfileAvatar";
import { subscribePush } from "../hooks/usePush";
import { howToUseNote, howToUseSteps } from "../lib/howToUse";
import { useFamilyStore } from "../store/family-store";
import { useUIStore } from "../store/ui-store";
import { useThemeMode } from "../theme/theme-context";
import { useAuth } from "./auth-context";
import { Button, Modal } from "./ui";
import "./Navigation.css";

const publicLinks = [
  { href: "#home", label: "Home" },
  { href: "#features", label: "Features" },
  { href: "#how-to-use", label: "How to use" },
  { href: "#features", label: "Family AI" },
  { href: "#features", label: "Reminders" },
];

const primaryLinks = [
  { path: "/dashboard", label: "Home", icon: Home },
  { path: "/family", label: "Family", icon: Users },
  { path: "/reminders", label: "Reminders", icon: Bell },
  { path: "/reports", label: "Reports", icon: FileText },
  { path: "/ai-chat", label: "Family AI", icon: MessageSquareText },
];

const secondaryLinks = [
  { path: "/health", label: "Health", icon: HeartPulse },
  { path: "/remedies", label: "Remedies", icon: Leaf },
  { path: "/settings", label: "Settings", icon: Settings },
];

const Navigation = ({ variant = "app" }) => {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const {
    members,
    household,
    selfMember,
    activeView,
    selectedMember,
    setSelectedMember,
    setActiveView,
  } = useFamilyStore();
  const { sidebarCollapsed, setSidebarCollapsed } = useUIStore();
  const location = useLocation();
  const isPublic = variant === "public";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  useEffect(() => {
    if (isPublic) return undefined;

    document.documentElement.classList.toggle("sidebar-collapsed", sidebarCollapsed);
    return () => {
      document.documentElement.classList.remove("sidebar-collapsed");
    };
  }, [isPublic, sidebarCollapsed]);

  const currentPrimary = useMemo(
    () =>
      primaryLinks.find(
        (item) =>
          location.pathname === item.path ||
          (item.path !== "/dashboard" && location.pathname.startsWith(`${item.path}/`))
      )?.path || "/dashboard",
    [location.pathname]
  );

  const allAppLinks = [...primaryLinks, ...secondaryLinks];
  const memberScope = activeView === "self" ? "self" : selectedMember?._id || "family";
  const selectedScopeName =
    activeView === "self"
      ? selfMember?.name || "My profile"
      : selectedMember?.name || household?.name || "All family";

  const handleScopeChange = (value) => {
    if (value === "self") {
      setSelectedMember(selfMember || null);
      setActiveView("self", { selfMember });
      return;
    }

    const nextSelectedMember =
      value === "family"
        ? null
        : members.find((member) => member._id === value) || null;

    setSelectedMember(nextSelectedMember);
    setActiveView("family", { selectedMember: nextSelectedMember });
  };

  if (isPublic) {
    return (
      <header className="public-nav">
        <div className="public-nav__inner">
          <Link className="public-nav__brand" to="/">
            <span className="public-nav__mark" style={{ background: "transparent", boxShadow: "none" }}>
              <img src="/swastha_parivar_fast.svg" alt="SwasthaParivar Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </span>
            <span>
              <strong>SwasthaParivar</strong>
              <small>Family Health OS</small>
            </span>
          </Link>

          <nav className="public-nav__links" aria-label="Public navigation">
            {publicLinks.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="public-nav__actions">
            <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {mode === "dark" ? <SunMedium size={18} /> : <Moon size={18} />}
            </button>
            <Button as={Link} to="/auth?mode=signin" size="sm">
              Launch App
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="mobile-app-header">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>

        <Link className="mobile-app-header__brand" to="/dashboard">
          <span className="mobile-app-header__mark" style={{ background: "transparent", boxShadow: "none" }}>
            <img src="/swastha_parivar_fast.svg" alt="SwasthaParivar Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </span>
          <span>
            <strong>SwasthaParivar</strong>
            <small>{selectedScopeName}</small>
          </span>
        </Link>

        <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {mode === "dark" ? <SunMedium size={18} /> : <Moon size={18} />}
        </button>
      </header>

      <aside className={`app-sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`}>
        <div className="app-sidebar__header">
          <Link className="app-sidebar__brand" to="/dashboard">
            <span className="app-sidebar__mark" style={{ background: "transparent", boxShadow: "none" }}>
              <img src="/swastha_parivar_fast.svg" alt="SwasthaParivar Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </span>
            <span className="app-sidebar__brand-copy">
              <strong>SwasthaParivar</strong>
              <small>AI household care</small>
            </span>
          </Link>

          <button
            type="button"
            className="icon-btn app-sidebar__collapse"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <div className="app-sidebar__scope card">
          <span className="app-sidebar__scope-label">Care scope</span>
          <select
            value={memberScope}
            onChange={(event) => handleScopeChange(event.target.value)}
          >
            <option value="family">All family</option>
            {selfMember ? <option value="self">My profile</option> : null}
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
          </select>
          <small>{activeView === "self" ? "Self view is active." : "Household mode is active."}</small>
        </div>

        <nav className="app-sidebar__nav" aria-label="Primary application navigation">
          <div className="app-sidebar__group">
            <span className="app-sidebar__group-label">Core</span>
            {primaryLinks.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.path !== "/dashboard" && location.pathname.startsWith(`${item.path}/`));
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`app-sidebar__link ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="app-sidebar__group">
            <span className="app-sidebar__group-label">More</span>
            {secondaryLinks.map((item) => {
              const active =
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`app-sidebar__link ${active ? "is-active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="app-sidebar__footer">
          <Button
            variant="ghost"
            size="sm"
            fullWidth={!sidebarCollapsed}
            leftIcon={<CircleHelp size={16} />}
            onClick={() => setGuideOpen(true)}
            className="app-sidebar__help-btn"
            aria-label="How to use"
            title="How to use"
          >
            {sidebarCollapsed ? null : "How to use"}
          </Button>

          <Button
            variant="secondary"
            size="sm"
            fullWidth={!sidebarCollapsed}
            leftIcon={<BellRing size={16} />}
            onClick={subscribePush}
            className="app-sidebar__notify-btn"
            aria-label="Enable reminders"
            title="Enable reminders"
          >
            {sidebarCollapsed ? null : "Enable reminders"}
          </Button>

          <div className="app-sidebar__profile card">
            <ProfileAvatar name={user?.fullName} src={user?.avatarUrl} size="md" />
            <div className="app-sidebar__profile-copy">
              <strong>{user?.fullName || "Family account"}</strong>
              <span>{user?.email || "Signed in"}</span>
            </div>
            <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {mode === "dark" ? <SunMedium size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <button type="button" className="app-sidebar__logout" onClick={logout}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className={`app-drawer ${drawerOpen ? "is-open" : ""}`} aria-hidden={!drawerOpen}>
        <button type="button" className="app-drawer__backdrop" onClick={() => setDrawerOpen(false)} />
        <div className="app-drawer__panel">
          <div className="app-drawer__header">
            <div>
              <strong>SwasthaParivar</strong>
              <small>Household care navigation</small>
            </div>
            <button type="button" className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Close navigation">
              <ChevronRight size={18} />
            </button>
          </div>

          <label className="app-drawer__scope">
            <span>Care scope</span>
            <select
              value={memberScope}
              onChange={(event) => handleScopeChange(event.target.value)}
            >
              <option value="family">All family</option>
              {selfMember ? <option value="self">My profile</option> : null}
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>

          <nav className="app-drawer__links">
            {allAppLinks.map((item) => {
              const active =
                location.pathname === item.path ||
                (item.path !== "/dashboard" && location.pathname.startsWith(`${item.path}/`));
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`app-drawer__link ${active ? "is-active" : ""}`}
                  onClick={() => setDrawerOpen(false)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="app-drawer__footer">
            <Button
              variant="ghost"
              leftIcon={<CircleHelp size={16} />}
              onClick={() => {
                setGuideOpen(true);
                setDrawerOpen(false);
              }}
              fullWidth
            >
              How to use
            </Button>
            <Button variant="secondary" leftIcon={<BellRing size={16} />} onClick={subscribePush} fullWidth>
              Enable notifications
            </Button>
            <Button variant="ghost" onClick={toggleTheme} fullWidth>
              Switch to {mode === "dark" ? "light" : "dark"} mode
            </Button>
            <div className="app-drawer__profile">
              <ProfileAvatar name={user?.fullName} src={user?.avatarUrl} size="md" />
              <div>
                <strong>{user?.fullName || "Family account"}</strong>
                <span>{user?.email || "Signed in"}</span>
              </div>
            </div>
            <button type="button" className="app-sidebar__logout" onClick={logout}>
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </div>

      <nav className="mobile-tabbar" aria-label="Mobile application navigation">
        {primaryLinks.map((item) => {
          const Icon = item.icon;
          const active = currentPrimary === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-tabbar__link ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <Modal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        title="How to use SwasthaParivar"
        description="A quick guide to getting the most useful reminders, reports, remedies, and AI support."
        size="md"
      >
        <div className="app-guide">
          <div className="app-guide__grid">
            {howToUseSteps.map((step, index) => (
              <article key={step.title} className="app-guide__card card">
                <span className="app-guide__step">Step {index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
          <div className="app-guide__note">
            <CircleHelp size={16} />
            <span>{howToUseNote}</span>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Navigation;
