import { Typography, type TypographyProps } from "@mui/material";

export default function Copyright(props: TypographyProps) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      align="center"
      {...props}
    >
      {"Copyright © Fliptem "}
      {new Date().getFullYear()}
      {"."}
    </Typography>
  );
}
