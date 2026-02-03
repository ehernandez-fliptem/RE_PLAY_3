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
  GetApp,
  RestoreFromTrash,
  // Upload, // [En proceso] Ocultado por funcionalidad de carga masiva no disponible
  Visibility,
} from "@mui/icons-material";
import { Avatar, IconButton, Tooltip } from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useConfirm } from "material-ui-confirm";
import { AxiosError } from "axios";
import { base64ToFile } from "../../helpers/generalHelpers";
import ErrorOverlay from "../../error/DataGridError";
import Spinner from "../../utils/Spinner";

const pageSizeOptions = [10, 25, 50];

export default function Empleados() {
  const apiRef = useGridApiRef();
  const [error, setError] = useState<string>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [isDownloadingQr, setIsDownloadingQr] = useState({
    id_usuario: "",
    descargando: false,
  });

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
            "/api/empleados?" + urlParams.toString()
          );
          //console.log("datos tabla ", res);
          if (res.data.estado) {
            setError("");
            rows = (res.data.datos.paginatedResults || []).map((r: any) => ({
              ...r,
              id_empleado: Number(r.id_empleado),
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
    navigate("nuevo-empleado");
  };

  const editarRegistro = (ID: string) => {
    navigate(`editar-empleado/${ID}`);
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle-empleado/${ID}`);
  };

  // [En proceso] Función de carga masiva deshabilitada temporalmente
  // const cargaMasiva = () => {
  //   navigate("carga-masiva");
  // };

  const cambiarEstado = async (ID: string, activo: boolean) => {
    if (!activo) {
      try {
        const res = await clienteAxios.patch(`/api/empleados/${ID}`, {
          activo,
        });
        if (res.data.estado) {
          apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "error" });
        }
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      }
    } else {
      confirm({
        title: "¿Seguro que deseas desactivar a este empleado?",
        description: "",
        allowClose: true,
        confirmationText: "Continuar",
      })
        .then(async (result) => {
          if (result.confirmed) {
            const res = await clienteAxios.patch(`/api/empleados/${ID}`, {
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

  const descargarQr = async (ID: string, nombre: string) => {
    try {
      setIsDownloadingQr({ id_usuario: ID, descargando: true });
      const res = await clienteAxios.get(`/api/empleados/qr/${ID}`);
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

  // --- COLUMNAS OCULTAS TEMPORALMENTE ---
  // Las siguientes columnas se comentan porque no se requieren en la vista actual de empleados.
  // Si en el futuro se necesitan, solo descomentar. Motivo: simplificar la interfaz y mostrar solo lo esencial.

  /*
  {
    headerName: "ID",
    field: "id_empleado",
    flex: 1,
    display: "flex",
    minWidth: 80,
    // Ocultado porque no se necesita mostrar el ID en la gestión de empleados por ahora.
  },
  {
    headerName: "Rol",
    field: "rol",
    flex: 1,
    display: "flex",
    minWidth: 120,
    // Ocultado porque el rol no es relevante para la gestión directa de empleados en esta vista.
  },
  {
    headerName: "Tipo",
    field: "tipo",
    flex: 1,
    display: "flex",
    minWidth: 100,
    // Ocultado porque el tipo no se requiere en la gestión de empleados actualmente.
  },
  {
    headerName: "Arco",
    field: "arco",
    type: "actions",
    align: "center",
    flex: 1,
    display: "flex",
    minWidth:100,
    // Ocultado porque la funcionalidad de arco no es necesaria en esta etapa.
  },
  {
    headerName: "Acceso",
    field: "desbloqueo",
    type: "actions",
    align: "center",
    flex: 1,
    display: "flex",
    minWidth:100,
    // Ocultado porque la gestión de acceso no se requiere por ahora.
  },
  */
  // --- FIN COLUMNAS OCULTAS ---

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
            headerName: "Empresa",
            field: "empresa",
            flex: 1,
            display: "flex",
            minWidth: 180,
          },
          {
            headerName: "Nombre",
            field: "nombre",
            flex: 1,
            display: "flex",
            minWidth: 180,
          },
          // Tipo: oculto por ahora porque no se ocupa en esta vista y se busca mantenerla simple.
          // Si se requiere mostrar el tipo de cuenta, descomentar este bloque.
          // {
          //   headerName: "Tipo",
          //   field: "esRoot",
          //   disableExport: true,
          //   flex: 1,
          //   display: "flex",
          //   minWidth: 100,
          //   renderCell: ({ value }) => (
          //     <Fragment>
          //       {value ? (
          //         <Chip
          //           label="Maestra"
          //           size="small"
          //           color="primary"
          //           sx={{ width: "100%" }}
          //         />
          //       ) : (
          //         <Chip
          //           label="Esclava"
          //           size="small"
          //           color="secondary"
          //           sx={{ width: "100%" }}
          //         />
          //       )}
          //     </Fragment>
          //   ),
          // },
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
              if (row.id_empleado !== 1) {
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
              tableTitle="Gestión de Empleados"
              customActionButtons={
                <Fragment>
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

