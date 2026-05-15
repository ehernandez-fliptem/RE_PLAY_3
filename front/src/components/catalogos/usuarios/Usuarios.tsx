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
import {
  Add,
  Delete,
  Edit,
  RestoreFromTrash,
  // Upload, // [En proceso] Ocultado por funcionalidad de carga masiva no disponible
  Visibility,
} from "@mui/icons-material";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import { getRoleLabel } from "../../../app/utils/roleLabels";
import { Avatar, Chip, FormControl, Grid, IconButton, InputLabel, MenuItem, Select, Tooltip } from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useConfirm } from "material-ui-confirm";
import { AxiosError } from "axios";
import ErrorOverlay from "../../error/DataGridError";

const pageSizeOptions = [25, 50, 100];

export default function Usuarios() {
  const { roles, habilitarContratistas, habilitarRegistroCampo } = useSelector(
    (state: IRootState) => state.config.data
  );
  const apiRef = useGridApiRef();
  const [error, setError] = useState<string>();
  const [tipoVista, setTipoVista] = useState<"sistema" | "contratistas" | "campo">("sistema");
  const [estadoFiltro, setEstadoFiltro] = useState<"activos" | "inactivos" | "todos">("activos");
  const navigate = useNavigate();
  const confirm = useConfirm();
  // QR y desbloqueo deshabilitados temporalmente junto con columnas ocultas


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
            scope: tipoVista,
            estado: estadoFiltro,
          });
          const res = await clienteAxios.get(
            "/api/usuarios?" + urlParams.toString()
          );
          //console.log("datos tabla ", res);
          if (res.data.estado) {
            setError("");
            rows = (res.data.datos.paginatedResults || []).map((r: any) => ({
              ...r,
              id_general: Number(r.id_general),
            }));
            console.log("Filas", rows);
            
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
    [tipoVista, estadoFiltro]
  );

  const initialState: GridInitialState = useMemo(
    () => ({
      pagination: {
        paginationModel: {
          pageSize: 25,
        },
        rowCount: 0,
      },
    }),
    []
  );

  const nuevoRegistro = () => {
    navigate("nuevo-usuario");
  };

  const opcionesVista = [
    { id: "sistema", label: "Usuarios normales" },
    ...(habilitarContratistas ? [{ id: "contratistas", label: "Contratistas" }] : []),
    ...(habilitarRegistroCampo ? [{ id: "campo", label: "Empleados campo" }] : []),
  ];
  const mostrarSelector = habilitarContratistas || habilitarRegistroCampo;

  const editarRegistro = (ID: string) => {
    navigate(`editar-usuario/${ID}`);
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle-usuario/${ID}`);
  };

  // [En proceso] Función de carga masiva deshabilitada temporalmente
  // const cargaMasiva = () => {
  //   navigate("carga-masiva");
  // };

  const cambiarEstado = async (ID: string, activo: boolean, nombre: string) => {
    if (!activo) {
      confirm({
        title: "¿Seguro que deseas restaurar este usuario?",
        description: nombre,
        allowClose: true,
        confirmationText: "Continuar",
      })
        .then(async (result) => {
          if (!result.confirmed) return;
          const res = await clienteAxios.patch(`/api/usuarios/${ID}`, {
            activo,
          });
          if (res.data.estado) {
            apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);
          } else {
            enqueueSnackbar(res.data.mensaje, { variant: "error" });
          }
        })
        .catch((error) => {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
        });
    } else {
      confirm({
        title: "¿Seguro que deseas desactivar este usuario?",
        description: nombre,
        allowClose: true,
        confirmationText: "Continuar",
      })
        .then(async (result) => {
          if (result.confirmed) {
            const res = await clienteAxios.patch(`/api/usuarios/${ID}`, {
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

  const eliminarPermanente = (ID: string, nombre: string) => {
    confirm({
      title: "¿Seguro que deseas eliminar permanentemente este usuario?",
      description: nombre,
      allowClose: true,
      confirmationText: "Continuar",
    })
      .then(async (result) => {
        if (!result.confirmed) return;
        const res = await clienteAxios.patch(`/api/usuarios/eliminar-permanente/${ID}`);
        if (res.data.estado) {
          (apiRef.current as any)?.dataSource?.fetchRows?.();
          enqueueSnackbar("Usuario eliminado permanentemente.", { variant: "success" });
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      })
      .catch((error) => {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      });
  };
  // const descargarQr = async (ID: string, nombre: string) => { ... }

  // const desbloquear = (ID: string) => { ... }
  // const anonimizar = (ID: string) => { ... }

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        getRowHeight={() => "auto"}
        columns={[
          // {
          //   headerName: "ID",
          //   field: "id_general",
          //   flex: 1,
          //   type: "number",
          //   display: "flex",
          // },
          {
            headerName: "Foto",
            field: "img_usuario",
            disableExport: true,
            flex: 1,
            display: "flex",
            renderCell: ({ row, value }) => (
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
            ),
          },
          // {
          //   headerName: "Empresa",
          //   field: "empresa",
          //   flex: 1,
          //   display: "flex",
          //   minWidth: 180,
          // },
          {
            headerName: "Nombre",
            field: "nombre",
            flex: 1,
            display: "flex",
            minWidth: 180,
          },
          {
            headerName: "Rol",
            field: "rol",
            flex: 1,
            display: "flex",
            minWidth: 150,
            renderCell: ({ value }) => (
              <Grid container spacing={1} sx={{ width: "100%", my: 1 }}>
                {value.map((item: number) => (
                  <Grid key={item} size={12}>
                    <Chip
                      label={getRoleLabel(item, roles[item]?.nombre)}
                      size="small"
                      color="secondary"
                      sx={(theme) => ({
                        width: "100%",
                        bgcolor: roles[item].color || "secondary.main",
                        color: theme.palette.getContrastText(
                          roles[item].color || "secondary.main"
                        ),
                      })}
                    />
                  </Grid>
                ))}
              </Grid>
            ),
            valueFormatter: (value: number[]) => {
              return value
                .map((item) => getRoleLabel(item, roles[item]?.nombre))
                .join(", ");
            },
          },
          // {
          //   headerName: "QR",
          //   field: "id_usuario",
          //   align: "center",
          //   flex: 1,
          //   display: "flex",
          //   renderCell: ({ row }) => {
          //     return (
          //       <Fragment>
          //         {isDownloadingQr.descargando &&
          //         row._id === isDownloadingQr.id_usuario ? (
          //           <Spinner size="small" />
          //         ) : (
          //           <IconButton
          //             onClick={() => descargarQr(row._id, row.nombre)}
          //           >
          //             <GetApp fontSize="small" color="success" />
          //           </IconButton>
          //         )}
          //       </Fragment>
          //     );
          //   },
          // },
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
                      onClick={() => cambiarEstado(row._id, row.activo, row.nombre)}
                      label="Desactivar"
                      title="Desactivar"
                    />
                  ) : (
                    <Fragment>
                      <GridActionsCellItem
                        icon={<RestoreFromTrash color="success" />}
                        onClick={() => cambiarEstado(row._id, row.activo, row.nombre)}
                        label="Recuperar"
                        title="Recuperar"
                      />
                      <GridActionsCellItem
                        icon={<Delete color="error" />}
                        onClick={() => eliminarPermanente(row._id, row.nombre)}
                        label="Eliminar permanentemente"
                        title="Eliminar permanentemente"
                      />
                    </Fragment>
                  )
                );
              }
              return gridActions;
            },
          },
          // {
          //   headerName: "Acceso",
          //   field: "desbloqueo",
          //   type: "actions",
          //   align: "center",
          //   flex: 1,
          //   display: "flex",
          //   minWidth:100,
          //   getActions: ({ row }) => [
          //     row.bloqueado ? (
          //       <GridActionsCellItem
          //         icon={<Lock color="error" />}
          //         onClick={() => desbloquear(row._id)}
          //         label="Bloqueado Temporalmente"
          //         title="Bloqueado Temporalmente"
          //       />
          //     ) : (
          //       <GridActionsCellItem
          //         icon={<LockOpen color="success" />}
          //         label="Acceso"
          //         title="Acceso"
          //       />
          //     ),
          //   ],
          // },
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
              tableTitle="Usuarios del sistema"
              customActionButtons={
                <Fragment>
                  {mostrarSelector && (
                    <FormControl size="small" sx={{ minWidth: 220, mr: 1 }}>
                      <InputLabel id="vista-usuarios-label">Vista</InputLabel>
                      <Select
                        labelId="vista-usuarios-label"
                        value={tipoVista}
                        label="Vista"
                        onChange={(e) => setTipoVista(e.target.value as typeof tipoVista)}
                      >
                        {opcionesVista.map((item) => (
                          <MenuItem key={item.id} value={item.id}>
                            {item.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  <FormControl size="small" sx={{ minWidth: 180, mr: 1 }}>
                    <InputLabel id="estado-usuarios-label">Estado</InputLabel>
                    <Select
                      labelId="estado-usuarios-label"
                      value={estadoFiltro}
                      label="Estado"
                      onChange={(e) => setEstadoFiltro(e.target.value as typeof estadoFiltro)}
                    >
                      <MenuItem value="todos">Todos</MenuItem>
                      <MenuItem value="activos">Activos</MenuItem>
                      <MenuItem value="inactivos">Inactivos</MenuItem>
                    </Select>
                  </FormControl>
                  <Tooltip title="Agregar">
                    <IconButton onClick={nuevoRegistro}>
                      <Add fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {/* [En proceso] Botón de carga masiva oculto porque la funcionalidad aún no está disponible
                  <Tooltip title="Carga masiva">
                    <IconButton onClick={cargaMasiva}>
                      <Upload fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  */}
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






