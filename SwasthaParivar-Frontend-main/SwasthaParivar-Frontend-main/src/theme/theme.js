// src/theme/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#4B7BEC", // Modern blue
    },
    secondary: {
      main: "#6C5CE7", // Purple gradient pair
    },
    success: {
      main: "#55D187",
    },
    background: {
      default: "#F6FAFF",
      paper: "#FFFFFF",
    },
  },

  typography: {
    fontFamily: "'Inter', sans-serif",
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    body1: { fontSize: "0.95rem" },
    body2: { color: "#555" },
  },

  shape: {
    borderRadius: 14, // Premium smooth corners
  },

  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          padding: "12px",
          boxShadow: "0 4px 18px rgba(0,0,0,0.04)",
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },

    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 12,
          padding: "8px 18px",
        },
      },
    },
  },
});

export default theme;
