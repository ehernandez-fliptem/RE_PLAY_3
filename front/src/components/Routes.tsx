import { useRoutes } from "react-router-dom";
import { useSelector } from "react-redux";
import type { IRootState } from "../app/store";
import Logout from "./auth/Logout";
import EditarPerfil from "./common/EditarPerfil";
import Unauthorized from "./error/401";
import Unknown from "./error/404";
import { Dashboard } from "./common/Dashboard";
import Empresas from "./catalogos/empresas/Empresas";
import NuevaEmpresa from "./catalogos/empresas/NuevaEmpresa";
import EditarEmpresa from "./catalogos/empresas/EditarEmpresa";
import DetalleEmpresa from "./catalogos/empresas/DetalleEmpresa";
import Usuarios from "./catalogos/usuarios/Usuarios";
import NuevoUsuario from "./catalogos/usuarios/NuevoUsuario";
import EditarUsuario from "./catalogos/usuarios/EditarUsuario";
import DetalleUsuario from "./catalogos/usuarios/DetalleUsuario";
import CargaUsuarios from "./catalogos/usuarios/CargaUsuarios";
import DispositivosHV from "./catalogos/dispositivos/DispositivosHV";
import NuevoDispositivoHV from "./catalogos/dispositivos/NuevoDispositivoHV";
import DetalleDispositivoHV from "./catalogos/dispositivos/DetalleDispositivoHV";
import EditarDispositivoHV from "./catalogos/dispositivos/EditarDispositivoHV";
import Configuracion from "./catalogos/configuracion/Configuracion";
import Directorio from "./recepcion/directorio/Directorio";
import Bitacora from "./recepcion/bitacora/Bitacora";
import Pases from "./catalogos/pases/Pases";
import NuevoPase from "./catalogos/pases/NuevoPase";
import DetallePase from "./catalogos/pases/DetallePase";
import EditarPase from "./catalogos/pases/EditarPase";
import NuevoRegistro from "./recepcion/bitacora/registros/NuevoRegistro";
import EditarRegistro from "./recepcion/bitacora/registros/EditarRegistro";
import DetalleRegistro from "./recepcion/bitacora/registros/DetalleRegistro";
import Reportes from "./recepcion/reportes/Reportes";
import Check from "./controlAcceso/check/Check";
import Eventos from "./controlAcceso/eventos/Eventos";
import DetalleEvento from "./controlAcceso/eventos/DetalleEvento";
import ReporteHoras from "./controlAcceso/reporteHoras/ReporteHoras";
import DetalleReporteHoras from "./controlAcceso/reporteHoras/DetalleReporteHoras";
import Pisos from "./catalogos/pisos/Pisos";
import NuevoPiso from "./catalogos/pisos/NuevoPiso";
import EditarPiso from "./catalogos/pisos/EditarPiso";
import DetallePiso from "./catalogos/pisos/DetallePiso";
import Accesos from "./catalogos/accesos/Accesos";
import NuevoAcceso from "./catalogos/accesos/NuevoAcceso";
import EditarAcceso from "./catalogos/accesos/EditarAcceso";
import DetalleAcceso from "./catalogos/accesos/DetalleAcceso";
import ManualUsuario from "./ayuda/ManualUsuario";
import Visitantes from "./recepcion/visitantes/Visitantes";
import NuevoVisitante from "./recepcion/visitantes/NuevoVisitante";
import EditarVisitante from "./recepcion/visitantes/EditarVisitante";
import DetalleVisitante from "./recepcion/visitantes/DetalleVisitante";
import CargaVisitantes from "./recepcion/visitantes/CargaVisitantes";
import ValidarDocumentos from "./recepcion/documentos/ValidarDocumentos";
import Documentos from "./recepcion/documentos/Documentos";
import NuevoDocumento from "./recepcion/documentos/NuevoDocumento";
import Tutoriales from "./ayuda/video/Tutoriales";
import DetalleDocumento from "./recepcion/documentos/DetalleDocumento";
import EditarDocumento from "./recepcion/documentos/EditarDocumento";
import BitacoraVisit from "./recepcion/bitacora/BitacoraVisit";
import EnviarCorreoVisit from "./recepcion/bitacora/registros/EnviarCorreoVisit";
import Puestos from "./catalogos/puestos/Puestos";
import NuevoPuesto from "./catalogos/puestos/NuevoPuesto";
import EditarPuesto from "./catalogos/puestos/EditarPuesto";
import DetallePuesto from "./catalogos/puestos/DetallePuesto";
import Departamentos from "./catalogos/departamentos/Departamentos";
import NuevoDepartamento from "./catalogos/departamentos/NuevoDepartamento";
import EditarDepartamento from "./catalogos/departamentos/EditarDepartamento";
import DetalleDepartamento from "./catalogos/departamentos/DetalleDepartamento";
import Cubiculos from "./catalogos/cubiculos/Cubiculos";
import NuevoCubiculo from "./catalogos/cubiculos/NuevoCubiculo";
import EditarCubiculo from "./catalogos/cubiculos/EditarCubiculo";
import DetalleCubiculo from "./catalogos/cubiculos/DetalleCubiculo";

import Kiosco from "./kiosco/Kiosco";
import Bot from "./controlAcceso/bot/Bot";
import Camaras from "./catalogos/camaras/Camaras";
import NuevaCamara from "./catalogos/camaras/NuevaCamara";
import DetalleCamara from "./catalogos/camaras/DetalleCamara";
import EditarCamara from "./catalogos/camaras/EditarCamara";

export default function Routes() {
  const { rol } = useSelector((state: IRootState) => state.auth.data);
  const { habilitarCamaras, habilitarIntegracionHv } = useSelector(
    (state: IRootState) => state.config.data
  );
  const esAdmin = rol.includes(1);
  const esRecep = rol.includes(2);
  const esInter = rol.includes(4);
  const esRepor = rol.includes(5);
  const esAsist = rol.includes(6);
  const esValid = rol.includes(7);
  const esVisit = rol.includes(10);
  const usuarioSistema =
    esAdmin || esRecep || esInter || esRepor || esAsist || esValid;

  return useRoutes([
    {
      path: "/",
      element: usuarioSistema ? <Dashboard /> : <Unauthorized />,
    },
    {
      path: "/logout",
      element: usuarioSistema ? <Logout /> : <Unauthorized />,
    },
    {
      path: "/perfil",
      element: usuarioSistema || esVisit ? <EditarPerfil /> : <Unauthorized />,
    },
    {
      path: "/check",
      element: usuarioSistema ? <Check /> : <Unauthorized />,
    },
    {
      path: "/kiosco",
      element: usuarioSistema ? <Kiosco /> : <Unauthorized />,
    },
    {
      path: "/bot",
      element: usuarioSistema ? <Bot /> : <Unauthorized />,
    },
    {
      path: "/pisos",
      children: [
        {
          path: "",
          element: esAdmin ? <Pisos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-piso",
              element: esAdmin ? <NuevoPiso /> : <Unauthorized />,
            },
            {
              path: "editar-piso/:id",
              element: esAdmin ? <EditarPiso /> : <Unauthorized />,
            },
            {
              path: "detalle-piso/:id",
              element: esAdmin ? <DetallePiso /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "*",
          element: <Unknown />,
        },
      ],
    },
    {
      path: "/accesos",
      children: [
        {
          path: "",
          element: esAdmin ? <Accesos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-acceso",
              element: esAdmin ? <NuevoAcceso /> : <Unauthorized />,
            },
            {
              path: "editar-acceso/:id",
              element: esAdmin ? <EditarAcceso /> : <Unauthorized />,
            },
            {
              path: "detalle-acceso/:id",
              element: esAdmin ? <DetalleAcceso /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "*",
          element: <Unknown />,
        },
      ],
    },
    {
      path: "/empresas",
      children: [
        {
          path: "",
          element: esAdmin ? <Empresas /> : <Unauthorized />,
          children: [
            {
              path: "nueva-empresa",
              element: esAdmin ? <NuevaEmpresa /> : <Unauthorized />,
            },
            {
              path: "editar-empresa/:id",
              element: esAdmin ? <EditarEmpresa /> : <Unauthorized />,
            },
            {
              path: "detalle-empresa/:id",
              element: esAdmin ? <DetalleEmpresa /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "*",
          element: <Unknown />,
        },
      ],
    },
    {
      path: "/puestos",
      children: [
        {
          path: "",
          element: esAdmin ? <Puestos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-puesto",
              element: esAdmin ? <NuevoPuesto /> : <Unauthorized />,
            },
            {
              path: "editar-puesto/:id",
              element: esAdmin ? <EditarPuesto /> : <Unauthorized />,
            },
            {
              path: "detalle-puesto/:id",
              element: esAdmin ? <DetallePuesto /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "*",
          element: <Unknown />,
        },
      ],
    },
    {
      path: "/departamentos",
      children: [
        {
          path: "",
          element: esAdmin ? <Departamentos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-departamento",
              element: esAdmin ? <NuevoDepartamento /> : <Unauthorized />,
            },
            {
              path: "editar-departamento/:id",
              element: esAdmin ? <EditarDepartamento /> : <Unauthorized />,
            },
            {
              path: "detalle-departamento/:id",
              element: esAdmin ? <DetalleDepartamento /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "*",
          element: <Unknown />,
        },
      ],
    },
    {
      path: "/cubiculos",
      children: [
        {
          path: "",
          element: esAdmin ? <Cubiculos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-cubiculo",
              element: esAdmin ? <NuevoCubiculo /> : <Unauthorized />,
            },
            {
              path: "editar-cubiculo/:id",
              element: esAdmin ? <EditarCubiculo /> : <Unauthorized />,
            },
            {
              path: "detalle-cubiculo/:id",
              element: esAdmin ? <DetalleCubiculo /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "*",
          element: <Unknown />,
        },
      ],
    },
    {
      path: "/usuarios/*",
      children: [
        {
          path: "",
          element: esAdmin ? <Usuarios /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-usuario",
              element: esAdmin ? <NuevoUsuario /> : <Unauthorized />,
            },
            {
              path: "editar-usuario/:id",
              element: esAdmin ? <EditarUsuario /> : <Unauthorized />,
            },
            {
              path: "detalle-usuario/:id",
              element: esAdmin ? <DetalleUsuario /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "carga-masiva",
          element: esAdmin ? <CargaUsuarios /> : <Unauthorized />,
        },
        {
          path: "*",
          element: <Unknown />,
        },
      ],
    },
    {
      path: "/pases/*",
      children: [
        {
          path: "",
          element: esAdmin || esRecep ? <Pases /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-pase",
              element: esAdmin || esRecep ? <NuevoPase /> : <Unauthorized />,
            },
            {
              path: "editar-pase/:id",
              element: esAdmin || esRecep ? <EditarPase /> : <Unauthorized />,
            },
            {
              path: "detalle-pase/:id",
              element: esAdmin || esRecep ? <DetallePase /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "*",
          element: <Unknown />,
        },
      ],
    },
    {
      path: "/visitantes/*",
      children: [
        {
          path: "",
          element: esAdmin || esRecep ? <Visitantes /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-visitante",
              element:
                esAdmin || esRecep ? <NuevoVisitante /> : <Unauthorized />,
            },
            {
              path: "editar-visitante/:id",
              element:
                esAdmin || esRecep ? <EditarVisitante /> : <Unauthorized />,
            },
            {
              path: "detalle-visitante/:id",
              element:
                esAdmin || esRecep ? <DetalleVisitante /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "carga-masiva",
          element: esAdmin ? <CargaVisitantes /> : <Unauthorized />,
        },
        {
          path: "*",
          element: <Unknown />,
        },
      ],
    },
    {
      path: "/validacion-documentos",
      children: [
        {
          path: "",
          element: esValid ? <ValidarDocumentos /> : <Unauthorized />,
          children: [
            {
              path: "editar-documento/:id",
              element: esValid ? <EditarDocumento /> : <Unauthorized />,
            },
            {
              path: "detalle-documento/:id",
              element: esValid ? <DetalleDocumento /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "*",
          element: <Unknown />,
        },
      ],
    },
    {
      path: "/documentos",
      children: [
        {
          path: "",
          element: esVisit ? <Documentos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-documento",
              element: esVisit ? <NuevoDocumento /> : <Unauthorized />,
            },
            {
              path: "detalle-documento/:id",
              element:
                esValid || esVisit ? <DetalleDocumento /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "*",
          element: <Unknown />,
        },
      ],
    },
    {
      path: "/bitacora/*",
      children: [
        {
          path: "",
          element: usuarioSistema ? (
            <Bitacora />
          ) : esVisit ? (
            <BitacoraVisit />
          ) : (
            <Unauthorized />
          ),
          children: [
            {
              path: "nuevo-registro",
              element: usuarioSistema ? <NuevoRegistro /> : <Unauthorized />,
            },
            {
              path: "enviar-liga-cita",
              element: usuarioSistema ? (
                <EnviarCorreoVisit />
              ) : (
                <Unauthorized />
              ),
            },
            {
              path: "permitir-entrada/:id",
              element: esRecep ? <EditarRegistro /> : <Unauthorized />,
            },
            {
              path: "editar-registro/:id",
              element: esRecep ? <EditarRegistro /> : <Unauthorized />,
            },
            {
              path: "detalle-registro/:id",
              element:
                usuarioSistema || esVisit ? (
                  <DetalleRegistro />
                ) : (
                  <Unauthorized />
                ),
            },
          ],
        },
        {
          path: "*",
          element: <Unknown />,
        },
      ],
    },
    {
      path: "/eventos/*",
      children: [
        {
          path: "",
          element:
            esAdmin || esRecep || esRepor || esAsist ? (
              <Eventos />
            ) : (
              <Unauthorized />
            ),
          children: [
            {
              path: "detalle-evento/:id",
              element:
                esAdmin || esRecep || esRepor || esAsist ? (
                  <DetalleEvento />
                ) : (
                  <Unauthorized />
                ),
            },
          ],
        },
      ],
    },
    // {
    //   path: "/horarios/*",
    //   children: [
    //     {
    //       path: "",
    //       element: esAdmin || esRecep ? <Horarios /> : <Unauthorized />,
    //       children: [
    //         {
    //           path: "nuevo-horario",
    //           element: esAdmin || esRecep ? <NuevoHorario /> : <Unauthorized />,
    //         },
    //         {
    //           path: "editar-horario/:id",
    //           element:
    //             esAdmin || esRecep ? <EditarHorario /> : <Unauthorized />,
    //         },
    //         {
    //           path: "detalle-horario/:id",
    //           element:
    //             esAdmin || esRecep ? <DetalleHorario /> : <Unauthorized />,
    //         },
    //       ],
    //     },
    //     {
    //       path: "*",
    //       element: <Unknown />,
    //     },
    //   ],
    // },
    // {
    //   path: "/asignaciones/*",
    //   children: [
    //     {
    //       path: "",
    //       element: esAdmin || esRecep ? <Asignaciones /> : <Unauthorized />,
    //       children: [
    //         {
    //           path: "nueva-asignacion",
    //           element:
    //             esAdmin || esRecep ? <NuevaAsignacion /> : <Unauthorized />,
    //         },
    //         {
    //           path: "editar-asignacion/:id",
    //           element:
    //             esAdmin || esRecep ? <EditarAsignacion /> : <Unauthorized />,
    //         },
    //         {
    //           path: "detalle-asignacion/:id",
    //           element:
    //             esAdmin || esRecep ? <DetalleAsignacion /> : <Unauthorized />,
    //         },
    //       ],
    //     },
    //     {
    //       path: "*",
    //       element: <Unknown />,
    //     },
    //   ],
    // },
    {
      path: "/reporte-horas/*",
      children: [
        {
          path: "",
          element:
            esAdmin || esRecep || esRepor || esAsist ? (
              <ReporteHoras />
            ) : (
              <Unauthorized />
            ),
          children: [
            {
              path: "detalle-reporte/:id",
              element:
                esAdmin || esRecep || esRepor || esAsist ? (
                  <DetalleReporteHoras />
                ) : (
                  <Unauthorized />
                ),
            },
          ],
        },
      ],
    },
    {
      path: "/reportes",
      element: esAdmin || esRecep || esRepor ? <Reportes /> : <Unauthorized />,
    },
    {
      path: "/directorio/*",
      element: usuarioSistema ? <Directorio /> : <Unauthorized />,
    },
    {
      path: "/camaras/*",
      children: [
        {
          path: "",
          element: esAdmin && habilitarCamaras ? <Camaras /> : <Unauthorized />,
          children: [
            {
              path: "nueva-camara",
              element:
                esAdmin && habilitarCamaras ? (
                  <NuevaCamara />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "detalle-camara/:id",
              element:
                esAdmin && habilitarCamaras ? (
                  <DetalleCamara />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "editar-camara/:id",
              element:
                esAdmin && habilitarCamaras ? (
                  <EditarCamara />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "*",
              element: <Unknown />,
            },
          ],
        },
      ],
    },
    {
      path: "/dispositivos-hikvision/*",
      children: [
        {
          path: "",
          element:
            esAdmin && habilitarIntegracionHv ? (
              <DispositivosHV />
            ) : (
              <Unauthorized />
            ), //&& habilitarIntegracionHv
          children: [
            {
              path: "nuevo-dispositivo",
              element:
                esAdmin && habilitarIntegracionHv ? (
                  <NuevoDispositivoHV />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "detalle-dispositivo/:id",
              element:
                esAdmin && habilitarIntegracionHv ? (
                  <DetalleDispositivoHV />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "editar-dispositivo/:id",
              element:
                esAdmin && habilitarIntegracionHv ? (
                  <EditarDispositivoHV />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "*",
              element: <Unknown />,
            },
          ],
        },
      ],
    },
    {
      path: "/manual-usuario",
      element: usuarioSistema ? <ManualUsuario /> : <Unauthorized />,
    },
    {
      path: "/videotutoriales",
      element: usuarioSistema || esVisit ? <Tutoriales /> : <Unauthorized />,
    },
    {
      path: "/configuracion",
      children: [
        {
          path: "",
          element: esAdmin ? <Configuracion /> : <Unauthorized />,
        },
      ],
    },
    {
      path: "*",
      element: <Unknown />,
    },
  ]);
}
