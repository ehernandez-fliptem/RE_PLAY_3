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
import NuevoDispositivoBiostar from "./catalogos/dispositivos/NuevoDispositivoBiostar";
import DetalleDispositivoBiostar from "./catalogos/dispositivos/DetalleDispositivoBiostar";
import EditarDispositivoBiostar from "./catalogos/dispositivos/EditarDispositivoBiostar";
import DispositivosBiostarRemotos from "./catalogos/dispositivos/DispositivosBiostarRemotos";
import BiostararGrupos from "./catalogos/dispositivos/BiostararGrupos";
import BiostararGruposDispositivos from "./catalogos/dispositivos/BiostararGruposDispositivos";
import BiostararPuertas from "./catalogos/dispositivos/BiostararPuertas";
import BiostararPuertasAcceso from "./catalogos/dispositivos/BiostararPuertasAcceso";
import BiostararAccessLevels from "./catalogos/dispositivos/BiostararAccessLevels";
import BiostararHorarios from "./catalogos/dispositivos/BiostararHorarios";
import BiostararPermisosAcceso from "./catalogos/dispositivos/BiostararPermisosAcceso";
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
import EscanerQr from "./controlAcceso/eventos/EscanerQr";
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
import { canViewModule, getMainModuleForRole, mainModulePath } from "../app/utils/permisosRoles";

export default function Routes() {
  const { rol } = useSelector((state: IRootState) => state.auth.data);
  const { habilitarCamaras, habilitarIntegracionHv, habilitarIntegracionBiostar, habilitarContratistas, habilitarRegistroCampo } =
    useSelector(
    (state: IRootState) => state.config.data
  );
  const permisosRoles = useSelector((state: IRootState) => state.config.data.permisos_roles);
  const esSuper = rol.includes(1);
  const esAdmin = rol.includes(2);
  const esAnfitrion = rol.includes(4);
  const esRecep = rol.includes(5);
  const esVisit = rol.includes(10);
  const esContratista = rol.includes(11);
  const esCampo = rol.includes(12);
  const esTablet = rol.includes(13);
  const esRolPersonalizado = rol.some((r) => Number(r) >= 100);
  const puedeAdmin = esSuper || esAdmin;
  const puedeBiostar = (esSuper || esAdmin) && habilitarIntegracionBiostar;
  const puedeKiosco = esSuper || esAdmin || esRecep || esTablet;
  const puedeVisitantes = esSuper || esAdmin || esAnfitrion || esRecep || esTablet;
  const usuarioSistema = esSuper || esAdmin || esAnfitrion || esRecep || esContratista || esCampo || esTablet || esRolPersonalizado;
  const canModule = (modulo: Parameters<typeof canViewModule>[2]) =>
    canViewModule(permisosRoles as any, rol, modulo);
  const canCatalogos = (puedeAdmin || esRolPersonalizado) && canModule("catalogos");
  const canUsuarios = (esSuper || esRolPersonalizado) && canModule("usuarios");
  const canEmpleados = (puedeAdmin || esRolPersonalizado) && canModule("empleados");
  const canVisitantes = (puedeVisitantes || esRolPersonalizado) && canModule("visitantes");
  const canEventos = (puedeKiosco || esRolPersonalizado) && canModule("eventos");
  const canEscaner = (esTablet || esRolPersonalizado) && canModule("escaner_qr");
  const canDirectorio = (puedeAdmin || esRolPersonalizado) && canModule("directorio");
  const canHikvision =
    (esSuper || esRolPersonalizado) && habilitarIntegracionHv && canModule("dispositivos_hikvision");
  const canCamaras = (esSuper || esRolPersonalizado) && habilitarCamaras && canModule("camaras");
  const canBiostar =
    ((puedeBiostar || esRolPersonalizado) && habilitarIntegracionBiostar && canModule("biostar"));
  const canContratistas =
    (puedeAdmin || esRolPersonalizado) && habilitarContratistas && canModule("contratistas");
  const canPortalContratistas =
    (esContratista || esSuper || esRolPersonalizado) && habilitarContratistas && canModule("portal_contratistas");
  const canConfiguracion = (esSuper || esRolPersonalizado) && canModule("configuracion");

  return useRoutes([
    {
      path: "/",
      element: usuarioSistema ? (
        getMainModuleForRole(permisosRoles as any, rol) ? (
          <Navigate
            to={mainModulePath[getMainModuleForRole(permisosRoles as any, rol)] || "/eventos"}
            replace
          />
        ) : esContratista && habilitarContratistas ? (
          <Navigate to="/portal-contratistas/visitantes" replace />
        ) : esCampo && habilitarRegistroCampo ? (
          <Navigate to="/campo" replace />
        ) : esTablet ? (
          <Navigate to="/kiosco" replace />
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
      element: (esSuper || esCampo) && habilitarRegistroCampo && canModule("campo") ? <Campo /> : <Unauthorized />,
    },
    {
      path: "/kiosco",
      element: puedeKiosco && canModule("kiosco") ? <Kiosco /> : <Unauthorized />,
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
          element: canCatalogos ? <Pisos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-piso",
              element: canCatalogos ? <NuevoPiso /> : <Unauthorized />,
            },
            {
              path: "editar-piso/:id",
              element: canCatalogos ? <EditarPiso /> : <Unauthorized />,
            },
            {
              path: "detalle-piso/:id",
              element: canCatalogos ? <DetallePiso /> : <Unauthorized />,
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
          element: canCatalogos ? <Accesos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-acceso",
              element: canCatalogos ? <NuevoAcceso /> : <Unauthorized />,
            },
            {
              path: "editar-acceso/:id",
              element: canCatalogos ? <EditarAcceso /> : <Unauthorized />,
            },
            {
              path: "detalle-acceso/:id",
              element: canCatalogos ? <DetalleAcceso /> : <Unauthorized />,
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
          element: canCatalogos ? <Empresas /> : <Unauthorized />,
          children: [
            {
              path: "nueva-empresa",
              element: canCatalogos ? <NuevaEmpresa /> : <Unauthorized />,
            },
            {
              path: "editar-empresa/:id",
              element: canCatalogos ? <EditarEmpresa /> : <Unauthorized />,
            },
            {
              path: "detalle-empresa/:id",
              element: canCatalogos ? <DetalleEmpresa /> : <Unauthorized />,
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
          element: canContratistas ? <Contratistas /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-contratista",
              element: canContratistas ? <NuevoContratista /> : <Unauthorized />,
            },
            {
              path: "editar-contratista/:id",
              element: canContratistas ? <EditarContratista /> : <Unauthorized />,
            },
            {
              path: "detalle-contratista/:id",
              element: canContratistas ? <DetalleContratista /> : <Unauthorized />,
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
          element: canContratistas ? <ContratistasSolicitudes /> : <Unauthorized />,
          children: [
            {
              path: "detalle/:id",
              element: canContratistas ? <DetalleContratistasSolicitud /> : <Unauthorized />,
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
          element: canPortalContratistas ? <DocumentosContratista /> : <Unauthorized />,
        },
        {
          path: "visitantes",
          element: canPortalContratistas ? <PortalVisitantes /> : <Unauthorized />,
          children: [
            {
              path: "nuevo",
              element: canPortalContratistas ? <NuevoPortalVisitante /> : <Unauthorized />,
            },
            {
              path: "editar/:id",
              element: canPortalContratistas ? <EditarPortalVisitante /> : <Unauthorized />,
            },
            {
              path: "detalle/:id",
              element: canPortalContratistas ? <DetallePortalVisitante /> : <Unauthorized />,
            },
            {
              path: "carga-masiva",
              element: canPortalContratistas ? <CargaVisitantesContratistas /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "solicitudes",
          element: canPortalContratistas ? <PortalSolicitudes /> : <Unauthorized />,
          children: [
            {
              path: "nueva",
              element: canPortalContratistas ? <NuevaPortalSolicitud /> : <Unauthorized />,
            },
            {
              path: "detalle/:id",
              element: canPortalContratistas ? <DetallePortalSolicitud /> : <Unauthorized />,
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
          element: canCatalogos ? <Puestos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-puesto",
              element: canCatalogos ? <NuevoPuesto /> : <Unauthorized />,
            },
            {
              path: "editar-puesto/:id",
              element: canCatalogos ? <EditarPuesto /> : <Unauthorized />,
            },
            {
              path: "detalle-puesto/:id",
              element: canCatalogos ? <DetallePuesto /> : <Unauthorized />,
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
          element: canCatalogos ? <Departamentos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-departamento",
              element: canCatalogos ? <NuevoDepartamento /> : <Unauthorized />,
            },
            {
              path: "editar-departamento/:id",
              element: canCatalogos ? <EditarDepartamento /> : <Unauthorized />,
            },
            {
              path: "detalle-departamento/:id",
              element: canCatalogos ? <DetalleDepartamento /> : <Unauthorized />,
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
          element: canCatalogos ? <Cubiculos /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-cubiculo",
              element: canCatalogos ? <NuevoCubiculo /> : <Unauthorized />,
            },
            {
              path: "editar-cubiculo/:id",
              element: canCatalogos ? <EditarCubiculo /> : <Unauthorized />,
            },
            {
              path: "detalle-cubiculo/:id",
              element: canCatalogos ? <DetalleCubiculo /> : <Unauthorized />,
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
          element: canUsuarios ? <Usuarios /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-usuario",
              element: canUsuarios ? <NuevoUsuario /> : <Unauthorized />,
            },
            {
              path: "editar-usuario/:id",
              element: canUsuarios ? <EditarUsuario /> : <Unauthorized />,
            },
            {
              path: "detalle-usuario/:id",
              element: canUsuarios ? <DetalleUsuario /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "carga-masiva",
          element: canUsuarios ? <CargaUsuarios /> : <Unauthorized />,
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
          element: canEmpleados ? <Empleados /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-empleado",
              element: canEmpleados ? <NuevoEmpleado /> : <Unauthorized />,
            },
            {
              path: "editar-empleado/:id",
              element: canEmpleados ? <EditarEmpleado /> : <Unauthorized />,
            },
            {
              path: "detalle-empleado/:id",
              element: canEmpleados ? <DetalleEmpleado /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "carga-masiva",
          element: canEmpleados ? <CargaEmpleados /> : <Unauthorized />,
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
          element: canCatalogos ? <Pases /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-pase",
              element: canCatalogos ? <NuevoPase /> : <Unauthorized />,
            },
            {
              path: "editar-pase/:id",
              element: canCatalogos ? <EditarPase /> : <Unauthorized />,
            },
            {
              path: "detalle-pase/:id",
              element: canCatalogos ? <DetallePase /> : <Unauthorized />,
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
          element: canVisitantes ? <Visitantes /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-visitante",
              element: canVisitantes ? <NuevoVisitante /> : <Unauthorized />,
            },
            {
              path: "editar-visitante/:id",
              element: canVisitantes ? <EditarVisitante /> : <Unauthorized />,
            },
            {
              path: "detalle-visitante/:id",
              element: canVisitantes ? <DetalleVisitante /> : <Unauthorized />,
            },
            {
              path: "verificar-visitante/:id",
              element: canVisitantes ? <VerificarVisitante /> : <Unauthorized />,
            },
          ],
        },
        {
          path: "carga-masiva",
          element: canVisitantes ? <CargaVisitantes /> : <Unauthorized />,
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
          element: canVisitantes ? <ValidarDocumentos /> : <Unauthorized />,
          children: [
            {
              path: "editar-documento/:id",
              element: canVisitantes ? <EditarDocumento /> : <Unauthorized />,
            },
            {
              path: "detalle-documento/:id",
              element: canVisitantes ? <DetalleDocumento /> : <Unauthorized />,
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
          element: canVisitantes ? (
            <Bitacora />
          ) : esVisit ? (
            <BitacoraVisit />
          ) : (
            <Unauthorized />
          ),
          children: [
            {
              path: "nuevo-registro",
              element: canVisitantes ? <NuevoRegistro /> : <Unauthorized />,
            },
            {
              path: "enviar-liga-cita",
              element: canVisitantes ? (
                <EnviarCorreoVisit />
              ) : (
                <Unauthorized />
              ),
            },
            {
              path: "permitir-entrada/:id",
              element: canVisitantes ? <EditarRegistro /> : <Unauthorized />,
            },
            {
              path: "editar-registro/:id",
              element: canVisitantes ? <EditarRegistro /> : <Unauthorized />,
            },
            {
              path: "detalle-registro/:id",
              element:
                canVisitantes || esVisit ? (
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
            canEventos ? (
              <Eventos />
            ) : (
              <Unauthorized />
            ),
          children: [
            {
              path: "detalle-evento/:id",
              element:
                canEventos ? (
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
            canEventos ? (
              <ReporteHoras />
            ) : (
              <Unauthorized />
            ),
          children: [
            {
              path: "detalle-reporte/:id",
              element:
                canEventos ? (
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
      element: canVisitantes ? <Reportes /> : <Unauthorized />,
    },
    {
      path: "/directorio/*",
      element: canDirectorio ? <Directorio /> : <Unauthorized />,
    },
    {
      path: "/camaras/*",
      children: [
        {
          path: "",
          element:
            canCamaras ? (
              <Camaras />
            ) : (
              <Unauthorized />
            ),
          children: [
            {
              path: "nueva-camara",
              element:
                canCamaras ? (
                  <NuevaCamara />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "detalle-camara/:id",
              element:
                canCamaras ? (
                  <DetalleCamara />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "editar-camara/:id",
              element:
                canCamaras ? (
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
            canHikvision ? (
              <DispositivosHV />
            ) : (
              <Unauthorized />
            ), //&& habilitarIntegracionHv
          children: [
            {
              path: "nuevo-dispositivo",
              element:
                canHikvision ? (
                  <NuevoDispositivoHV />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "detalle-dispositivo/:id",
              element:
                canHikvision ? (
                  <DetalleDispositivoHV />
                ) : (
                  <Unauthorized />
                ),
            },
            {
              path: "editar-dispositivo/:id",
              element:
                canHikvision ? (
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
      path: "/biostarar/conexion/*",
      children: [
        {
          path: "",
          element: canBiostar ? <DispositivosBiostar /> : <Unauthorized />,
          children: [
            {
              path: "nuevo-dispositivo",
              element: canBiostar ? <NuevoDispositivoBiostar /> : <Unauthorized />,
            },
            {
              path: "detalle-dispositivo/:id",
              element: canBiostar ? <DetalleDispositivoBiostar /> : <Unauthorized />,
            },
            {
              path: "editar-dispositivo/:id",
              element: canBiostar ? <EditarDispositivoBiostar /> : <Unauthorized />,
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
      path: "/escaner-qr",
      element: canEscaner ? <EscanerQr /> : <Unauthorized />,
    },
    {
      path: "/biostarar/dispositivos",
      element: canBiostar ? <DispositivosBiostarRemotos /> : <Unauthorized />,
    },
    {
      path: "/biostarar/grupos",
      element: canBiostar ? <BiostararGrupos /> : <Unauthorized />,
    },
    {
      path: "/biostarar/grupos-dispositivos",
      element: canBiostar ? <BiostararGruposDispositivos /> : <Unauthorized />,
    },
    {
      path: "/biostarar/puertas",
      element: canBiostar ? <BiostararPuertas /> : <Unauthorized />,
    },
    {
      path: "/biostarar/puertas-acceso",
      element: canBiostar ? <BiostararPuertasAcceso /> : <Unauthorized />,
    },
    {
      path: "/biostarar/access-levels",
      element: canBiostar ? <BiostararAccessLevels /> : <Unauthorized />,
    },
    {
      path: "/biostarar/horarios",
      element: canBiostar ? <BiostararHorarios /> : <Unauthorized />,
    },
    {
      path: "/biostarar/permisos-acceso",
      element: canBiostar ? <BiostararPermisosAcceso /> : <Unauthorized />,
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
          element: canConfiguracion ? <Configuracion /> : <Unauthorized />,
        },
      ],
    },
    {
      path: "*",
      element: <Unknown />,
    },
  ]);
}















