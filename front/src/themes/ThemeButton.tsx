import { DarkMode, LightMode } from "@mui/icons-material";
import { IconButton } from "@mui/material";
import { useContext } from "react";
import ColorModeContext from "../components/context/ColorModeContext.js";

type Props = {
  mode: "light" | "dark";
};

export default function ThemeButton({ mode }: Props) {
  const colorMode = useContext(ColorModeContext);
  
  return (
    <IconButton onClick={colorMode.toggleColorMode}>
      {mode === "light" ? (
        <DarkMode sx={{ color: "primary.main" }} />
      ) : (
        <LightMode sx={{ color: "primary.main" }} />
      )}
    </IconButton>
  );
}
