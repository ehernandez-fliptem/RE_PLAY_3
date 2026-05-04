import { useMemo, useState } from "react";
import {
  DataGrid,
  type GridDataSource,
  type GridInitialState,
  GridActionsCellItem,
  useGridApiRef,
} from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Delete, Edit, RestoreFromTrash, Visibility } from "@mui/icons-material";
import { Chip, IconButton, Tooltip } from "@mui/material";
import { Outlet, useNavigate } from "react-router-dom";
import type { AxiosError } from "axios";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import DataGridToolbar from "../../utils/DataGridToolbar";
import ErrorOverlay from "../../error/DataGridError";

const pageSizeOptions = [10, 25, 50];

export default function DispositivosBiostar() {
  const apiRef = useGridApiRef();
  const navigate = useNavigate();
  const [error, setError] = useState<string>();

  const dataSource: GridDataSource = useMemo(
    () => ({
      getRows: async (params) => {
        try {
          const urlParams = new URLSearchParams({
            filter: JSON.stringify(params.filterModel.quickFilterValues),
            pagination: JSON.stringify(params.paginationModel),
            sort: JSON.stringify(params.sortModel),
          });
          const res = await clienteAxios.get("/api/dispositivos-biostar?" + urlParams.toString());
          if (!res.data.estado) return { rows: [], rowCount: 0 };
          return {
            rows: res.data.datos.paginatedResults || [],
            rowCount: res.data.datos.totalCount[0]?.count || 0,
          };
        } catch (error) {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
          throw error;
        }
      },
    }),
    [navigate]
  );

  const initialState: GridInitialState = useMemo(
    () => ({
      pagination: {
        paginationModel: { pageSize: 10 },
        rowCount: 0,
      },
    }),
    []
  );

  const cambiarEstado = async (ID: string, activo: boolean) => {
    try {
      const res = await clienteAxios.patch(`/api/dispositivos-biostar/${ID}`, { activo });
      if (res.data.estado) {
        apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    }
  };

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        columns={[
          { headerName: "Nombre", field: "nombre", flex: 1, minWidth: 180 },
          { headerName: "IP", field: "direccion_ip", flex: 1, minWidth: 150 },
          { headerName: "Puerto", field: "puerto", flex: 0.5, minWidth: 90 },
          { headerName: "Usuario", field: "usuario", flex: 1, minWidth: 130 },
          {
            headerName: "Sesion",
            field: "session_activa",
            flex: 0.7,
            minWidth: 120,
            renderCell: (params) => (
              <Chip
                label={params.value ? "Activa" : "Sin sesion"}
                color={params.value ? "success" : "default"}
                size="small"
                sx={{ width: "100%" }}
              />
            ),
          },
          {
            headerName: "Acciones",
            field: "activo",
            type: "actions",
            align: "center",
            flex: 1,
            minWidth: 170,
            getActions: ({ row }) => [
              <GridActionsCellItem icon={<Visibility color="primary" />} label="Ver" onClick={() => navigate(`detalle-dispositivo/${row._id}`)} />,
              ...(row.activo
                ? [<GridActionsCellItem icon={<Edit color="primary" />} label="Editar" onClick={() => navigate(`editar-dispositivo/${row._id}`)} />]
                : []),
              row.activo ? (
                <GridActionsCellItem icon={<Delete color="success" />} label="Desactivar" onClick={() => cambiarEstado(row._id, row.activo)} />
              ) : (
                <GridActionsCellItem icon={<RestoreFromTrash color="error" />} label="Restaurar" onClick={() => cambiarEstado(row._id, row.activo)} />
              ),
            ],
          },
        ]}
        disableRowSelectionOnClick
        disableColumnFilter
        filterDebounceMs={1000}
        dataSource={dataSource}
        dataSourceCache={null}
        onDataSourceError={(dataSourceError) => {
          const axiosCause = (dataSourceError as any).cause as AxiosError | undefined;
          if (axiosCause?.code) {
            setError(axiosCause.code);
            return;
          }
          setError((dataSourceError as Error).message);
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
              tableTitle="Gestion de Dispositivos BioStar"
              customActionButtons={
                <Tooltip title="Agregar">
                  <IconButton size="small" onClick={() => navigate("nuevo-dispositivo")}>
                    <Add />
                  </IconButton>
                </Tooltip>
              }
            />
          ),
        }}
      />
      {error && <ErrorOverlay error={error} gridDataRef={apiRef.current?.dataSource} />}
      <Outlet context={apiRef.current?.dataSource} />
    </div>
  );
}
