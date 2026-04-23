import { useState, useMemo, Fragment, useEffect } from "react";
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
  IconButton,
  Tooltip,
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
  const { habilitarIntegracionHvBiometria } = useSelector(
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
  const setRowLoading = (id: string, isLoading: boolean) =>
    setLoadingRows((prev) => ({ ...prev, [id]: isLoading }));

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
      setBiometriaLoading(true);
      const res = await clienteAxios.get(`/api/empleados/biometria/${id}`);
      if (!res.data.estado) {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        return;
      }
      const datos = res.data.datos;
      setBiometriaEmpleado(datos);
      const huellas = Array.isArray(datos?.huellas_registradas)
        ? datos.huellas_registradas
        : [];
      const defaultFinger = getNextDefaultFinger(huellas);
      setSelectedFinger(defaultFinger);
      setBiometriaStep(step);
      setBiometriaMensaje("");
      setBiometriaOpen(true);
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setBiometriaLoading(false);
    }
  };

  const cerrarBiometria = () => {
    setBiometriaOpen(false);
    setBiometriaStep("huella");
    setBiometriaEmpleado(null);
    setBiometriaMensaje("");
  };

  const iniciarCapturaHuella = async () => {
    if (!biometriaEmpleado?._id) return;
    const MIN_WAIT_MS = 2000;
    const waitMin = new Promise((resolve) =>
      setTimeout(resolve, MIN_WAIT_MS)
    );
    try {
      setBiometriaStep("espera");
      const resPromise = clienteAxios.put(
        `/api/empleados/biometria/huella/${biometriaEmpleado._id}`,
        { dedo: selectedFinger }
      );
      const [res] = await Promise.all([resPromise, waitMin]);
      if (res.data.estado) {
        const huellas = res.data.datos?.huellas_registradas || [];
        const total = res.data.datos?.huellas_total ?? huellas.length;
        const nextFinger = getNextDefaultFinger(huellas);
        setBiometriaEmpleado((prev: any) => ({
          ...prev,
          huellas_registradas: huellas,
          huellas_total: total,
        }));
        setSelectedFinger(nextFinger);
        setBiometriaMensaje(
          res.data.mensaje || "Huella registrada correctamente."
        );
        apiRef.current?.updateRows([
          {
            _id: biometriaEmpleado._id,
            huellas_total: total,
          },
        ]);
        setBiometriaStep("ok");
      } else {
        setBiometriaMensaje(res.data.mensaje || "No se pudo registrar la huella.");
        setBiometriaStep("error");
      }
    } catch (error) {
      await waitMin;
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
      setBiometriaMensaje("No se pudo registrar la huella.");
      setBiometriaStep("error");
    }
  };

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

  useEffect(() => {
    const state = location.state as any;
    if (
      state?.openBiometriaFor &&
      typeof state.openBiometriaFor === "string" &&
      habilitarIntegracionHvBiometria
    ) {
      abrirBiometria(
        state.openBiometriaFor,
        state.biometriaStep === "tarjeta" ? "tarjeta" : "huella"
      );
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state, habilitarIntegracionHvBiometria]);

  const devReplayEnabled = false;

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
            console.log("Filas", rows);
            
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
          ...(habilitarIntegracionHvBiometria
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
                      <Button
                        size="small"
                        variant={total > 0 ? "contained" : "outlined"}
                        onClick={() => abrirBiometria(row._id, "huella")}
                        sx={{
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
                    );
                  },
                },
                {
                  headerName: "Tarjeta",
                  field: "tarjetas_total",
                  flex: 1,
                  minWidth: 150,
                  display: "flex" as const,
                  sortable: false,
                  renderCell: ({ row, value }: any) => {
                    const total = Number(value || 0);
                    return (
                      <Button
                        size="small"
                        variant={total > 0 ? "contained" : "outlined"}
                        onClick={() => abrirBiometria(row._id, "tarjeta")}
                        sx={{
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
                    );
                  },
                },
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
                  <Tooltip title="Agregar">
                    <IconButton onClick={nuevoRegistro}>
                      <Add fontSize="small" />
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
        open={biometriaOpen}
        onClose={cerrarBiometria}
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
          Configurar huella / tarjeta
          <IconButton
            onClick={cerrarBiometria}
            sx={{ position: "absolute", right: 8, top: 8 }}
            size="small"
            color="error"
          >
            <Close />
          </IconButton>
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
                  {biometriaStep === "huella" && (
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
                                const registrado = (
                                  (biometriaEmpleado.huellas_registradas || []).map((v: any) =>
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
                <Alert severity="info">
                  Configuracion de tarjeta: esqueleto listo (implementacion en
                  siguiente fase).
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {biometriaStep === "huella" && (
            <>
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
                Siguiente
              </Button>
            </>
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
          {biometriaStep === "tarjeta" && (
            <Button
              variant="contained"
              onClick={cerrarBiometria}
              sx={{ fontWeight: 700, color: "common.white" }}
            >
              Omitir y salir
            </Button>
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

