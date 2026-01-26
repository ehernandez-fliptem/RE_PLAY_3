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
import VistaUsuarios from "../../../assets/img/ayuda/VistaUsuarios.png";
import CrearNuevoUsuario from "../../../assets/img/ayuda/CrearNuevoUsuario.png";
import CrearNuevoUsuario2 from "../../../assets/img/ayuda/CrearNuevoUsuario2.png";
import CargaMasiva from "../../../assets/img/ayuda/CargaMasiva.png";
import CM1 from "../../../assets/img/ayuda/CM1.png";
import CM2 from "../../../assets/img/ayuda/CM2.png";
import CM3 from "../../../assets/img/ayuda/CM3.png";
import CM4 from "../../../assets/img/ayuda/CM4.png";
import ExitoCargaMasiva from "../../../assets/img/ayuda/ExitoCargaMasiva.png";
import ErrorCargaMasiva from "../../../assets/img/ayuda/ErrorCargaMasiva.png";

export default function ANuevoUsuario() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario?manual=2`);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ p: 4 }}>
        <Typography variant="h5">Usuarios</Typography>
        <Typography variant="body1" my={2}>
          En este apartado se dan de alta a los usuarios que corresponden a la
          entidad, para acceder es desde el menú, dentro de catálogos y
          seleccionar <strong>Usuarios </strong> como se muestra en la imagen.
          En esta vista se va a encontrar la tabla con los usuarios ya
          registrados, de lado superior derecho se encuentran las siguientes
          funcionalidades:
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            Exportar: Se puede descargar la lista de los usuarios registrados en
            formato PFD o CSV.
          </li>
          <li>Buscar: Se puede filtrar los usuarios por Empresa y Nombre.</li>
          <li>Agregar: Al dar clic nos permite agregar un nuevo usuario.</li>
          <li>
            Carga Masiva: Se pueden registrar varios usuarios a la vez llenando
            un archivo excel, se explicará más adelante.
          </li>
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={VistaUsuarios}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          En la tabla de Usuarios se encuentran las siguientes columnas:
        </Typography>
        <Typography component="ul" pl={4}>
          <li>ID: Es un número que se asigna automáticamente al usuario.</li>
          <li>
            Foto: Cuando el usuario tiene foto en su perfil se mostrará el ícono
            en verde en caso contrario se mostrará en rojo.
          </li>
          <li>
            Empresa: Muestra el nombre de la empresa a la que pertenece el
            usuario.
          </li>
          <li>Nombre del usuario registrado.</li>
          <li>
            Rol: Existen 5 tipos de roles cada uno tiene un color identificador
            diferente, se explicará cada rol más adelante.
          </li>
          <li>Tipo: Se refiere a que tipo de empresa pertenece el usuario.</li>
          <li>
            QR: Desde esta columna se descarga el código QR con el cuál puede
            ingresar a la empresa.
          </li>
          <li>
            Acciones: Desde la columna acciones se puede ver el detalle, se
            puede editar o también se puede eliminar al usuario, el único
            usuario que no se puede eliminar es al usuario administradorde la
            empresa maestra.
          </li>
          <li>
            Arco: Este ícono se muestra cuando un usuario se ha eliminado, se le
            dará clic en caso de querer eliminar sus datos personales.
          </li>
          <li>
            Acceso: Al dar clic se bloqueará el acceso del usuario, también se
            puede desbloquear.
          </li>
        </Typography>
        <Typography variant="body1" my={2}>
          Para crear un nuevo usuario se realiza desde la función agregar
          mencionada anteriormente al dar click mostrará un formulario como el
          siguiente.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={CrearNuevoUsuario}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <img
            src={CrearNuevoUsuario2}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          Se tienen que llenar los campos que se muestran, los campos
          obligatorios son los que tienen asteríscos al completarlos habilitara
          el botón guardar. En el campo contraseña se deben cumplir las
          condiciones mostradas abajo, al cumplirlas se irán marcando con check
          verde. En el rol se pueden marcar uno o varios roles que se le asignen
          al usuario, los roles son 5:
        </Typography>
        <Typography component="ul" pl={4}>
          <li>
            <strong>Administrador</strong> Es el usuario que puede dar de altas
            a otros usuarios y pases, si es usuario de{" "}
            <strong>Empresa Maestra</strong> también podrá dar de alta empresas,
            accesos y pisos, además de que es el único usuario que tiene acceso
            a la configuración del sistema.
          </li>
          <li>
            <strong>Recepción: </strong>Puede crear citas y registros para su
            empresa en caso de que sea usuario de{" "}
            <strong>Empresa Maestra </strong>podrá realizar lo mismo también
            para los usuarios de otras empresas registradas.
          </li>
          <li>
            <strong>Interno: </strong>Tiene acceso a labitácora solo para ver
            sus propias citas y registros, también puede crearlas para si mismo.
          </li>
          <li>
            <strong>Reportes: </strong>Tiene los mismos accesos que el rol
            interno, agregando la vista de reportes y la vista de eventos.
          </li>
          <li>
            <strong>Asistencia: </strong>Tiene los mismos accesos que el rol
            interno agregando la vista de Reporte de Horas.
          </li>
        </Typography>
        <Typography variant="h6" my={2}>
          Carga Masiva de Usuarios
        </Typography>
        <Typography variant="body1" my={2}>
          Para realizar la carga de varios usuarios se ingresa desde el botón
          Carga Masiva antes mencionado, y mostrará una ventana como la
          siguiente:
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img src={CargaMasiva} style={{ maxWidth: "100%", height: "auto" }} />
        </Stack>
        <Typography variant="body1" my={2}>
          Como primer paso se debe descargar siempre el archivo excel, este
          siempre debe hacerse ya que si hay algún cambio en cualquier gestión
          se verá reflejada en este archivo, una vez descargado y llenado debe
          subirse el archivo, la casilla de enviar correos se puede activar si
          se requiere envíar correo a los usuarios que se están dando de alta,
          si este paso se realiza se debe tener en cuenta que tardará más para
          crear los registros de usuarios ya que esto va a depender de la
          velocidad de internte y de el número de usuarios a los que se está
          enviando correo.
        </Typography>
        <Typography variant="body1" my={2}>
          <strong>Excel </strong>
          El archivo excel se aprecia de la siguiente forma:
        </Typography>
        <Typography variant="body1" my={2}>
          Las columnas de color amarillo son datos obligatorios y las columnas
          de color verde son datos opcionales. Se muestra un ejemplo en las
          siguientes imagenes:
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img src={CM1} style={{ maxWidth: "100%", height: "auto" }} />
          <img src={CM2} style={{ maxWidth: "100%", height: "auto" }} />
        </Stack>
        <Typography variant="body1" my={2}>
          En las pestañas de <strong>Empresas</strong> y <strong>Roles</strong>{" "}
          se puede consultar que información debe ir en las columnas{" "}
          <strong>RFC Empresa, en Piso y en Acceso</strong> en la pestaña{" "}
          <strong>General</strong> está información esta actualizada con cada
          cambio que se realice en la gestión por eso es importante como primer
          paso descargar el archivo excel para impedir errores, además se
          colocan los datos en estás pestañas para su consulta rápida y se
          coloquen de forma correcta en los campos de la pestaña general.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img src={CM3} style={{ maxWidth: "100%", height: "auto" }} />
        </Stack>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img src={CM4} style={{ maxWidth: "100%", height: "auto" }} />
        </Stack>
        <Typography variant="body1" my={2}>
          Una vez que se llene el excel se debe cerrar y proceder a subir en la
          vista de Carga Masiva, al cargar el excel se mostrarán los registros
          de la siguiente forma:
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={ExitoCargaMasiva}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          Si los datos son corrector en la columna estado mostrará un check en
          verde y habilitará el botón <strong>Procesar</strong>, al dar clic
          enviará los correos a los usuarios (en caso de haber habilitado el
          cehck de enviar correos) y creará los usuarios, se pueden consultar en
          la tabla de Gestión de Usuarios.
        </Typography>
        <Stack alignItems="center" sx={{ my: 2 }}>
          <img
            src={ErrorCargaMasiva}
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Stack>
        <Typography variant="body1" my={2}>
          En caso de que hubiera un error en algún registro mostrará una alerta
          en la columna estado, al dar clic en la alerta describirá el error
          para poder modificarlo en el excel, los errores pueden ser diferentes
          en cada registro.
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
