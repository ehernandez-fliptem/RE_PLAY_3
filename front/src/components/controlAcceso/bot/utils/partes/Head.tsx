import { alpha, Box, lighten } from "@mui/material";
import React from "react";

type Props = {
  children: React.ReactNode;
};

export default function Head({ children }: Props) {
  return (
    <Box
      id="head"
      component="div"
      sx={(theme) => ({
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: { xs: 200, sm: 300, md: 400, xl: 500 },
        height: { xs: 100, sm: 200, md: 300, xl: 400 },
        borderRadius: { xs: 25, md: 35, xl: 45 },
        bgcolor:
          theme.palette.mode === "light"
            ? "white"
            : theme.palette.secondary.light,
        border: `2px solid ${lighten(alpha(theme.palette.divider, 1), 0.88)}`,
        p: 5,
      })}
    >
      <Box
        id="head"
        component="div"
        sx={(theme) => ({
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: { xs: 150, sm: 200, md: 280, xl: 300 },
          height: { xs: 60, sm: 120, md: 200, xl: 280 },
          borderRadius: { xs: 15, md: 25, xl: 25 },
          bgcolor: theme.palette.primary.main,
          p: { xs: 2, sm: 5 },
        })}
      >
        {children}
      </Box>
    </Box>
  );
}
