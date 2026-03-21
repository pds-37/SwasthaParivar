import React, { useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { ThemeModeContext } from "./theme-context";

export const AppThemeProvider = ({ children }) => {
  const storedMode = localStorage.getItem("themeMode") || "light";
  const [mode, setMode] = useState(storedMode);

  const toggleTheme = () => {
    const nextMode = mode === "light" ? "dark" : "light";
    setMode(nextMode);
    localStorage.setItem("themeMode", nextMode);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: "#16a394",
            dark: "#0d6b63",
            light: "#8ce0d3",
          },
          secondary: {
            main: "#f3a638",
          },
          success: {
            main: "#35c78b",
          },
          warning: {
            main: "#f59e0b",
          },
          error: {
            main: "#f26d62",
          },
          background:
            mode === "light"
              ? {
                  default: "#eef3f7",
                  paper: "#ffffff",
                }
              : {
                  default: "#081118",
                  paper: "#101b24",
                },
          text:
            mode === "light"
              ? {
                  primary: "#122433",
                  secondary: "#617484",
                }
              : {
                  primary: "#eef8f8",
                  secondary: "#99adba",
                },
          divider:
            mode === "light"
              ? "rgba(18, 41, 56, 0.1)"
              : "rgba(163, 201, 212, 0.12)",
        },
        shape: {
          borderRadius: 20,
        },
        typography: {
          fontFamily: '"Manrope", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          h1: { fontFamily: '"Sora", "Manrope", sans-serif', fontWeight: 800, letterSpacing: "-0.05em" },
          h2: { fontFamily: '"Sora", "Manrope", sans-serif', fontWeight: 800, letterSpacing: "-0.04em" },
          h3: { fontFamily: '"Sora", "Manrope", sans-serif', fontWeight: 800, letterSpacing: "-0.03em" },
          h4: { fontWeight: 700 },
          h5: { fontWeight: 700 },
          h6: { fontWeight: 700 },
          button: { fontWeight: 800 },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                background: "var(--app-bg)",
                color: "var(--text)",
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
                boxShadow:
                  mode === "light"
                    ? "0 16px 44px rgba(19, 35, 50, 0.08)"
                    : "0 22px 54px rgba(0, 0, 0, 0.36)",
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
                backgroundColor: mode === "light" ? "#ffffff" : "#0f1a22",
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                borderRadius: 28,
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
      }),
    [mode]
  );

  return (
    <ThemeModeContext.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};
