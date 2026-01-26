import { alpha, Box, lighten } from "@mui/material";

export default function Body() {
  return (
    <Box
      id="body"
      component="div"
      sx={(theme) => ({
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: 300,
        height: 200,
        borderRadius: 15,
        bgcolor:
          theme.palette.mode === "light"
            ? "white"
            : theme.palette.secondary.light,
        border: `2px solid ${lighten(alpha(theme.palette.divider, 1), 0.88)}`,
        p: 5,
      })}
    ></Box>
  );
}
