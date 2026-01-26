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
import VistaReportes from "../../../assets/img/ayuda/VistaReportes.png";
import VistaReportes2 from "../../../assets/img/ayuda/VistaReportes2.png";

export default function AReportes() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario?manual=3`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 4 }}>
        <Typography variant="body1" my={2}>
          En este apartado se puede consultar todas las citas y registros
          dependiendo los filtros que se apliquen, para acceder es desde el
          menú, dentro de Recepción y seleccionar <strong>Reportes </strong>{" "}
          como se muestra en la imagen. En esta vista se van a encontrar una
          serie de filtros para poder encontrar la lista de citas y reportes de
          acuerdo a lo que se necesite, se puede filtrar por los siguientes
          criterios:
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            Fecha de inicio: Fecha desde cuando queremos el reporte, también se
            puede seleccionar la hora.
          </li>
          <li>Fecha de fin: Fecha de hasta cuando se necesita el reporte.</li>
          <li>Correo: De la persona que es la cita o el registro.</li>
          <li>Nombre: De la persona que es la cita o el registro.</li>
          <li>Teléfono: De la persona que es la cita o el registro.</li>
          <li>
            Empresa: De donde viene la persona que es la cita o el registro.
          </li>
          <li>Estatus: De la cita o el registro.</li>
          <li>Anfitriones: A quien se le agendo la cita o el registro.</li>
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={VistaReportes}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <img
            src={VistaReportes2}
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
