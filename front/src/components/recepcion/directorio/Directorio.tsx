import { useState, useMemo } from "react";
import {
  DataGrid,
  useGridApiRef,
  type GridInitialState,
  type GridDataSource,
  GridGetRowsError,
  type GridValidRowModel,
} from "@mui/x-data-grid";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { Outlet, useNavigate } from "react-router-dom";
import { esES } from "@mui/x-data-grid/locales";
import DataGridToolbar from "../../utils/DataGridToolbar";
import ErrorOverlay from "../../error/DataGridError";
import { AxiosError } from "axios";

const pageSizeOptions = [10, 25, 50];

export default function Directorio() {
  const apiRef = useGridApiRef();
  const [error, setError] = useState<string>();
  const navigate = useNavigate();

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
            "/api/usuarios/directorio?" + urlParams.toString()
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

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        columns={[
          {
            headerName: "Nombre",
            field: "nombre",
            flex: 1,
            display: "flex",
            minWidth: 180,
          },
          {
            headerName: "Puesto",
            field: "puesto",
            flex: 1,
            display: "flex",
            minWidth: 150,
          },
          {
            headerName: "Correo",
            field: "correo",
            flex: 1,
            display: "flex",
            minWidth: 250,
          },
          {
            headerName: "Teléfono",
            field: "telefono",
            flex: 1,
            display: "flex",
            minWidth: 150,
          },
          {
            headerName: "Móvil",
            field: "movil",
            flex: 1,
            display: "flex",
            minWidth: 150,
          },
        ]}
        disableRowSelectionOnClick
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
            <DataGridToolbar tableTitle="Directorio de Empleados Activos" />
          ),
        }}
      />
      {error && (
        <ErrorOverlay error={error} gridDataRef={apiRef.current?.dataSource} />
      )}
      <Outlet context={apiRef.current?.dataSource} />
    </div>
  );
}
