import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  lighten,
  Stack,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <Box component="section">
      <Card
        elevation={0}
        sx={(theme) => ({
          border: `1px solid ${lighten(
            alpha(theme.palette.divider, 0.3),
            0.88
          )}`,
        })}
      >
        <CardContent>
          <Stack
            spacing={2}
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Typography variant="h4">401</Typography>
            <Typography variant="overline" textAlign="center">
              No estás autorizado para acceder.
            </Typography>
            <Link to="/">
              <Button size="small" variant="contained">
                Volver al Dashboard
              </Button>
            </Link>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
