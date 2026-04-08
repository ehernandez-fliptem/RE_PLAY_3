import { useState, useMemo, Fragment, useEffect, useRef } from "react";
import {
  DataGrid,
  useGridApiRef,
  type GridInitialState,
  type GridDataSource,
  GridGetRowsError,
  type GridValidRowModel,
  GridActionsCellItem,
} from "@mui/x-data-grid";
import { clienteAxios, handlingError } from "../../app/config/axios";
import { Outlet, useNavigate } from "react-router-dom";
import { esES } from "@mui/x-data-grid/locales";
import DataGridToolbar from "../utils/DataGridToolbar";
import {
  Add,
  Delete,
  Edit,
  PeopleAlt,
  Refresh,
  RestoreFromTrash,
  Verified,
  Visibility,
} from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  IconButton as MuiIconButton,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useConfirm } from "material-ui-confirm";
import ErrorOverlay from "../error/DataGridError";
import { AxiosError } from "axios";
import Modal from "@mui/material/Modal";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Spinner from "../utils/Spinner";
import { useSelector } from "react-redux";
import { selectCurrentData } from "../../app/features/config/configSlice";

const pageSizeOptions = [10, 25, 50];

type TContratistaSeleccion = {
  id: string;
  empresa: string;
};

const DOC_LABELS: Record<string, string> = {
  identificacion_oficial: "Identificación oficial",
  sua: "SUA",
  permiso_entrada: "Permiso de entrada",
  lista_articulos: "Lista de artículos",
  repse: "REPSE",
  soporte_pago_actualizado: "Soporte de pago actualizado",
  constancia_vigencia_imss: "Constancia de vigencia IMSS",
  constancias_habilidades: "Constancias de habilidades",
};

const DOC_KEYS = [
  "identificacion_oficial",
  "sua",
  "permiso_entrada",
  "lista_articulos",
  "repse",
  "soporte_pago_actualizado",
  "constancia_vigencia_imss",
  "constancias_habilidades",
];

const REQUIRED_DOC_KEYS = [
  "identificacion_oficial",
  "sua",
  "permiso_entrada",
  "lista_articulos",
  "repse",
  "soporte_pago_actualizado",
];

const OPTIONAL_DOC_KEYS = ["constancia_vigencia_imss", "constancias_habilidades"];

const areDocsComplete = (
  requiredKeys: string[],
  value?: Record<string, boolean> | null
) => requiredKeys.every((key) => Boolean(value?.[key]));

const getEstadoLabel = (estado?: number) => {
  if (estado === 2) return { label: "Verificado", color: "success" as const };
  if (estado === 3) return { label: "Rechazado", color: "error" as const };
  return { label: "Pendiente", color: "warning" as const };
};
const createChecks = (keys: string[]) =>
  keys.reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = false;
    return acc;
  }, {});

export default function Contratistas() {
  const apiRef = useGridApiRef();
  const apiRefVisitantes = useGridApiRef();
  const [error, setError] = useState<string>();
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showVisitantes, setShowVisitantes] = useState(false);
  const [contratistaDocs, setContratistaDocs] = useState<any | null>(null);
  const [isLoadingContratistaDocs, setIsLoadingContratistaDocs] = useState(false);
  const [contratistaInfo, setContratistaInfo] = useState<GridValidRowModel | null>(
    null
  );
  const [contratistaSeleccion, setContratistaSeleccion] =
    useState<TContratistaSeleccion | null>(null);
  const [visitantesError, setVisitantesError] = useState<string>();
  const [selectedVisitanteId, setSelectedVisitanteId] = useState<string | null>(
    null
  );
  const [selectedVisitante, setSelectedVisitante] =
    useState<GridValidRowModel | null>(null);
  const [showDetalleVisitante, setShowDetalleVisitante] = useState(false);
  const [showVerificarVisitante, setShowVerificarVisitante] = useState(false);
  const [showRevertirVisitante, setShowRevertirVisitante] = useState(false);
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);
  const [isLoadingVerificar, setIsLoadingVerificar] = useState(false);
  const [isLoadingRevertir, setIsLoadingRevertir] = useState(false);
  const [showVerificarContratista, setShowVerificarContratista] = useState(false);
  const [showRevertirContratista, setShowRevertirContratista] = useState(false);
  const [showMotivoRechazoContratista, setShowMotivoRechazoContratista] =
    useState(false);
  const [motivoRechazoContratista, setMotivoRechazoContratista] = useState("");
  const [isLoadingVerificarContratista, setIsLoadingVerificarContratista] =
    useState(false);
  const [isLoadingRevertirContratista, setIsLoadingRevertirContratista] =
    useState(false);
  const [isEnviandoRechazoContratista, setIsEnviandoRechazoContratista] =
    useState(false);
  const [verifChecksContratista, setVerifChecksContratista] = useState<
    Record<string, boolean>
  >({});
  const [expandedDocKeyContratista, setExpandedDocKeyContratista] = useState<
    string | false
  >(false);
  const [verifChecks, setVerifChecks] = useState<Record<string, boolean>>({});
  const [showMotivoRechazo, setShowMotivoRechazo] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [isEnviandoRechazo, setIsEnviandoRechazo] = useState(false);
  const [expandedDocKey, setExpandedDocKey] = useState<string | false>(false);
  const [expandedDocKeyDetalle, setExpandedDocKeyDetalle] = useState<
    string | false
  >(false);
  const [filtroDocs, setFiltroDocs] = useState<
    "todos" | "pendientes_completos" | "pendientes_incompletos"
  >("todos");
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const verifScrollRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const config = useSelector(selectCurrentData);
  const docsVisitantes = config?.documentos_visitantes || {};
  const docsContratistasConfig = config?.documentos_contratistas || {};
  const enabledDocKeys = DOC_KEYS.filter((key) => docsVisitantes[key] !== false);
  const requiredDocKeys = REQUIRED_DOC_KEYS.filter(
    (key) => docsVisitantes[key] !== false
  );
  const optionalDocKeys = OPTIONAL_DOC_KEYS.filter(
    (key) => docsVisitantes[key] !== false
  );
  const enabledContratistaDocKeys = DOC_KEYS.filter(
    (key) => docsContratistasConfig[key] !== false
  );
  const requiredContratistaDocKeys = REQUIRED_DOC_KEYS.filter(
    (key) => docsContratistasConfig[key] !== false
  );
  const optionalContratistaDocKeys = OPTIONAL_DOC_KEYS.filter(
    (key) => docsContratistasConfig[key] !== false
  );
  const documentosContratistas = enabledDocKeys.map((key) => ({
    key,
    label: DOC_LABELS[key],
  }));
  const documentosOpcionales = optionalDocKeys.map((key) => ({
    key,
    label: DOC_LABELS[key],
  }));
  const documentosContratistaAdmin = enabledContratistaDocKeys.map((key) => ({
    key,
    label: DOC_LABELS[key],
  }));
  const documentosContratistaAdminOpcionales = optionalContratistaDocKeys.map(
    (key) => ({
      key,
      label: DOC_LABELS[key],
    })
  );

  useEffect(() => {
    const interval = setInterval(() => {
      apiRef.current?.dataSource?.fetchRows?.();
      if (showVisitantes) {
        apiRefVisitantes.current?.dataSource?.fetchRows?.();
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [apiRef, apiRefVisitantes, showVisitantes]);

  const dataSource: GridDataSource = useMemo(
    () => ({
      getRows: async (params) => {
        let rows: GridValidRowModel[] = [];
        let rowCount: number = 0;
        try {
          const urlParams = new URLSearchParams({
            filter: JSON.stringify(params.filterModel.quickFilterValues),
            pagination: JSON.stringify(params.paginationModel),
            sort: JSON.stringify(params.sortModel),
          });
          const res = await clienteAxios.get(
            "/api/contratistas?" + urlParams.toString()
          );
          if (res.data.estado) {
            setError("");
            rows = res.data.datos.paginatedResults || [];
            rowCount = res.data.datos.totalCount[0]?.count || 0;
          }
        } catch (error) {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
          throw error;
        }

        return {
          rows,
          rowCount,
        };
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const dataSourceVisitantes: GridDataSource = useMemo(
    () => ({
      getRows: async (params) => {
        if (!contratistaSeleccion?.id) {
          return { rows: [], rowCount: 0 };
        }
        let rows: GridValidRowModel[] = [];
        let rowCount: number = 0;
        try {
          const urlParams = new URLSearchParams({
            filter: JSON.stringify(params.filterModel.quickFilterValues),
            pagination: JSON.stringify(params.paginationModel),
            sort: JSON.stringify(params.sortModel),
            contratista: contratistaSeleccion.id,
          });
          if (filtroDocs === "pendientes_completos") {
            urlParams.set("docs_estado", "completo");
            urlParams.set("solo_pendientes", "1");
          }
          if (filtroDocs === "pendientes_incompletos") {
            urlParams.set("docs_estado", "incompleto");
            urlParams.set("solo_pendientes", "1");
          }
          const res = await clienteAxios.get(
            "/api/contratistas-visitantes?" + urlParams.toString()
          );
          if (res.data.estado) {
            setVisitantesError("");
            rows = res.data.datos.paginatedResults || [];
            rowCount = res.data.datos.totalCount[0]?.count || 0;
          }
        } catch (error) {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
          throw error;
        }

        if (contratistaSeleccion?.id) {
          const contratistaRow: GridValidRowModel = {
            _id: `contratista-${contratistaSeleccion.id}`,
            __isContratista: true,
            nombre_completo: contratistaSeleccion.empresa || "Contratista",
            correo: contratistaInfo?.correo || "",
            telefono: contratistaInfo?.telefono || "",
            estado_validacion: contratistaDocs?.estado_validacion,
            empresa: contratistaSeleccion.empresa,
          };
          rows = [contratistaRow, ...rows];
          rowCount += 1;
        }

        return {
          rows,
          rowCount,
        };
      },
    }),
    [
      contratistaSeleccion?.id,
      contratistaSeleccion?.empresa,
      contratistaDocs?.estado_validacion,
      contratistaInfo?.correo,
      contratistaInfo?.telefono,
      filtroDocs,
      navigate,
    ]
  );

  const initialState: GridInitialState = useMemo(
    () => ({
      pagination: {
        paginationModel: {
          pageSize: 10,
        },
        rowCount: 0,
      },
    }),
    []
  );

  const nuevoRegistro = () => {
    navigate("nuevo-contratista");
  };

  const editarRegistro = (ID: string) => {
    navigate(`editar-contratista/${ID}`);
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle-contratista/${ID}`);
  };

  const cargarContratistaDocs = async (id: string) => {
    setIsLoadingContratistaDocs(true);
    try {
      const res = await clienteAxios.get("/api/contratistas-documentos", {
        params: { contratista: id },
      });
      if (res.data.estado) {
        setContratistaDocs(res.data.datos || null);
      } else {
        setContratistaDocs(null);
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
      setContratistaDocs(null);
    } finally {
      setIsLoadingContratistaDocs(false);
    }
  };
  const abrirVisitantes = (row?: GridValidRowModel | null) => {
    if (!row?._id || !row?.empresa) return;
    setContratistaSeleccion({ id: String(row._id), empresa: String(row.empresa) });
    setContratistaInfo(row);
    setShowVisitantes(true);
    cargarContratistaDocs(String(row._id));
  };

  const cerrarVisitantes = () => {
    setShowVisitantes(false);
    setSelectedVisitanteId(null);
    setSelectedVisitante(null);
    setShowDetalleVisitante(false);
    setShowVerificarVisitante(false);
    setShowVerificarContratista(false);
    setContratistaDocs(null);
    setContratistaInfo(null);
    setShowRevertirVisitante(false);
    setShowRevertirContratista(false);
  };

  const cambiarEstado = async (ID: string, activo: boolean) => {
    if (!activo) {
      try {
        const res = await clienteAxios.patch(`/api/contratistas/${ID}`, {
          activo,
        });
        if (res.data.estado) {
          apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      }
    } else {
      confirm({
        title: "Seguro que deseas desactivar a este contratista?",
        description: "Esta accion desactiva tambien el usuario manager.",
        allowClose: true,
        confirmationText: "Continuar",
      })
        .then(async (result) => {
          if (result.confirmed) {
            const res = await clienteAxios.patch(`/api/contratistas/${ID}`, {
              activo,
            });
            if (res.data.estado) {
              apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);
            } else {
              enqueueSnackbar(res.data.mensaje, { variant: "warning" });
            }
          }
        })
        .catch((error) => {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
        });
    }
  };

  const abrirDetalleVisitante = (row: GridValidRowModel) => {
    setSelectedVisitanteId(String(row._id || row.id));
    setSelectedVisitante(row);
    setShowDetalleVisitante(true);
    setExpandedDocKeyDetalle(false);
    setShowVisitantes(false);
    cargarVisitanteDetalle(String(row._id || row.id));
  };

  const abrirVerificarVisitante = (row?: GridValidRowModel | null) => {
    const target = row || selectedVisitante;
    if (!target) return;
    if ((target as any)?.__isContratista) {
      abrirVerificarContratista();
      return;
    }
    setSelectedVisitanteId(String(target._id || target.id));
    setSelectedVisitante(target);
    setVerifChecks(createChecks(enabledDocKeys));
    setExpandedDocKey(false);
    setShowVerificarVisitante(true);
    setShowVisitantes(false);
    cargarVisitanteDetalle(String(target._id || target.id), true);
  };

  const abrirRevertirVisitante = (row?: GridValidRowModel | null) => {
    const target = row || selectedVisitante;
    if (!target) return;
    if ((target as any)?.__isContratista) {
      setShowRevertirContratista(true);
      return;
    }
    setSelectedVisitanteId(String(target._id || target.id));
    setSelectedVisitante(target);
    setShowRevertirVisitante(true);
  };

  const abrirVerificarContratista = () => {
    setExpandedDocKeyContratista(false);
    setVerifChecksContratista(createChecks(enabledContratistaDocKeys));
    setShowVerificarContratista(true);
    setShowVisitantes(false);
  };

  const confirmarVerificacionContratista = async () => {
    if (!contratistaDocs?._id) return;
    if (!areDocsComplete(requiredContratistaDocKeys, verifChecksContratista)) {
      await confirm({
        title: "Documentos incompletos",
        description:
          "Para poder verificar al contratista, se deben tener todos los documentos marcados.",
        allowClose: true,
        confirmationText: "Cerrar",
        hideCancelButton: true,
      }).catch(() => {});
      return;
    }

    try {
      const result = await confirm({
        title: "Confirmar verificación",
        description: `Confirma que los documentos de ${contratistaSeleccion?.empresa || "este contratista"} están completos y vigentes?`,
        allowClose: true,
        confirmationText: "Continuar",
      });
      if (!result.confirmed) return;
    } catch {
      return;
    }

    setIsLoadingVerificarContratista(true);
    try {
      const res = await clienteAxios.patch(
        `/api/contratistas-documentos/verificar/${contratistaDocs._id}`,
        { documentos_checks: verifChecksContratista }
      );
      if (res.data.estado) {
        enqueueSnackbar("Contratista verificado.", { variant: "success" });
        setContratistaDocs(res.data.datos || contratistaDocs);
        setSelectedVisitante((prev) =>
          prev && (prev as any).__isContratista
            ? { ...prev, estado_validacion: 2 }
            : prev
        );
        apiRefVisitantes.current?.dataSource?.fetchRows?.();
        setShowVerificarContratista(false);
        setShowVisitantes(true);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsLoadingVerificarContratista(false);
    }
  };

  const solicitarCorreccionContratista = async () => {
    if (!contratistaDocs?._id) return;
    if (areDocsComplete(requiredContratistaDocKeys, verifChecksContratista)) return;
    setMotivoRechazoContratista("");
    setShowMotivoRechazoContratista(true);
  };

  const confirmarRechazoContratista = async () => {
    if (!contratistaDocs?._id) return;
    if (!motivoRechazoContratista.trim()) {
      enqueueSnackbar("El motivo de rechazo es obligatorio.", {
        variant: "warning",
      });
      return;
    }
    setIsEnviandoRechazoContratista(true);
    try {
      const res = await clienteAxios.patch(
        `/api/contratistas-documentos/rechazar/${contratistaDocs._id}`,
        {
          documentos_checks: verifChecksContratista,
          motivo_rechazo: motivoRechazoContratista.trim(),
        }
      );
      if (res.data.estado) {
        enqueueSnackbar("Documentos enviados a corrección.", {
          variant: "success",
        });
        setContratistaDocs(res.data.datos || contratistaDocs);
        setSelectedVisitante((prev) =>
          prev && (prev as any).__isContratista
            ? { ...prev, estado_validacion: 3 }
            : prev
        );
        apiRefVisitantes.current?.dataSource?.fetchRows?.();
        setShowMotivoRechazoContratista(false);
        setShowVerificarContratista(false);
        setShowVisitantes(true);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsEnviandoRechazoContratista(false);
    }
  };

  const confirmarRevertirContratista = async () => {
    if (!contratistaDocs?._id) return;
    setIsLoadingRevertirContratista(true);
    try {
      const res = await clienteAxios.patch(
        `/api/contratistas-documentos/revertir/${contratistaDocs._id}`
      );
      if (res.data.estado) {
        enqueueSnackbar("Verificación revertida.", { variant: "success" });
        setContratistaDocs(res.data.datos || contratistaDocs);
        setSelectedVisitante((prev) =>
          prev && (prev as any).__isContratista
            ? { ...prev, estado_validacion: 1 }
            : prev
        );
        apiRefVisitantes.current?.dataSource?.fetchRows?.();
        setShowRevertirContratista(false);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsLoadingRevertirContratista(false);
    }
  };

  const renderDocPreview = (docUrl?: string, label?: string) => {
    if (!docUrl) {
      return <Typography variant="body2">Sin archivo</Typography>;
    }
    const lower = docUrl.toLowerCase();
    const isPdf =
      lower.endsWith(".pdf") ||
      lower.includes(".pdf?") ||
      lower.startsWith("data:application/pdf");
    if (isPdf) {
      return (
        <Box
          component="iframe"
          src={docUrl}
          title={label || "Documento"}
          sx={{
            width: "100%",
            height: 360,
            borderRadius: 1,
            border: "1px solid #e0e0e0",
          }}
        />
      );
    }
    return (
      <Box
        component="img"
        src={docUrl}
        alt={label}
        sx={{
          maxWidth: "100%",
          maxHeight: 360,
          objectFit: "contain",
          borderRadius: 1,
          border: "1px solid #e0e0e0",
        }}
      />
    );
  };

  const confirmarRevertirVisitante = async () => {
    if (!selectedVisitante?._id) return;
    setIsLoadingRevertir(true);
    try {
      const res = await clienteAxios.patch(
        `/api/contratistas-visitantes/revertir/${selectedVisitante._id}`
      );
      if (res.data.estado) {
        enqueueSnackbar("Verificación revertida.", { variant: "success" });
        setSelectedVisitante((prev) =>
          prev ? { ...prev, estado_validacion: 1 } : prev
        );
        apiRefVisitantes.current?.dataSource?.fetchRows?.();
        setShowRevertirVisitante(false);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsLoadingRevertir(false);
    }
  };

  const cargarVisitanteDetalle = async (
    id: string,
    forVerificar = false
  ) => {
    if (!id) return;
    forVerificar ? setIsLoadingVerificar(true) : setIsLoadingDetalle(true);
    try {
      const res = await clienteAxios.get(`/api/contratistas-visitantes/${id}`);
      if (res.data.estado) {
        setSelectedVisitante(res.data.datos);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      forVerificar ? setIsLoadingVerificar(false) : setIsLoadingDetalle(false);
    }
  };

  const confirmarVerificacion = async () => {
    if (!selectedVisitante) return;
    if (!areDocsComplete(requiredDocKeys, verifChecks)) {
      await confirm({
        title: "Documentos incompletos",
        description:
          "Para poder verificar al visitante, se deben tener todos los documentos marcados.",
        allowClose: true,
        confirmationText: "Cerrar",
        hideCancelButton: true,
      }).catch(() => {});
      return;
    }

    try {
      const result = await confirm({
        title: "Confirmar verificación",
        description: `Confirma que los documentos de ${selectedVisitante?.nombre_completo || selectedVisitante?.correo || "este visitante"} están completos y vigentes?`,
        allowClose: true,
        confirmationText: "Continuar",
      });
      if (!result.confirmed) return;
    } catch {
      return;
    }

    try {
      const res = await clienteAxios.patch(
        `/api/contratistas-visitantes/verificar/${selectedVisitante._id}`,
        { documentos_checks: verifChecks }
      );
      if (res.data.estado) {
        enqueueSnackbar("Visitante verificado.", { variant: "success" });
        setSelectedVisitante((prev) =>
          prev ? { ...prev, estado_validacion: 2 } : prev
        );
        apiRefVisitantes.current?.dataSource?.fetchRows?.();
        setShowVerificarVisitante(false);
            setContratistaDocs(null);
        setShowVisitantes(true);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    }
  };

  const solicitarCorreccion = async () => {
    if (!selectedVisitante) return;
    if (areDocsComplete(requiredDocKeys, verifChecks)) return;
    setMotivoRechazo("");
    setShowMotivoRechazo(true);
  };

  const confirmarRechazo = async () => {
    if (!selectedVisitante) return;
    if (!motivoRechazo.trim()) {
      enqueueSnackbar("El motivo de rechazo es obligatorio.", {
        variant: "warning",
      });
      return;
    }
    setIsEnviandoRechazo(true);
    try {
      const res = await clienteAxios.patch(
        `/api/contratistas-visitantes/rechazar/${selectedVisitante._id}`,
        { documentos_checks: verifChecks, motivo_rechazo: motivoRechazo.trim() }
      );
      if (res.data.estado) {
        enqueueSnackbar("Documentos enviados a corrección.", {
          variant: "success",
        });
        setSelectedVisitante((prev) =>
          prev ? { ...prev, estado_validacion: 3 } : prev
        );
        apiRefVisitantes.current?.dataSource?.fetchRows?.();
        setShowMotivoRechazo(false);
        setShowVerificarVisitante(false);
            setContratistaDocs(null);
        setShowVisitantes(true);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsEnviandoRechazo(false);
    }
  };

  const actualizarScrollVerificar = () => {
    const el = verifScrollRef.current;
    if (!el) {
      setCanScrollUp(false);
      setCanScrollDown(false);
      return;
    }
    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 4);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 4);
  };

  const scrollVerificarArriba = () => {
    const el = verifScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollVerificarAbajo = () => {
    const el = verifScrollRef.current;
    if (!el) return;
    const target = Math.max(0, el.scrollHeight - el.clientHeight);
    el.scrollTo({ top: target, behavior: "auto" });
  };

  useEffect(() => {
    actualizarScrollVerificar();
  }, [showVerificarVisitante, isLoadingVerificar, selectedVisitante, expandedDocKey]);

  const isContratistaSeleccionado = Boolean(
    (selectedVisitante as any)?.__isContratista
  );
  const contratistaPuedeVerificarse = Boolean(contratistaDocs?._id);

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        disableRowSelectionOnClick
        disableMultipleRowSelection
        onCellClick={(params) => {
          setSelectedRowId(String(params.id));
        }}
        onRowDoubleClick={(params) => {
          setSelectedRowId(String(params.id));
          abrirVisitantes(params.row);
        }}
        getRowClassName={(params) =>
          params.id === selectedRowId ? "row-selected" : ""
        }
        columns={[
          {
            headerName: "Empresa",
            field: "empresa",
            flex: 1,
            display: "flex",
            minWidth: 180,
          },
          {
            headerName: "Manager",
            field: "nombre",
            flex: 1,
            display: "flex",
            minWidth: 180,
          },
          {
            headerName: "Correo",
            field: "correo",
            flex: 1,
            display: "flex",
            minWidth: 220,
          },
          {
            headerName: "Correos",
            field: "correos",
            flex: 1,
            display: "flex",
            minWidth: 220,
            valueFormatter: (value: string[]) =>
              Array.isArray(value) ? value.join(", ") : "",
          },
          {
            headerName: "Telefono",
            field: "telefono",
            flex: 1,
            display: "flex",
            minWidth: 140,
          },
          {
            headerName: "Acciones",
            field: "activo",
            type: "actions",
            align: "center",
            flex: 1,
            display: "flex",
            minWidth: 150,
            getActions: ({ row }) => {
              const gridActions = [];
              gridActions.push(
                <GridActionsCellItem
                  icon={<Visibility color="primary" />}
                  onClick={() => verRegistro(row._id)}
                  label="Ver"
                  title="Ver"
                />
              );
              if (row.activo)
                gridActions.push(
                  <GridActionsCellItem
                    icon={<Edit color="primary" />}
                    onClick={() => editarRegistro(row._id)}
                    label="Editar"
                    title="Editar"
                  />
                );
              gridActions.push(
                row.activo ? (
                  <GridActionsCellItem
                    icon={<Delete color="success" />}
                    onClick={() => cambiarEstado(row._id, row.activo)}
                    label="Desactivar"
                    title="Desactivar"
                  />
                ) : (
                  <GridActionsCellItem
                    icon={<RestoreFromTrash color="error" />}
                    onClick={() => cambiarEstado(row._id, row.activo)}
                    label="Restaurar"
                    title="Restaurar"
                  />
                )
              );

              return gridActions;
            },
          },
        ]}
        disableColumnFilter
        filterDebounceMs={1000}
        dataSource={dataSource}
        dataSourceCache={null}
        sx={{
          "& .row-selected": {
            outline: "2px solid #7A3DF0",
            outlineOffset: -2,
          },
          "& .MuiDataGrid-row.Mui-selected": {
            backgroundColor: "rgba(122, 61, 240, 0.08)",
          },
          "& .MuiDataGrid-cell.MuiDataGrid-cell--focus": {
            outline: "none",
          },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
            outline: "none",
          },
          "& .MuiDataGrid-columnSeparator": {
            display: "none",
          },
        }}
        onDataSourceError={(dataSourceError) => {
          if (dataSourceError.cause instanceof AxiosError) {
            setError(dataSourceError.cause.code);
            return;
          }
          if (dataSourceError instanceof GridGetRowsError) {
            setError(dataSourceError.message);
            return;
          }
        }}
        pagination
        pageSizeOptions={pageSizeOptions}
        showToolbar
        localeText={{
          ...esES.components.MuiDataGrid.defaultProps.localeText,
          toolbarColumns: "",
          toolbarFilters: "",
          toolbarDensity: "",
          toolbarExport: "",
          noRowsLabel: "Sin registros",
          footerRowSelected: () => "",
        }}
        slots={{
          toolbar: () => (
            <DataGridToolbar
              tableTitle="Alta de Contratistas"
              customActionButtons={
                <Fragment>
                  <Tooltip title="Agregar">
                    <IconButton onClick={nuevoRegistro}>
                      <Add fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Recargar">
                    <IconButton onClick={() => apiRef.current?.dataSource?.fetchRows?.()}>
                      <Refresh fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Ver visitantes">
                    <span>
                          <IconButton
                        onClick={() =>
                          abrirVisitantes(
                            apiRef.current?.getRow(selectedRowId || "") || null
                          )
                        }
                        disabled={!selectedRowId}
                      >
                        <PeopleAlt fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Fragment>
              }
            />
          ),
        }}
      />
      {error && (
        <ErrorOverlay error={error} gridDataRef={apiRef.current?.dataSource} />
      )}
      <Outlet context={apiRef.current?.dataSource} />
      <Modal open={showVisitantes} onClose={cerrarVisitantes} sx={{ outline: "none" }}>
        <Box
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 2,
            outline: "none",
            "&:focus, &:focus-visible": { outline: "none" },
          }}
        >
          <Card
            sx={{
              width: "100%",
              maxWidth: 1200,
              height: "80vh",
              maxHeight: "80vh",
              outline: "none",
              "&:focus, &:focus-visible": { outline: "none" },
            }}
          >
            <CardContent sx={{ height: "100%", overflowY: "auto" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h6">
                  Visitantes de {contratistaSeleccion?.empresa || ""}
                </Typography>
                <MuiIconButton
                  onClick={cerrarVisitantes}
                  size="small"
                  sx={{ color: "error.main" }}
                >
                  <CloseIcon fontSize="small" />
                </MuiIconButton>
              </Box>
              {false && (
              <Box sx={{ display: "grid", gap: 0.5, mb: 2 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.6 }}
                >
                  Filtros
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={filtroDocs}
                  onChange={(_, value) => value && setFiltroDocs(value)}
                  sx={{
                    "& .MuiToggleButton-root": {
                      textTransform: "none",
                      px: 1.5,
                      borderRadius: 2,
                    },
                    "& .MuiToggleButton-root.Mui-selected": {
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      borderColor: "primary.main",
                      "&:hover": {
                        bgcolor: "primary.dark",
                      },
                    },
                  }}
                >
                  <ToggleButton value="todos">Todos</ToggleButton>
                  <ToggleButton value="pendientes_completos">
                    Pendientes completos
                  </ToggleButton>
                  <ToggleButton value="pendientes_incompletos">
                    Pendientes incompletos
                  </ToggleButton>
                </ToggleButtonGroup>
                <Typography variant="caption" color="text.secondary">
                  {/* Filtra a los visitantes que tienen documentos completos o incompletos dentro de los pendientes. */}
                  {/* Filtra por documentos cargados en pendientes. */}
                </Typography>
              </Box>
              )}
              <DataGrid
                apiRef={apiRefVisitantes}
                autoHeight
                getRowId={(row) => row._id}
                columns={[
                  {
                    headerName: "Nombre",
                    field: "nombre_completo",
                    flex: 1,
                    display: "flex",
                    minWidth: 180,
                    renderCell: ({ row, value }) => {
                      if (row?.__isContratista) {
                        return (
                          <Box sx={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                textTransform: "uppercase",
                                letterSpacing: 0.6,
                                color: "text.secondary",
                                fontWeight: 700,
                              }}
                            >
                              Contratista
                            </Typography>
                            <Typography variant="body2" fontWeight={700}>
                              {contratistaSeleccion?.empresa || "-"}
                            </Typography>
                          </Box>
                        );
                      }
                      const text =
                        value && String(value).trim() ? String(value) : "-";
                      return <span>{text}</span>;
                    },
                  },
                  {
                    headerName: "Correo",
                    field: "correo",
                    flex: 1,
                    display: "flex",
                    minWidth: 200,
                    renderCell: ({ row, value }) => {
                      if (row?.__isContratista) {
                        const text =
                          value && String(value).trim() ? String(value) : "-";
                        return <span>{text}</span>;
                      }
                      const text =
                        value && String(value).trim() ? String(value) : "-";
                      return <span>{text}</span>;
                    },
                  },
                  {
                    headerName: "Teléfono",
                    field: "telefono",
                    flex: 1,
                    display: "flex",
                    minWidth: 140,
                    renderCell: ({ row, value }) => {
                      if (row?.__isContratista) {
                        const text =
                          value && String(value).trim() ? String(value) : "-";
                        return <span>{text}</span>;
                      }
                      const text =
                        value && String(value).trim() ? String(value) : "-";
                      return <span>{text}</span>;
                    },
                  },
                  {
                    headerName: "Estado",
                    field: "estado_validacion",
                    flex: 1,
                    display: "flex",
                    minWidth: 140,
                    headerAlign: "center",
                    align: "center",
                    renderCell: ({ row, value }) => {
                      if (row?.__isContratista) {
                        if (isLoadingContratistaDocs) {
                          return (
                            <Typography
                              component="span"
                              sx={{ fontSize: 12, fontWeight: 600, color: "text.secondary" }}
                            >
                              Cargando...
                            </Typography>
                          );
                        }
                        const estado = getEstadoLabel(
                          contratistaDocs?.estado_validacion
                        );
                        return (
                          <Typography
                            component="span"
                            sx={{
                              bgcolor: `${estado.color}.main`,
                              color: "#fff",
                              px: 1.5,
                              py: 0.25,
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 600,
                              minWidth: 100,
                              textAlign: "center",
                              display: "inline-block",
                            }}
                          >
                            {estado.label}
                          </Typography>
                        );
                      }
                      const verificado = value === 2;
                      return (
                        <Typography
                          component="span"
                          sx={{
                            bgcolor: verificado ? "success.main" : "error.main",
                            color: "#fff",
                            px: 1.5,
                            py: 0.25,
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 600,
                            minWidth: 100,
                            textAlign: "center",
                            display: "inline-block",
                          }}
                        >
                          {verificado ? "Verificado" : "No verificado"}
                        </Typography>
                      );
                    },
                  },
                  // {
                  //   headerName: "Documentos",
                  //   field: "docs_completos",
                  //   flex: 1,
                  //   display: "flex",
                  //   minWidth: 140,
                  //   renderCell: ({ value }) =>
                  //     value ? (
                  //       <Typography color="success.main" fontWeight={600}>
                  //         Completos
                  //       </Typography>
                  //     ) : (
                  //       <Typography color="error.main" fontWeight={600}>
                  //         Incompletos
                  //       </Typography>
                  //     ),
                  // },
                  {
                    headerName: "Acciones",
                    field: "acciones",
                    type: "actions",
                    align: "center",
                    flex: 1,
                    display: "flex",
                    minWidth: 120,
                    getActions: ({ row }) => {
                      if (row?.__isContratista) {
                        return [
                          <GridActionsCellItem
                            icon={<Visibility color="primary" />}
                            onClick={() => abrirVerificarContratista()}
                            label="Ver"
                            title="Ver"
                          />,
                        ];
                      }
                      return [
                        <GridActionsCellItem
                          icon={<Visibility color="primary" />}
                          onClick={() => abrirDetalleVisitante(row)}
                          label="Ver"
                          title="Ver"
                        />,
                      ];
                    },
                  },
                ]}
                disableColumnFilter
                disableRowSelectionOnClick
                filterDebounceMs={1000}
                dataSource={dataSourceVisitantes}
                dataSourceCache={null}
                onCellClick={(params) => {
                  setSelectedVisitanteId(String(params.id));
                  setSelectedVisitante(params.row);
                }}
                onRowDoubleClick={(params) => {
                  const row = params.row;
                  setSelectedVisitanteId(String(params.id));
                  setSelectedVisitante(row);
                  if (row?.__isContratista) {
                    abrirVerificarContratista();
                    return;
                  }
                  if (row?.estado_validacion === 2) {
                    abrirDetalleVisitante(row);
                  } else {
                    abrirVerificarVisitante(row);
                  }
                }}
                getRowClassName={(params) => {
                  const classes: string[] = [];
                  if (params.row?.__isContratista) classes.push("row-contratista");
                  if (params.id === selectedVisitanteId) classes.push("row-selected");
                  return classes.join(" ");
                }}
                getRowHeight={(params) =>
                  params.model?.__isContratista ? 60 : null
                }
                onDataSourceError={(dataSourceError) => {
                  if (dataSourceError.cause instanceof AxiosError) {
                    setVisitantesError(dataSourceError.cause.code);
                    return;
                  }
                  if (dataSourceError instanceof GridGetRowsError) {
                    setVisitantesError(dataSourceError.message);
                    return;
                  }
                }}
                pagination
                pageSizeOptions={pageSizeOptions}
                showToolbar
                localeText={{
                  ...esES.components.MuiDataGrid.defaultProps.localeText,
                  toolbarColumns: "",
                  toolbarFilters: "",
                  toolbarDensity: "",
                  toolbarExport: "",
                  noRowsLabel: "Sin registros",
                }}
                slots={{
                  toolbar: () => (
                    <DataGridToolbar
                      tableTitle=""
                        customActionButtons={
                          <Fragment>
                            <Button
                              variant="contained"
                              size="small"
                              startIcon={<Verified />}
                              onClick={() => {
                                if (selectedVisitante?.estado_validacion === 2) {
                                  abrirRevertirVisitante();
                                } else {
                                  if (isContratistaSeleccionado) {
                                    abrirVerificarContratista();
                                  } else {
                                    abrirVerificarVisitante();
                                  }
                                }
                              }}
                              disabled={
                                !selectedVisitante ||
                                isLoadingRevertir ||
                                isLoadingRevertirContratista ||
                                (isContratistaSeleccionado && !contratistaPuedeVerificarse)
                              }
                            >
                              {selectedVisitante?.estado_validacion === 2
                                ? "Revertir verificación"
                                : "Verificar"}
                            </Button>
                            <Tooltip title="Recargar">
                              <IconButton
                                onClick={() =>
                                  apiRefVisitantes.current?.dataSource?.fetchRows?.()
                                }
                              >
                                <Refresh fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Fragment>
                        }
                      />
                    ),
                  }}
                sx={{
                  "& .row-selected": {
                    outline: "2px solid #7A3DF0",
                    outlineOffset: -2,
                  },
                  "& .row-contratista .MuiDataGrid-cell": {
                    borderBottom: "2px solid #7A3DF0",
                  },
                  "& .MuiDataGrid-cell.MuiDataGrid-cell--focus": {
                    outline: "none",
                  },
                  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within":
                    {
                      outline: "none",
                    },
                  "& .MuiDataGrid-columnSeparator": {
                    display: "none",
                  },
                }}
              />
              {visitantesError && (
                <ErrorOverlay
                  error={visitantesError}
                  gridDataRef={apiRefVisitantes.current?.dataSource}
                />
              )}
            </CardContent>
          </Card>
        </Box>
      </Modal>
      <Modal
        open={showDetalleVisitante}
        onClose={() => {
          setShowDetalleVisitante(false);
          setShowVisitantes(true);
        }}
        sx={{ outline: "none" }}
      >
        <Box
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 2,
            outline: "none",
            "&:focus, &:focus-visible": { outline: "none" },
          }}
        >
          <Card
            sx={{
              width: "100%",
              maxWidth: 1200,
              maxHeight: "70vh",
              outline: "none",
              "&:focus, &:focus-visible": { outline: "none" },
            }}
          >
            <CardContent sx={{ maxHeight: "70vh", overflowY: "auto" }}>
              {isLoadingDetalle ? (
                <Spinner />
              ) : (
                <Box sx={{ mt: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Typography variant="h5" component="h5">
                        Visitante
                      </Typography>
                      <Typography
                        component="span"
                        sx={{
                          bgcolor:
                            selectedVisitante?.estado_validacion === 2
                              ? "success.main"
                              : "error.main",
                          color: "#fff",
                          px: 2,
                          py: 0.45,
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 600,
                          minWidth: 130,
                          textAlign: "center",
                          display: "inline-block",
                        }}
                      >
                        {selectedVisitante?.estado_validacion === 2
                          ? "Verificado"
                          : "No verificado"}
                      </Typography>
                    </Box>
                    <MuiIconButton
                      onClick={() => {
                        setShowDetalleVisitante(false);
                        setShowVisitantes(true);
                      }}
                      size="small"
                      sx={{ color: "error.main" }}
                    >
                      <CloseIcon fontSize="small" />
                    </MuiIconButton>
                  </Box>
                <Typography
                  variant="h6"
                  component="h6"
                  color="primary"
                  bgcolor="#FFFFFF"
                  sx={(theme) => ({
                    border: `1px solid ${theme.palette.primary.main}`,
                    borderRadius: 2,
                    px: 2,
                    py: 0.5,
                  })}
                  textAlign="center"
                  mb={2}
                >
                  <strong>Generales</strong>
                </Typography>
                <Box sx={{ display: "grid", gap: 1.5, mb: 3 }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                    <strong>Empresa:</strong>
                    <span>{selectedVisitante?.empresa || "-"}</span>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                    <strong>Nombre:</strong>
                    <span>
                      {selectedVisitante?.nombre_completo ||
                        [selectedVisitante?.nombre, selectedVisitante?.apellido_pat, selectedVisitante?.apellido_mat]
                          .filter(Boolean)
                          .join(" ") ||
                        "-"}
                    </span>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                    <strong>Correo:</strong>
                    <span>{selectedVisitante?.correo || "-"}</span>
                  </Box>
                  <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                    <strong>Teléfono:</strong>
                    <span>{selectedVisitante?.telefono || "-"}</span>
                  </Box>
                </Box>
                <Typography
                  variant="h6"
                  component="h6"
                  color="primary"
                  bgcolor="#FFFFFF"
                  sx={(theme) => ({
                    border: `1px solid ${theme.palette.primary.main}`,
                    borderRadius: 2,
                    px: 2,
                    py: 0.5,
                  })}
                  textAlign="center"
                  mb={2}
                >
                  <strong>Documentos</strong>
                </Typography>
                {documentosContratistas.filter(
                  ({ key }) =>
                    !["constancia_vigencia_imss", "constancias_habilidades"].includes(
                      key
                    )
                ).map(({ key, label }) => {
                  const documentos =
                    (selectedVisitante as any)?.documentos ||
                    (selectedVisitante as any)?.documentos_urls ||
                    (selectedVisitante as any)?.documentos_archivos ||
                    {};
                  const docUrl = documentos?.[key] as string | undefined;
                  const checks = (selectedVisitante as any)?.documentos_checks || {};
                  const tieneDoc = Boolean(checks?.[key]);
                  return (
                    <Accordion
                      key={key}
                      disableGutters
                      expanded={expandedDocKeyDetalle === key}
                      onChange={(_, isExpanded) =>
                        setExpandedDocKeyDetalle(isExpanded ? key : false)
                      }
                    >
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            pr: 2,
                          }}
                        >
                          <Typography>{label}</Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: tieneDoc ? "success.main" : "error.main",
                              fontWeight: 600,
                            }}
                          >
                            {tieneDoc ? "OK" : "Pendiente de verificación"}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        {renderDocPreview(docUrl, label)}
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
                {(() => {
                  const documentos =
                    (selectedVisitante as any)?.documentos ||
                    (selectedVisitante as any)?.documentos_urls ||
                    (selectedVisitante as any)?.documentos_archivos ||
                    {};
                      const opcionales = documentosOpcionales.filter(({ key }) =>
                        Boolean(documentos?.[key])
                      );
                      if (opcionales.length === 0) return null;
                  return (
                    <>
                      <Typography
                        variant="h6"
                        component="h6"
                        color="primary"
                        bgcolor="#FFFFFF"
                        sx={(theme) => ({
                          border: `1px solid ${theme.palette.primary.main}`,
                          borderRadius: 2,
                          px: 2,
                          py: 0.5,
                        })}
                        textAlign="center"
                        mt={2}
                        mb={2}
                      >
                        <strong>Documentos opcionales</strong>
                      </Typography>
                      {opcionales.map(({ key, label }) => {
                        const docUrl = documentos?.[key] as string | undefined;
                        const checks = (selectedVisitante as any)?.documentos_checks || {};
                        const tieneDoc = Boolean(checks?.[key]);
                        return (
                          <Accordion
                            key={key}
                            disableGutters
                            expanded={expandedDocKeyDetalle === key}
                            onChange={(_, isExpanded) =>
                              setExpandedDocKeyDetalle(isExpanded ? key : false)
                            }
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  width: "100%",
                                  pr: 2,
                                }}
                              >
                                <Typography>{label}</Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: tieneDoc ? "success.main" : "error.main",
                                    fontWeight: 600,
                                  }}
                                >
                                  {tieneDoc ? "OK" : "Pendiente de revisión"}
                                </Typography>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              {renderDocPreview(docUrl, label)}
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </>
                  );
                })()}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Modal>
      <Modal
        open={showVerificarVisitante}
        onClose={(_, reason) => {
          if (reason === "escapeKeyDown" || reason === "backdropClick") {
            setShowVerificarVisitante(false);
            setContratistaDocs(null);
            setShowVisitantes(true);
          }
        }}
        sx={{ outline: "none" }}
      >
        <Box
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 2,
            outline: "none",
            "&:focus, &:focus-visible": { outline: "none" },
          }}
        >
          <Card
            sx={{
              width: "100%",
              maxWidth: 1200,
              maxHeight: "70vh",
              outline: "none",
              "&:focus, &:focus-visible": { outline: "none" },
            }}
          >
            <CardContent
              sx={{
                maxHeight: "70vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {isLoadingVerificar ? (
                <Spinner />
              ) : (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" component="h6">
                      Verificar visitante
                    </Typography>
                    <MuiIconButton
                      onClick={() => {
                        setShowVerificarVisitante(false);
            setContratistaDocs(null);
                        setShowVisitantes(true);
                      }}
                      size="small"
                      sx={{ color: "error.main" }}
                    >
                      <CloseIcon fontSize="small" />
                    </MuiIconButton>
                  </Box>
                  <Typography
                    variant="h6"
                    component="h6"
                    color="primary"
                    bgcolor="#FFFFFF"
                    sx={(theme) => ({
                      border: `1px solid ${theme.palette.primary.main}`,
                      borderRadius: 2,
                      px: 2,
                      py: 0.5,
                    })}
                    textAlign="center"
                    mb={2}
                  >
                    <strong>Generales</strong>
                  </Typography>
                  <Box sx={{ display: "grid", gap: 1.5, mb: 2 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                      <strong>Empresa:</strong>
                      <span>{selectedVisitante?.empresa || "-"}</span>
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                      <strong>Nombre:</strong>
                      <span>
                        {selectedVisitante?.nombre_completo ||
                          [selectedVisitante?.nombre, selectedVisitante?.apellido_pat, selectedVisitante?.apellido_mat]
                            .filter(Boolean)
                            .join(" ") ||
                          "-"}
                      </span>
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                      <strong>Correo:</strong>
                      <span>{selectedVisitante?.correo || "-"}</span>
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                      <strong>Teléfono:</strong>
                      <span>{selectedVisitante?.telefono || "-"}</span>
                    </Box>
                  </Box>
                  <Typography
                    variant="h6"
                    component="h6"
                    color="primary"
                    bgcolor="#FFFFFF"
                    sx={(theme) => ({
                      border: `1px solid ${theme.palette.primary.main}`,
                      borderRadius: 2,
                      px: 2,
                      py: 0.5,
                    })}
                    textAlign="center"
                    mb={2}
                  >
                    <strong>Documentos</strong>
                  </Typography>
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: "auto",
                      pr: 0.5,
                      position: "relative",
                      overscrollBehavior: "contain",
                    }}
                    ref={verifScrollRef}
                    onScroll={actualizarScrollVerificar}
                  >
                    {!canScrollDown && canScrollUp && (
                      <MuiIconButton
                        size="small"
                        onClick={scrollVerificarArriba}
                        sx={{
                          position: "sticky",
                          top: 8,
                          left: "50%",
                          transform: "translateX(-50%)",
                          bgcolor: "rgba(255,255,255,0.9)",
                          border: "1px solid rgba(0,0,0,0.1)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                          zIndex: 2,
                          "&:hover": { bgcolor: "rgba(255,255,255,1)" },
                        }}
                        aria-label="Ir arriba"
                      >
                        <ExpandMoreIcon sx={{ transform: "rotate(180deg)" }} />
                      </MuiIconButton>
                    )}
                    {documentosContratistas.filter(
                      ({ key }) =>
                        !["constancia_vigencia_imss", "constancias_habilidades"].includes(
                          key
                        )
                    ).map(({ key, label }) => {
                      const documentos =
                        (selectedVisitante as any)?.documentos ||
                        (selectedVisitante as any)?.documentos_urls ||
                        (selectedVisitante as any)?.documentos_archivos ||
                        {};
                      const docUrl = documentos?.[key] as string | undefined;
                      const tieneDoc = Boolean(verifChecks?.[key]);
                      return (
                      <Accordion
                        key={key}
                        disableGutters
                        expanded={expandedDocKey === key}
                        onChange={(_, isExpanded) =>
                          setExpandedDocKey(isExpanded ? key : false)
                        }
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                              pr: 2,
                            }}
                          >
                            <Typography>{label}</Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: tieneDoc ? "success.main" : "error.main",
                                  fontWeight: 600,
                                }}
                              >
                                {tieneDoc ? "OK" : "Pendiente de revisión"}
                              </Typography>
                              <Checkbox
                                size="small"
                                checked={tieneDoc}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) =>
                                  setVerifChecks((prev) => ({
                                    ...prev,
                                    [key]: event.target.checked,
                                  }))
                                }
                              />
                            </Box>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {renderDocPreview(docUrl, label)}
                        </AccordionDetails>
                    </Accordion>
                      );
                    })}
                    {(() => {
                      const documentos =
                        (selectedVisitante as any)?.documentos ||
                        (selectedVisitante as any)?.documentos_urls ||
                        (selectedVisitante as any)?.documentos_archivos ||
                        {};
                      const opcionales = documentosOpcionales.filter(({ key }) =>
                        Boolean(documentos?.[key])
                      );
                      if (opcionales.length === 0) return null;
                      return (
                        <>
                          <Typography
                            variant="h6"
                            component="h6"
                            color="primary"
                            bgcolor="#FFFFFF"
                            sx={(theme) => ({
                              border: `1px solid ${theme.palette.primary.main}`,
                              borderRadius: 2,
                              px: 2,
                              py: 0.5,
                              mt: 2,
                            })}
                            textAlign="center"
                            mb={2}
                          >
                            <strong>Documentos opcionales</strong>
                          </Typography>
                          {opcionales.map(({ key, label }) => {
                            const docUrl = documentos?.[key] as string | undefined;
                            const tieneDoc = Boolean(verifChecks?.[key]);
                            return (
                              <Accordion
                                key={key}
                                disableGutters
                                expanded={expandedDocKey === key}
                                onChange={(_, isExpanded) =>
                                  setExpandedDocKey(isExpanded ? key : false)
                                }
                              >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      width: "100%",
                                      pr: 2,
                                    }}
                                  >
                                    <Typography>{label}</Typography>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: tieneDoc ? "success.main" : "error.main",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {tieneDoc ? "OK" : "Pendiente de revisión"}
                                      </Typography>
                                      <Checkbox
                                        size="small"
                                        checked={tieneDoc}
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={(event) =>
                                          setVerifChecks((prev) => ({
                                            ...prev,
                                            [key]: event.target.checked,
                                          }))
                                        }
                                      />
                                    </Box>
                                  </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                  {renderDocPreview(docUrl, label)}
                                </AccordionDetails>
                              </Accordion>
                            );
                          })}
                        </>
                      );
                    })()}
                    {canScrollDown && (
                      <MuiIconButton
                        size="small"
                        onClick={scrollVerificarAbajo}
                        sx={{
                          position: "sticky",
                          bottom: 8,
                          left: "50%",
                          transform: "translateX(-50%)",
                          bgcolor: "rgba(255,255,255,0.9)",
                          border: "1px solid rgba(0,0,0,0.1)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                          zIndex: 2,
                          "&:hover": { bgcolor: "rgba(255,255,255,1)" },
                        }}
                        aria-label="Ir abajo"
                      >
                        <ExpandMoreIcon />
                      </MuiIconButton>
                    )}
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    {areDocsComplete(requiredDocKeys, verifChecks) ? (
                      <Button
                        variant="contained"
                        startIcon={<Verified />}
                        onClick={confirmarVerificacion}
                        disabled={selectedVisitante?.estado_validacion === 2}
                      >
                        Verificar
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="warning"
                        onClick={solicitarCorreccion}
                      >
                        Solicitar corrección
                      </Button>
                    )}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      </Modal>
      <Modal
        open={showVerificarContratista}
        onClose={() => {
          setShowVerificarContratista(false);
          setShowVisitantes(true);
        }}
        sx={{ outline: "none" }}
      >
        <Box
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 2,
            outline: "none",
            "&:focus, &:focus-visible": { outline: "none" },
          }}
        >
          <Card
            sx={{
              width: "100%",
              maxWidth: 1200,
              maxHeight: "80vh",
              outline: "none",
              "&:focus, &:focus-visible": { outline: "none" },
            }}
          >
            <CardContent
              sx={{ maxHeight: "80vh", overflowY: "auto", overflowX: "hidden" }}
            >
              {isLoadingContratistaDocs ? (
                <Spinner />
              ) : !contratistaDocs ? (
                <Typography variant="body1">
                  El contratista no tiene documentos cargados.
                </Typography>
              ) : (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" component="h6">
                      Verificar contratista
                    </Typography>
                    <MuiIconButton
                      onClick={() => {
                        setShowVerificarContratista(false);
                        setShowVisitantes(true);
                      }}
                      size="small"
                      sx={{ color: "error.main" }}
                    >
                      <CloseIcon fontSize="small" />
                    </MuiIconButton>
                  </Box>
                  <Typography
                    variant="h6"
                    component="h6"
                    color="primary"
                    bgcolor="#FFFFFF"
                    sx={(theme) => ({
                      border: `1px solid ${theme.palette.primary.main}`,
                      borderRadius: 2,
                      px: 2,
                      py: 0.5,
                    })}
                    textAlign="center"
                    mb={2}
                  >
                    <strong>Generales</strong>
                  </Typography>
                  <Box sx={{ display: "grid", gap: 1.5, mb: 2 }}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "140px 1fr",
                        gap: 1,
                      }}
                    >
                      <strong>Empresa:</strong>
                      <span>{contratistaSeleccion?.empresa || "-"}</span>
                    </Box>
                  </Box>
                  <Typography
                    variant="h6"
                    component="h6"
                    color="primary"
                    bgcolor="#FFFFFF"
                    sx={(theme) => ({
                      border: `1px solid ${theme.palette.primary.main}`,
                      borderRadius: 2,
                      px: 2,
                      py: 0.5,
                    })}
                    textAlign="center"
                    mb={2}
                  >
                    <strong>Documentos</strong>
                  </Typography>
                  <Box sx={{ display: "grid", gap: 1.5 }}>
                    {documentosContratistaAdmin.filter(
                      ({ key }) =>
                        !["constancia_vigencia_imss", "constancias_habilidades"].includes(
                          key
                        )
                    ).map(({ key, label }) => {
                      const documentos =
                        (contratistaDocs as any)?.documentos_archivos ||
                        (contratistaDocs as any)?.documentos_urls ||
                        {};
                      const docUrl = documentos?.[key] as string | undefined;
                      const tieneDoc = Boolean(verifChecksContratista?.[key]);
                      return (
                        <Accordion
                          key={key}
                          disableGutters
                          expanded={expandedDocKeyContratista === key}
                          onChange={(_, isExpanded) =>
                            setExpandedDocKeyContratista(isExpanded ? key : false)
                          }
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%",
                                pr: 2,
                              }}
                            >
                              <Typography>{label}</Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: tieneDoc ? "success.main" : "error.main",
                                    fontWeight: 600,
                                  }}
                                >
                                  {tieneDoc ? "OK" : "Pendiente de revisión"}
                                </Typography>
                                <Checkbox
                                  size="small"
                                  checked={tieneDoc}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={(event) =>
                                    setVerifChecksContratista((prev) => ({
                                      ...prev,
                                      [key]: event.target.checked,
                                    }))
                                  }
                                />
                              </Box>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails>
                            {renderDocPreview(docUrl, label)}
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                    {(() => {
                      const documentos =
                        (contratistaDocs as any)?.documentos_archivos ||
                        (contratistaDocs as any)?.documentos_urls ||
                        {};
                      const opcionales = documentosContratistaAdminOpcionales.filter(
                        ({ key }) => Boolean(documentos?.[key])
                      );
                      if (opcionales.length === 0) return null;
                      return (
                        <>
                          <Typography
                            variant="h6"
                            component="h6"
                            color="primary"
                            bgcolor="#FFFFFF"
                            sx={(theme) => ({
                              border: `1px solid ${theme.palette.primary.main}`,
                              borderRadius: 2,
                              px: 2,
                              py: 0.5,
                              mt: 2,
                            })}
                            textAlign="center"
                            mb={2}
                          >
                            <strong>Documentos opcionales</strong>
                          </Typography>
                          {opcionales.map(({ key, label }) => {
                            const docUrl = documentos?.[key] as string | undefined;
                            const tieneDoc = Boolean(verifChecksContratista?.[key]);
                            return (
                              <Accordion
                                key={key}
                                disableGutters
                                expanded={expandedDocKeyContratista === key}
                                onChange={(_, isExpanded) =>
                                  setExpandedDocKeyContratista(isExpanded ? key : false)
                                }
                              >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      width: "100%",
                                      pr: 2,
                                    }}
                                  >
                                    <Typography>{label}</Typography>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          color: tieneDoc ? "success.main" : "error.main",
                                          fontWeight: 600,
                                        }}
                                      >
                                        {tieneDoc ? "OK" : "Pendiente de revisión"}
                                      </Typography>
                                      <Checkbox
                                        size="small"
                                        checked={tieneDoc}
                                        onClick={(event) => event.stopPropagation()}
                                        onChange={(event) =>
                                          setVerifChecksContratista((prev) => ({
                                            ...prev,
                                            [key]: event.target.checked,
                                          }))
                                        }
                                      />
                                    </Box>
                                  </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                  {renderDocPreview(docUrl, label)}
                                </AccordionDetails>
                              </Accordion>
                            );
                          })}
                        </>
                      );
                    })()}
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    {areDocsComplete(
                      requiredContratistaDocKeys,
                      verifChecksContratista
                    ) ? (
                      <Button
                        variant="contained"
                        startIcon={<Verified />}
                        onClick={confirmarVerificacionContratista}
                        disabled={
                          contratistaDocs?.estado_validacion === 2 ||
                          isLoadingVerificarContratista
                        }
                      >
                        Verificar
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        color="warning"
                        onClick={solicitarCorreccionContratista}
                      >
                        Solicitar corrección
                      </Button>
                    )}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      </Modal>
      <Modal
        open={showMotivoRechazo}
        onClose={() => setShowMotivoRechazo(false)}
        sx={{ outline: "none" }}
      >
        <Box
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 2,
            outline: "none",
            "&:focus, &:focus-visible": { outline: "none" },
          }}
        >
          <Card sx={{ width: "100%", maxWidth: 520 }}>
            <CardContent sx={{ overflow: "hidden" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h6">
                  Motivo de rechazo
                </Typography>
                <MuiIconButton
                  onClick={() => setShowMotivoRechazo(false)}
                  size="small"
                  sx={{ color: "error.main" }}
                >
                  <CloseIcon fontSize="small" />
                </MuiIconButton>
              </Box>
              <TextField
                fullWidth
                label="Motivo"
                multiline
                minRows={2}
                value={motivoRechazo}
                onChange={(event) => setMotivoRechazo(event.target.value)}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={confirmarRechazo}
                  disabled={isEnviandoRechazo}
                >
                  Rechazar
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Modal>
      <Modal
        open={showMotivoRechazoContratista}
        onClose={() => setShowMotivoRechazoContratista(false)}
        sx={{ outline: "none" }}
      >
        <Box
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 2,
            outline: "none",
            "&:focus, &:focus-visible": { outline: "none" },
          }}
        >
          <Card sx={{ width: "100%", maxWidth: 520 }}>
            <CardContent sx={{ overflow: "hidden" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h6">
                  Motivo de rechazo
                </Typography>
                <MuiIconButton
                  onClick={() => setShowMotivoRechazoContratista(false)}
                  size="small"
                  sx={{ color: "error.main" }}
                >
                  <CloseIcon fontSize="small" />
                </MuiIconButton>
              </Box>
              <TextField
                fullWidth
                label="Motivo"
                multiline
                minRows={2}
                value={motivoRechazoContratista}
                onChange={(event) =>
                  setMotivoRechazoContratista(event.target.value)
                }
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={confirmarRechazoContratista}
                  disabled={isEnviandoRechazoContratista}
                >
                  Rechazar
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Modal>
      <Modal
        open={showRevertirVisitante}
        onClose={(_, reason) => {
          if (reason === "escapeKeyDown" || reason === "backdropClick") {
            setShowRevertirVisitante(false);
          }
        }}
        sx={{ outline: "none" }}
      >
        <Box
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 2,
            outline: "none",
            "&:focus, &:focus-visible": { outline: "none" },
          }}
        >
          <Card sx={{ width: "100%", maxWidth: 420 }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h6">
                  Revertir verificación
                </Typography>
                <MuiIconButton
                  onClick={() => setShowRevertirVisitante(false)}
                  size="small"
                  sx={{ color: "error.main" }}
                >
                  <CloseIcon fontSize="small" />
                </MuiIconButton>
              </Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Seguro que desea quitar la verificación a{" "}
                <strong>
                  {selectedVisitante?.nombre_completo ||
                    [selectedVisitante?.nombre, selectedVisitante?.apellido_pat, selectedVisitante?.apellido_mat]
                      .filter(Boolean)
                      .join(" ") ||
                    selectedVisitante?.correo ||
                    "este visitante"}
                </strong>
                ?
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={confirmarRevertirVisitante}
                  disabled={isLoadingRevertir}
                >
                  Si, revertir
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Modal>
      <Modal
        open={showRevertirContratista}
        onClose={(_, reason) => {
          if (reason === "escapeKeyDown" || reason === "backdropClick") {
            setShowRevertirContratista(false);
          }
        }}
        sx={{ outline: "none" }}
      >
        <Box
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 2,
            outline: "none",
            "&:focus, &:focus-visible": { outline: "none" },
          }}
        >
          <Card sx={{ width: "100%", maxWidth: 420 }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Typography variant="h6" component="h6">
                  Revertir verificación
                </Typography>
                <MuiIconButton
                  onClick={() => setShowRevertirContratista(false)}
                  size="small"
                  sx={{ color: "error.main" }}
                >
                  <CloseIcon fontSize="small" />
                </MuiIconButton>
              </Box>
              <Typography variant="body1" sx={{ mb: 3 }}>
                Seguro que desea quitar la verificación a{" "}
                <strong>{contratistaSeleccion?.empresa || "este contratista"}</strong>?
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button
                  variant="contained"
                  onClick={confirmarRevertirContratista}
                  disabled={isLoadingRevertirContratista}
                >
                  Si, revertir
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Modal>
    </div>
  );
}

















