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

const pageSizeOptions = [10, 25, 50];

type TContratistaSeleccion = {
  id: string;
  empresa: string;
};

const DOCUMENTOS_CONTRATISTAS = [
  { key: "identificacion_oficial", label: "Identificación oficial" },
  { key: "sua", label: "SUA" },
  { key: "permiso_entrada", label: "Permiso de entrada" },
  { key: "lista_articulos", label: "Lista de artículos" },
  { key: "repse", label: "REPSE" },
  { key: "soporte_pago_actualizado", label: "Soporte de pago actualizado" },
  { key: "constancia_vigencia_imss", label: "Constancia de vigencia IMSS" },
  { key: "constancias_habilidades", label: "Constancias de habilidades" },
];

const REQUIRED_DOC_KEYS = [
  "identificacion_oficial",
  "sua",
  "permiso_entrada",
  "lista_articulos",
  "repse",
  "soporte_pago_actualizado",
];

const areDocsComplete = (value?: Record<string, boolean> | null) =>
  REQUIRED_DOC_KEYS.every((key) => Boolean(value?.[key]));

const createChecks = () =>
  DOCUMENTOS_CONTRATISTAS.reduce<Record<string, boolean>>((acc, { key }) => {
    acc[key] = false;
    return acc;
  }, {});

export default function Contratistas() {
  const apiRef = useGridApiRef();
  const apiRefVisitantes = useGridApiRef();
  const [error, setError] = useState<string>();
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showVisitantes, setShowVisitantes] = useState(false);
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
  const [isLoadingDetalle, setIsLoadingDetalle] = useState(false);
  const [isLoadingVerificar, setIsLoadingVerificar] = useState(false);
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

        return {
          rows,
          rowCount,
        };
      },
    }),
    [contratistaSeleccion?.id, filtroDocs, navigate]
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

  const abrirVisitantes = (id?: string, empresa?: string) => {
    if (!id || !empresa) return;
    setContratistaSeleccion({ id, empresa });
    setShowVisitantes(true);
  };

  const cerrarVisitantes = () => {
    setShowVisitantes(false);
    setSelectedVisitanteId(null);
    setSelectedVisitante(null);
    setShowDetalleVisitante(false);
    setShowVerificarVisitante(false);
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
    setSelectedVisitanteId(String(target._id || target.id));
    setSelectedVisitante(target);
    setVerifChecks(createChecks());
    setExpandedDocKey(false);
    setShowVerificarVisitante(true);
    setShowVisitantes(false);
    cargarVisitanteDetalle(String(target._id || target.id), true);
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
    if (!areDocsComplete(verifChecks)) {
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
    if (areDocsComplete(verifChecks)) return;
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
          abrirVisitantes(String(params.row._id), String(params.row.empresa));
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
                            selectedRowId || undefined,
                            String(
                              apiRef.current?.getRow(selectedRowId || "")
                                ?.empresa || ""
                            )
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
                    valueFormatter: (value?: string) =>
                      value && String(value).trim() ? String(value) : "-",
                  },
                  {
                    headerName: "Correo",
                    field: "correo",
                    flex: 1,
                    display: "flex",
                    minWidth: 200,
                    valueFormatter: (value?: string) =>
                      value && String(value).trim() ? String(value) : "-",
                  },
                  {
                    headerName: "Teléfono",
                    field: "telefono",
                    flex: 1,
                    display: "flex",
                    minWidth: 140,
                    valueFormatter: (value?: string) =>
                      value && String(value).trim() ? String(value) : "-",
                  },
                  {
                    headerName: "Estado",
                    field: "estado_validacion",
                    flex: 1,
                    display: "flex",
                    minWidth: 140,
                    headerAlign: "center",
                    align: "center",
                    renderCell: ({ value }) => {
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
                    getActions: ({ row }) => [
                      <GridActionsCellItem
                        icon={<Visibility color="primary" />}
                        onClick={() => abrirDetalleVisitante(row)}
                        label="Ver"
                        title="Ver"
                      />,
                    ],
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
                  if (row?.estado_validacion === 2) {
                    abrirDetalleVisitante(row);
                  } else {
                    abrirVerificarVisitante(row);
                  }
                }}
                getRowClassName={(params) =>
                  params.id === selectedVisitanteId ? "row-selected" : ""
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
                              onClick={() => abrirVerificarVisitante()}
                              disabled={
                                !selectedVisitante ||
                                selectedVisitante?.estado_validacion === 2
                              }
                            >
                              Verificar
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
                {DOCUMENTOS_CONTRATISTAS.filter(
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
                        {docUrl ? (
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
                        ) : (
                          <Typography variant="body2">Sin archivo</Typography>
                        )}
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
                  const opcionales = DOCUMENTOS_CONTRATISTAS.filter(({ key }) =>
                    ["constancia_vigencia_imss", "constancias_habilidades"].includes(key)
                  ).filter(({ key }) => Boolean(documentos?.[key]));
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
                              {docUrl ? (
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
                              ) : (
                                <Typography variant="body2">Sin archivo</Typography>
                              )}
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
                    {DOCUMENTOS_CONTRATISTAS.filter(
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
                          {docUrl ? (
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
                          ) : (
                            <Typography variant="body2">Sin archivo</Typography>
                        )}
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
                      const opcionales = DOCUMENTOS_CONTRATISTAS.filter(({ key }) =>
                        ["constancia_vigencia_imss", "constancias_habilidades"].includes(
                          key
                        )
                      ).filter(({ key }) => Boolean(documentos?.[key]));
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
                                  {docUrl ? (
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
                                  ) : (
                                    <Typography variant="body2">Sin archivo</Typography>
                                  )}
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
                    {areDocsComplete(verifChecks) ? (
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
          <Card sx={{ width: "100%", maxWidth: 600, height: "60vh", maxHeight: "60vh" }}>
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
                minRows={3}
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
    </div>
  );
}
