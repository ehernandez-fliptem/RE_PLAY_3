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
import VistaDirectorio from "../../../assets/img/ayuda/VistaDirectorio.png";

export default function ADirectorio() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario?manual=3`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 4 }}>
        <Typography variant="body1" my={2}>
          En este apartado se visualizan los usuarios del sistema. El usuario
          con rol de administrador de una empresa maestra tendrá acceso a todos
          los usuarios, los usuarios de las empresas esclavas solo podrán ver la
          información de su propia empresa. Para acceder es desde el menú,
          dentro de recepción y seleccionar <strong>Directorio </strong> como se
          muestra en la imagen, de lado superior derecho se encuentran las
          siguientes funcionalidades:
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            Exportar: Se puede descargar el directorio en formato PFD o CSV.
          </li>
          <li>
            Buscar: Para filtrar los pisos por identificador o por nombre.
          </li>
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={VistaDirectorio}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          En la tabla de Directorio se encuentran las columnas de Nombre,
          Puesto, Correo, Teléfono y Móvil.
        </Typography>
        <Divider sx={{ my: 3 }} />
        <Box
          component="footer"
          sx={{
            display: "flex",
            justifyContent: "end",
            m: 3,
            //mb: 0.5,
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
