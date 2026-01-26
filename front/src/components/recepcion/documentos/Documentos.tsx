import { useState, useMemo } from "react";
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
import { Add, Visibility } from "@mui/icons-material";
import { Chip, IconButton, Tooltip } from "@mui/material";
import ErrorOverlay from "../../error/DataGridError";
import { AxiosError } from "axios";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";

const pageSizeOptions = [10, 25, 50];
const ESTATUS: Record<
  number,
  { nombre: string; color: "warning" | "error" | "success" }
> = {
  1: { nombre: "Por validar", color: "warning" },
  2: { nombre: "Rechazado", color: "error" },
  3: { nombre: "Aceptado", color: "success" },
};

export default function Documentos() {
  const { tipos_documentos } = useSelector(
    (state: IRootState) => state.config.data
  );
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
            "/api/documentos/usuario?" + urlParams.toString()
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

  const nuevoRegistro = () => {
    navigate("nuevo-documento");
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle-documento/${ID}`);
  };

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        columns={[
          {
            headerName: "Documento",
            field: "tipo",
            flex: 1,
            display: "flex",
            align: "center",
            minWidth: 150,
            renderCell: ({ value }) => (
              <Chip
                label={tipos_documentos[value].nombre}
                size="small"
                sx={(theme) => ({
                  width: "100%",
                  bgcolor: tipos_documentos[value].color || "secondary.main",
                  color: theme.palette.getContrastText(
                    tipos_documentos[value].color || "secondary.main"
                  ),
                })}
              />
            ),
            valueFormatter: (value) => {
              return tipos_documentos[value].nombre;
            },
          },
          {
            headerName: "Estatus",
            field: "estatus",
            flex: 1,
            display: "flex",
            minWidth: 150,
            renderCell: ({ value }) => (
              <Chip
                label={ESTATUS[value as keyof typeof ESTATUS].nombre}
                color={ESTATUS[value as keyof typeof ESTATUS].color}
                size="small"
                sx={{
                  width: "100%",
                }}
              />
            ),
            valueFormatter: (value: 1 | 2 | 3) => {
              return ESTATUS[value].nombre;
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
              return gridActions;
            },
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
            <DataGridToolbar
              tableTitle="Gestión de Documentos"
              customActionButtons={
                <Tooltip title="Agregar">
                  <IconButton onClick={nuevoRegistro}>
                    <Add fontSize="small" />
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
      <Outlet context={apiRef.current?.dataSource} />
    </div>
  );
}
