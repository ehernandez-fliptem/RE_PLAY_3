import { Paper, Typography, useTheme } from "@mui/material";

type Props = {
  title?: string;
};

export default function Header({ title }: Props) {
  const theme = useTheme();
  return (
    <Paper
      sx={{
        bgcolor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        p: 1,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      }}
    >
      {title && (
        <Typography component="h6" variant="subtitle2">
          {title}
        </Typography>
      )}
    </Paper>
  );
}
