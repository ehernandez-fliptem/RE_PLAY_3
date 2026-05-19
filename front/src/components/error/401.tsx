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
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { IRootState } from "../../app/store";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { token } = useSelector((state: IRootState) => state.auth.data);

  useEffect(() => {
    if (token) {
      navigate("/", { replace: true });
    }
  }, [token, navigate]);

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
