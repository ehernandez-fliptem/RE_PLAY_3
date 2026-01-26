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
import CrearCita from "../../../assets/img/ayuda/CrearCita.png";
import NuevaCita from "../../../assets/img/ayuda/NuevaCita.png";
import NuevaCita2 from "../../../assets/img/ayuda/NuevaCita2.png";
import NuevaCitaAcceso from "../../../assets/img/ayuda/NuevaCitaAcceso.png";
import NuevaCitaAcceso2 from "../../../assets/img/ayuda/NuevaCitaAcceso2.png";
import NuevaCitaAdicionales from "../../../assets/img/ayuda/NuevaCitaAdicionales.png";

export default function ANuevaCita() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario?manual=1`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 4 }}>
        <Typography variant="h5">Nueva Cita</Typography>
        <Typography variant="body1" my={2}>
          Para crear una nueva cita se realiza desde la vista Bitácora como se
          muestra en la siguiente imagen.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img src={CrearCita} style={{ maxWidth: "100%", height: "auto" }} />
        </Stack>
        <Typography variant="body1" my={2}>
          Al dar clic en <strong>+ Cita</strong> mostrará el siguiente
          formulario, en este se deben colocar los datos del visitante, los
          campos que tiene un astérico son campos obligatorios, si anteriormente
          se ha realizado una cita con el mismo correo se llenarán los campos
          automáticamente, si así se desea, habilitando la casilla
          autocompletar.
        </Typography>
        <Typography variant="body1" my={2}>
          Se pueden agregar varias personas en la cita con el botón de agregar,
          al hacerlo se irán mostrando en la tabla de Visitantes, cuando se
          hayan agregado la(s) persona(s) habilitará el botón de siguiente.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img src={NuevaCita} style={{ maxWidth: "100%", height: "auto" }} />
          <img src={NuevaCita2} style={{ maxWidth: "100%", height: "auto" }} />
        </Stack>
        <Typography variant="body1" my={2}>
          En la siguiente vista se llenan los campos fecha y hora de la cita, la
          persona a la que va a visitar (anfitrión), las actividades que va a
          realizar y se seleccionan los accesos por los que puede ingresar, en
          este caso solo apareceran los accesos que tiene asignados la empresa a
          la que pertenece el anfitrión. En este punto se puede guardar la cita
          o dar clic en siguiente.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={NuevaCitaAcceso}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <img
            src={NuevaCitaAcceso2}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          En Adicionales se pueden agregar comentarios extras, también se puede
          agregar las placas y descripción del vehículo que puede traer la cita.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={NuevaCitaAdicionales}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          Una vez creada la cita se envían correos a los visitantes y al
          anfitrión con todos los datos de la cita, a los visitantes les llega
          un código QR el cual se debe presentar a la cita.
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
