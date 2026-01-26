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
import VistaPases from "../../../assets/img/ayuda/VistaPases.png";
import CrearNuevoPase from "../../../assets/img/ayuda/CrearNuevoPase.png";

export default function ANuevoPase() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario?manual=2`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 4 }}>
        <Typography variant="h5">Pases</Typography>
        <Typography variant="body1" my={2}>
          En este apartado se dan de alta los pases que corresponden a la
          entidad, para acceder es desde el menú, dentro de catálogos y
          seleccionar <strong>Pases </strong> como se muestra en la imagen. En
          esta vista se va a encontrar la tabla con los pases ya registrados, de
          lado superior derecho se encuentran las siguientes funcionalidades:
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            Exportar: Se puede descargar la lista de los pases registrados en
            formato PFD o CSV.
          </li>
          <li>
            Buscar: Para filtrar los pases por Código, Empresa, Fabricante o
            Modelo.
          </li>
          <li>Agregar: Al dar clic nos permite agregar un nuevo pase.</li>
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img src={VistaPases} style={{ maxWidth: "100%", height: "auto" }} />
        </Stack>
        <Typography variant="body1" my={2}>
          En la tabla de Pases se encuentran las columnas de Código, Empresa,
          Fabricante, Modelo, Disponibilidad y Acciones, desde la columna
          acciones se puede ver el detalle, se puede editar o también se puede
          eliminar el pase.
        </Typography>
        <Typography variant="body1" my={2}>
          Para crear un nuevo pase se realiza desde la función agregar
          mencionada anteriormente al dar click mostrará un formulario como el
          siguiente.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={CrearNuevoPase}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          Se tienen que llenar los campos que se muestran, los campos
          obligatorios son los que tienen asteríscos al completarlos habilitara
          el botón guardar.
        </Typography>
        <Typography variant="body1" my={2}>
          <strong>Nota: </strong>En el campo empresa desplegará la lista de las
          empresas dadas de alta y los pases creados serán asignados a una
          empresa.
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
