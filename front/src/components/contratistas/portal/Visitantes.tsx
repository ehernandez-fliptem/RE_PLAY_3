import { useState, useMemo, Fragment } from "react";
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
import { Add, Edit, Visibility, UploadFile } from "@mui/icons-material";
import { Chip, IconButton, Tooltip } from "@mui/material";
import ErrorOverlay from "../../error/DataGridError";
import { AxiosError } from "axios";

const pageSizeOptions = [10, 25, 50];

const getEstadoLabel = (estado?: number) => {
  if (estado === 2) return { label: "Aprobado", color: "success" as const };
  if (estado === 3) return { label: "Rechazado", color: "error" as const };
  return { label: "Pendiente", color: "warning" as const };
};

export default function PortalVisitantes() {
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
            "/api/contratistas-visitantes?" + urlParams.toString()
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
    navigate("nuevo");
  };

  const editarRegistro = (ID: string) => {
    navigate(`editar/${ID}`);
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle/${ID}`);
  };

  const cargaMasiva = () => {
    navigate("carga-masiva");
  };

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
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
            renderCell: ({ value }) => {
              const estado = getEstadoLabel(value);
              return <Chip label={estado.label} color={estado.color} size="small" />;
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
              gridActions.push(
                <GridActionsCellItem
                  icon={<Edit color="primary" />}
                  onClick={() => editarRegistro(row._id)}
                  label="Editar"
                  title="Editar"
                />
              );
              return gridActions;
            },
          },
        ]}
        disableColumnFilter
        disableRowSelectionOnClick
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
              tableTitle="Mi Catálogo de Visitantes"
              customActionButtons={
                <Fragment>
                  <Tooltip title="Agregar">
                    <IconButton onClick={nuevoRegistro}>
                      <Add fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Carga masiva">
                    <IconButton onClick={cargaMasiva}>
                      <UploadFile fontSize="small" />
                    </IconButton>
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
    </div>
  );
}
