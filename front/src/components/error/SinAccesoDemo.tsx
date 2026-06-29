import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  lighten,
  Stack,
  Typography,
} from "@mui/material";
import { Block, Home } from "@mui/icons-material";
import { Link } from "react-router-dom";

export default function SinAccesoDemo() {
  return (
    <Box
      component="section"
      sx={{
        minHeight: "calc(100dvh - 140px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
      }}
    >
      <Card
        elevation={0}
        sx={(theme) => ({
          width: "100%",
          maxWidth: 640,
          border: `1px solid ${lighten(alpha(theme.palette.divider, 0.3), 0.88)}`,
        })}
      >
        <CardContent>
          <Stack spacing={2.5} alignItems="center" textAlign="center">
            <Box
              sx={(theme) => ({
                width: 72,
                height: 72,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
              })}
            >
              <Block fontSize="large" />
            </Box>

            <Chip label="Acceso restringido" color="error" variant="outlined" />

            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                No tienes permisos para acceder
              </Typography>
              <Typography color="text.secondary">
                El rol asignado a tu usuario no cuenta con autorizacion para consultar este modulo.
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              Si necesitas acceso, solicita la revision de permisos con un administrador del sistema.
            </Typography>

            <Button
              component={Link}
              to="/"
              variant="contained"
              startIcon={<Home />}
              sx={{ mt: 1 }}
            >
              Volver al inicio
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
