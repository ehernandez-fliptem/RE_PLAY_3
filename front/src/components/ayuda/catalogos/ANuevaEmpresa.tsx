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
import VistaEmpresas from "../../../assets/img/ayuda/VistaEmpresas.png";
import CrearNuevaEmpresa from "../../../assets/img/ayuda/CrearNuevaEmpresa.png";

export default function ANuevaEmpresa() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario?manual=2`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 4 }}>
        <Typography variant="h5">Empresas</Typography>
        <Typography variant="body1" my={2}>
          En este apartado se dan de alta a las empresas, antes de dar de alta a
          una empresa ya tienen que estar dados de alta los pisos y los accesos
          para poder asignarlos a la empresa que se creara, para acceder es
          desde el menú, dentro de catálogos y seleccionar{" "}
          <strong>Empresas </strong> como se muestra en la imagen. En esta vista
          se va a encntrar la tabla con las empresas ya registradas, de lado
          superior derecho se encuentran las siguientes funcionalidades:
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            Exportar: Se puede descargar la lista de lempresas registradas en
            formato PFD o CSV.
          </li>
          <li>Buscar: Para filtrar las empresas por nombre o RFC.</li>
          <li>Agregar: Al dar clic nos permite agregar una nueva empresa.</li>
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={VistaEmpresas}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          En la tabla de Empresas se encuentran las columnas Nombre, RFC, Tipo y
          Acciones, desde la columna acciones se puede ver el detalle, se puede
          editar o también se puede eliminar la empresa, la única que no se
          puede eliminar es la empresa Maestra.
        </Typography>
        <Typography variant="body1" my={2}>
          <strong>Nota: </strong>Existen 2 tipos de empresas, Maestra y Esclava,
          sus características difieren en que la empresa Maestra tiene todos los
          permisos del sistema, puede crear y eliminar otras empresas, excepto
          la suya, la empresa esclava solo tiene acceso a los datos de su misma
          empresa, también depende el rol de cada usuario, véase en el manual de
          usuarios.
        </Typography>
        <Typography variant="body1" my={2}>
          Para crear una nueva empresa se realiza desde la función agregar
          mencionada anteriormente al dar click mostrará un formulario como el
          siguiente:
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={CrearNuevaEmpresa}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          Los campos obligatorios a llenar son:
        </Typography>
        <Typography component="ul" pl={4}>
          <li>Fotografía: Se puede subir una foto con formato jpg.</li>
          <li>Nombre: El nombre comercial de la empresa.</li>
          <li>RFC: Debe cumplir un formato válido.</li>
          <li>
            Pisos: Desplegará una lista de pisos que serán los mismos que se
            encuentran en la vista Pisos.
          </li>
          <li>
            Accesos: Desplegará una lista de accesos que serán los mismos que se
            encuentran en la vista Accesos.
          </li>
          <li>
            Contactos: Se requiere al menos un número de contacto de la empresa.
          </li>
        </Typography>
        <Typography variant="body1" my={2}>
          Para finalizar se da clic en Guardar el cual se habilita una vez se
          han llenado todos los campos obligatorios.
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
