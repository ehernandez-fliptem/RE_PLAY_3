import { useState, useMemo, Fragment, useCallback, useEffect } from "react";
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
  Cached,
  Check,
  ChevronLeft,
  ChevronRight,
  Close,
  Delete,
  Edit,
  ExitToApp,
  Mail,
  MeetingRoom,
  QrCodeScanner,
  Visibility,
  Warning,
} from "@mui/icons-material";
import {
  alpha,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  lighten,
  Stack,
  Tooltip,
} from "@mui/material";

import ErrorOverlay from "../../error/DataGridError";
import { AxiosError } from "axios";
import { DatePicker } from "@mui/x-date-pickers";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { PickerValue } from "@mui/x-date-pickers/internals";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import { FormProvider, useForm } from "react-hook-form";
import LectorQr from "./lector/LectorQr";
import { useConfirm } from "material-ui-confirm";
import { closeSnackbar, enqueueSnackbar } from "notistack";
import { showDialogComment } from "../../utils/functions/showDialogComment";
import { useLocalStorageListener } from "../../../hooks/useLocalStorageListener";

type ARGS = {
  estado: boolean;
  datos: {
    _id: string;
    tipo_registro: number;
    nombre: string;
    anfitrion: string;
    accesos: string[];
    fecha_entrada: string;
    fecha_salida: string;
    estatus: number;
    activo: boolean;
    fecha_modificacion: string;
  };
};

const pageSizeOptions = [10, 25, 50, 100];

type FormValues = {
  searchDate: Dayjs;
};
const initialValue: FormValues = {
  searchDate: dayjs().startOf("day"),
};

export default function Bitacora() {
  const ACCESS = localStorage.getItem("SELECTED_ACCESS");
  const socket = useSelector((state: IRootState) => state.ws.data);
  const { rol } = useSelector((state: IRootState) => state.auth.data);
  const esRecep = rol.includes(2);
  const esVisit = rol.includes(10);
  const { tipos_registros, tipos_eventos } = useSelector(
    (state: IRootState) => state.config.data
  );
  const TIPOS_REGISTROS = Object.entries(tipos_registros).map((item) => {
    return {
      id: Number(item[0]),
      label: item[1].nombre,
      link: `nuevo-registro?t=${item[0]}`,
      tooltip: item[1].descripcion,
    };
  });
  const apiRef = useGridApiRef();
  const formContext = useForm({
    defaultValues: initialValue,
  });
  const searchDate = formContext.watch("searchDate");

  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [cargando, setCargando] = useState(false);
  const [open, setOpen] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const confirm = useConfirm();
  const [accesoActual, setAccesoActual] = useState(ACCESS);

  const dataSource: GridDataSource = useMemo(
    () => ({
      getRows: async (params) => {
        let rows: GridValidRowModel[] = [];
        let rowCount: number = 0;
        try {
          const dateFilter = searchDate?.toISOString();
          const urlParams = new URLSearchParams({
            date: dateFilter,
            filter: JSON.stringify(params.filterModel.quickFilterValues),
            pagination: JSON.stringify(params.paginationModel),
            sort: JSON.stringify(params.sortModel),
          });
          const res = await clienteAxios.get(
            "/api/registros?" + urlParams.toString()
          );
          if (res.data.estado) {
            setError("");
            rows = res.data.datos.paginatedResults || [];
            rowCount = res.data.datos.totalCount[0]?.count || 0;
          }
          setShowQRScanner(false);
          setCargando(false);
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
    [searchDate]
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

  const handleErrorFunctions = (error: unknown, functionName: string) => {
    console.error(functionName, error);
  };

  const actualizarEstadoRegistros = useCallback(
    (args: { datos: ARGS["datos"][] }) => {
      try {
        const { datos } = args;
        const searchDate = formContext.watch("searchDate");

        const pageSize =
          apiRef.current?.state.pagination.paginationModel.pageSize || 10;
        const rowModels = apiRef.current?.getRowModels() || [];
        const rowsValues = Array.from(rowModels).map((item) => item[1]);

        const updatedRowsMap = new Map(rowsValues.map((row) => [row._id, row]));

        datos.forEach((nuevoRegistro) => {
          if (
            dayjs(nuevoRegistro.fecha_entrada).isBetween(
              dayjs(searchDate).startOf("day"),
              dayjs(searchDate).endOf("day")
            ) &&
            nuevoRegistro.accesos.some((item) => accesoActual === item)
          ) {
            updatedRowsMap.set(nuevoRegistro._id, nuevoRegistro);
          }
        });

        const updatedRows = Array.from(updatedRowsMap.values());

        const sortedRows = updatedRows.sort(
          (a, b) =>
            new Date(b.fecha_modificacion).getTime() -
            new Date(a.fecha_modificacion).getTime()
        );

        const paginatedRows = sortedRows.slice(0, pageSize);
        apiRef.current?.setRows(paginatedRows);
      } catch (error) {
        handleErrorFunctions(error, "actualizarEstadoRegistro");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiRef, accesoActual]
  );

  const actualizarEstadoRegistro = useCallback(
    (args: ARGS) => {
      try {
        const { datos } = args;
        const searchDate = formContext.watch("searchDate");

        const pageSize =
          apiRef.current?.state.pagination.paginationModel.pageSize || 10;
        const rowModels = apiRef.current?.getRowModels() || [];
        const rowsValues = Array.from(rowModels).map((item) => item[1]);
        const updatedRows = rowsValues.map((item) => {
          if (item._id === datos._id) {
            return { ...datos };
          }
          return item;
        });

        const rowExists = updatedRows.some((row) => row._id === datos._id);
        if (!rowExists) {
          if (
            dayjs(datos.fecha_entrada).isBetween(
              dayjs(searchDate).startOf("day"),
              dayjs(searchDate).endOf("day")
            )
          )
            updatedRows.push(datos);
        }

        const sortedRows = updatedRows.sort(
          (a, b) =>
            new Date(b.fecha_modificacion).getTime() -
            new Date(a.fecha_modificacion).getTime()
        );

        const paginatedRows = sortedRows.slice(0, pageSize);
        apiRef.current?.setRows(paginatedRows);
      } catch (error) {
        handleErrorFunctions(error, "actualizarEstadoRegistro");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apiRef]
  );

  useEffect(() => {
    if (socket) {
      socket.on("registros:recibir-nuevos", actualizarEstadoRegistros);
      socket.on(
        "registros:recibir-modificacion-estado",
        actualizarEstadoRegistro
      );
      return () => {
        socket.off("registros:recibir-nuevos", actualizarEstadoRegistros);
        socket.off(
          "registros:recibir-modificacion-estado",
          actualizarEstadoRegistro
        );
      };
    }
  }, [socket, actualizarEstadoRegistro, actualizarEstadoRegistros]);

  useLocalStorageListener("SELECTED_ACCESS", (newValue) => {
    setAccesoActual(newValue as string);
    apiRef.current?.dataSource.fetchRows();
  });

  const nuevoRegistro = (link: string) => {
    handleClose();
    navigate(link);
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle-registro/${ID}`);
  };

  const enviarLiga = () => {
    navigate("enviar-liga-cita");
  };

  const modificar = (ID: string) => {
    navigate(`editar-registro/${ID}`);
  };

  const handleChangeDate = (value: PickerValue | Dayjs) => {
    setCargando(true);
    formContext.setValue("searchDate", value || dayjs().startOf("day"));
  };

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpenScanner = () => {
    setShowQRScanner(true);
  };

  const reloadData = () => {
    formContext.reset({ searchDate: dayjs(searchDate).startOf("day") });
  };

  const cancelar = async (ID: string) => {
    let key = null;
    try {
      const { isSubmitted, result } = await showDialogComment({
        title: "Motivo de cancelación",
        label: "Comentarios",
        showCheckBox: true,
      });
      if (isSubmitted) {
        if (result?.check) {
          key = enqueueSnackbar(`Enviando correos`, {
            variant: "info",
            persist: true,
          });
        }
        const res = await clienteAxios.put(`/api/registros/cancelar/${ID}`, {
          motivo_cancelacion: result?.text,
          enviar_correo: result?.check,
        });
        if (res.data.estado) {
          if (key) closeSnackbar(key);
          if (result?.check) {
            const { anfitrion, visitante } = res.data.datos;
            if (result?.check) {
              enqueueSnackbar("El registro se canceló correctamente.", {
                variant: "success",
              });
              enqueueSnackbar(
                anfitrion
                  ? "El correo al anfitrión se envió correctamente."
                  : "El correo al anfitrión no se envió correctamente.",
                { variant: anfitrion ? "success" : "warning" }
              );
              enqueueSnackbar(
                visitante
                  ? "El correo al visitante se envió correctamente."
                  : "El correo al visitante no se envió correctamente.",
                { variant: visitante ? "success" : "warning" }
              );
            } else {
              enqueueSnackbar("El registro se canceló correctamente.", {
                variant: "success",
              });
            }
          } else {
            enqueueSnackbar("El registro se canceló correctamente.", {
              variant: "success",
            });
          }
          apiRef.current?.dataSource.fetchRows();
          socket?.emit("registros:modificar-estado", { id_registro: ID });
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "error" });
        }
      }
    } catch (error: unknown) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      if (key) closeSnackbar(key);
    }
  };

  const finalizar = async (ID: string) => {
    confirm({
      title: "¿Seguro que desea finalizar el registro?",
      allowClose: true,
      confirmationText: "Confirmar",
    })
      .then(async (result) => {
        if (result.confirmed) {
          const res = await clienteAxios.put(`/api/registros/finalizar/${ID}`);
          if (res.data.estado) {
            apiRef.current?.dataSource.fetchRows();
            socket?.emit("registros:modificar-estado", { id_registro: ID });
            enqueueSnackbar("El registro se finalizó correctamente.", {
              variant: "success",
            });
          } else {
            enqueueSnackbar(res.data.mensaje, { variant: "error" });
          }
        }
      })
      .catch((error) => {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      });
  };

  const marcarAcceso = async (ID: string) => {
    confirm({
      title: "¿Seguro que desea marcar un nuevo acceso para el visitante?",
      description:
        "Esta acción creará un nuevo evento de acuerdo a tu acceso asignado y al estatus actual del visitante.",
      allowClose: true,
      confirmationText: "Confirmar",
    })
      .then(async (result) => {
        if (result.confirmed) {
          const res = await clienteAxios.patch(`/api/registros/acceso/${ID}`);
          if (res.data.estado) {
            apiRef.current?.dataSource.fetchRows();
            socket?.emit("registros:modificar-estado", { id_registro: ID });
            enqueueSnackbar("El acceso se concedió correctamente.", {
              key: Math.random().toString(36).substring(2, 9),
              variant: "success",
            });
          } else {
            enqueueSnackbar(res.data.mensaje, { variant: "error" });
          }
        }
      })
      .catch((error) => {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      });
  };

  const onQrChange = async (QR: string): Promise<boolean> => {
    return await new Promise((resolve, reject) => {
      (async () => {
        try {
          const res = await clienteAxios.post("/api/eventos/validar-qr", {
            qr: QR,
            lector: 0,
          });
          if (res.data.estado) {
            const { id_registro: ID, puedeAcceder } = res.data.datos;
            if (!puedeAcceder) {
              navigate(`permitir-entrada/${ID}`);
            } else {
              apiRef.current?.dataSource.fetchRows();
              socket?.emit("registros:modificar-estado", { id_registro: ID });
            }
            setShowQRScanner(false);
            resolve(true);
          } else {
            enqueueSnackbar(res.data.mensaje, { variant: "error" });
            resolve(false);
          }
        } catch (error) {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
          reject(error);
        }
      })();
    });
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
            headerName: "Fecha",
            field: "fecha_entrada",
            type: "date",
            flex: 1,
            display: "flex",
            minWidth: 180,
            valueGetter: (value) => {
              return new Date(value);
            },
            valueFormatter: (value) => {
              return dayjs(value).format("DD/MM/YYYY, HH:mm:ss a");
            },
          },
          {
            headerName: "Nombre",
            field: "nombre",
            flex: 1,
            display: "flex",
            minWidth: 180,
          },
          {
            headerName: "Acceso",
            field: "tipo_registro",
            flex: 1,
            display: "flex",
            align: "center",
            minWidth: 150,
            renderCell: ({ row, value }) => (
              <Grid container spacing={1} sx={{ width: "100%", my: 1 }}>
                <Grid size={12}>
                  <Chip
                    label={tipos_registros[value].nombre}
                    size="small"
                    sx={(theme) => ({
                      width: "100%",
                      bgcolor: tipos_registros[value].color || "secondary.main",
                      color: theme.palette.getContrastText(
                        tipos_registros[value].color || "secondary.main"
                      ),
                    })}
                  />
                </Grid>
                <Grid size={12}>
                  <Tooltip
                    title={
                      row.docs_faltantes.length > 0
                        ? row.docs_faltantes.join(" - ")
                        : ""
                    }
                  >
                    <Chip
                      icon={
                        row.docs_faltantes.length > 0 ? <Warning /> : <Check />
                      }
                      label="Documentación"
                      size="small"
                      color={
                        row.docs_faltantes.length > 0 ? "warning" : "success"
                      }
                      sx={{
                        width: "100%",
                      }}
                    />
                  </Tooltip>
                </Grid>
              </Grid>
            ),
            valueFormatter: (value) => {
              return tipos_registros[value].nombre;
            },
          },
          {
            headerName: "Anfitrión",
            field: "anfitrion",
            flex: 1,
            display: "flex",
            minWidth: 180,
          },
          {
            headerName: "Estado",
            field: "estatus",
            flex: 1,
            display: "flex",
            align: "center",
            minWidth: 150,
            renderCell: ({ row, value }) => (
              <Grid container spacing={1} sx={{ width: "100%", my: 1 }}>
                <Grid size={12}>
                  <Chip
                    label={tipos_eventos[value].nombre}
                    size="small"
                    color="secondary"
                    sx={(theme) => ({
                      width: "100%",
                      bgcolor: tipos_eventos[value].color || "secondary.main",
                      color: theme.palette.getContrastText(
                        tipos_eventos[value].color || "secondary.main"
                      ),
                    })}
                  />
                </Grid>
                {row.accesos.length === 0 ? (
                  <Grid size={12}>
                    <Chip
                      label="Sin acceso definido"
                      size="small"
                      color="error"
                      sx={{
                        width: "100%",
                      }}
                    />
                  </Grid>
                ) : (
                  row.acceso && (
                    <Grid size={12}>
                      <Chip
                        label={row.acceso}
                        size="small"
                        color="secondary"
                        sx={{
                          width: "100%",
                        }}
                      />
                    </Grid>
                  )
                )}
              </Grid>
            ),
            valueFormatter: (value) => {
              return tipos_eventos[value].nombre;
            },
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
              if (esRecep && [1].includes(row.estatus))
                gridActions.push(
                  <GridActionsCellItem
                    icon={<Edit color="info" />}
                    onClick={() => modificar(row._id)}
                    label="Modificar"
                    title="Modificar"
                  />
                );
              if (
                esRecep &&
                row.activo &&
                [1, 5, 6].includes(row.estatus) &&
                row.permitir_acceso
              )
                gridActions.push(
                  <GridActionsCellItem
                    icon={<MeetingRoom color="info" />}
                    onClick={() =>
                      row.estatus == 1
                        ? navigate(`permitir-entrada/${row._id}`)
                        : marcarAcceso(row._id)
                    }
                    label="Dar acceso"
                    title="Dar acceso"
                  />
                );
              if (esRecep && row.activo && [1].includes(row.estatus))
                gridActions.push(
                  <GridActionsCellItem
                    icon={<Delete color="success" />}
                    onClick={() => cancelar(row._id)}
                    label="Cancelar"
                    title="Cancelar"
                  />
                );
              if (
                esRecep &&
                row.activo &&
                row.se_puede_finalizar &&
                [6].includes(row.estatus)
              )
                gridActions.push(
                  <GridActionsCellItem
                    icon={<ExitToApp color="success" />}
                    onClick={() => finalizar(row._id)}
                    label="Finalizar"
                    title="Finalizar"
                  />
                );
              return gridActions;
            },
          },
          {
            headerName: "Fecha modificación",
            field: "fecha_modificacion",
            type: "date",
            flex: 1,
            display: "flex",
            minWidth: 180,
            valueGetter: (value) => {
              return new Date(value);
            },
            valueFormatter: (value) => {
              return dayjs(value).format("DD/MM/YYYY, HH:mm:ss a");
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
            <Fragment>
              <DataGridToolbar
                tableTitle="Bitácora"
                customActionButtons={
                  <Fragment>
                    {esRecep && (
                      <Tooltip title="Lector QR">
                        <IconButton onClick={handleOpenScanner}>
                          <QrCodeScanner fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {!esVisit && (
                      <Tooltip title="Crear nuevo">
                        <IconButton onClick={handleClickOpen}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Enviar liga de cita">
                      <IconButton onClick={enviarLiga}>
                        <Mail fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Recargar bitácora">
                      <IconButton onClick={reloadData}>
                        <Cached fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Dialog
                      open={open}
                      onClose={handleClose}
                      fullWidth
                      disableEscapeKeyDown
                    >
                      <DialogTitle display="flex" justifyContent="center">
                        Crear un nuevo registro de:
                      </DialogTitle>
                      <DialogContent sx={{ width: "100%" }}>
                        <Grid
                          container
                          spacing={2}
                          sx={{ display: "flex", justifyContent: "center" }}
                        >
                          {TIPOS_REGISTROS.reverse().map((item) => {
                            if (item.id === 1 && !esRecep) return <></>;
                            return (
                              <Grid key={item.label} size={{ xs: 12, sm: 4 }}>
                                <Tooltip title={item.tooltip} arrow>
                                  <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    onClick={() => nuevoRegistro(item.link)}
                                    startIcon={<Add />}
                                  >
                                    {item.label}
                                  </Button>
                                </Tooltip>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </DialogContent>
                      <DialogActions sx={{ px: 3, pb: 3 }}>
                        <Stack
                          spacing={2}
                          direction={{ xs: "column-reverse", sm: "row" }}
                          justifyContent="end"
                          sx={{ width: "100%" }}
                        >
                          <Button
                            variant="contained"
                            color="secondary"
                            autoFocus
                            onClick={handleClose}
                            startIcon={<Close />}
                          >
                            Cancelar
                          </Button>
                        </Stack>
                      </DialogActions>
                    </Dialog>
                  </Fragment>
                }
              />
              <Stack
                spacing={2}
                display="flex"
                direction={{ xs: "column", sm: "row" }}
                sx={{ p: 1 }}
              >
                <Box
                  sx={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid size={2}>
                      <IconButton
                        disabled={cargando}
                        size="small"
                        onClick={() =>
                          handleChangeDate(searchDate?.subtract(1, "day"))
                        }
                      >
                        <ChevronLeft />
                      </IconButton>
                    </Grid>
                    <Grid size={8}>
                      <DatePicker
                        disabled={cargando}
                        slotProps={{
                          field: {
                            clearable: false,
                          },
                          textField: {
                            fullWidth: true,
                            margin: "none",
                            size: "small",
                          },
                        }}
                        value={searchDate}
                        onChange={(value) => handleChangeDate(value)}
                      />
                    </Grid>
                    <Grid size={2}>
                      <IconButton
                        disabled={cargando}
                        size="small"
                        onClick={() =>
                          handleChangeDate(searchDate?.add(1, "day"))
                        }
                      >
                        <ChevronRight />
                      </IconButton>
                    </Grid>
                  </Grid>
                </Box>
              </Stack>
              <Divider
                sx={(theme) => ({
                  borderBottom: `1px solid ${lighten(
                    alpha(theme.palette.divider, 0.3),
                    0.88
                  )}`,
                })}
              />
            </Fragment>
          ),
        }}
      />
      {error && (
        <ErrorOverlay error={error} gridDataRef={apiRef.current?.dataSource} />
      )}
      {showQRScanner && (
        <FormProvider {...formContext}>
          <LectorQr
            name="qr"
            setShow={setShowQRScanner}
            onQrChange={onQrChange}
          />
        </FormProvider>
      )}
      <Outlet context={apiRef.current?.dataSource} />
    </div>
  );
}
