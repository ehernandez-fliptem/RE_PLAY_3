import { useEffect, useMemo, useRef, useState } from "react";

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
import { Button, Chip, CircularProgress, IconButton, Stack, Tooltip } from "@mui/material";
import {
  Add,
  Delete,
  Edit,
  RestoreFromTrash,
  Sync,
  Visibility,
} from "@mui/icons-material";
import { enqueueSnackbar } from "notistack";
import { useConfirm } from "material-ui-confirm";
import ErrorOverlay from "../../error/DataGridError";
import { AxiosError } from "axios";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";

const pageSizeOptions = [10, 25, 50];

export default function DispositivoHV() {
  const { tipos_eventos } = useSelector(
    (state: IRootState) => state.config.data
  );
  const apiRef = useGridApiRef();
  const [error, setError] = useState<string>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [isLoading, setIsLoading] = useState(false);
  const [syncAllInProgress, setSyncAllInProgress] = useState(false);
  const [syncAllStatus, setSyncAllStatus] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const showSnackbar = (
    message: string,
    options?: Parameters<typeof enqueueSnackbar>[1]
  ) =>
    enqueueSnackbar(message, {
      autoHideDuration: 4000,
      ...options,
    });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
            "/api/dispositivos-hikvision?" + urlParams.toString()
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
    navigate("nuevo-dispositivo");
  };

  const editarRegistro = (ID: string) => {
    navigate(`editar-dispositivo/${ID}`);
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle-dispositivo/${ID}`);
  };

  const cambiarEstado = async (ID: string, activo: boolean) => {
    if (!activo) {
      try {
        const res = await clienteAxios.patch(
          `/api/dispositivos-hikvision/${ID}`,
          {
            activo,
          }
        );
        if (res.data.estado) {
          apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);
        } else {
            showSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      }
    } else {
      confirm({
        title: "¿Seguro que deseas desactivar a este dispositivo?",
        description: "",
        allowClose: true,
        confirmationText: "Continuar",
      })
        .then(async (result) => {
          if (result.confirmed) {
            const res = await clienteAxios.patch(
              `/api/dispositivos-hikvision/${ID}`,
              {
                activo,
              }
            );
            if (res.data.estado) {
              apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);
            } else {
              showSnackbar(res.data.mensaje, { variant: "warning" });
            }
          }
        })
        .catch((error) => {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
        });
    }
  };

  /*
  const sincronizar = async (ID: string) => {
    setIsLoading(true);
    try {
      const res = await clienteAxios.get(
        `/api/dispositivos-hikvision/sincronizar/${ID}`
      );
      if (res.data.estado) {
        enqueueSnackbar(
          `Usuarios: ${res.data.datos.usuarios} / Registros: ${res.data.datos.registros} / Tarjetas: ${res.data.datos.tarjetas}  / Eventos: ${res.data.datos.eventos}`,
          { variant: "success", persist: true }
        );
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "error" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };
*/

  const sincronizar = async (panelId: string) => {
    setIsLoading(true);
    try {
      const resUsers = await clienteAxios.get(
        `/api/dispositivos-hikvision/sincronizar/${panelId}`
      );

      if (resUsers.data?.estado) {
        // enqueueSnackbar(
        //   `Usuarios: ${resUsers.data.datos?.usuarios ?? 0} / Registros: ${resUsers.data.datos?.registros ?? 0} / Tarjetas: ${resUsers.data.datos?.tarjetas ?? 0} / Eventos: ${resUsers.data.datos?.eventos ?? 0}`,
        //   { variant: "success", persist: true }
        // );
        enqueueSnackbar("Sincronización Exitosa", {
          variant: "success",
        });
      } else {
        showSnackbar(
          resUsers.data?.mensaje || "Error al sincronizar usuarios",
          {
            variant: "error",
          }
        );
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const obtenerTodosDispositivos = async () => {
    const all: GridValidRowModel[] = [];
    const pageSize = 100;
    let page = 0;
    while (true) {
      const urlParams = new URLSearchParams({
        filter: JSON.stringify([]),
        pagination: JSON.stringify({ page, pageSize }),
        sort: JSON.stringify([]),
      });
      const res = await clienteAxios.get(
        "/api/dispositivos-hikvision?" + urlParams.toString()
      );
      const datos = res.data?.datos;
      const rows = datos?.paginatedResults || [];
      const total = datos?.totalCount?.[0]?.count ?? rows.length;
      all.push(...rows);
      if (all.length >= total || rows.length === 0) break;
      page += 1;
    }
    return all;
  };

  const sincronizarTodos = () => {
    if (syncAllInProgress) return;
    setSyncAllInProgress(true);
    setSyncAllStatus("Sincronizando...");
    showSnackbar("Sincronización iniciada", { variant: "success" });

    void (async () => {
      try {
        const dispositivos = await obtenerTodosDispositivos();
        const activos = dispositivos.filter((d: any) => d.activo);

        if (activos.length === 0) {
          enqueueSnackbar("No hay dispositivos activos para sincronizar.", {
            variant: "warning",
          });
          return;
        }

        let ok = 0;
        let fail = 0;

        for (const dispositivo of activos) {
          try {
            const res = await clienteAxios.get(
              `/api/dispositivos-hikvision/sincronizar/${dispositivo._id}`
            );
            if (res.data?.estado) ok += 1;
            else fail += 1;
          } catch {
            fail += 1;
          }
        }

        showSnackbar(`Sincronización completa. OK: ${ok} / Error: ${fail}`, {
          variant: fail > 0 ? "warning" : "success",
          persist: fail > 0,
        });
        setSyncAllStatus(
          fail > 0 ? "Sincronizado con errores" : "Sincronizado"
        );
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      } finally {
        if (isMountedRef.current) {
          setSyncAllInProgress(false);
          setTimeout(() => {
            if (isMountedRef.current) setSyncAllStatus(null);
          }, 2500);
        }
      }
    })();
  };


  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        apiRef={apiRef}
        loading={isLoading}
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
            headerName: "Acceso",
            field: "acceso",
            flex: 1,
            display: "flex",
            minWidth: 150,
          },
          {
            headerName: "Tipo de Evento",
            field: "tipo_evento",
            flex: 1,
            display: "flex",
            minWidth: 120,
            renderCell: ({ value }) => (
              <Chip
                label={tipos_eventos[value].nombre}
                size="small"
                sx={{
                  width: "100%",
                  bgcolor: tipos_eventos[value].color || "#C4C4C4",
                }}
              />
            ),
            valueFormatter: (value) => {
              return tipos_eventos[value].nombre;
            },
          },
          {
            headerName: "Habilitado para citas",
            field: "habilitar_citas",
            flex: 1,
            display: "flex",
            minWidth: 150,
            renderCell: (params) => (
              <Chip
                label={params.value ? "Sí" : "No"}
                color={params.value ? "success" : "error"}
                size="small"
                sx={{ width: "100%" }}
              />
            ),
          },
          {
            headerName: "Sincronizar",
            field: "sync",
            type: "actions",
            align: "center",
            flex: 1,
            display: "flex",
            minWidth: 100,
            getActions: ({ row }) => 
              row.activo ? [
                <GridActionsCellItem
                  color="primary"
                  icon={<Sync />}
                  onClick={() => sincronizar(row._id)}
                  label="Sincronizar"
                />
             ] : [],
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
              tableTitle="Gestión de Dispositivos"
              customActionButtons={
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={
                      syncAllInProgress ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Sync />
                      )
                    }
                    onClick={sincronizarTodos}
                    disabled={syncAllInProgress}
                  >
                    {syncAllStatus ?? "Sincronizar todos"}
                  </Button>
                  <Tooltip title="Agregar">
                    <IconButton size="small" onClick={nuevoRegistro}>
                      <Add />
                    </IconButton>
                  </Tooltip>
                </Stack>
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
