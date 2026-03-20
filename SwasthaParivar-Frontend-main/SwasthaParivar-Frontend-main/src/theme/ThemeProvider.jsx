import React, { useMemo, useState } from "react";
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

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: "#1e9a93",
            dark: "#0f6b66",
            light: "#7ad7d0",
          },
          secondary: {
            main: "#f59e0b",
          },
          background:
            mode === "light"
              ? {
                  default: "#f4f7fa",
                  paper: "#ffffff",
                }
              : {
                  default: "#0f171d",
                  paper: "#17232d",
                },
          text:
            mode === "light"
              ? {
                  primary: "#152331",
                  secondary: "#667480",
                }
              : {
                  primary: "#edf7f8",
                  secondary: "#b3c2cb",
                },
          divider:
            mode === "light"
              ? "rgba(18, 41, 56, 0.09)"
              : "rgba(255, 255, 255, 0.08)",
        },
        shape: {
          borderRadius: 18,
        },
        typography: {
          fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          h1: { fontWeight: 800, letterSpacing: "-0.04em" },
          h2: { fontWeight: 800, letterSpacing: "-0.03em" },
          h3: { fontWeight: 800, letterSpacing: "-0.02em" },
          h4: { fontWeight: 700 },
          h5: { fontWeight: 700 },
          h6: { fontWeight: 700 },
          button: { fontWeight: 700 },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                background:
                  mode === "light"
                    ? "radial-gradient(circle at top left, rgba(31, 156, 144, 0.08), transparent 24%), linear-gradient(180deg, #fbfcfd 0%, #f2f5f8 100%)"
                    : "linear-gradient(180deg, #0d151b 0%, #101b23 100%)",
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
                borderRadius: 20,
                backgroundImage: "none",
                boxShadow:
                  mode === "light"
                    ? "0 12px 30px rgba(20, 34, 48, 0.05)"
                    : "0 18px 44px rgba(0, 0, 0, 0.28)",
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: "none",
                borderRadius: 14,
                paddingInline: 18,
                minHeight: 42,
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
                borderRadius: 16,
                backgroundColor: mode === "light" ? "#ffffff" : "#101c24",
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                borderRadius: 24,
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
