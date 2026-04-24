import React, { useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { ThemeModeContext } from "./theme-context";

const STORAGE_KEY = "sp-theme";
const LEGACY_STORAGE_KEY = "themeMode";

const readStoredPreference = () => {
  const storedValue = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  return storedValue || "system";
};

const persistPreference = (value) => {
  localStorage.setItem(STORAGE_KEY, value);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
};

const resolvePaletteTokens = (mode) => {
  if (typeof document === "undefined" || !document.body) {
    return {};
  }

  const probe = document.createElement("div");
  probe.dataset.theme = mode;
  probe.setAttribute("aria-hidden", "true");
  probe.style.position = "absolute";
  probe.style.opacity = "0";
  probe.style.pointerEvents = "none";
  probe.style.inset = "0";
  document.body.appendChild(probe);

  const styles = getComputedStyle(probe);
  const read = (name) => styles.getPropertyValue(name).trim();
  const tokens = {
    primary: read("--color-primary"),
    primaryDark: read("--color-primary-strong"),
    primaryLight: read("--color-primary-soft-strong"),
    secondary: read("--color-accent"),
    success: read("--color-success"),
    warning: read("--color-warning"),
    danger: read("--color-danger"),
    page: read("--color-page"),
    surface: read("--color-surface"),
    textPrimary: read("--color-text-primary"),
    textSecondary: read("--color-text-secondary"),
    divider: read("--color-border-subtle"),
  };

  probe.remove();
  return tokens;
};

export const AppThemeProvider = ({ children }) => {
  const getSystemPreference = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  const storedMode = readStoredPreference();
  const [preference, setPreference] = useState(storedMode);
  const [systemMode, setSystemMode] = useState(getSystemPreference);
  const mode = preference === "system" ? systemMode : preference;

  const toggleTheme = () => {
    const nextMode = mode === "light" ? "dark" : "light";
    setPreference(nextMode);
    persistPreference(nextMode);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const syncSystemMode = (event) => {
      setSystemMode(event.matches ? "dark" : "light");
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncSystemMode);
    } else {
      mediaQuery.addListener(syncSystemMode);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", syncSystemMode);
      } else {
        mediaQuery.removeListener(syncSystemMode);
      }
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const setThemePreference = (nextPreference) => {
    setPreference(nextPreference);
    persistPreference(nextPreference);
  };

  const theme = useMemo(
    () => {
      const paletteTokens = resolvePaletteTokens(mode);

      return createTheme({
        palette: {
          mode,
          primary: {
            main: paletteTokens.primary,
            dark: paletteTokens.primaryDark,
            light: paletteTokens.primaryLight,
          },
          secondary: {
            main: paletteTokens.secondary,
          },
          success: {
            main: paletteTokens.success,
          },
          warning: {
            main: paletteTokens.warning,
          },
          error: {
            main: paletteTokens.danger,
          },
          background: {
            default: paletteTokens.page,
            paper: paletteTokens.surface,
          },
          text: {
            primary: paletteTokens.textPrimary,
            secondary: paletteTokens.textSecondary,
          },
          divider: paletteTokens.divider,
        },
        shape: {
          borderRadius: 20,
        },
        typography: {
          fontFamily: 'var(--font-sans)',
          h1: { fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: "-0.05em" },
          h2: { fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: "-0.04em" },
          h3: { fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: "-0.03em" },
          h4: { fontWeight: 700 },
          h5: { fontWeight: 700 },
          h6: { fontWeight: 700 },
          button: { fontWeight: 800 },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                background: "var(--color-page)",
                color: "var(--color-text-primary)",
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                backdropFilter: "blur(16px)",
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 24,
                backgroundImage: "none",
                boxShadow: "var(--shadow-md)",
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: "none",
                borderRadius: 16,
                paddingInline: 18,
                minHeight: 46,
                boxShadow: "none",
              },
              containedPrimary: {
                "&:hover": {
                  boxShadow: "none",
                },
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: {
                borderRadius: 999,
                fontWeight: 700,
              },
            },
          },
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 18,
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text-primary)",
                "& .MuiOutlinedInput-input": {
                  color: "var(--color-text-primary)",
                  WebkitTextFillColor: "var(--color-text-primary)",
                },
                "& .MuiOutlinedInput-input::placeholder": {
                  color: "var(--color-text-disabled)",
                  opacity: 1,
                },
                "& .MuiOutlinedInput-input:-webkit-autofill": {
                  WebkitBoxShadow: "0 0 0px 1000px var(--color-surface) inset",
                  WebkitTextFillColor: "var(--color-text-primary)",
                },
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--color-border)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--color-primary-soft-strong)",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "var(--color-primary)",
                },
              },
            },
          },
          MuiInputLabel: {
            styleOverrides: {
              root: {
                color: "var(--color-text-secondary)",
                "&.Mui-focused": {
                  color: "var(--color-primary)",
                },
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                borderRadius: 28,
                background: "var(--color-surface-overlay)",
                border: "1px solid var(--color-border-subtle)",
              },
            },
          },
          MuiMenu: {
            styleOverrides: {
              paper: {
                borderRadius: 18,
                marginTop: 8,
              },
            },
          },
        },
      });
    },
    [mode]
  );

  return (
    <ThemeModeContext.Provider
      value={{
        mode,
        preference,
        setThemePreference,
        toggleTheme,
      }}
    >
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};
