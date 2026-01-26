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
import CrearRegistro from "../../../assets/img/ayuda/CrearRegistro.png";
import NuevoRegistro from "../../../assets/img/ayuda/NuevoRegistro.png";
import NuevoRegistro2 from "../../../assets/img/ayuda/NuevoRegistro2.png";
import NuevoRegistro3 from "../../../assets/img/ayuda/NuevoRegistro3.png";
import NuevoRegistroAcceso from "../../../assets/img/ayuda/NuevoRegistroAcceso.png";
import NuevoRegistroAcceso2 from "../../../assets/img/ayuda/NuevoRegistroAcceso2.png";
import NuevoRegistroAdicionales from "../../../assets/img/ayuda/NuevoRegistroAdicionales.png";

export default function ANuevoRegistro() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario?manual=1`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 4 }}>
        <Typography variant="h5">Nuevo Registro</Typography>
        <Typography variant="body1" my={2}>
          Para crear un nuevo Registro se realiza desde la vista Bitácora como
          se muestra en la siguiente imagen.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={CrearRegistro}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          Al seleccionar la opción registro mostrará un formulario como el
          siguiente, el registro es la persona que llega sin cita, si ya existe
          el correo registrado como visitante se pueden completar los datos al
          acivar la casilla de <strong>Autocompletar</strong>, todos los campos
          con asteríscos son campos obligatorios, se debe tomar fotografía de la
          persona que llega y de la identificación que presente por la parte
          frontal y trasera. Se pueden agregar tantas personas como se deseen en
          el momento con el botón <strong>Agregar,</strong> los mismos se irán
          mostrando en la tabla <strong>Visitantes</strong> de la parte
          inferior. cuando se hayan agregado la(s) persona(s) habilitará el
          botón de siguiente.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={NuevoRegistro}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <img
            src={NuevoRegistro2}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <img
            src={NuevoRegistro3}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          Al dar clic en siguiente muestra el formulario en el que se agrega al
          anfitrión, la fecha y hora no se podrán modificar en un registo, se
          registran las actividades que va a realizar y se seleccionan los
          accesos por los que puede ingresar, en este caso solo apareceran los
          accesos que tiene asignados la empresa a la que pertenece el
          anfitrión. En este punto se puede guardar la cita o dar clic en
          siguiente.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={NuevoRegistroAcceso}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <img
            src={NuevoRegistroAcceso2}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          En Adicionales se pueden agregar comentarios extras, en caso de que se
          ingrese un vehículo se puede agregar las placas y descripción del
          vehículo.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={NuevoRegistroAdicionales}
            style={{ maxWidth: "100%", height: "auto" }}
          />
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
