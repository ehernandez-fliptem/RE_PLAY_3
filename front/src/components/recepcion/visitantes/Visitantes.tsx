import { useState, useMemo, Fragment, useRef } from "react";
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
  GetApp,
  Lock,
  LockOpen,
  RestoreFromTrash,
  // Upload, // Carga masiva oculta temporalmente
  Visibility,
} from "@mui/icons-material";
import { Avatar, IconButton, Tooltip } from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useConfirm } from "material-ui-confirm";
import { AxiosError } from "axios";
import { base64ToFile } from "../../helpers/generalHelpers";
import ErrorOverlay from "../../error/DataGridError";
import Spinner from "../../utils/Spinner";

import { isBlockedNow } from "../../../utils/bloqueo";

import CircularProgress from "@mui/material/CircularProgress";


const pageSizeOptions = [10, 25, 50];

export default function Visitantes() {
  console.log("[VISITANTES] render");
  console.log("Prueba 01");

  const apiRef = useGridApiRef();
  const [error, setError] = useState<string>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [isDownloadingQr, setIsDownloadingQr] = useState({
    id_usuario: "",
    descargando: false,
  });

  const [loadingRows, setLoadingRows] = useState<Record<string, boolean>>({});
  const autoBlockedByTrashRef = useRef<Record<string, boolean>>({});
  const setRowLoading = (id: string, isLoading: boolean) =>
    setLoadingRows((prev) => ({ ...prev, [id]: isLoading }));


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
            "/api/visitantes?" + urlParams.toString()
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
    navigate("nuevo-visitante");
  };

  const editarRegistro = (ID: string) => {
    navigate(`editar-visitante/${ID}`);
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle-visitante/${ID}`);
  };

  const cambiarEstado = async (ID: string, activo: boolean) => {
    if (!activo) {
      try {
        const res = await clienteAxios.patch(`/api/visitantes/${ID}`, {
          activo,
        });
        if (res.data.estado) {
          apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);
          if (autoBlockedByTrashRef.current[ID]) {
            setRowLoading(ID, true);
            try {
              const unlockRes = await clienteAxios.patch(`/api/visitantes/desbloquear/${ID}`);
              if (unlockRes.data.estado) {
                const v = unlockRes.data.data;
                apiRef.current?.updateRows([
                  { _id: ID, bloqueado: v.bloqueado, desbloqueado_hasta: v.desbloqueado_hasta ?? null },
                ]);
              }
            } finally {
              setRowLoading(ID, false);
              delete autoBlockedByTrashRef.current[ID];
            }
          }
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "error" });
        }
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      }
      return;
    }

    confirm({
      title: "¿Seguro que deseas desactivar a este visitante?",
      description: "Al desactivar, se bloqueará el acceso y no se podrá editar.",
      allowClose: true,
      confirmationText: "Continuar",
    })
      .then(async (result) => {
        if (!result.confirmed) return;

        try {
          const res = await clienteAxios.patch(`/api/visitantes/${ID}`, {
            activo,
          });
          if (res.data.estado) {
            const rowBefore = apiRef.current?.getRow(ID) as any;
            apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);

            // Si aún no está bloqueado, aplicar bloqueo automático al desactivar.
            if (rowBefore && !isBlockedNow(rowBefore)) {
              setRowLoading(ID, true);
              try {
                const lockRes = await clienteAxios.patch(`/api/visitantes/bloquear/${ID}`);
                if (lockRes.data.estado) {
                  const v = lockRes.data.data;
                  apiRef.current?.updateRows([
                    { _id: ID, bloqueado: v.bloqueado, desbloqueado_hasta: v.desbloqueado_hasta ?? null },
                  ]);
                  autoBlockedByTrashRef.current[ID] = true;
                }
              } finally {
                setRowLoading(ID, false);
              }
            }
          } else {
            enqueueSnackbar(res.data.mensaje, { variant: "warning" });
          }
        } catch (error) {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
        }
      })
      .catch((error) => {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      });
  };

  // const cargaMasiva = () => {
  //   navigate("carga-masiva");
  // };

  const descargarQr = async (ID: string, nombre: string) => {
    try {
      setIsDownloadingQr({ id_usuario: ID, descargando: true });
      const res = await clienteAxios.get(`/api/visitantes/qr/${ID}`);
      if (res.data.estado) {
        base64ToFile(res.data.datos, "image/jpg", `${nombre}.jpg`);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsDownloadingQr({ id_usuario: ID, descargando: false });
    }
  };

const accionDesbloquear = (ID: string) => {
  const row = apiRef.current?.getRow(ID) as any;
  if (row && row.activo === false) {
    enqueueSnackbar("Debes restaurar al visitante para habilitar el acceso.", { variant: "warning" });
    return;
  }
  confirm({
    title: "¿Seguro que desea desbloquear a este visitante?",
    description: "Esta acción restaura los intentos y habilita el acceso SOLO por hoy.",
    allowClose: true,
    confirmationText: "Continuar",
  })
    .then(async (result) => {
      if (!result.confirmed) return;

      setRowLoading(ID, true);

      try {
        const res = await clienteAxios.patch(`/api/visitantes/desbloquear/${ID}`);

        if (res.data.estado) {
          const v = res.data.data;
          apiRef.current?.updateRows([
            { _id: ID, bloqueado: v.bloqueado, desbloqueado_hasta: v.desbloqueado_hasta ?? null },
          ]);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: any) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      } finally {
        setRowLoading(ID, false);
      }
    })
    .catch(() => {});
};

const accionBloquear = (ID: string) => {
  const row = apiRef.current?.getRow(ID) as any;
  if (row && row.activo === false) {
    enqueueSnackbar("Debes restaurar al visitante para cambiar el acceso.", { variant: "warning" });
    return;
  }
  confirm({
    title: "¿Seguro que desea bloquear a este visitante?",
    description: "Esta acción bloquea el acceso al sistema para el visitante.",
    allowClose: true,
    confirmationText: "Continuar",
  })
    .then(async (result) => {
      if (!result.confirmed) return;

      setRowLoading(ID, true);

      try {
        const res = await clienteAxios.patch(`/api/visitantes/bloquear/${ID}`);

        if (res.data.estado) {
          const v = res.data.data;
          apiRef.current?.updateRows([
            { _id: ID, bloqueado: v.bloqueado, desbloqueado_hasta: v.desbloqueado_hasta ?? null },
          ]);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: any) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      } finally {
        setRowLoading(ID, false);
      }
    })
    .catch(() => {});
};


  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        getRowHeight={() => "auto"}
        columns={[
          {
            headerName: "Foto",
            field: "img_usuario",
            disableExport: true,
            headerAlign: "center",
            align: "center",
            flex: 0,
            width: 70,
            minWidth: 70,
            display: "flex",
            renderCell: ({ row, value }) => (
              <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <Avatar
                  alt={row.nombre}
                  sx={(theme) => ({
                    backgroundColor: value
                      ? theme.palette.success.main
                      : theme.palette.error.main,
                    fontSize: 15,
                    width: 25,
                    height: 25,
                  })}
                />
              </div>
            ),
          },
          {
            headerName: "Nombre",
            field: "nombre",
            flex: 1,
            display: "flex",
            minWidth: 180,
            renderCell: ({ value }) => (
              <span style={{ fontSize: 14, fontWeight: 400 }}>{value}</span>
            ),
          },
          {
            headerName: "Empresa",
            field: "empresa",
            flex: 1,
            display: "flex",
            minWidth: 180,
            renderCell: ({ value }) => value || "--",
          },
          {
            headerName: "QR",
            field: "id_usuario",
            headerAlign: "center",
            align: "center",
            flex: 0,
            width: 70,
            minWidth: 70,
            display: "flex",
            renderCell: ({ row }) => {
              return (
                <Fragment>
                  {isDownloadingQr.descargando &&
                  row._id === isDownloadingQr.id_usuario ? (
                    <Spinner size="small" />
                  ) : (
                    <IconButton
                      onClick={() => descargarQr(row._id, row.nombre)}
                    >
                      <GetApp fontSize="small" color="success" />
                    </IconButton>
                  )}
                </Fragment>
              );
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
            sortable: false,
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
              if (row.id_general !== 1) {
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
              return gridActions;
            },
          },
          {
            headerName: "Acceso",
            field: "desbloqueo",
            type: "actions",
            align: "center",
            flex: 1,
            display: "flex",
            minWidth: 100,

            // Esto ayuda a que DataGrid recalcule el cell cuando cambie el row
            valueGetter: (_value, row) => `${row?.bloqueado ?? false}-${row?.desbloqueado_hasta ?? ""}`,

            getActions: ({ row }) => {
              const isLoading = !!loadingRows[row._id];

              if (isLoading) {
                return [
                  <GridActionsCellItem
                    icon={<CircularProgress size={18} />}
                    label="Procesando"
                    disabled
                    onClick={() => {}}
                  />,
                ];
              }

              const bloqueadoEfectivo = isBlockedNow(row);

              return [
                bloqueadoEfectivo ? (
                  <GridActionsCellItem
                    icon={<Lock color="error" />}
                    onClick={() => accionDesbloquear(row._id)}
                    label="Bloqueado"
                    title="Desbloquear"
                  />
                ) : (
                  <GridActionsCellItem
                    icon={<LockOpen color="success" />}
                    onClick={() => accionBloquear(row._id)}
                    label="Acceso"
                    title="Bloquear"
                  />
                ),
              ];
            }
          }
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
              tableTitle="Gestión de Visitantes"
              customActionButtons={
                <Fragment>
                  <Tooltip title="Agregar">
                    <IconButton onClick={nuevoRegistro}>
                      <Add fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {/* Carga masiva oculta temporalmente; mantener para uso futuro */}
                  {/* <Tooltip title="Carga masiva">
                    <IconButton onClick={cargaMasiva}>
                      <Upload fontSize="small" />
                    </IconButton>
                  </Tooltip> */}
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
