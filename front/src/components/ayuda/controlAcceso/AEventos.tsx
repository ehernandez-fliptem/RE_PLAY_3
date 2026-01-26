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
import VistaEventos from "../../../assets/img/ayuda/VistaEventos.png";
import VistaEventos2 from "../../../assets/img/ayuda/VistaEventos2.png";

export default function AEventos() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario?manual=4`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 4 }}>
        <Typography variant="body1" my={2}>
          En este apartado se puede consultar los eventos del sistema
          dependiendo los filtros que se apliquen, para acceder es desde el
          menú, dentro de Control de Accesos y seleccionar{" "}
          <strong>Eventos </strong> como se muestra en la imagen. En esta vista
          se van a encontrar una serie de filtros para poder encontrar los
          eventos de acuerdo a lo que se necesite, se puede filtrar por los
          siguientes criterios:
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            Fecha de inicio: Fecha desde cuando queremos el reporte, también se
            puede seleccionar la hora.
          </li>
          <li>Fecha de fin: Fecha de hasta cuando se necesita el reporte.</li>
          <li>Usuarios: Los usuarios registrados del sistema.</li>
          <li>
            Dispositivo: Desde que dispositivo conectado al sistema se realizó
            un check.
          </li>
          <li>
            Estatus: Si es que se realizó una entrada, una salida o es
            indefinido.
          </li>
          <li>Empresa: La empresa por la cuál se realizó el evento.</li>
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={VistaEventos}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <img
            src={VistaEventos2}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          Estos filtros se pueden combinar, en la parte de abajo mostrará el{" "}
          <strong>Resúmen</strong> que es el resultado de lo que se este
          filtrando, además el resumen se puede exportar en formato PDF o CSV.
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
