import { useState, useMemo, Fragment, useEffect, useCallback, useRef } from "react";
import {
  DataGrid,
  useGridApiRef,
  type GridInitialState,
  type GridDataSource,
  GridGetRowsError,
  type GridValidRowModel,
  GridActionsCellItem,
} from "@mui/x-data-grid";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { esES } from "@mui/x-data-grid/locales";
import DataGridToolbar from "../../utils/DataGridToolbar";
import {
  Add,
  Autorenew,
  CheckCircleOutline,
  Close,
  Delete,
  Edit,
  ErrorOutline,
  GetApp,
  RestoreFromTrash,
  // Upload, // [En proceso] Ocultado por funcionalidad de carga masiva no disponible
  Visibility,
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import { enqueueSnackbar } from "notistack";
import { useConfirm } from "material-ui-confirm";
import { AxiosError } from "axios";
import { base64ToFile } from "../../helpers/generalHelpers";
import ErrorOverlay from "../../error/DataGridError";
import Spinner from "../../utils/Spinner";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";

const pageSizeOptions = [10, 25, 50];
const HAND_WIDTH = 180;
const HAND_HEIGHT = 220;

type FingerAdjust = { dx: number; dy: number; rot: number; h: number };
type FingerAdjustMap = Record<number, FingerAdjust>;
type FingerShape = {
  id: number;
  left: number;
  top: number;
  width: number;
  height: number;
  rot: number;
};

const DEFAULT_FINGER_ADJUST: FingerAdjustMap = {
  1: { dx: 10, dy: -22, rot: 70, h: 0 },
  2: { dx: -15, dy: -20, rot: 0, h: 5 },
  3: { dx: -14, dy: -18, rot: 0, h: 0 },
  4: { dx: -13, dy: 1, rot: 0, h: -17 },
  5: { dx: -11, dy: 4, rot: 0, h: -13 },
  6: { dx: 0, dy: 0, rot: 0, h: 0 },
  7: { dx: 0, dy: 0, rot: 0, h: 0 },
  8: { dx: 0, dy: 0, rot: 0, h: 0 },
  9: { dx: 0, dy: 0, rot: 0, h: 0 },
  10: { dx: 0, dy: 0, rot: 0, h: 0 },
};

const LEFT_FINGER_SHAPES: FingerShape[] = [
  { id: 5, left: 50, top: 34, width: 22, height: 72, rot: 0 },
  { id: 4, left: 78, top: 20, width: 22, height: 86, rot: 0 },
  { id: 3, left: 106, top: 34, width: 22, height: 72, rot: 0 },
  { id: 2, left: 134, top: 56, width: 20, height: 58, rot: 0 },
  { id: 1, left: 132, top: 106, width: 24, height: 62, rot: -35 },
];

const LEFT_TO_RIGHT_ID_MAP: Record<number, number> = {
  1: 6,
  2: 7,
  3: 8,
  4: 9,
  5: 10,
};

export default function Empleados() {
  const { rol } = useSelector((state: IRootState) => state.auth.data);
  const { habilitarIntegracionHvBiometria, habilitarIntegracionBiostar } = useSelector(
    (state: IRootState) => state.config.data
  );
  const apiRef = useGridApiRef();
  const [error, setError] = useState<string>();
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const [isDownloadingQr, setIsDownloadingQr] = useState({
    id_usuario: "",
    descargando: false,
  });
  const [loadingRows, setLoadingRows] = useState<Record<string, boolean>>({});
  const [biometriaOpen, setBiometriaOpen] = useState(false);
  const [biometriaLoading, setBiometriaLoading] = useState(false);
  const [biometriaEmpleado, setBiometriaEmpleado] = useState<any>(null);
  const [biometriaStep, setBiometriaStep] = useState<
    "huella" | "espera" | "ok" | "error" | "tarjeta"
  >("huella");
  const [selectedFinger, setSelectedFinger] = useState<number>(2);
  const [biometriaMensaje, setBiometriaMensaje] = useState("");
  const [huellaProviderQueue, setHuellaProviderQueue] = useState<Array<"hiki" | "biostar">>([]);
  const [huellaProviderIndex, setHuellaProviderIndex] = useState(0);
  const [hikiPaneles, setHikiPaneles] = useState<Array<{ id: string; nombre: string; direccion_ip: string; es_panel_maestro?: boolean }>>([]);
  const [biostarDispositivos, setBiostarDispositivos] = useState<Array<{ id: string; nombre: string; direccion_ip: string; puerto?: number }>>([]);
  const [hikiPanelSeleccionado, setHikiPanelSeleccionado] = useState("");
  const [biostarDispositivoSeleccionado, setBiostarDispositivoSeleccionado] = useState("");
  const [tarjetaStep, setTarjetaStep] = useState<
    "lista" | "form" | "espera" | "ok" | "error"
  >("lista");
  const [tarjetaNombre, setTarjetaNombre] = useState("");
  const [tarjetaDescripcion, setTarjetaDescripcion] = useState("");
  const [tarjetaMensaje, setTarjetaMensaje] = useState("");
  const [biostarGroupFilter, setBiostarGroupFilter] = useState("");
  const [estadoFiltro] = useState<"activos" | "inactivos" | "todos">("activos");
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [biostarGroupOptions, setBiostarGroupOptions] = useState<
    Array<{ id_externo: string; nombre: string; total: number }>
  >([]);
  const [syncBioOpen, setSyncBioOpen] = useState(false);
  const [syncBioLoading, setSyncBioLoading] = useState(false);
  const [syncBioPendientes, setSyncBioPendientes] = useState<any[]>([]);
  const [syncBioSelected, setSyncBioSelected] = useState<string>("");
  const [syncBioSearch, setSyncBioSearch] = useState("");
  const [huellasPorProveedor, setHuellasPorProveedor] = useState<{
    hiki: number[];
    biostar: number[];
  }>({ hiki: [], biostar: [] });
  const huellaCaptureRunRef = useRef(0);
  const huellaCaptureCanceledRef = useRef(false);
  const setRowLoading = (id: string, isLoading: boolean) =>
    setLoadingRows((prev) => ({ ...prev, [id]: isLoading }));
  const esAdminOSuper = rol.includes(1) || rol.includes(2);
  const huellaHikiEnabled = !!habilitarIntegracionHvBiometria;
  const huellaBiostarEnabled = !!habilitarIntegracionBiostar && esAdminOSuper;
  const tarjetaHikiEnabled = !!habilitarIntegracionHvBiometria;
  const proveedorHuellaActual =
    huellaProviderQueue[huellaProviderIndex] ||
    (huellaHikiEnabled ? "hiki" : "biostar");
  const proveedorHuellaLabel = proveedorHuellaActual === "hiki" ? "Hikvision" : "BioStar";
  const haySiguienteProveedorHuella = huellaProviderIndex < huellaProviderQueue.length - 1;

  const fingers = [
    { id: 1, label: "Pulgar Izq" },
    { id: 2, label: "Indice Izq" },
    { id: 3, label: "Medio Izq" },
    { id: 4, label: "Anular Izq" },
    { id: 5, label: "Menique Izq" },
    { id: 6, label: "Pulgar Der" },
    { id: 7, label: "Indice Der" },
    { id: 8, label: "Medio Der" },
    { id: 9, label: "Anular Der" },
    { id: 10, label: "Menique Der" },
  ];
  const fingerPriorityOrder = [2, 7, 1, 6, 4, 9, 5, 10, 3, 8];
  const tarjetasMaximas = 10;
  const getNextDefaultFinger = (registeredRaw: number[] = []) => {
    const registered = new Set(
      (registeredRaw || []).map((v) => Number(v)).filter((v) => v >= 1 && v <= 10)
    );
    const available = fingerPriorityOrder.find((id) => !registered.has(id));
    return available || 2;
  };
  const leftFingerAdjust = DEFAULT_FINGER_ADJUST;
  const rotateLeft = 0;
  const offsetLeftX = 0;
  const offsetLeftY = 0;
  const palmHeightLeft = 90;
  const mirrorAdjustX = 0;
  const mirrorAdjustY = 0;
  const mirrorAdjustRotate = 0;

  const clamp = (value: number, min: number, max: number) =>
    Math.min(max, Math.max(min, value));

  const leftIdMap: Record<number, number> = {
    6: 1,
    7: 2,
    8: 3,
    9: 4,
    10: 5,
  };

  const abrirBiometria = async (
    id: string,
    step: "huella" | "tarjeta" = "huella"
  ) => {
    try {
      if (step === "tarjeta" && !tarjetaHikiEnabled) {
        enqueueSnackbar("Tarjeta solo está disponible con Hikvision activo.", {
          variant: "warning",
        });
        return;
      }
      setBiometriaLoading(true);
      const res = await clienteAxios.get(`/api/empleados/biometria/${id}`);
      if (!res.data.estado) {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        return;
      }
      const datos = res.data.datos;
      setBiometriaEmpleado(datos);
      const panelesHikiData = Array.isArray(datos?.paneles_hiki) ? datos.paneles_hiki : [];
      const dispositivosBiostarData = Array.isArray(datos?.dispositivos_biostar) ? datos.dispositivos_biostar : [];
      setHikiPaneles(panelesHikiData);
      setBiostarDispositivos(dispositivosBiostarData);
      const panelMain =
        panelesHikiData.find((p: any) => !!p?.es_panel_maestro)?.id ||
        panelesHikiData[0]?.id ||
        "";
      setHikiPanelSeleccionado(String(panelMain || ""));
      const defaultBio =
        dispositivosBiostarData.length === 1 ? String(dispositivosBiostarData[0]?.id || "") : "";
      setBiostarDispositivoSeleccionado(defaultBio);
      const huellas = Array.isArray(datos?.huellas_registradas)
        ? datos.huellas_registradas
        : [];
      if (step === "huella") {
        const queue: Array<"hiki" | "biostar"> = [];
        if (huellaHikiEnabled) queue.push("hiki");
        if (huellaBiostarEnabled) queue.push("biostar");
        setHuellaProviderQueue(queue);
        setHuellaProviderIndex(0);
        if (queue.length > 1) {
          // En captura dual, iniciar ambas vistas con lo registrado para mostrar bordes verdes.
          // Luego cada proveedor evoluciona por separado al capturar.
          setHuellasPorProveedor({
            hiki: [...huellas],
            biostar: [...huellas],
          });
          setSelectedFinger(getNextDefaultFinger(huellas));
        } else if (queue[0] === "biostar") {
          setHuellasPorProveedor({
            hiki: [],
            biostar: [...huellas],
          });
          setSelectedFinger(getNextDefaultFinger(huellas));
        } else {
          setHuellasPorProveedor({
            hiki: [...huellas],
            biostar: [],
          });
          setSelectedFinger(getNextDefaultFinger(huellas));
        }
      }
      setBiometriaStep(step);
      setTarjetaStep("lista");
      setTarjetaNombre("");
      setTarjetaDescripcion("");
      setTarjetaMensaje("");
      setBiometriaMensaje("");
      huellaCaptureCanceledRef.current = false;
      setBiometriaOpen(true);
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setBiometriaLoading(false);
    }
  };

  const cerrarBiometria = () => {
    if (biometriaStep === "espera") {
      huellaCaptureCanceledRef.current = true;
      huellaCaptureRunRef.current += 1;
    }
    setBiometriaOpen(false);
    setBiometriaStep("huella");
    setBiometriaEmpleado(null);
    setBiometriaMensaje("");
    setTarjetaStep("lista");
    setTarjetaNombre("");
    setTarjetaDescripcion("");
    setTarjetaMensaje("");
    setHuellaProviderQueue([]);
    setHuellaProviderIndex(0);
    setHikiPaneles([]);
    setBiostarDispositivos([]);
    setHikiPanelSeleccionado("");
    setBiostarDispositivoSeleccionado("");
    setHuellasPorProveedor({ hiki: [], biostar: [] });
  };

  const iniciarCapturaHuella = async () => {
    if (!biometriaEmpleado?._id) return;
    if (
      proveedorHuellaActual === "biostar" &&
      !biostarDispositivoSeleccionado
    ) {
      enqueueSnackbar("Selecciona un dispositivo BioStar para capturar.", {
        variant: "warning",
      });
      return;
    }
    if (proveedorHuellaActual === "hiki" && !hikiPanelSeleccionado) {
      enqueueSnackbar("Selecciona un panel Hikvision para capturar.", {
        variant: "warning",
      });
      return;
    }
    const MIN_WAIT_MS = 2000;
    const waitMin = new Promise((resolve) =>
      setTimeout(resolve, MIN_WAIT_MS)
    );
    try {
      const currentRunId = huellaCaptureRunRef.current + 1;
      huellaCaptureRunRef.current = currentRunId;
      huellaCaptureCanceledRef.current = false;
      setBiometriaStep("espera");
      const resPromise = clienteAxios.put(
        `/api/empleados/biometria/huella/${biometriaEmpleado._id}`,
        {
          dedo: selectedFinger,
          proveedor: proveedorHuellaActual,
          panel_hiki_id: hikiPanelSeleccionado || undefined,
          panel_biostar_id: biostarDispositivoSeleccionado || undefined,
        }
      );
      const [res] = await Promise.all([resPromise, waitMin]);
      if (
        huellaCaptureCanceledRef.current ||
        currentRunId !== huellaCaptureRunRef.current
      ) {
        return;
      }
      if (res.data.estado) {
        const huellas = res.data.datos?.huellas_registradas || [];
        const total = res.data.datos?.huellas_total ?? huellas.length;
        const proveedorKey = proveedorHuellaActual === "biostar" ? "biostar" : "hiki";
        const huellasProveedorActual = Array.from(
          new Set([
            ...((huellasPorProveedor[proveedorKey] || []).map((v: any) => Number(v))),
            Number(selectedFinger),
          ])
        ).sort((a, b) => a - b);
        const nextFinger = getNextDefaultFinger(huellasProveedorActual);
        setHuellasPorProveedor((prev) => {
          const key = proveedorKey;
          const actuales = Array.isArray(prev[key]) ? prev[key] : [];
          return {
            ...prev,
            [key]: Array.from(new Set([...actuales, Number(selectedFinger)])).sort((a, b) => a - b),
          };
        });
        setBiometriaEmpleado((prev: any) => ({
          ...prev,
          huellas_registradas: huellas,
          huellas_total: total,
        }));
        setSelectedFinger(nextFinger);
        setBiometriaMensaje(res.data.mensaje || `Huella registrada en ${proveedorHuellaLabel}.`);
        apiRef.current?.updateRows([
          {
            _id: biometriaEmpleado._id,
            huellas_total: total,
          },
        ]);
        if (haySiguienteProveedorHuella) {
          setHuellaProviderIndex((prev) => prev + 1);
          setBiometriaStep("huella");
          enqueueSnackbar(`Huella guardada en ${proveedorHuellaLabel}. Continúa con el siguiente sistema.`, {
            variant: "success",
          });
        } else {
          setBiometriaStep("ok");
        }
      } else {
        setBiometriaMensaje(res.data.mensaje || "No se pudo registrar la huella.");
        setBiometriaStep("error");
      }
    } catch (error) {
      await waitMin;
      if (huellaCaptureCanceledRef.current) return;
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
      setBiometriaMensaje("No se pudo registrar la huella.");
      setBiometriaStep("error");
    }
  };

  useEffect(() => {
    if (biometriaStep !== "huella") return;
    const proveedorKey = proveedorHuellaActual === "biostar" ? "biostar" : "hiki";
    const base = Array.isArray(huellasPorProveedor[proveedorKey])
      ? huellasPorProveedor[proveedorKey]
      : [];
    setSelectedFinger(getNextDefaultFinger(base));
  }, [proveedorHuellaActual, biometriaStep, huellasPorProveedor]);

  const reenviarHuellaGuardada = async () => {
    if (!biometriaEmpleado?._id) return;
    const MIN_WAIT_MS = 2000;
    const waitMin = new Promise((resolve) => setTimeout(resolve, MIN_WAIT_MS));
    try {
      setBiometriaStep("espera");
      const resPromise = clienteAxios.put(
        `/api/empleados/biometria/huella/reenviar/${biometriaEmpleado._id}`,
        { dedo: selectedFinger }
      );
      const [res] = await Promise.all([resPromise, waitMin]);
      if (res.data.estado) {
        setBiometriaMensaje(res.data.mensaje || "Huella reenviada correctamente.");
        setBiometriaStep("ok");
      } else {
        setBiometriaMensaje(res.data.mensaje || "No se pudo reenviar la huella.");
        setBiometriaStep("error");
      }
    } catch (error) {
      await waitMin;
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
      setBiometriaMensaje("No se pudo reenviar la huella.");
      setBiometriaStep("error");
    }
  };

  const tarjetasWeb = Array.isArray(biometriaEmpleado?.tarjetas_web)
    ? biometriaEmpleado.tarjetas_web
    : [];
  const tarjetasActuales = tarjetasWeb.length;
  const puedeAgregarTarjeta = tarjetasActuales < tarjetasMaximas;

  const abrirFormularioTarjeta = () => {
    if (!puedeAgregarTarjeta) return;
    setTarjetaNombre("");
    setTarjetaDescripcion("");
    setTarjetaMensaje("");
    setTarjetaStep("form");
  };

  const regresarListaTarjetas = () => {
    setTarjetaStep("lista");
    setTarjetaMensaje("");
  };

  const iniciarCapturaTarjeta = async () => {
    if (!biometriaEmpleado?._id) return;
    const nombre = tarjetaNombre.trim();
    if (!nombre) {
      enqueueSnackbar("El nombre de la tarjeta es obligatorio.", {
        variant: "warning",
      });
      return;
    }
    const MIN_WAIT_MS = 2000;
    const waitMin = new Promise((resolve) => setTimeout(resolve, MIN_WAIT_MS));
    try {
      setTarjetaStep("espera");
      const resPromise = clienteAxios.put(
        `/api/empleados/biometria/tarjeta/${biometriaEmpleado._id}`,
        {
          nombre,
          descripcion: tarjetaDescripcion.trim(),
        }
      );
      const [res] = await Promise.all([resPromise, waitMin]);
      if (res.data.estado) {
        const tarjetas = Array.isArray(res.data.datos?.tarjetas_web)
          ? res.data.datos.tarjetas_web
          : [];
        const total =
          res.data.datos?.tarjetas_total ??
          (Array.isArray(res.data.datos?.tarjetas_registradas)
            ? res.data.datos.tarjetas_registradas.length
            : tarjetas.length);
        setBiometriaEmpleado((prev: any) => ({
          ...prev,
          tarjetas_web: tarjetas,
          tarjetas_registradas: res.data.datos?.tarjetas_registradas || [],
          tarjetas_total: total,
        }));
        apiRef.current?.updateRows([
          {
            _id: biometriaEmpleado._id,
            tarjetas_total: total,
          },
        ]);
        setTarjetaMensaje(
          res.data.mensaje || "Tarjeta registrada correctamente."
        );
        setTarjetaStep("ok");
      } else {
        setTarjetaMensaje(
          res.data.mensaje || "No se pudo registrar la tarjeta."
        );
        setTarjetaStep("error");
      }
    } catch (error) {
      await waitMin;
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
      setTarjetaMensaje("No se pudo registrar la tarjeta.");
      setTarjetaStep("error");
    }
  };

  const eliminarTarjeta = async (tarjeta: any) => {
    if (!biometriaEmpleado?._id || !tarjeta?.id) return;
    try {
      await confirm({
        title: "Eliminar tarjeta",
        description: `Seguro que deseas borrar "${tarjeta.nombre}"?`,
      });
      const res = await clienteAxios.delete(
        `/api/empleados/biometria/tarjeta/${biometriaEmpleado._id}/${tarjeta.id}`
      );
      if (!res.data.estado) {
        enqueueSnackbar(res.data.mensaje || "No se pudo eliminar la tarjeta.", {
          variant: "warning",
        });
        return;
      }
      const tarjetas = Array.isArray(res.data.datos?.tarjetas_web)
        ? res.data.datos.tarjetas_web
        : [];
      const total =
        res.data.datos?.tarjetas_total ??
        (Array.isArray(res.data.datos?.tarjetas_registradas)
          ? res.data.datos.tarjetas_registradas.length
          : tarjetas.length);
      setBiometriaEmpleado((prev: any) => ({
        ...prev,
        tarjetas_web: tarjetas,
        tarjetas_registradas: res.data.datos?.tarjetas_registradas || [],
        tarjetas_total: total,
      }));
      apiRef.current?.updateRows([
        {
          _id: biometriaEmpleado._id,
          tarjetas_total: total,
        },
      ]);
      enqueueSnackbar(res.data.mensaje || "Tarjeta eliminada correctamente.", {
        variant: "success",
      });
    } catch {
      // cancelado por usuario
    }
  };

  useEffect(() => {
    const state = location.state as any;
    if (state?.reopenSyncBiostar && location.pathname === "/empleados") {
      setSyncBioOpen(true);
      cargarSyncBiostarPreview();
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
    if (
      state?.openBiometriaFor &&
      typeof state.openBiometriaFor === "string" &&
      (huellaHikiEnabled || huellaBiostarEnabled)
    ) {
      abrirBiometria(
        state.openBiometriaFor,
        state.biometriaStep === "tarjeta" && tarjetaHikiEnabled ? "tarjeta" : "huella"
      );
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, huellaHikiEnabled, huellaBiostarEnabled, tarjetaHikiEnabled]);

  const cargarResumenGrupos = useCallback(async () => {
    try {
      const res = await clienteAxios.get("/api/empleados/biostar-grupos-resumen");
      if (res.data?.estado) {
        setBiostarGroupOptions(Array.isArray(res.data.datos) ? res.data.datos : []);
      }
    } catch {
      setBiostarGroupOptions([]);
    }
  }, []);

  useEffect(() => {
    cargarResumenGrupos();
  }, [cargarResumenGrupos]);

  const devReplayEnabled = false;
  const biometriaBadgeWidth = 126;

  const getHandTransform = (side: "L" | "R") => {
    const rotate = side === "L" ? rotateLeft : -rotateLeft + mirrorAdjustRotate;
    const offsetX = side === "L" ? offsetLeftX : -offsetLeftX + mirrorAdjustX;
    const offsetY = side === "L" ? offsetLeftY : offsetLeftY + mirrorAdjustY;
    return `translate(${(offsetX / 100) * HAND_WIDTH}px, ${
      (offsetY / 100) * HAND_HEIGHT
    }px) rotate(${rotate}deg)`;
  };

  const getPalmHeight = (_side: "L" | "R") => clamp(palmHeightLeft, 80, 180);

  const getFingerAdjustForRender = (fingerId: number, side: "L" | "R") => {
    if (side === "L") return leftFingerAdjust[fingerId];
    const sourceId = leftIdMap[fingerId];
    const sourceAdjust = leftFingerAdjust[sourceId] || { dx: 0, dy: 0, rot: 0, h: 0 };
    return {
      dx: -sourceAdjust.dx,
      dy: sourceAdjust.dy,
      rot: -sourceAdjust.rot,
      h: sourceAdjust.h,
    };
  };

  const getFingerShapesForRender = (side: "L" | "R"): FingerShape[] => {
    if (side === "L") return LEFT_FINGER_SHAPES;
    return LEFT_FINGER_SHAPES.map((shape) => ({
      id: LEFT_TO_RIGHT_ID_MAP[shape.id],
      left: HAND_WIDTH - shape.left - shape.width,
      top: shape.top,
      width: shape.width,
      height: shape.height,
      rot: -shape.rot,
    }));
  };

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
          urlParams.set("estado", estadoFiltro);
          urlParams.set("biostar_live", "1");
          if (biostarGroupFilter) {
            urlParams.set("biostar_group_id", biostarGroupFilter);
          }
          const res = await clienteAxios.get(
            "/api/empleados?" + urlParams.toString()
          );
          //console.log("datos tabla ", res);
          if (res.data.estado) {
            setError("");
            rows = (res.data.datos.paginatedResults || []).map((r: any) => ({
              ...r,
              id_empleado: Number(r.id_empleado),
            }));
            setPendingSyncCount(
              rows.filter(
                (r: any) =>
                  !!r.sync_hikvision_pendiente || !!r.sync_biostar_pendiente
              ).length
            );
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
    [biostarGroupFilter, estadoFiltro]
  );

  useEffect(() => {
    apiRef.current?.dataSource?.fetchRows?.();
    cargarResumenGrupos();
  }, [biostarGroupFilter, estadoFiltro, apiRef, cargarResumenGrupos]);

  useEffect(() => {
    const interval = setInterval(() => {
      apiRef.current?.dataSource?.fetchRows?.();
      cargarResumenGrupos();
    }, 15000);
    return () => clearInterval(interval);
  }, [apiRef, cargarResumenGrupos]);

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
    navigate("nuevo-empleado");
  };

  const cargarSyncBiostarPreview = useCallback(async () => {
    try {
      setSyncBioLoading(true);
      const res = await clienteAxios.get("/api/empleados/biostar-sync/preview");
      if (!res.data?.estado) {
        enqueueSnackbar(res.data?.mensaje || "No se pudo consultar BioStar.", { variant: "warning" });
        setSyncBioPendientes([]);
        return;
      }
      setSyncBioPendientes(Array.isArray(res.data?.datos?.pendientes) ? res.data.datos.pendientes : []);
      setSyncBioSelected("");
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setSyncBioLoading(false);
    }
  }, [navigate]);

  const abrirSyncBiostar = async () => {
    setSyncBioOpen(true);
    await cargarSyncBiostarPreview();
  };
  const syncBioPendientesFiltrados = useMemo(() => {
    const term = syncBioSearch.trim().toLowerCase();
    if (!term) return syncBioPendientes;
    return syncBioPendientes.filter((u: any) => {
      const nombre = String(u?.nombre || "").toLowerCase();
      const correo = String(u?.correo || "").toLowerCase();
      const grupo = String(u?.biostar_group_name || "").toLowerCase();
      const faltantes = String((u?.motivos || []).join(" ") || "").toLowerCase();
      return (
        nombre.includes(term) ||
        correo.includes(term) ||
        grupo.includes(term) ||
        faltantes.includes(term)
      );
    });
  }, [syncBioPendientes, syncBioSearch]);

  const darAltaPendiente = () => {
    const selected = syncBioPendientes.find((p: any) => String(p.biostar_user_id) === syncBioSelected);
    if (!selected) {
      enqueueSnackbar("Selecciona un usuario pendiente.", { variant: "warning" });
      return;
    }
    setSyncBioOpen(false);
    navigate("nuevo-empleado", {
      state: {
        biostarPrefill: {
          nombre: selected.nombre || "",
          apellido_pat: selected.apellido_pat || "",
          apellido_mat: selected.apellido_mat || "",
          correo: selected.correo || "",
          telefono: selected.telefono || "",
          movil: selected.movil || "",
          extension: selected.extension || "",
          biostar_group_id: selected.biostar_group_id || "",
          biostar_user_id: selected.biostar_user_id || "",
        },
      },
    });
  };
  const columnasPendientesBiostar = [
    {
      field: "nombre",
      headerName: "Nombre",
      flex: 1,
      minWidth: 170,
      renderCell: ({ value }: any) => value || "(Sin nombre)",
    },
    {
      field: "correo",
      headerName: "Correo",
      flex: 1,
      minWidth: 200,
      renderCell: ({ value }: any) => value || "(Sin correo)",
    },
    {
      field: "biostar_group_name",
      headerName: "Grupo BioStar",
      flex: 1,
      minWidth: 170,
      renderCell: ({ value }: any) => value || "(Sin grupo)",
    },
    {
      field: "motivos_texto",
      headerName: "Faltantes",
      flex: 1.4,
      minWidth: 240,
      renderCell: ({ row }: any) =>
        (row.motivos || []).length
          ? (row.motivos || []).join(", ")
          : "Completar datos en RE",
    },
  ];

  const editarRegistro = (ID: string) => {
    navigate(`editar-empleado/${ID}`);
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle-empleado/${ID}`);
  };

  // [En proceso] Función de carga masiva deshabilitada temporalmente
  // const cargaMasiva = () => {
  //   navigate("carga-masiva");
  // };

  const cambiarEstado = async (ID: string, activo: boolean) => {
    if (!activo) {
      try {
        setRowLoading(ID, true);
        const res = await clienteAxios.patch(`/api/empleados/${ID}`, {
          activo,
        });
        if (res.data.estado) {
          apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);
          apiRef.current?.dataSource?.fetchRows?.();
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "error" });
        }
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      } finally {
        setRowLoading(ID, false);
      }
    } else {
      confirm({
        title: "¿Seguro que deseas desactivar a este empleado?",
        description: "",
        allowClose: true,
        confirmationText: "Continuar",
      })
        .then(async (result) => {
          if (result.confirmed) {
            setRowLoading(ID, true);
            const res = await clienteAxios.patch(`/api/empleados/${ID}`, {
              activo,
            });
            if (res.data.estado) {
              apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);
              apiRef.current?.dataSource?.fetchRows?.();
            } else {
              enqueueSnackbar(res.data.mensaje, { variant: "warning" });
            }
            setRowLoading(ID, false);
          }
        })
        .catch((error) => {
          setRowLoading(ID, false);
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
        });
    }
  };

  const descargarQr = async (ID: string, nombre: string) => {
    try {
      setIsDownloadingQr({ id_usuario: ID, descargando: true });
      const res = await clienteAxios.get(`/api/empleados/qr/${ID}`);
      if (res.data.estado) {
        base64ToFile(res.data.datos, "image/jpg", `${nombre}.jpg`);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsDownloadingQr({ id_usuario: ID, descargando: false });
    }
  };

  const reintentarSyncFila = async (ID: string) => {
    try {
      setRowLoading(ID, true);
      const res = await clienteAxios.post(`/api/empleados/${ID}/reintentar-sync`);
      if (res.data?.estado) {
        const pendientes: string[] = Array.isArray(res.data?.sync?.pendiente)
          ? res.data.sync.pendiente
          : [];
        if (pendientes.length === 0) {
          enqueueSnackbar("Sincronización completada.", { variant: "success" });
        } else {
          enqueueSnackbar(
            `Sincronización pendiente en: ${pendientes.join(", ")}.`,
            { variant: "warning" }
          );
        }
        apiRef.current?.dataSource?.fetchRows?.();
      } else {
        enqueueSnackbar(res.data?.mensaje || "No se pudo reintentar la sincronización.", {
          variant: "warning",
        });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setRowLoading(ID, false);
    }
  };

  // --- COLUMNAS OCULTAS TEMPORALMENTE ---
  // Las siguientes columnas se comentan porque no se requieren en la vista actual de empleados.
  // Si en el futuro se necesitan, solo descomentar. Motivo: simplificar la interfaz y mostrar solo lo esencial.

  /*
  {
    headerName: "ID",
    field: "id_empleado",
    flex: 1,
    display: "flex",
    minWidth: 80,
    // Ocultado porque no se necesita mostrar el ID en la gestión de empleados por ahora.
  },
  {
    headerName: "Rol",
    field: "rol",
    flex: 1,
    display: "flex",
    minWidth: 120,
    // Ocultado porque el rol no es relevante para la gestión directa de empleados en esta vista.
  },
  {
    headerName: "Tipo",
    field: "tipo",
    flex: 1,
    display: "flex",
    minWidth: 100,
    // Ocultado porque el tipo no se requiere en la gestión de empleados actualmente.
  },
  {
    headerName: "Arco",
    field: "arco",
    type: "actions",
    align: "center",
    flex: 1,
    display: "flex",
    minWidth:100,
    // Ocultado porque la funcionalidad de arco no es necesaria en esta etapa.
  },
  {
    headerName: "Acceso",
    field: "desbloqueo",
    type: "actions",
    align: "center",
    flex: 1,
    display: "flex",
    minWidth:100,
    // Ocultado porque la gestión de acceso no se requiere por ahora.
  },
  */
  // --- FIN COLUMNAS OCULTAS ---

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      {pendingSyncCount > 0 && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Hay {pendingSyncCount} empleado(s) con sincronización pendiente con integraciones.
        </Alert>
      )}
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        getRowHeight={() => "auto"}
        columns={[
          {
            headerName: "Foto",
            field: "img_usuario",
            disableExport: true,
            headerAlign: "center",
            align: "center",
            flex: 0,
            width: 70,
            minWidth: 70,
            display: "flex",
            renderCell: ({ row, value }) => (
              <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <Avatar
                  alt={row.nombre}
                  sx={(theme) => ({
                    backgroundColor: value
                      ? theme.palette.success.main
                      : theme.palette.error.main,
                    fontSize: 15,
                    width: 25,
                    height: 25,
                  })}
                />
              </div>
            ),
          },
          {
            headerName: "Empresa",
            field: "empresa",
            flex: 1,
            display: "flex",
            minWidth: 180,
          },
          {
            headerName: "Nombre",
            field: "nombre",
            flex: 1,
            display: "flex",
            minWidth: 180,
          },
          ...(huellaHikiEnabled || huellaBiostarEnabled
            ? [
                {
                  headerName: "Huella",
                  field: "huellas_total",
                  flex: 1,
                  minWidth: 150,
                  display: "flex" as const,
                  sortable: false,
                  renderCell: ({ row, value }: any) => {
                    const total = Number(value || 0);
                    return (
                      <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
                        <Button
                          size="small"
                          variant={total > 0 ? "contained" : "outlined"}
                          onClick={() => abrirBiometria(row._id, "huella")}
                          sx={{
                            width: biometriaBadgeWidth,
                            minWidth: biometriaBadgeWidth,
                            maxWidth: biometriaBadgeWidth,
                            whiteSpace: "nowrap",
                            bgcolor: total > 0 ? "success.main" : "#fff",
                            color: total > 0 ? "#fff" : "text.secondary",
                            borderColor: total > 0 ? "success.main" : "grey.500",
                            "&:hover": {
                              bgcolor: total > 0 ? "success.dark" : "#fff",
                              borderColor: total > 0 ? "success.dark" : "grey.700",
                            },
                          }}
                        >
                          {total > 0 ? `${total} huella(s)` : "Sin huellas"}
                        </Button>
                      </Box>
                    );
                  },
                },
                ...(tarjetaHikiEnabled
                  ? [{
                  headerName: "Tarjeta",
                  field: "tarjetas_total",
                  flex: 1,
                  minWidth: 150,
                  display: "flex" as const,
                  sortable: false,
                  renderCell: ({ row, value }: any) => {
                    const total = Number(value || 0);
                    return (
                      <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
                        <Button
                          size="small"
                          variant={total > 0 ? "contained" : "outlined"}
                          onClick={() => abrirBiometria(row._id, "tarjeta")}
                          sx={{
                            width: biometriaBadgeWidth,
                            minWidth: biometriaBadgeWidth,
                            maxWidth: biometriaBadgeWidth,
                            whiteSpace: "nowrap",
                            bgcolor: total > 0 ? "success.main" : "#fff",
                            color: total > 0 ? "#fff" : "text.secondary",
                            borderColor: total > 0 ? "success.main" : "grey.500",
                            "&:hover": {
                              bgcolor: total > 0 ? "success.dark" : "#fff",
                              borderColor: total > 0 ? "success.dark" : "grey.700",
                            },
                          }}
                        >
                          {total > 0 ? `${total} tarjeta(s)` : "Sin tarjetas"}
                        </Button>
                      </Box>
                    );
                  },
                }]
                  : []),
              ]
            : []),
          // Tipo: oculto por ahora porque no se ocupa en esta vista y se busca mantenerla simple.
          // Si se requiere mostrar el tipo de cuenta, descomentar este bloque.
          // {
          //   headerName: "Tipo",
          //   field: "esRoot",
          //   disableExport: true,
          //   flex: 1,
          //   display: "flex",
          //   minWidth: 100,
          //   renderCell: ({ value }) => (
          //     <Fragment>
          //       {value ? (
          //         <Chip
          //           label="Maestra"
          //           size="small"
          //           color="primary"
          //           sx={{ width: "100%" }}
          //         />
          //       ) : (
          //         <Chip
          //           label="Esclava"
          //           size="small"
          //           color="secondary"
          //           sx={{ width: "100%" }}
          //         />
          //       )}
          //     </Fragment>
          //   ),
          // },
          {
            headerName: "QR",
            field: "id_usuario",
            headerAlign: "center",
            align: "center",
            flex: 0,
            width: 70,
            minWidth: 70,
            display: "flex",
            renderCell: ({ row }) => {
              return (
                <Fragment>
                  {isDownloadingQr.descargando &&
                  row._id === isDownloadingQr.id_usuario ? (
                    <Spinner size="small" />
                  ) : (
                    <IconButton
                      onClick={() => descargarQr(row._id, row.nombre)}
                    >
                      <GetApp fontSize="small" color="success" />
                    </IconButton>
                  )}
                </Fragment>
              );
            },
          },
          {
            headerName: "Acciones",
            field: "activo",
            type: "actions",
            align: "center",
            flex: 1,
            display: "flex",
            minWidth: 120,
            sortable: false,
            getActions: ({ row }) => {
              const gridActions = [];
              const isLoading = !!loadingRows[row._id];
              if (isLoading) {
                return [
                  <GridActionsCellItem
                    icon={<CircularProgress size={18} />}
                    label="Procesando"
                    disabled
                    onClick={() => {}}
                  />,
                ];
              }
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
              if (row.id_empleado !== 1) {
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
              }
              if (row.sync_hikvision_pendiente || row.sync_biostar_pendiente) {
                const sistemas = [
                  ...(row.sync_hikvision_pendiente ? ["Hikvision"] : []),
                  ...(row.sync_biostar_pendiente ? ["BioStar"] : []),
                ].join(", ");
                gridActions.push(
                  <GridActionsCellItem
                    icon={<Autorenew color="warning" />}
                    onClick={() => reintentarSyncFila(row._id)}
                    label={`Reintentar sync (${sistemas})`}
                    title={`Reintentar sync (${sistemas})`}
                  />
                );
              }
              return gridActions;
            },
          },
        ]}
        disableColumnFilter
        filterDebounceMs={1000}
        dataSource={dataSource}
        dataSourceCache={null}
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
        disableMultipleRowSelection
        sx={{
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": {
            outline: "none",
          },
          "& .MuiDataGrid-cell:focus-within, & .MuiDataGrid-columnHeader:focus-within": {
            outline: "none",
          },
          "& .MuiDataGrid-row.Mui-selected": {
            backgroundColor: "rgba(122,60,255,0.10) !important",
          },
          "& .MuiDataGrid-row.Mui-selected:hover": {
            backgroundColor: "rgba(122,60,255,0.14) !important",
          },
        }}
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
              tableTitle="Gestión de Empleados"
              customActionButtons={
                <Fragment>
                  <FormControl
                    size="small"
                    sx={{ minWidth: 260, mr: 1 }}
                  >
                    <InputLabel id="grupo-biostar-filter-label">
                      Grupo BioStar
                    </InputLabel>
                    <Select
                      labelId="grupo-biostar-filter-label"
                      value={biostarGroupFilter}
                      label="Grupo BioStar"
                      onChange={(e) =>
                        setBiostarGroupFilter(String(e.target.value || ""))
                      }
                    >
                      <MenuItem value="">
                        Todos
                      </MenuItem>
                      {biostarGroupOptions.map((item) => (
                        <MenuItem key={item.id_externo} value={item.id_externo}>
                          {item.nombre} ({item.total})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Tooltip title="Agregar">
                    <IconButton onClick={nuevoRegistro}>
                      <Add fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Sincronizar BioStar">
                    <IconButton onClick={abrirSyncBiostar}>
                      <Autorenew fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {/* [En proceso] Botón de carga masiva oculto porque la funcionalidad aún no está disponible
                  <Tooltip title="Carga masiva">
                    <IconButton onClick={cargaMasiva}>
                      <Upload fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  */}
                </Fragment>
              }
            />
          ),
        }}
      />
      <Dialog
        open={syncBioOpen}
        onClose={() => setSyncBioOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { minHeight: 560 } }}
      >
        <DialogTitle>Pendientes de BioStar</DialogTitle>
        <DialogContent dividers sx={{ minHeight: 460 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por nombre, correo, grupo o faltantes"
            value={syncBioSearch}
            onChange={(e) => setSyncBioSearch(String(e.target.value || ""))}
            sx={{ mb: 2 }}
          />
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            Selecciona un registro para completar alta en RE ({syncBioPendientesFiltrados.length})
          </Typography>
          <Box sx={{ width: "100%", height: 320 }}>
            {syncBioLoading && <Spinner />}
            {!syncBioLoading && syncBioPendientesFiltrados.length === 0 && (
              <Typography variant="body2" sx={{ p: 2 }}>
                No hay registros para el filtro actual.
              </Typography>
            )}
            {!syncBioLoading && syncBioPendientesFiltrados.length > 0 && (
              <DataGrid
                rows={syncBioPendientesFiltrados.map((u: any) => ({
                  ...u,
                  id: String(u.biostar_user_id),
                  motivos_texto: (u.motivos || []).join(", "),
                }))}
                columns={columnasPendientesBiostar as any}
                getRowId={(row) => row.id}
                onRowClick={(params) => setSyncBioSelected(String(params.row?.id || ""))}
                getRowClassName={(params) =>
                  String(params.row?.id || "") === syncBioSelected ? "fila-pendiente-seleccionada" : ""
                }
                pageSizeOptions={[5, 10, 25]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 5, page: 0 } },
                }}
                disableRowSelectionOnClick={false}
                sx={{
                  "& .MuiDataGrid-cell, & .MuiDataGrid-columnHeaderTitle": {
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  },
                  "& .MuiDataGrid-virtualScroller": {
                    overflowX: "hidden !important",
                  },
                  "& .MuiDataGrid-main": {
                    overflowX: "hidden",
                  },
                  "& .fila-pendiente-seleccionada": {
                    backgroundColor: "rgba(122,60,255,0.10)",
                  },
                }}
                localeText={esES.components.MuiDataGrid.defaultProps.localeText}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={cargarSyncBiostarPreview} disabled={syncBioLoading}>Recargar</Button>
          <Button onClick={() => setSyncBioOpen(false)}>Cerrar</Button>
          <Button variant="contained" onClick={darAltaPendiente} disabled={!syncBioSelected || syncBioLoading}>
            Dar de alta
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={biometriaOpen}
        onClose={(_, reason) => {
          if (reason === "backdropClick") return;
          cerrarBiometria();
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#ffffff",
            width: "100%",
            maxWidth: 620,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1.1rem", color: "text.primary" }}>
          {biometriaStep === "tarjeta"
            ? "Configurar tarjeta Hikvision"
            : `Configurar huella ${proveedorHuellaActual === "biostar" ? "BioStar" : "Hikvision"}`}
          <Tooltip title={biometriaStep === "espera" ? "Cancelar captura" : "Cerrar"}>
            <IconButton
              onClick={cerrarBiometria}
              sx={{ position: "absolute", right: 8, top: 8 }}
              size="small"
              color="error"
            >
              <Close />
            </IconButton>
          </Tooltip>
        </DialogTitle>
        <DialogContent dividers sx={{ bgcolor: "#ffffff" }}>
          {biometriaLoading && <Spinner />}
          {!biometriaLoading && biometriaEmpleado && (
            <Box>
              <Box sx={{ mb: 2, fontSize: "0.95rem" }}>
                <strong>Empleado:</strong> {biometriaEmpleado.nombre}
              </Box>

              {(biometriaStep === "huella" ||
                biometriaStep === "espera" ||
                biometriaStep === "ok" ||
                biometriaStep === "error") && (
                <Box>
                  <Box sx={{ mb: 1, fontSize: "0.9rem", color: "text.secondary" }}>
                    Sistema actual: <strong>{proveedorHuellaLabel}</strong>
                  </Box>
                  {biometriaStep === "huella" && (
                    <>
                      <Box sx={{ mb: 1.5 }}>
                        {proveedorHuellaActual === "hiki" ? (
                          <FormControl size="small" fullWidth>
                            <InputLabel id="hiki-panel-select-label">Panel Hikvision para captura</InputLabel>
                            <Select
                              labelId="hiki-panel-select-label"
                              value={hikiPanelSeleccionado}
                              label="Panel Hikvision para captura"
                              onChange={(e) => setHikiPanelSeleccionado(String(e.target.value || ""))}
                            >
                              {hikiPaneles.map((panel) => (
                                <MenuItem key={panel.id} value={panel.id}>
                                  {panel.nombre || panel.direccion_ip}
                                  {panel.es_panel_maestro ? " (Main)" : ""}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        ) : (
                          <FormControl size="small" fullWidth>
                            <InputLabel id="biostar-device-select-label">Dispositivo BioStar para captura</InputLabel>
                            <Select
                              labelId="biostar-device-select-label"
                              value={biostarDispositivoSeleccionado}
                              label="Dispositivo BioStar para captura"
                              onChange={(e) => setBiostarDispositivoSeleccionado(String(e.target.value || ""))}
                            >
                              {biostarDispositivos.length > 1 && (
                                <MenuItem value="">Selecciona un dispositivo</MenuItem>
                              )}
                              {biostarDispositivos.map((device) => (
                                <MenuItem key={device.id} value={device.id}>
                                  {device.nombre || "Sin nombre"}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        )}
                      </Box>
                        <>
                          <Box sx={{ mb: 1, fontWeight: 700, fontSize: "0.95rem" }}>
                            Selecciona el dedo para capturar
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              gap: 4,
                              flexWrap: "wrap",
                            }}
                          >
                            {(["L", "R"] as const).map((side) => (
                              <Box
                                key={side}
                                sx={{
                                  position: "relative",
                                  width: HAND_WIDTH,
                                  height: HAND_HEIGHT,
                                  bgcolor: "transparent",
                                }}
                              >
                                <Box
                                  sx={{
                                    position: "absolute",
                                    inset: 0,
                                    transform: getHandTransform(side),
                                    transformOrigin: "50% 55%",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      position: "absolute",
                                      left: 38,
                                      top: 78,
                                      width: 104,
                                      height: getPalmHeight(side),
                                      borderRadius: "34px",
                                      bgcolor: "#f3c998",
                                      border: "2px solid #d89f6b",
                                      boxShadow: "inset 0 0 0 2px #f9d8b4",
                                    }}
                                  />
                                  {getFingerShapesForRender(side).map((fingerShape) => {
                                    const adjust = getFingerAdjustForRender(
                                      fingerShape.id,
                                      side
                                    );
                                    const proveedorKey =
                                      proveedorHuellaActual === "biostar"
                                        ? "biostar"
                                        : "hiki";
                                    const registradasProveedor = huellasPorProveedor[proveedorKey];
                                    const registrado = (
                                      (registradasProveedor || []).map((v: any) =>
                                        Number(v)
                                      )
                                    ).includes(fingerShape.id);
                                    const selectedForCapture = selectedFinger === fingerShape.id;
                                    const highlight = selectedForCapture;
                                    const finger = fingers.find((f) => f.id === fingerShape.id);
                                    return (
                                      <Tooltip
                                        key={fingerShape.id}
                                        title={`${finger?.label || "Dedo"} ${
                                          registrado ? "(registrado)" : "(sin registrar)"
                                        }`}
                                      >
                                        <Box
                                          onClick={() => {
                                            setSelectedFinger(fingerShape.id);
                                          }}
                                          sx={{
                                            position: "absolute",
                                            left: fingerShape.left,
                                            top: fingerShape.top,
                                            width: fingerShape.width,
                                            height: clamp(fingerShape.height + adjust.h, 30, 140),
                                            borderRadius: "14px",
                                          transform: `translate(${adjust.dx}px, ${adjust.dy}px) rotate(${
                                            fingerShape.rot + adjust.rot
                                          }deg)`,
                                          transformOrigin: "center",
                                          bgcolor: "#f3c998",
                                          border: highlight
                                            ? "2px solid #7a3cff"
                                            : registrado
                                            ? "2px solid #66bb6a"
                                            : "2px solid #d89f6b",
                                          boxShadow: selectedForCapture
                                            ? "0 0 0 3px rgba(122,60,255,.22)"
                                            : registrado
                                            ? "0 0 0 1px rgba(102,187,106,.22)"
                                            : "none",
                                          cursor: "pointer",
                                        }}
                                      />
                                      </Tooltip>
                                    );
                                  })}
                                </Box>
                                <Box
                                  sx={{
                                    position: "absolute",
                                    left: "50%",
                                    bottom: 10,
                                    transform: "translateX(-50%)",
                                    fontSize: 12,
                                    color: "#6a4a2e",
                                    fontWeight: 600,
                                  }}
                                >
                                  {side === "L" ? "Mano izquierda" : "Mano derecha"}
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </>
                    </>
                  )}

                  {biometriaStep === "espera" && (
                    <Box sx={{ py: 4, textAlign: "center" }}>
                      <CircularProgress size={40} sx={{ mb: 2 }} />
                      <Box sx={{ fontSize: "1rem", fontWeight: 700, mb: 0.5 }}>
                        Registrando huella...
                      </Box>
                      <Box sx={{ color: "text.secondary" }}>
                        Revisa el panel para capturar la huella del empleado.
                      </Box>
                    </Box>
                  )}

                  {biometriaStep === "ok" && (
                    <Alert icon={<CheckCircleOutline />} severity="success" sx={{ mt: 2 }}>
                      {biometriaMensaje}
                    </Alert>
                  )}
                  {biometriaStep === "error" && (
                    <Alert icon={<ErrorOutline />} severity="error" sx={{ mt: 2 }}>
                      {biometriaMensaje || "No se pudo registrar la huella."}
                    </Alert>
                  )}
                </Box>
              )}

              {biometriaStep === "tarjeta" && (
                <Box>
                  {tarjetaStep === "lista" && (
                    <Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1.5,
                        }}
                      >
                        <Box sx={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          Tarjetas de web ({tarjetasActuales}/{tarjetasMaximas})
                        </Box>
                        <Tooltip
                          title={
                            puedeAgregarTarjeta
                              ? "Registrar nueva tarjeta"
                              : "No puedes agregar más de 10 tarjetas. Borra una para continuar."
                          }
                        >
                          <span>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={abrirFormularioTarjeta}
                              disabled={!puedeAgregarTarjeta}
                              sx={{ fontWeight: 700, color: "common.white" }}
                            >
                              Registrar nueva
                            </Button>
                          </span>
                        </Tooltip>
                      </Box>
                      <Box
                        sx={{
                          border: "1px solid rgba(0,0,0,0.12)",
                          borderRadius: 1,
                          overflow: "hidden",
                        }}
                      >
                        {tarjetasWeb.length === 0 && (
                          <Box sx={{ p: 2, color: "text.secondary", fontSize: "0.92rem" }}>
                            Aún no hay tarjetas registradas en este módulo.
                          </Box>
                        )}
                        {tarjetasWeb.map((tarjeta: any) => (
                          <Box
                            key={tarjeta.id}
                            sx={{
                              p: 1.2,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              borderBottom: "1px solid rgba(0,0,0,0.08)",
                              "&:last-of-type": { borderBottom: "none" },
                            }}
                          >
                            <Box sx={{ pr: 2 }}>
                              <Box sx={{ fontWeight: 700, fontSize: "0.92rem" }}>
                                {tarjeta.nombre}
                              </Box>
                              <Box sx={{ fontSize: "0.86rem", color: "text.secondary" }}>
                                {tarjeta.descripcion || "Sin descripción"}
                              </Box>
                              <Box sx={{ fontSize: "0.8rem", color: "text.disabled", mt: 0.3 }}>
                                ID: {String(tarjeta.card_no || "").slice(-8)}
                              </Box>
                            </Box>
                            <Tooltip title="Eliminar tarjeta">
                              <IconButton
                                color="error"
                                size="small"
                                onClick={() => eliminarTarjeta(tarjeta)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {tarjetaStep === "form" && (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                      <TextField
                        label="Nombre de la tarjeta"
                        value={tarjetaNombre}
                        onChange={(e) => setTarjetaNombre(e.target.value)}
                        size="small"
                        fullWidth
                        required
                        autoFocus
                        inputProps={{ maxLength: 60 }}
                      />
                      <TextField
                        label="Descripción (opcional)"
                        value={tarjetaDescripcion}
                        onChange={(e) => setTarjetaDescripcion(e.target.value)}
                        size="small"
                        fullWidth
                        multiline
                        minRows={2}
                        inputProps={{ maxLength: 140 }}
                      />
                    </Box>
                  )}

                  {tarjetaStep === "espera" && (
                    <Box sx={{ py: 4, textAlign: "center" }}>
                      <CircularProgress size={40} sx={{ mb: 2 }} />
                      <Box sx={{ fontSize: "1rem", fontWeight: 700, mb: 0.5 }}>
                        Registrando tarjeta...
                      </Box>
                      <Box sx={{ color: "text.secondary" }}>
                        Revisa el panel y acerca la tarjeta al lector.
                      </Box>
                    </Box>
                  )}

                  {tarjetaStep === "ok" && (
                    <Alert icon={<CheckCircleOutline />} severity="success" sx={{ mt: 1 }}>
                      {tarjetaMensaje || "Tarjeta registrada correctamente."}
                    </Alert>
                  )}

                  {tarjetaStep === "error" && (
                    <Alert icon={<ErrorOutline />} severity="error" sx={{ mt: 1 }}>
                      {tarjetaMensaje || "No se pudo registrar la tarjeta."}
                    </Alert>
                  )}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {biometriaStep === "huella" && (
            <Box sx={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box>
              {devReplayEnabled && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={reenviarHuellaGuardada}
                  sx={{ fontWeight: 700 }}
                >
                  Reenviar huella (DEV)
                </Button>
              )}
              <Button
                variant="contained"
                onClick={iniciarCapturaHuella}
                sx={{ fontWeight: 700, color: "common.white" }}
              >
                Capturar
              </Button>
              </Box>
              {huellaProviderQueue.length > 1 && (
                <Button
                  variant="outlined"
                  color="warning"
                  onClick={() => {
                    setHuellaProviderIndex((prev) =>
                      haySiguienteProveedorHuella ? prev + 1 : Math.max(0, prev - 1)
                    );
                    setBiometriaMensaje("");
                  }}
                  sx={{ fontWeight: 700 }}
                >
                  {haySiguienteProveedorHuella ? "Omitir" : "Atras"}
                </Button>
              )}
            </Box>
          )}
          {biometriaStep === "ok" && (
            <Button
              variant="contained"
              onClick={() => setBiometriaStep("huella")}
              sx={{ fontWeight: 700, color: "common.white" }}
              >
                Registrar otra
              </Button>
              
          )}
          {biometriaStep === "ok" && (
            <Button
              variant="outlined"
              onClick={cerrarBiometria}
              sx={{ fontWeight: 700 }}
            >
              Cerrar
            </Button>
          )}
          {biometriaStep === "error" && (
            <Button
              variant="contained"
              color="warning"
              onClick={() => setBiometriaStep("huella")}
              sx={{ fontWeight: 700, color: "common.white" }}
            >
              Volver a intentar
            </Button>
          )}
          {biometriaStep === "error" && (
            <Button
              variant="outlined"
              onClick={cerrarBiometria}
              sx={{ fontWeight: 700 }}
            >
              Cerrar
            </Button>
          )}
          {biometriaStep === "tarjeta" && tarjetaStep === "lista" && (
            <Button
              variant="outlined"
              onClick={cerrarBiometria}
              sx={{ fontWeight: 700 }}
            >
              Cerrar
            </Button>
          )}
          {biometriaStep === "tarjeta" && tarjetaStep === "form" && (
            <>
              <Button
                variant="outlined"
                onClick={regresarListaTarjetas}
                sx={{ fontWeight: 700 }}
              >
                Regresar
              </Button>
              <Button
                variant="contained"
                onClick={iniciarCapturaTarjeta}
                sx={{ fontWeight: 700, color: "common.white" }}
              >
                Crear
              </Button>
            </>
          )}
          {biometriaStep === "tarjeta" && tarjetaStep === "ok" && (
            <>
              <Button
                variant="contained"
                onClick={abrirFormularioTarjeta}
                disabled={!puedeAgregarTarjeta}
                sx={{ fontWeight: 700, color: "common.white" }}
              >
                Registrar otra
              </Button>
              <Button
                variant="outlined"
                onClick={cerrarBiometria}
                sx={{ fontWeight: 700 }}
              >
                Cerrar
              </Button>
            </>
          )}
          {biometriaStep === "tarjeta" && tarjetaStep === "error" && (
            <>
              <Button
                variant="contained"
                color="warning"
                onClick={abrirFormularioTarjeta}
                sx={{ fontWeight: 700, color: "common.white" }}
              >
                Volver a intentar
              </Button>
              <Button
                variant="outlined"
                onClick={cerrarBiometria}
                sx={{ fontWeight: 700 }}
              >
                Cerrar
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
      {error && (
        <ErrorOverlay error={error} gridDataRef={apiRef.current?.dataSource} />
      )}
      <Outlet context={apiRef.current?.dataSource} />
    </div>
  );
}


