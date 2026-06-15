import { useState, useMemo, useEffect } from "react";
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
import { Outlet, useNavigate } from "react-router-dom";
import { esES } from "@mui/x-data-grid/locales";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { FilterAltOff, InboxOutlined, Refresh, Verified, Visibility } from "@mui/icons-material";
import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ErrorOverlay from "../../error/DataGridError";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import { DatePicker, type DateValidationError } from "@mui/x-date-pickers";

const pageSizeOptions = [10, 25, 50];

type ContratistasSolicitudesProps = {
  embedded?: boolean;
};

const getEstadoLabel = (estado?: number) => {
  if (estado === 2) return { label: "Aprobada", color: "success" as const };
  if (estado === 3) return { label: "Rechazada", color: "error" as const };
  if (estado === 4) return { label: "Parcial", color: "warning" as const };
  return { label: "Pendiente de verificar", color: "warning" as const };
};

export default function ContratistasSolicitudes({ embedded = false }: ContratistasSolicitudesProps) {
  const apiRef = useGridApiRef();
  const [error, setError] = useState<string>();
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedRowEstado, setSelectedRowEstado] = useState<number | null>(null);
  const navigate = useNavigate();
  const [estadoFiltro, setEstadoFiltro] = useState<number | null>(null);
  const [fechaDesde, setFechaDesde] = useState(dayjs().startOf("month"));
  const [fechaHasta, setFechaHasta] = useState(dayjs().endOf("month"));
  const [resumen, setResumen] = useState({
    total: 0,
    pendientes: 0,
    aprobadas: 0,
    rechazadas: 0,
    parciales: 0,
    urgentes: 0,
  });
  const [fechaDesdeError, setFechaDesdeError] = useState<string>("");
  const [fechaHastaError, setFechaHastaError] = useState<string>("");
  const [urgenteFiltro, setUrgenteFiltro] = useState(false);
  const [empresaFiltro, setEmpresaFiltro] = useState("");
  const [empresasDisponibles, setEmpresasDisponibles] = useState<string[]>([]);
  const isTodosSelected = estadoFiltro === null && !urgenteFiltro;

  const safeIso = (value: dayjs.Dayjs | null) => {
    if (!value || !value.isValid()) return "";
    try {
      return value.toISOString();
    } catch {
      // eslint-disable-next-line no-console
      console.warn("Invalid time value al convertir fecha en Solicitudes de Contratistas.");
      return "";
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      apiRef.current?.dataSource?.fetchRows?.();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [apiRef]);

  useEffect(() => {
    apiRef.current?.dataSource?.fetchRows?.();
  }, [apiRef, estadoFiltro, fechaDesde, fechaHasta, urgenteFiltro, empresaFiltro]);

  useEffect(() => {
    const obtenerResumen = async () => {
      try {
        const desdeIso = safeIso(fechaDesde);
        const hastaIso = safeIso(fechaHasta);
        if (!desdeIso || !hastaIso) return;
        const empresaParam = empresaFiltro.trim();
        const res = await clienteAxios.get(
          `/api/contratistas-solicitudes/resumen-admin?fecha_desde=${desdeIso}&fecha_hasta=${hastaIso}${
            empresaParam ? `&empresa=${encodeURIComponent(empresaParam)}` : ""
          }`
        );
        if (res.data.estado) {
          setResumen(res.data.datos);
        }
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      }
    };
    obtenerResumen();
  }, [fechaDesde, fechaHasta, empresaFiltro, navigate]);

  useEffect(() => {
    const obtenerEmpresas = async () => {
      try {
        const desdeIso = safeIso(fechaDesde);
        const hastaIso = safeIso(fechaHasta);
        if (!desdeIso || !hastaIso) return;
        const res = await clienteAxios.get(
          `/api/contratistas-solicitudes/empresas-admin?fecha_desde=${desdeIso}&fecha_hasta=${hastaIso}`
        );
        if (res.data.estado) {
          setEmpresasDisponibles(res.data.datos || []);
        }
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      }
    };
    obtenerEmpresas();
  }, [fechaDesde, fechaHasta, navigate]);

  const dataSource: GridDataSource = useMemo(
    () => ({
      getRows: async (params) => {
        let rows: GridValidRowModel[] = [];
        let rowCount: number = 0;
        try {
          const desdeIso = safeIso(fechaDesde);
          const hastaIso = safeIso(fechaHasta);
          if (!desdeIso || !hastaIso) {
            return { rows: [], rowCount: 0 };
          }
          const urlParams = new URLSearchParams({
            filter: JSON.stringify(params.filterModel.quickFilterValues),
            pagination: JSON.stringify(params.paginationModel),
            sort: JSON.stringify(params.sortModel),
            fecha_desde: desdeIso,
            fecha_hasta: hastaIso,
          });
          if (estadoFiltro !== null) {
            urlParams.set("estado", String(estadoFiltro));
          }
          if (urgenteFiltro) {
            urlParams.set("urgente", "1");
          }
          if (empresaFiltro.trim()) {
            urlParams.set("empresa", empresaFiltro.trim());
          }
          const res = await clienteAxios.get(
            "/api/contratistas-solicitudes/pendientes?" + urlParams.toString()
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
    [estadoFiltro, fechaDesde, fechaHasta, urgenteFiltro, empresaFiltro, navigate]
  );

  const initialState: GridInitialState = useMemo(
    () => ({
      sorting: {
        sortModel: [{ field: "fecha_visita", sort: "desc" }],
      },
      pagination: {
        paginationModel: {
          pageSize: 10,
        },
        rowCount: 0,
      },
    }),
    []
  );

  const getDetallePath = (ID: string, modo?: "aprobar") => {
    const suffix = modo ? `?modo=${modo}` : "";
    return embedded
      ? `/visitantes/solicitudes-contratistas/detalle/${ID}${suffix}`
      : `detalle/${ID}${suffix}`;
  };

  const verRegistro = (ID: string) => {
    navigate(getDetallePath(ID));
  };

  const actualizarEstadoFiltro = (estado: number | null) => {
    setEstadoFiltro(estado);
    setUrgenteFiltro(false);
    apiRef.current?.dataSource?.fetchRows?.();
  };

  const actualizarFechaDesde = (value: dayjs.Dayjs | null) => {
    if (!value) return;
    setFechaDesde(value);
    if (value.isAfter(fechaHasta)) {
      setFechaHasta(value);
    }
    apiRef.current?.dataSource?.fetchRows?.();
  };

  const actualizarFechaHasta = (value: dayjs.Dayjs | null) => {
    if (!value) return;
    setFechaHasta(value);
    if (value.isBefore(fechaDesde)) {
      setFechaDesde(value);
    }
    apiRef.current?.dataSource?.fetchRows?.();
  };

  const statusFilters = [
    { label: "Todos", count: resumen.total, active: isTodosSelected, onClick: () => actualizarEstadoFiltro(null) },
    { label: "Aprobadas", count: resumen.aprobadas, active: estadoFiltro === 2, onClick: () => actualizarEstadoFiltro(2) },
    { label: "Pendientes", count: resumen.pendientes, active: estadoFiltro === 1, onClick: () => actualizarEstadoFiltro(1) },
    { label: "Rechazadas", count: resumen.rechazadas, active: estadoFiltro === 3, onClick: () => actualizarEstadoFiltro(3) },
  ];

  return (
    <Box sx={{ minHeight: 400, position: "relative", display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
          backgroundColor: "#fff",
          borderRadius: 2,
          p: { xs: 1.5, md: 2 },
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 8px 24px rgba(20, 20, 43, 0.05)",
          "& .MuiChip-root": {
            borderRadius: 1.5,
          },
        }}
      >
        <DatePicker
          label="Fecha desde"
          value={fechaDesde}
          onChange={actualizarFechaDesde}
          maxDate={fechaHasta}
          onError={(reason: DateValidationError) =>
            setFechaDesdeError(
              reason ? "Fecha inválida. Usa un día válido del mes." : ""
            )
          }
          sx={{
            "& .MuiInputBase-root": {
              backgroundColor: "#fff",
            },
          }}
          slotProps={{
            textField: {
              error: Boolean(fechaDesdeError),
              helperText: fechaDesdeError,
              size: "small",
              sx: { minWidth: { xs: "100%", md: 180 } },
            },
          }}
        />
        <DatePicker
          label="Fecha hasta"
          value={fechaHasta}
          onChange={actualizarFechaHasta}
          minDate={fechaDesde}
          onError={(reason: DateValidationError) =>
            setFechaHastaError(
              reason ? "Fecha inválida. Usa un día válido del mes." : ""
            )
          }
          sx={{
            "& .MuiInputBase-root": {
              backgroundColor: "#fff",
            },
          }}
          slotProps={{
            textField: {
              error: Boolean(fechaHastaError),
              helperText: fechaHastaError,
              size: "small",
              sx: { minWidth: { xs: "100%", md: 180 } },
            },
          }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: "100%", md: 220 } }}>
          <InputLabel>Empresa</InputLabel>
          <Select
            label="Empresa"
            value={empresaFiltro}
            onChange={(e) => setEmpresaFiltro(String(e.target.value))}
          >
            <MenuItem value="">Todas</MenuItem>
            {empresasDisponibles.map((empresa) => (
              <MenuItem key={empresa} value={empresa}>
                {empresa}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {statusFilters.map((filter) => (
        <Chip
          key={filter.label}
          label={`${filter.label}: ${filter.count}`}
          onClick={filter.onClick}
          sx={{
            height: 30,
            justifyContent: "center",
            bgcolor: filter.active ? "#6d00f5" : "#f3f4f8",
            color: filter.active ? "#fff" : "#3d3d4d",
            border: filter.active ? "1px solid #6d00f5" : "1px solid #e4e5ec",
            "& .MuiChip-label": {
              px: 1.25,
              fontWeight: 700,
              fontSize: 12,
              textAlign: "center",
            },
            "&:hover": {
              bgcolor: filter.active ? "#5d00d4" : "#eceef6",
            },
          }}
        />
        ))}
        <Box sx={{ flex: 1 }} />
        <Button
          variant="outlined"
          startIcon={<FilterAltOff />}
          onClick={() => {
            actualizarEstadoFiltro(null);
            actualizarFechaDesde(dayjs().startOf("month"));
            actualizarFechaHasta(dayjs().endOf("month"));
            setUrgenteFiltro(false);
            setEmpresaFiltro("");
          }}
          sx={{
            minHeight: 36,
            textTransform: "none",
            borderColor: "rgba(122, 61, 240, 0.35)",
            color: "#6d00f5",
          }}
        >
          Limpiar filtros
        </Button>
      </Box>
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          borderColor: "rgba(0,0,0,0.08)",
          boxShadow: "0 8px 24px rgba(20, 20, 43, 0.06)",
        }}
      >
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        columns={[
          {
            headerName: "Empresa",
            field: "empresa",
            flex: 1,
            display: "flex",
            minWidth: 180,
          },
          {
            headerName: "Fecha de visita",
            field: "fecha_visita",
            flex: 1,
            display: "flex",
            minWidth: 160,
            headerAlign: "center",
            align: "center",
            valueFormatter: (value: string) =>
              value ? dayjs(value).format("DD/MM/YYYY") : "-",
          },
          {
            headerName: "Visitantes",
            field: "items",
            flex: 1,
            display: "flex",
            minWidth: 80,
            headerAlign: "center",
            align: "center",
            valueFormatter: (value: any[]) => value?.length || 0,
          },
          {
            headerName: "Estado",
            field: "estado",
            flex: 1,
            display: "flex",
            minWidth: 120,
            headerAlign: "center",
            align: "center",
            renderCell: ({ value }) => {
              const estado = getEstadoLabel(value);
              return (
                <Chip
                  label={estado.label}
                  color={estado.color}
                  size="small"
                  sx={{
                    minWidth: 150,
                    height: 26,
                    borderRadius: 1.5,
                    justifyContent: "center",
                    "& .MuiChip-label": {
                      px: 1.5,
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 12,
                      textAlign: "center",
                    },
                  }}
                />
              );
            },
          },
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
                onClick={() => verRegistro(row._id)}
                label="Ver solicitud"
                title="Ver solicitud"
              />,
            ],
          },
        ]}
        disableColumnFilter
        disableRowSelectionOnClick
        onCellClick={(params) => {
          setSelectedRowId(String(params.id));
          setSelectedRowEstado(typeof params.row?.estado === "number" ? params.row.estado : null);
        }}
        onRowDoubleClick={(params) => {
          const estado = typeof params.row?.estado === "number" ? params.row.estado : null;
          if (estado === 1) {
            navigate(getDetallePath(String(params.id), "aprobar"));
            return;
          }
          verRegistro(String(params.id));
        }}
        getRowClassName={(params) =>
          params.id === selectedRowId ? "row-selected" : ""
        }
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
        localeText={{
          ...esES.components.MuiDataGrid.defaultProps.localeText,
          toolbarColumns: "",
          toolbarFilters: "",
          toolbarDensity: "",
          toolbarExport: "",
          noRowsLabel: "Sin solicitudes registradas",
        }}
        sx={{
          minHeight: 460,
          border: 0,
          "& .MuiDataGrid-toolbarContainer": {
            p: 1.25,
            gap: 1,
            borderBottom: "1px solid rgba(0,0,0,0.08)",
          },
          "& .MuiDataGrid-columnHeaders": {
            bgcolor: "#fafbfe",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
          },
          "& .MuiDataGrid-columnHeaderTitle": {
            fontWeight: 800,
            color: "#2f2f3a",
          },
          "& .MuiDataGrid-row": {
            minHeight: "52px !important",
          },
          "& .MuiDataGrid-row:hover": {
            bgcolor: "rgba(122, 61, 240, 0.05)",
          },
          "& .MuiDataGrid-cell": {
            py: 1,
            borderColor: "rgba(0,0,0,0.06)",
          },
          "& .row-selected": {
            bgcolor: "rgba(122, 61, 240, 0.08)",
            outline: "2px solid rgba(122, 61, 240, 0.65)",
            outlineOffset: -2,
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
        slots={{
          toolbar: () => (
            <DataGridToolbar
              tableTitle={embedded ? "Listado de solicitudes" : "Solicitudes de Contratistas"}
              customActionButtons={
                <>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Verified />}
                    onClick={() => {
                      if (selectedRowId) navigate(getDetallePath(selectedRowId, "aprobar"));
                    }}
                    disabled={!selectedRowId || selectedRowEstado !== 1}
                    sx={{
                      textTransform: "none",
                      borderRadius: 1.5,
                      boxShadow: "none",
                      "&.Mui-disabled": {
                        bgcolor: "#f0edf8",
                        color: "#8b829d",
                      },
                    }}
                  >
                    Verificar
                  </Button>
                  <Tooltip title="Recargar">
                    <IconButton onClick={() => apiRef.current?.dataSource?.fetchRows?.()}>
                      <Refresh fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              }
            />
          ),
          noRowsOverlay: () => (
            <Stack height="100%" alignItems="center" justifyContent="center" spacing={1.25} sx={{ p: 3, textAlign: "center" }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  bgcolor: "rgba(122, 61, 240, 0.10)",
                  color: "#6d00f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <InboxOutlined />
              </Box>
              <Box>
                <Typography variant="subtitle1" fontWeight={800}>
                  Sin solicitudes registradas
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  No hay solicitudes de visita que coincidan con los criterios seleccionados.
                </Typography>
              </Box>
            </Stack>
          ),
        }}
      />
      </Paper>
      {error && (
        <ErrorOverlay error={error} gridDataRef={apiRef.current?.dataSource} />
      )}
      <Outlet context={apiRef.current?.dataSource} />
    </Box>
  );
}
