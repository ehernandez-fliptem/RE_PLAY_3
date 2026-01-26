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
import VistaConfiguracion from "../../../assets/img/ayuda/VistaConfiguracion.png";

export default function AConfiguracion() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario?manual=5`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 4 }}>
        <Typography variant="body1" my={2}>
          A esta vista solo tienen acceso los administradores del sistema, para
          acceder es desde el menú y seleccionar <strong>Configuracion </strong>{" "}
          como se muestra en la imagen.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={VistaConfiguracion}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          En esta vista se puede configurar diferentes campos:
        </Typography>
        <Typography variant="body1" my={2}>
          <strong>Configuración General</strong>
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            Zona horaria: se puede seleccionar la región para que el sistema
            tenga el horario de la zona correcta
          </li>
          <li>
            Logo: se podrá subir un logo y este se mostrará en los correos que
            se envian automáticamente desde el sistema.
          </li>
          <li>
            Saludo: Este mensaje se mostrará en la cabecera de los correos que
            se envian automáticamente desde el sistema.
          </li>
          <li>
            Despedida: Este mensaje se mostrará al pie de los correos que se
            envian automáticamente desde el sistema.
          </li>
        </Typography>
        <Typography variant="body1" my={2}>
          <strong>Bitácora</strong>
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            Tiempo de cancelcaión / finalización de registros y citas: se
            configura en cuánto tiempo se cancelará o se finalizará una cita o
            un registro de forma automática, esto en caso de que no se haya
            realizado manualmente.
          </li>
          <li>
            Tiempo de tolerancia de entrada de citas: se confgura cuál será el
            tiempo de tolerancia para las citas, es decir que si la cita llega
            después de este tiempo estipulado o antes no se le podrá dar acceso.
          </li>
        </Typography>
        <Typography variant="body1" my={2}>
          <strong>Hikvision</strong>
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            Habilitar integración: Esta opción habilita el uso de los
            dispositivos de reconocimiento facial de la marca Hikvision.
          </li>
        </Typography>
        <Typography variant="body1" my={2}>
          Una vez hecho el cambio en cualquiera de las opciones se debe dar clic
          en el botón <strong>Guardar.</strong>
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
