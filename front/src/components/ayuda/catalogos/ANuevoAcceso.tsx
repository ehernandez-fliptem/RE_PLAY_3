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
import VistaAccesos from "../../../assets/img/ayuda/VistaAccesos.png";
import CrearNuevoAcceso from "../../../assets/img/ayuda/CrearNuevoAcceso.png";

export default function NuevoAcceso() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario?manual=2`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 4 }}>
        <Typography variant="h5">Accesos</Typography>
        <Typography variant="body1" my={2}>
          En este apartado se dan de alta los accesos que corresponden a la
          entidad, para acceder es desde el menú, dentro de catálogos y
          seleccionar <strong>Accesos </strong> como se muestra en la imagen. En
          esta vista se va a encontrar la tabla con los accesos ya registrados,
          de lado superior derecho se encuentran las siguientes funcionalidades:
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            Exportar: Se puede descargar la lista de los accesos registrados en
            formato PFD o CSV.
          </li>
          <li>
            Buscar: Para filtrar los accesos por identificador o por nombre.
          </li>
          <li>Agregar: Al dar clic nos permite agregar un nuevo acceso.</li>
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={VistaAccesos}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          En la tabla de Accesos se encuentran las columnas de Identificador,
          Nombre y Acciones, desde la columna acciones se puede ver el detalle,
          se puede editar o también se puede eliminar el acceso.
        </Typography>
        <Typography variant="body1" my={2}>
          Para crear un nuevo acceso se realiza desde la función agregar
          mencionada anteriormente al dar click mostrará un formulario como el
          siguiente.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={CrearNuevoAcceso}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          Se tiene que agregar un identificador y un nombre al acceso, ambos
          campos son obligatorios.
        </Typography>
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
