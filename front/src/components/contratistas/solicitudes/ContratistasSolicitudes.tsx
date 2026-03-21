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
import { Refresh, Visibility } from "@mui/icons-material";
import { Box, Chip, IconButton, Tooltip } from "@mui/material";
import ErrorOverlay from "../../error/DataGridError";
import { AxiosError } from "axios";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import { DatePicker, type DateValidationError } from "@mui/x-date-pickers";

const pageSizeOptions = [10, 25, 50];

const getEstadoLabel = (estado?: number) => {
  if (estado === 2) return { label: "Aprobada", color: "success" as const };
  if (estado === 3) return { label: "Rechazada", color: "error" as const };
  if (estado === 4) return { label: "Parcial", color: "warning" as const };
  return { label: "Pendiente de verificar", color: "warning" as const };
};

export default function ContratistasSolicitudes() {
  const { esRoot } = useSelector((state: IRootState) => state.auth.data);
  const apiRef = useGridApiRef();
  const [error, setError] = useState<string>();
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const navigate = useNavigate();
  const autoRefreshEnabled = true;
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
  const chipScale = 1.5;
  const [fechaDesdeError, setFechaDesdeError] = useState<string>("");
  const [fechaHastaError, setFechaHastaError] = useState<string>("");
  const [urgenteFiltro, setUrgenteFiltro] = useState(false);

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
  }, [apiRef, estadoFiltro, fechaDesde, fechaHasta, urgenteFiltro]);

  useEffect(() => {
    const obtenerResumen = async () => {
      try {
        const desdeIso = safeIso(fechaDesde);
        const hastaIso = safeIso(fechaHasta);
        if (!desdeIso || !hastaIso) return;
        const res = await clienteAxios.get(
          `/api/contratistas-solicitudes/resumen-admin?fecha_desde=${desdeIso}&fecha_hasta=${hastaIso}`
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
    [estadoFiltro, fechaDesde, fechaHasta, urgenteFiltro, navigate]
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

  const verRegistro = (ID: string) => {
    navigate(`detalle/${ID}`);
  };

  const actualizarEstadoFiltro = (estado: number | null) => {
    setEstadoFiltro(estado);
    setUrgenteFiltro(false);
    apiRef.current?.dataSource?.fetchRows?.();
  };

  const actualizarUrgente = () => {
    setUrgenteFiltro(true);
    setEstadoFiltro(null);
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

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
          mb: 1.5,
          backgroundColor: "#fff",
          borderRadius: 2,
          p: 1.5,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        }}
      >
        <DatePicker
          label="Desde"
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
              sx: {
                backgroundColor: "#fff",
                borderRadius: 1,
              },
            },
          }}
        />
        <DatePicker
          label="Hasta"
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
              sx: {
                backgroundColor: "#fff",
                borderRadius: 1,
              },
            },
          }}
        />
        <Chip
          label={`Todos: ${resumen.total}`}
          color={estadoFiltro === null ? "primary" : "default"}
          onClick={() => actualizarEstadoFiltro(null)}
          sx={{
            minWidth: 150 * chipScale,
            height: 30 * chipScale,
            justifyContent: "center",
            "& .MuiChip-label": {
              px: 1.5 * chipScale,
              color: estadoFiltro === null ? "#fff" : "#2f2f2f",
              fontWeight: 600,
              fontSize: 12 * chipScale,
              textAlign: "center",
            },
          }}
        />
        <Chip
          label={`Aprobadas: ${resumen.aprobadas}`}
          color={estadoFiltro === 2 ? "success" : "default"}
          onClick={() => actualizarEstadoFiltro(2)}
          sx={{
            minWidth: 150 * chipScale,
            height: 30 * chipScale,
            justifyContent: "center",
            "& .MuiChip-label": {
              px: 1.5 * chipScale,
              color: estadoFiltro === 2 ? "#fff" : "#2f2f2f",
              fontWeight: 600,
              fontSize: 12 * chipScale,
              textAlign: "center",
            },
          }}
        />
        <Chip
          label={`Pendientes: ${resumen.pendientes}`}
          color={estadoFiltro === 1 ? "warning" : "default"}
          onClick={() => actualizarEstadoFiltro(1)}
          sx={{
            minWidth: 150 * chipScale,
            height: 30 * chipScale,
            justifyContent: "center",
            "& .MuiChip-label": {
              px: 1.5 * chipScale,
              color: estadoFiltro === 1 ? "#fff" : "#2f2f2f",
              fontWeight: 600,
              fontSize: 12 * chipScale,
              textAlign: "center",
            },
          }}
        />
        <Chip
          label={`Rechazadas: ${resumen.rechazadas}`}
          color={estadoFiltro === 3 ? "error" : "default"}
          onClick={() => actualizarEstadoFiltro(3)}
          sx={{
            minWidth: 150 * chipScale,
            height: 30 * chipScale,
            justifyContent: "center",
            "& .MuiChip-label": {
              px: 1.5 * chipScale,
              color: estadoFiltro === 3 ? "#fff" : "#2f2f2f",
              fontWeight: 600,
              fontSize: 12 * chipScale,
              textAlign: "center",
            },
          }}
        />
        <Chip
          label={`Urgentes: ${resumen.urgentes}`}
          color={urgenteFiltro ? "error" : "default"}
          onClick={actualizarUrgente}
          sx={{
            minWidth: 150 * chipScale,
            height: 30 * chipScale,
            justifyContent: "center",
            "& .MuiChip-label": {
              px: 1.5 * chipScale,
              color: urgenteFiltro ? "#fff" : "#2f2f2f",
              fontWeight: 600,
              fontSize: 12 * chipScale,
              textAlign: "center",
            },
          }}
        />
        <Box sx={{ flex: 1 }} />
        <Chip
          label="Limpiar filtros"
          color="default"
          onClick={() => {
            actualizarEstadoFiltro(null);
            actualizarFechaDesde(dayjs().startOf("month"));
            actualizarFechaHasta(dayjs().endOf("month"));
            setUrgenteFiltro(false);
          }}
          sx={{
            minWidth: 170 * chipScale,
            height: 30 * chipScale,
            justifyContent: "center",
            "& .MuiChip-label": {
              px: 1.5 * chipScale,
              color: "#2f2f2f",
              fontWeight: 600,
              fontSize: 12 * chipScale,
              textAlign: "center",
            },
          }}
        />
      </Box>
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
            valueFormatter: (value: string) =>
              value ? dayjs(value).format("DD/MM/YYYY") : "-",
          },
          {
            headerName: "Visitantes",
            field: "items",
            flex: 1,
            display: "flex",
            minWidth: 80,
            valueFormatter: (value: any[]) => value?.length || 0,
          },
          {
            headerName: "Estado",
            field: "estado",
            flex: 1,
            display: "flex",
            minWidth: 120,
            renderCell: ({ value }) => {
              const estado = getEstadoLabel(value);
              return (
                <Chip
                  label={estado.label}
                  color={estado.color}
                  size="small"
                  sx={{
                    minWidth: 130,
                    height: 24,
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
        }}
        onRowDoubleClick={(params) => {
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
          noRowsLabel: "Sin registros",
        }}
        sx={{
          "& .row-selected": {
            outline: "2px solid #7A3DF0",
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
              tableTitle="Solicitudes de Contratistas"
              customActionButtons={
                <Tooltip title="Recargar">
                  <IconButton onClick={() => apiRef.current?.dataSource?.fetchRows?.()}>
                    <Refresh fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            />
          ),
        }}
      />
      {error && (
        <ErrorOverlay error={error} gridDataRef={apiRef.current?.dataSource} />
      )}
      {esRoot && (
        <div
          style={{
            position: "fixed",
            bottom: 8,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 1200,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "rgba(0, 0, 0, 0.45)",
              background: "rgba(255, 255, 255, 0.75)",
              padding: "2px 8px",
              borderRadius: 8,
            }}
          >
            Auto-refresh: {autoRefreshEnabled ? "activo" : "inactivo"}
          </span>
        </div>
      )}
      <Outlet context={apiRef.current?.dataSource} />
    </div>
  );
}
