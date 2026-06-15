import { useMemo, useState } from "react";
import {
  DataGrid,
  GridActionsCellItem,
  GridGetRowsError,
  type GridDataSource,
  type GridInitialState,
  type GridValidRowModel,
  useGridApiRef,
} from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, ContentCopy, Delete, Edit, Link as LinkIcon, PlayArrow, Preview, Visibility } from "@mui/icons-material";
import { Chip, IconButton, Tooltip } from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { enqueueSnackbar } from "notistack";
import { useConfirm } from "material-ui-confirm";
import { clienteAxios, handlingError } from "../../app/config/axios";
import DataGridToolbar from "../utils/DataGridToolbar";
import ErrorOverlay from "../error/DataGridError";

const pageSizeOptions = [10, 25, 50];

const estadoColor: Record<string, "default" | "success" | "warning" | "error"> = {
  borrador: "default",
  publicada: "success",
  inactiva: "warning",
};

export default function Capacitaciones() {
  const apiRef = useGridApiRef();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [error, setError] = useState<string>();

  const dataSource: GridDataSource = useMemo(
    () => ({
      getRows: async (params) => {
        let rows: GridValidRowModel[] = [];
        let rowCount = 0;
        try {
          const urlParams = new URLSearchParams({
            filter: JSON.stringify(params.filterModel.quickFilterValues),
            pagination: JSON.stringify(params.paginationModel),
            sort: JSON.stringify(params.sortModel),
          });
          const res = await clienteAxios.get(`/api/capacitaciones?${urlParams.toString()}`);
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
        return { rows, rowCount };
      },
    }),
    [navigate]
  );

  const initialState: GridInitialState = useMemo(
    () => ({
      pagination: { paginationModel: { pageSize: 10 }, rowCount: 0 },
    }),
    []
  );

  const copyPublicLink = async (slug: string) => {
    const url = `${window.location.origin}/capacitacion/${slug}`;
    await navigator.clipboard.writeText(url);
    enqueueSnackbar("Enlace publico copiado.", { variant: "success" });
  };

  const updateEstado = async (id: string, estado: string) => {
    try {
      const res = await clienteAxios.patch(`/api/capacitaciones/${id}/estado`, { estado });
      if (res.data.estado) {
        enqueueSnackbar("Estado actualizado.", { variant: "success" });
        apiRef.current?.dataSource.fetchRows();
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession, erroresForm } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
      const firstError = erroresForm ? Object.values(erroresForm)[0] : "";
      enqueueSnackbar(String(firstError || "No se pudo actualizar el estado."), { variant: "error" });
    }
  };

  const duplicate = async (id: string) => {
    try {
      const res = await clienteAxios.post(`/api/capacitaciones/${id}/duplicar`);
      if (res.data.estado) {
        enqueueSnackbar("Capacitacion duplicada.", { variant: "success" });
        apiRef.current?.dataSource.fetchRows();
      }
    } catch (error) {
      handlingError(error);
    }
  };

  const remove = async (id: string) => {
    try {
      await confirm({
        title: "Eliminar capacitacion",
        description: "Esta accion eliminara tambien los resultados registrados.",
        confirmationText: "Eliminar",
        cancellationText: "Cancelar",
        confirmationButtonProps: { color: "error", variant: "contained" },
      });
      const res = await clienteAxios.delete(`/api/capacitaciones/${id}`);
      if (res.data.estado) {
        enqueueSnackbar("Capacitacion eliminada.", { variant: "success" });
        apiRef.current?.dataSource.fetchRows();
      }
    } catch (error) {
      if (error) handlingError(error);
    }
  };

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        columns={[
          { headerName: "Nombre", field: "titulo", flex: 1.3, minWidth: 220, display: "flex" },
          {
            headerName: "Estado",
            field: "estado",
            flex: 0.6,
            minWidth: 130,
            display: "flex",
            renderCell: ({ row }) => (
              <Chip
                size="small"
                label={String(row.estado || "").replace(/^./, (value: string) => value.toUpperCase())}
                color={estadoColor[row.estado] || "default"}
                sx={{ fontWeight: 700 }}
              />
            ),
          },
          {
            headerName: "URL publica",
            field: "slug",
            flex: 1,
            minWidth: 180,
            display: "flex",
            renderCell: ({ row }) => (
              <Tooltip title="Copiar enlace publico">
                <IconButton size="small" onClick={() => copyPublicLink(row.slug)}>
                  <LinkIcon color="primary" fontSize="small" />
                </IconButton>
              </Tooltip>
            ),
          },
          { headerName: "Pasos", field: "pasos_count", flex: 0.4, minWidth: 90, display: "flex" },
          {
            headerName: "Ultima edicion",
            field: "fecha_modificacion",
            flex: 0.8,
            minWidth: 160,
            display: "flex",
            valueFormatter: (value) => (value ? new Date(value as string).toLocaleString("es-MX") : "--"),
          },
          { headerName: "Creado por", field: "creado_por", flex: 0.8, minWidth: 150, display: "flex" },
          {
            headerName: "Acciones",
            field: "acciones",
            type: "actions",
            minWidth: 220,
            flex: 0.9,
            getActions: ({ row }) => [
              <GridActionsCellItem icon={<Visibility color="primary" />} label="Ver" title="Ver" onClick={() => navigate(`${row._id}/vista-previa`)} />,
              <GridActionsCellItem icon={<Edit color="primary" />} label="Editar" title="Editar" onClick={() => navigate(`${row._id}/editar`)} />,
              <GridActionsCellItem icon={<ContentCopy color="primary" />} label="Duplicar" title="Duplicar" onClick={() => duplicate(row._id)} />,
              <GridActionsCellItem
                icon={<PlayArrow color={row.estado === "publicada" ? "warning" : "success"} />}
                label={row.estado === "publicada" ? "Inactivar" : "Publicar"}
                title={row.estado === "publicada" ? "Inactivar" : "Publicar"}
                onClick={() => updateEstado(row._id, row.estado === "publicada" ? "inactiva" : "publicada")}
              />,
              <GridActionsCellItem icon={<Preview color="primary" />} label="Resultados" title="Resultados" onClick={() => navigate(`${row._id}/resultados`)} />,
              <GridActionsCellItem icon={<Delete color="error" />} label="Eliminar" title="Eliminar" onClick={() => remove(row._id)} />,
            ],
          },
        ]}
        disableRowSelectionOnClick
        disableColumnFilter
        filterDebounceMs={700}
        dataSource={dataSource}
        dataSourceCache={null}
        pagination
        pageSizeOptions={pageSizeOptions}
        showToolbar
        localeText={{
          ...esES.components.MuiDataGrid.defaultProps.localeText,
          toolbarColumns: "",
          toolbarFilters: "",
          toolbarDensity: "",
          toolbarExport: "",
          noRowsLabel: "Sin capacitaciones",
        }}
        slots={{
          toolbar: () => (
            <DataGridToolbar
              tableTitle="Capacitaciones"
              showExportButton={false}
              customActionButtons={
                <Tooltip title="Nueva capacitacion">
                  <IconButton onClick={() => navigate("nueva")}>
                    <Add fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            />
          ),
        }}
        onDataSourceError={(dataSourceError) => {
          if (dataSourceError.cause instanceof AxiosError) {
            setError(dataSourceError.cause.code);
            return;
          }
          if (dataSourceError instanceof GridGetRowsError) setError(dataSourceError.message);
        }}
      />
      {error && <ErrorOverlay error={error} gridDataRef={apiRef.current?.dataSource} />}
      <Outlet context={apiRef.current?.dataSource} />
    </div>
  );
}
