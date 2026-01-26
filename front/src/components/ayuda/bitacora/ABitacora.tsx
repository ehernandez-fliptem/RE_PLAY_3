import { ChevronLeft } from "@mui/icons-material";
import {
  Box,
  Button,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router";
import Bitacora from "../../../assets/img/ayuda/Bitacora.png";
import MenuBitacora from "../../../assets/img/ayuda/MenuBitacora.png";
import BitacoraNuevo from "../../../assets/img/ayuda/BitacoraNuevo.png";
import QRCitas from "../../../assets/img/ayuda/QRCitas.png";

export default function ABitacora() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario?manual=1`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 4 }}>
        <Typography variant="h5">Bitácora</Typography>
        <Typography variant="body1" my={2}>
          Para acceder a la bitácora puedes seleccionar el apartado desde el
          menú como se muestra en la siguiente imagen, en esta vista podras
          crear las citas y los registro.
        </Typography>
        <Stack alignItems="center" sx={{ my: 4 }}>
          <img
            src={MenuBitacora}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="h5" my={2}>
          Tabla de citas y registros
        </Typography>
        <Typography variant="body1" mb={2}>
          En la vista Bitácora se puede encontrar la tabla de citas y registros,
          un <strong>Registro </strong> a diferencia de una{" "}
          <strong>Cita</strong> es la persona que se presenta sin prevía cita,
          la tabla presentan las siguientes columnas:
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            Fecha de acceso: Fecha en la que se tiene la cita o el ingreso de un
            registro.
          </li>
          <li>
            Nombre: El nombre de la persona que tiene la cita o que se registró.
          </li>
          <li>Accesos: Se podrá conocer si es un registro o una cita.</li>
          <li>Personas a visitar: Nombre del abfitrión.</li>
          <li>
            Estado: Se observa el estatus del registro, si ya accedió, se esta
            pendiente, etc.
          </li>
          <li>
            Acciones: Se puede consultar el detalle, se puede editar la cita en
            caso de que aún no haya ingresado o eliminar, una vez finalizada o
            cancelada la cita/registro solo aparecerá el ícono de detalle.
          </li>
          <li>
            Fecha de modificación: mostrará la última modificación realizada a
            la cita.
          </li>
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img src={Bitacora} style={{ maxWidth: "100%", height: "auto" }} />
        </Stack>
        <Typography variant="body1" my={2}>
          En la parte superior de la tabla se encuentra un filtro por fechas, lo
          que quiere decir que al cambiar la fecha mostrará las citas y
          registros de la fecha seleccionada.
        </Typography>
        <Typography variant="body1" my={2}>
          En la parte superior derecha se encuentran las siguientes
          funcionalidades:
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            Exportar: Se puede descargar la lista de citas y registros en
            formato PDF o en CSV.
          </li>
          <li>Buscar: Para filtrar por nombre de la visita o del anfitrión.</li>
          <li>
            Lector QR: Al dar clic abrirá la cámara que se tenga conectada al
            sistema y leer el código QR de la cita, el funcionamiento de este se
            decribirá más adelante.
          </li>
          <li>
            Crear nuevo: en esta sección al dar clic se podrá dar crear una cita
            o un registro, la descripción completa se describirá más adelante.
          </li>
          <li>
            Recargar bitácora: Se puede actualizar la vista para poder
            visualizar los registors nuevos.
          </li>
        </Typography>
        <Typography variant="body1" my={2}>
          En la parte inferior derecha se puede observar la paginación en la
          cual puedes cambiar el número de registros que quieras visualizar en
          la tabla, también en caso de tener varios registros podrás cambiar de
          página en esta misma sección.
        </Typography>
        <Typography variant="h5">Crear cita o registro</Typography>
        <Typography variant="body1" my={2}>
          Para crear una cita o un registro se puede realizar desde la parte
          superior derecha de la vista Bitácora como se había descrito
          anteriormente, al dar clic nos mostrará la siguiente ventana en donde
          se podrá seleccionar entre cita o registro.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={BitacoraNuevo}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="h5">Ingreso de citas</Typography>
        <Typography variant="body1" my={2}>
          Al llegar una cita presenta el código QR que le llego por correo
          electrónico, este se escanea desde bitácora como se muestra en la
          siguiente imagen.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img src={QRCitas} style={{ maxWidth: "100%", height: "auto" }} />
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
