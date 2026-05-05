import { useRoutes, Navigate } from "react-router-dom";
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
import Empleados from "./catalogos/empleados/Empleados";
import NuevoEmpleado from "./catalogos/empleados/NuevoEmpleado";
import EditarEmpleado from "./catalogos/empleados/EditarEmpleado";
import DetalleEmpleado from "./catalogos/empleados/DetalleEmpleado";
import CargaEmpleados from "./catalogos/empleados/CargaEmpleados";
import DispositivosHV from "./catalogos/dispositivos/DispositivosHV";
import NuevoDispositivoHV from "./catalogos/dispositivos/NuevoDispositivoHV";
import DetalleDispositivoHV from "./catalogos/dispositivos/DetalleDispositivoHV";
import EditarDispositivoHV from "./catalogos/dispositivos/EditarDispositivoHV";
import DispositivosBiostar from "./catalogos/dispositivos/DispositivosBiostar";
import BiostararConexion from "./catalogos/dispositivos/BiostararConexion";
import NuevoDispositivoBiostar from "./catalogos/dispositivos/NuevoDispositivoBiostar";
import DetalleDispositivoBiostar from "./catalogos/dispositivos/DetalleDispositivoBiostar";
import EditarDispositivoBiostar from "./catalogos/dispositivos/EditarDispositivoBiostar";
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
import VerificarVisitante from "./recepcion/visitantes/VerificarVisitante";
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
import Contratistas from "./contratistas/Contratistas";
import NuevoContratista from "./contratistas/NuevoContratista";
import EditarContratista from "./contratistas/EditarContratista";
import DetalleContratista from "./contratistas/DetalleContratista";
import ContratistasSolicitudes from "./contratistas/solicitudes/ContratistasSolicitudes";
import DetalleContratistasSolicitud from "./contratistas/solicitudes/DetalleContratistasSolicitud";
import PortalVisitantes from "./contratistas/portal/Visitantes";
import NuevoPortalVisitante from "./contratistas/portal/NuevoVisitante";
import EditarPortalVisitante from "./contratistas/portal/EditarVisitante";
import DetallePortalVisitante from "./contratistas/portal/DetalleVisitante";
import CargaVisitantesContratistas from "./contratistas/portal/CargaVisitantes";
import PortalSolicitudes from "./contratistas/portal/Solicitudes";
import NuevaPortalSolicitud from "./contratistas/portal/NuevaSolicitud";
import DetallePortalSolicitud from "./contratistas/portal/DetalleSolicitud";
import DocumentosContratista from "./contratistas/portal/DocumentosContratista";

import Kiosco from "./kiosco/Kiosco";
import Bot from "./controlAcceso/bot/Bot";
import Camaras from "./catalogos/camaras/Camaras";
import NuevaCamara from "./catalogos/camaras/NuevaCamara";
import DetalleCamara from "./catalogos/camaras/DetalleCamara";
import EditarCamara from "./catalogos/camaras/EditarCamara";
import Campo from "./campo/Campo";

export default function Routes() {
  const { rol } = useSelector((state: IRootState) => state.auth.data);
  const { habilitarCamaras, habilitarIntegracionHv, habilitarIntegracionBiostar, habilitarContratistas, habilitarRegistroCampo } =
    useSelector(
    (state: IRootState) => state.config.data
  );
  const esSuper = rol.includes(1);
  const esAdmin = rol.includes(2);
  const esAnfitrion = rol.includes(4);
  const esRecep = rol.includes(5);
  const esVisit = rol.includes(10);
  const esContratista = rol.includes(11);
  const esCampo = rol.includes(12);
  const puedeAdmin = esSuper || esAdmin;
  const puedeKiosco = esSuper || esAdmin || esRecep;
  const puedeVisitantes = esSuper || esAdmin || esAnfitrion || esRecep;
  const usuarioSistema = esSuper || esAdmin || esAnfitrion || esRecep || esContratista || esCampo;

  return useRoutes([
    {
      path: "/",
      element: usuarioSistema ? (
        esContratista && habilitarContratistas ? (
          <Navigate to="/portal-contratistas/visitantes" replace />
        ) : esCampo && habilitarRegistroCampo ? (
          <Navigate to="/campo" replace />
        ) : (
          <Dashboard />
        )
      ) : (
        <Unauthorized />
      ),
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
      element: puedeAdmin ? <Check /> : <Unauthorized />,
    },
    {
      path: "/campo",
      element: (esSuper || esCampo) && habilitarRegistroCampo ? <Campo /> : <Unauthorized />,
    },
    {
      path: "/kiosco",
      element: puedeKiosco ? <Kiosco /> : <Unauthorized />,
    },
    {
      path: "/bot",
      element: puedeAdmin ? <Bot /> : <Unauthorized />,
    },
    {
      path: "/pisos",
      children: [
        {
          path: "documentos",
          element:
            (esContratista || esSuper) && habilitarContratistas ? (
              <DocumentosContratista />
            ) : (
              <Unauthorized />
            ),
        },
        {
          path: "",
          element: puedeAdmin ? <Pisos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-piso",
              element: puedeAdmin ? <NuevoPiso /> : <Unauthorized />,
            },
            {
              path: "editar-piso/:id",
              element: puedeAdmin ? <EditarPiso /> : <Unauthorized />,
            },
            {
              path: "detalle-piso/:id",
              element: puedeAdmin ? <DetallePiso /> : <Unauthorized />,
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
          element: puedeAdmin ? <Accesos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-acceso",
              element: puedeAdmin ? <NuevoAcceso /> : <Unauthorized />,
            },
            {
              path: "editar-acceso/:id",
              element: puedeAdmin ? <EditarAcceso /> : <Unauthorized />,
            },
            {
              path: "detalle-acceso/:id",
              element: puedeAdmin ? <DetalleAcceso /> : <Unauthorized />,
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
          element: puedeAdmin ? <Empresas /> : <Unauthorized />,
          children: [
            {
              path: "nueva-empresa",
              element: puedeAdmin ? <NuevaEmpresa /> : <Unauthorized />,
            },
            {
              path: "editar-empresa/:id",
              element: puedeAdmin ? <EditarEmpresa /> : <Unauthorized />,
            },
            {
              path: "detalle-empresa/:id",
              element: puedeAdmin ? <DetalleEmpresa /> : <Unauthorized />,
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
      path: "/contratistas",
      children: [
        {
          path: "",
          element: puedeAdmin && habilitarContratistas ? <Contratistas /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-contratista",
              element: puedeAdmin && habilitarContratistas ? <NuevoContratista /> : <Unauthorized />,
            },
            {
              path: "editar-contratista/:id",
              element: puedeAdmin && habilitarContratistas ? <EditarContratista /> : <Unauthorized />,
            },
            {
              path: "detalle-contratista/:id",
              element: puedeAdmin && habilitarContratistas ? <DetalleContratista /> : <Unauthorized />,
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
      path: "/contratistas/solicitudes",
      children: [
        {
          path: "",
          element: puedeAdmin && habilitarContratistas ? <ContratistasSolicitudes /> : <Unauthorized />,
          children: [
            {
              path: "detalle/:id",
              element:
                puedeAdmin && habilitarContratistas ? <DetalleContratistasSolicitud /> : <Unauthorized />,
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
      path: "/portal-contratistas",
      children: [
        {
          path: "documentos",
          element:
            (esContratista || esSuper) && habilitarContratistas ? (
              <DocumentosContratista />
            ) : (
              <Unauthorized />
            ),
        },
        {
          path: "visitantes",
          element:
            (esContratista || esSuper) && habilitarContratistas ? (
              <PortalVisitantes />
            ) : (
              <Unauthorized />
            ),
          children: [
            {
              path: "nuevo",
              element:
                (esContratista || esSuper) && habilitarContratistas ? (
                  <NuevoPortalVisitante />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "editar/:id",
              element:
                (esContratista || esSuper) && habilitarContratistas ? (
                  <EditarPortalVisitante />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "detalle/:id",
              element:
                (esContratista || esSuper) && habilitarContratistas ? (
                  <DetallePortalVisitante />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "carga-masiva",
              element:
                (esContratista || esSuper) && habilitarContratistas ? (
                  <CargaVisitantesContratistas />
                ) : (
                  <Unauthorized />
                ),
            },
          ],
        },
        {
          path: "solicitudes",
          element:
            (esContratista || esSuper) && habilitarContratistas ? (
              <PortalSolicitudes />
            ) : (
              <Unauthorized />
            ),
          children: [
            {
              path: "nueva",
              element:
                (esContratista || esSuper) && habilitarContratistas ? (
                  <NuevaPortalSolicitud />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "detalle/:id",
              element:
                (esContratista || esSuper) && habilitarContratistas ? (
                  <DetallePortalSolicitud />
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
      path: "/puestos",
      children: [
        {
          path: "",
          element: puedeAdmin ? <Puestos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-puesto",
              element: puedeAdmin ? <NuevoPuesto /> : <Unauthorized />,
            },
            {
              path: "editar-puesto/:id",
              element: puedeAdmin ? <EditarPuesto /> : <Unauthorized />,
            },
            {
              path: "detalle-puesto/:id",
              element: puedeAdmin ? <DetallePuesto /> : <Unauthorized />,
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
          element: puedeAdmin ? <Departamentos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-departamento",
              element: puedeAdmin ? <NuevoDepartamento /> : <Unauthorized />,
            },
            {
              path: "editar-departamento/:id",
              element: puedeAdmin ? <EditarDepartamento /> : <Unauthorized />,
            },
            {
              path: "detalle-departamento/:id",
              element: puedeAdmin ? <DetalleDepartamento /> : <Unauthorized />,
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
          element: puedeAdmin ? <Cubiculos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-cubiculo",
              element: puedeAdmin ? <NuevoCubiculo /> : <Unauthorized />,
            },
            {
              path: "editar-cubiculo/:id",
              element: puedeAdmin ? <EditarCubiculo /> : <Unauthorized />,
            },
            {
              path: "detalle-cubiculo/:id",
              element: puedeAdmin ? <DetalleCubiculo /> : <Unauthorized />,
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
          element: esSuper ? <Usuarios /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-usuario",
              element: esSuper ? <NuevoUsuario /> : <Unauthorized />,
            },
            {
              path: "editar-usuario/:id",
              element: esSuper ? <EditarUsuario /> : <Unauthorized />,
            },
            {
              path: "detalle-usuario/:id",
              element: esSuper ? <DetalleUsuario /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "carga-masiva",
          element: esSuper ? <CargaUsuarios /> : <Unauthorized />,
        },
        {
          path: "*",
          element: <Unknown />,
        },
      ],
    },
    {
      path: "/empleados/*",
      children: [
        {
          path: "",
          element: puedeAdmin ? <Empleados /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-empleado",
              element: puedeAdmin ? <NuevoEmpleado /> : <Unauthorized />,
            },
            {
              path: "editar-empleado/:id",
              element: puedeAdmin ? <EditarEmpleado /> : <Unauthorized />,
            },
            {
              path: "detalle-empleado/:id",
              element: puedeAdmin ? <DetalleEmpleado /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "carga-masiva",
          element: puedeAdmin ? <CargaEmpleados /> : <Unauthorized />,
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
          element: puedeAdmin ? <Pases /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-pase",
              element: puedeAdmin ? <NuevoPase /> : <Unauthorized />,
            },
            {
              path: "editar-pase/:id",
              element: puedeAdmin ? <EditarPase /> : <Unauthorized />,
            },
            {
              path: "detalle-pase/:id",
              element: puedeAdmin ? <DetallePase /> : <Unauthorized />,
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
          element: puedeVisitantes ? <Visitantes /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-visitante",
              element: puedeVisitantes ? <NuevoVisitante /> : <Unauthorized />,
            },
            {
              path: "editar-visitante/:id",
              element: puedeVisitantes ? <EditarVisitante /> : <Unauthorized />,
            },
            {
              path: "detalle-visitante/:id",
              element: puedeVisitantes ? <DetalleVisitante /> : <Unauthorized />,
            },
            {
              path: "verificar-visitante/:id",
              element: puedeVisitantes ? <VerificarVisitante /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "carga-masiva",
          element: puedeAdmin ? <CargaVisitantes /> : <Unauthorized />,
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
          element: puedeAdmin ? <ValidarDocumentos /> : <Unauthorized />,
          children: [
            {
              path: "editar-documento/:id",
              element: puedeAdmin ? <EditarDocumento /> : <Unauthorized />,
            },
            {
              path: "detalle-documento/:id",
              element: puedeAdmin ? <DetalleDocumento /> : <Unauthorized />,
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
          element: esVisit || puedeAdmin ? <Documentos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-documento",
              element: esVisit || puedeAdmin ? <NuevoDocumento /> : <Unauthorized />,
            },
            {
              path: "detalle-documento/:id",
              element:
                esVisit || puedeAdmin ? <DetalleDocumento /> : <Unauthorized />,
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
          element: puedeAdmin ? (
            <Bitacora />
          ) : esVisit ? (
            <BitacoraVisit />
          ) : (
            <Unauthorized />
          ),
          children: [
            {
              path: "nuevo-registro",
              element: puedeAdmin ? <NuevoRegistro /> : <Unauthorized />,
            },
            {
              path: "enviar-liga-cita",
              element: puedeAdmin ? (
                <EnviarCorreoVisit />
              ) : (
                <Unauthorized />
              ),
            },
            {
              path: "permitir-entrada/:id",
              element: puedeAdmin ? <EditarRegistro /> : <Unauthorized />,
            },
            {
              path: "editar-registro/:id",
              element: puedeAdmin ? <EditarRegistro /> : <Unauthorized />,
            },
            {
              path: "detalle-registro/:id",
              element:
                puedeAdmin || esVisit ? (
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
            puedeKiosco ? (
              <Eventos />
            ) : (
              <Unauthorized />
            ),
          children: [
            {
              path: "detalle-evento/:id",
              element:
                puedeKiosco ? (
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
    //       element: puedeAdmin ? <Horarios /> : <Unauthorized />,
    //       children: [
    //         {
    //           path: "nuevo-horario",
    //           element: puedeAdmin ? <NuevoHorario /> : <Unauthorized />,
    //         },
    //         {
    //           path: "editar-horario/:id",
    //           element:
    //             puedeAdmin ? <EditarHorario /> : <Unauthorized />,
    //         },
    //         {
    //           path: "detalle-horario/:id",
    //           element:
    //             puedeAdmin ? <DetalleHorario /> : <Unauthorized />,
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
    //       element: puedeAdmin ? <Asignaciones /> : <Unauthorized />,
    //       children: [
    //         {
    //           path: "nueva-asignacion",
    //           element:
    //             puedeAdmin ? <NuevaAsignacion /> : <Unauthorized />,
    //         },
    //         {
    //           path: "editar-asignacion/:id",
    //           element:
    //             puedeAdmin ? <EditarAsignacion /> : <Unauthorized />,
    //         },
    //         {
    //           path: "detalle-asignacion/:id",
    //           element:
    //             puedeAdmin ? <DetalleAsignacion /> : <Unauthorized />,
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
            puedeKiosco ? (
              <ReporteHoras />
            ) : (
              <Unauthorized />
            ),
          children: [
            {
              path: "detalle-reporte/:id",
              element:
                puedeKiosco ? (
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
      element: puedeAdmin ? <Reportes /> : <Unauthorized />,
    },
    {
      path: "/directorio/*",
      element: puedeAdmin ? <Directorio /> : <Unauthorized />,
    },
    {
      path: "/camaras/*",
      children: [
        {
          path: "",
          element:
            esSuper && habilitarCamaras ? (
              <Camaras />
            ) : (
              <Unauthorized />
            ),
          children: [
            {
              path: "nueva-camara",
              element:
                esSuper && habilitarCamaras ? (
                  <NuevaCamara />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "detalle-camara/:id",
              element:
                esSuper && habilitarCamaras ? (
                  <DetalleCamara />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "editar-camara/:id",
              element:
                esSuper && habilitarCamaras ? (
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
            esSuper && habilitarIntegracionHv ? (
              <DispositivosHV />
            ) : (
              <Unauthorized />
            ), //&& habilitarIntegracionHv
          children: [
            {
              path: "nuevo-dispositivo",
              element:
                esSuper && habilitarIntegracionHv ? (
                  <NuevoDispositivoHV />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "detalle-dispositivo/:id",
              element:
                esSuper && habilitarIntegracionHv ? (
                  <DetalleDispositivoHV />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "editar-dispositivo/:id",
              element:
                esSuper && habilitarIntegracionHv ? (
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
      path: "/dispositivos-biostar/*",
      element: <Navigate to="/biostarar/dispositivos" replace />,
    },
    {
      path: "/biostarar/conexion",
      element:
        esSuper && habilitarIntegracionBiostar ? (
          <BiostararConexion />
        ) : (
          <Unauthorized />
        ),
    },
    {
      path: "/biostarar/dispositivos/*",
      children: [
        {
          path: "",
          element:
            esSuper && habilitarIntegracionBiostar ? (
              <DispositivosBiostar />
            ) : (
              <Unauthorized />
            ),
          children: [
            {
              path: "nuevo-dispositivo",
              element:
                esSuper && habilitarIntegracionBiostar ? (
                  <NuevoDispositivoBiostar />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "detalle-dispositivo/:id",
              element:
                esSuper && habilitarIntegracionBiostar ? (
                  <DetalleDispositivoBiostar />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "editar-dispositivo/:id",
              element:
                esSuper && habilitarIntegracionBiostar ? (
                  <EditarDispositivoBiostar />
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
          element: esSuper ? <Configuracion /> : <Unauthorized />,
        },
      ],
    },
    {
      path: "*",
      element: <Unknown />,
    },
  ]);
}















