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
import VistaHoras from "../../../assets/img/ayuda/VistaHoras.png";

export default function AReporteHoras() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario?manual=4`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 4 }}>
        <Typography variant="body1" my={2}>
          En este apartado se puede consultar el total de tiempo laborado
          dependiendo los filtros que se apliquen, para acceder es desde el
          menú, dentro de Control de Accesos y seleccionar{" "}
          <strong>Reporte de Horas </strong> como se muestra en la imagen. En
          esta vista se van a encontrar una serie de filtros para poder
          encontrar el total de horas trabajadas de acuerdo a lo que se
          necesite, se puede filtrar por los siguientes criterios:
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            Fecha de inicio: Fecha desde cuando queremos el reporte, también se
            puede seleccionar la hora.
          </li>
          <li>Fecha de fin: Fecha de hasta cuando se necesita el reporte.</li>
          <li>Usuario: De la persona de quién se requiere el reporte.</li>
          <li>Empresa: A la que pertenece el usuario.</li>
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img src={VistaHoras} style={{ maxWidth: "100%", height: "auto" }} />
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
