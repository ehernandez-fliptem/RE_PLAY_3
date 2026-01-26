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
import {
  Add,
  Delete,
  Edit,
  RestoreFromTrash,
  Visibility,
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import { Chip, IconButton, Tooltip } from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useConfirm } from "material-ui-confirm";
import ErrorOverlay from "../../error/DataGridError";
import { AxiosError } from "axios";

const pageSizeOptions = [10, 25, 50];

export default function Empresas() {
  const { esRoot } = useSelector((state: IRootState) => state.auth.data);
  const apiRef = useGridApiRef();
  const [error, setError] = useState<string>();
  const navigate = useNavigate();
  const confirm = useConfirm();

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
            "/api/empresas?" + urlParams.toString()
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
    navigate("nueva-empresa");
  };

  const editarRegistro = (ID: string) => {
    navigate(`editar-empresa/${ID}`);
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle-empresa/${ID}`);
  };

  const cambiarEstado = async (ID: string, activo: boolean) => {
    if (!activo) {
      try {
        const res = await clienteAxios.patch(`/api/empresas/${ID}`, {
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
        title: "¿Seguro que deseas desactivar a este empresa?",
        description:
          "Esta acción desactiva a todos los usuarios que pertenezcan a la misma.",
        allowClose: true,
        confirmationText: "Continuar",
      })
        .then(async (result) => {
          if (result.confirmed) {
            const res = await clienteAxios.patch(`/api/empresas/${ID}`, {
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
            minWidth: 150,
          },
          {
            headerName: "RFC",
            field: "rfc",
            flex: 1,
            display: "flex",
            minWidth: 150,
          },
          {
            headerName: "Tipo",
            field: "esRoot",
            flex: 1,
            display: "flex",
            minWidth: 150,
            renderCell: ({ value }) => (
              <>
                {value ? (
                  <Chip
                    label="Maestra"
                    size="small"
                    color="primary"
                    sx={{ width: "100%" }}
                  />
                ) : (
                  <Chip
                    label="Esclava"
                    size="small"
                    color="secondary"
                    sx={{ width: "100%" }}
                  />
                )}
              </>
            ),
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
              if (!row.esRoot) {
                if (esRoot) {
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
              }

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
              tableTitle="Gestión de Empresas"
              customActionButtons={
                <>
                  {esRoot && (
                    <Tooltip title="Agregar">
                      <IconButton onClick={nuevoRegistro}>
                        <Add fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
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
