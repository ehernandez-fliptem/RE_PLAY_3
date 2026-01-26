import { ChevronLeft } from "@mui/icons-material";
import { useNavigate } from "react-router";
import {
  Box,
  Button,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import MenuCheck from "../../../assets/img/ayuda/MenuCheck.png";
import VistaCheck from "../../../assets/img/ayuda/VistaCheck.png";
import VistaCheck2 from "../../../assets/img/ayuda/VistaCheck2.png";

export default function ACheck() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario?manual=4`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 4 }}>
        <Typography variant="body1" my={2}>
          Desde esta vista se pueden leer los códigos QR pero solo de los
          usuarios que pertenecen a la empresa, para acceder es desde el menú,
          dentro de Control de Accesos y seleccionar <strong>Check </strong>{" "}
          como se muestra en la imagen. Cada usuario puede obtener su código QR
          desde la vista Usuarios, revisar el manual de Gestión de Usuarios.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img src={MenuCheck} style={{ maxWidth: "100%", height: "auto" }} />
        </Stack>
        <Typography variant="body1" my={2}>
          Al leer el código QR tomará una fotografía del usuario y registrará la
          hora o salida de acceso, en la parte superior del lector en el ícono,
          se puede cambiar el tipo de acceso, es decir, si se requiere que lea
          la entrada o la salida.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img src={VistaCheck} style={{ maxWidth: "100%", height: "auto" }} />
        </Stack>
        <Typography variant="body1" my={2}>
          En la parte de abajo del lector QR se puede cambiar desde cuál cámara
          se debe leer el código QR, en caso de tener varías cámaras conectadas.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img src={VistaCheck2} style={{ maxWidth: "100%", height: "auto" }} />
        </Stack>
        <Divider sx={{ my: 3 }} />
        <Box
          component="footer"
          sx={{
            display: "flex",
            justifyContent: "end",
            mt: 2,
            mb: 0.5,
          }}
        >
          <Stack
            spacing={2}
            direction={{ xs: "column-reverse", sm: "row" }}
            justifyContent="end"
            sx={{ width: "100%" }}
          >
            <Button
              type="button"
              size="medium"
              variant="contained"
              color="secondary"
              onClick={regresar}
              startIcon={<ChevronLeft />}
            >
              Regresar
            </Button>
          </Stack>
        </Box>
      </Box>
    </Container>
  );
}
