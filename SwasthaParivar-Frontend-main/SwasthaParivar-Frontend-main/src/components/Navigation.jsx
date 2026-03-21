import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AppBar,
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Toolbar,
  Typography,
  useTheme,
} from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import {
  Activity,
  Bell,
  Heart,
  LayoutDashboard,
  Leaf,
  LogOut,
  Sparkles,
} from "lucide-react";

import { useAuth } from "./auth-context";
import { subscribePush } from "../hooks/usePush";
import { useThemeMode } from "../theme/theme-context";

const Navigation = ({ variant = "app" }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const [anchorEl, setAnchorEl] = React.useState(null);

  const isPublic = variant === "public";
  const isDark = mode === "dark";
  const openMenu = (event) => setAnchorEl(event.currentTarget);
  const closeMenu = () => setAnchorEl(null);
  const isActive = (path) => location.pathname === path;

  const navItems = isPublic
    ? [
        { path: "#home", label: "Home", icon: <LayoutDashboard size={16} />, anchor: true },
        { path: "#features", label: "Health", icon: <Activity size={16} />, anchor: true },
        { path: "#features", label: "Remedies", icon: <Leaf size={16} />, anchor: true },
        { path: "#features", label: "AI Chat", icon: <Sparkles size={16} />, anchor: true },
        { path: "#features", label: "Reminders", icon: <Bell size={16} />, anchor: true },
      ]
    : [
        { path: "/dashboard", label: "Home", icon: <LayoutDashboard size={16} /> },
        { path: "/health", label: "Health", icon: <Activity size={16} /> },
        { path: "/remedies", label: "Remedies", icon: <Leaf size={16} /> },
        { path: "/ai-chat", label: "AI Chat", icon: <Sparkles size={16} /> },
        { path: "/reminders", label: "Reminders", icon: <Bell size={16} /> },
      ];

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: "var(--nav-bg)",
        borderBottom: `1px solid var(--nav-border)`,
        boxShadow: isPublic ? "var(--shadow-sm)" : "none",
      }}
    >
      <Toolbar
        sx={{
          maxWidth: "1240px",
          margin: "0 auto",
          width: "100%",
          minHeight: "78px !important",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          px: { xs: 2, md: 3 },
          py: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <Paper
            component={Link}
            to={isPublic ? "/" : "/dashboard"}
            elevation={0}
            sx={{
              p: 1.15,
              bgcolor: "primary.main",
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              boxShadow: "0 14px 30px rgba(22, 163, 148, 0.22)",
            }}
          >
            <Heart size={19} color="white" />
          </Paper>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: theme.palette.text.primary,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                fontFamily: '"Sora", "Manrope", sans-serif',
              }}
            >
              SwasthaParivar
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
              AI Household Care
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 0.75, alignItems: "center" }}>
          {navItems.map((nav) => {
            const active = !nav.anchor && isActive(nav.path);

            return (
              <Button
                key={`${variant}-${nav.label}`}
                component={nav.anchor ? "a" : Link}
                href={nav.anchor ? nav.path : undefined}
                to={nav.anchor ? undefined : nav.path}
                startIcon={nav.icon}
                sx={{
                  minHeight: 42,
                  px: 2.1,
                  borderRadius: 999,
                  color: active ? "var(--brand-dark)" : theme.palette.text.secondary,
                  backgroundColor: active ? "var(--brand-soft)" : "transparent",
                  border: active ? "1px solid var(--brand-soft-strong)" : "1px solid transparent",
                  fontWeight: active ? 800 : 600,
                }}
              >
                {nav.label}
              </Button>
            );
          })}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            onClick={toggleTheme}
            sx={{
              width: 44,
              height: 44,
              bgcolor: "var(--surface-glass)",
              borderRadius: "16px",
              border: "1px solid var(--border)",
            }}
          >
            {isDark ? (
              <LightModeIcon sx={{ color: "#f8fbfd", fontSize: 20 }} />
            ) : (
              <DarkModeIcon sx={{ color: "#20303a", fontSize: 20 }} />
            )}
          </IconButton>

          {isPublic ? (
            <Button
              component={Link}
              to="/auth"
              variant="contained"
              sx={{
                borderRadius: 999,
                px: 2.7,
                bgcolor: "primary.main",
                minWidth: 124,
              }}
            >
              Launch App
            </Button>
          ) : (
            <>
              <Button
                variant="contained"
                size="small"
                startIcon={<Bell size={15} />}
                onClick={subscribePush}
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  borderRadius: 999,
                  px: 2.2,
                  bgcolor: "primary.main",
                }}
              >
                Enable Notifications
              </Button>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.9,
                  cursor: "pointer",
                  pl: { xs: 0, sm: 0.5 },
                }}
                onClick={openMenu}
              >
                <Avatar sx={{ bgcolor: "secondary.main", width: 36, height: 36, fontWeight: 800 }}>
                  {user?.fullName?.charAt(0) || "U"}
                </Avatar>
                <Typography
                  sx={{
                    fontWeight: 700,
                    display: { xs: "none", sm: "block" },
                    maxWidth: 130,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user?.fullName}
                </Typography>
              </Box>

              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
                <MenuItem disabled>{user?.email}</MenuItem>
                <Divider />
                <MenuItem
                  sx={{ color: "error.main" }}
                  onClick={() => {
                    closeMenu();
                    logout();
                  }}
                >
                  <LogOut size={18} style={{ marginRight: 8 }} />
                  Sign Out
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation;
