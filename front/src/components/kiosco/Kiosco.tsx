import {
  alpha,
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  lighten,
  Stack,
  styled,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Fragment } from "react/jsx-runtime";
import { clienteAxios, handlingError } from "../../app/config/axios";
import dayjs, { Dayjs } from "dayjs";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { IRootState } from "../../app/store";
import type { GridSortModel } from "@mui/x-data-grid";
import type { AxiosError } from "axios";
import Spinner from "../utils/Spinner";
import { ArrowDownward, ArrowUpward, WarningAmber } from "@mui/icons-material";
import ErrorOverlay from "../error/DataGridError";
import SearchInput from "../recepcion/bitacora/utils/SearchInput";

const StyledStack = styled(Stack)(({ theme }) => ({
  width: "100%",
  height: "auto",
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  [theme.breakpoints.down("sm")]: {
    flexDirection: "column",
  },
}));

type IRegistro = {
  _id: string;
  img_usuario: string;
  nombre: string;
  anfitrion?: string;
  tipo_check: number;
  fecha_creacion: string;
  tipo_origen: 1 | 2 | 3;
  panel?: string;
  acceso?: string;
  id_registro?: string;
  id_empleado?: string;
  id_usuario?: string;
};

type ARGS = {
  estado: boolean;
  datos: IRegistro;
};

type IPanelAlerta = {
  _id: string;
  nombre: string;
  direccion_ip?: string;
  reloj_offset_segundos?: number;
  reloj_ultimo_desfase_segundos?: number;
};

const pageSizeOptions = [12, 24, 48];
const KIOSCO_PANEL_STORAGE_KEY = "SELECTED_KIOSCO_PANEL";

const TYPE = {
  1: "Usuario",
  2: "Visitante",
  3: "Indefinido",
};

export default function Kiosco() {
  const socket = useSelector((state: IRootState) => state.ws.data);
  const { rol, esRoot } = useSelector((state: IRootState) => state.auth.data);
  const { tipos_eventos } = useSelector(
    (state: IRootState) => state.config.data
  );
  const puedeVerAlertasReloj = esRoot && rol.includes(1);
  const [error, setError] = useState<string>();
  const [cargando, setCargando] = useState(false);
  const [ROWS, setRows] = useState<IRegistro[]>([]);
  const [firstRecord, setFirstRecord] = useState<IRegistro>();
  const [showModal, setShowModal] = useState(false);
  const [selectedReg, setSelectedReg] = useState<IRegistro | null>(null);
  // Filtering, sorting and pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(12);
  const [totalCount, setTotalCount] = useState(0);
  const [totalCountUsersIn, setTotalCountUsersIn] = useState(0);
  const [totalCountVisitsIn, setTotalCountVisitsIn] = useState(0);
  const [totalCountUsersOut, setTotalCountUsersOut] = useState(0);
  const [totalCountVisitsOut, setTotalCountVisitsOut] = useState(0);
  const [quickFilter, setQuickFilter] = useState<string>("");
  const [panelFilter, setPanelFilter] = useState<string>(
    localStorage.getItem(KIOSCO_PANEL_STORAGE_KEY) || "all"
  );
  const [alertasReloj, setAlertasReloj] = useState<IPanelAlerta[]>([]);
  const [sort, setSort] = useState<GridSortModel>([
    { field: "fecha_creacion", sort: "desc" },
  ]);
  const [searchDate] = useState<Dayjs | null>(dayjs());
  //   const [dateFilter, setDateFilter] = useState<"now" | null>("now");
  const [sorting, setSorting] = useState<"asc" | "desc">("desc");
  const getTipoEvento = (tipo: number) =>
    tipos_eventos?.[tipo] || { nombre: "Sin tipo", color: "#9e9e9e" };
  const colorIn = getTipoEvento(5).color || "#2e7d32";
  const colorOut = getTipoEvento(6).color || "#ef6c00";

  const obtenerRegistros = useCallback(async () => {
    setCargando(true);
    try {
      const dateFilter = searchDate?.toISOString() || "";
      const urlParams = new URLSearchParams({
        date: dateFilter,
        panel: panelFilter,
        filter: JSON.stringify(quickFilter ? [quickFilter] : []),
        pagination: JSON.stringify({ page, pageSize: pageSize }),
        sort: JSON.stringify(sort),
      });
      const res = await clienteAxios.get(
        "/api/eventos/kiosco?" + urlParams.toString()
      );
      if (res.data.estado) {
        setError("");
        setRows(res.data.datos.paginatedResults || []);
        setTotalCount(res.data.datos.stats?.totalCount || 0);
        setTotalCountUsersIn(res.data.datos.stats?.totalCountUserIn || 0);
        setTotalCountVisitsIn(res.data.datos.stats?.totalCountVisitIn || 0);
        setTotalCountUsersOut(res.data.datos.stats?.totalCountUserOut || 0);
        setTotalCountVisitsOut(res.data.datos.stats?.totalCountVisitOut || 0);
        if (page === 0) {
          setFirstRecord(res.data.datos.firstRecord);
        }
      }
    } catch (error: unknown) {
      setError((error as Error | AxiosError)?.message || "Error desconocido");
      handlingError(error);
      setPage(0);
      setPageSize(12);
      setRows([]);
      setTotalCount(0);
      setTotalCountUsersIn(0);
      setTotalCountVisitsIn(0);
      setTotalCountUsersOut(0);
      setTotalCountVisitsOut(0);
    } finally {
      setCargando(false);
    }
  }, [searchDate, panelFilter, quickFilter, sort, page, pageSize]);

  useEffect(() => {
    obtenerRegistros();
  }, [obtenerRegistros]);

  useEffect(() => {
    if (!puedeVerAlertasReloj) {
      setAlertasReloj([]);
      return;
    }
    const obtenerAlertasReloj = async () => {
      try {
        const res = await clienteAxios.get("/api/eventos/paneles-alerta-reloj");
        if (res.data?.estado) {
          setAlertasReloj(res.data.datos || []);
        } else {
          setAlertasReloj([]);
        }
      } catch {
        setAlertasReloj([]);
      }
    };
    obtenerAlertasReloj();
  }, [puedeVerAlertasReloj]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== KIOSCO_PANEL_STORAGE_KEY) return;
      setPanelFilter(event.newValue || "all");
      setPage(0);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleErrorFunctions = (error: unknown, functionName: string) => {
    console.error(functionName, error);
  };

  const actualizarEstadoEvento = useCallback(
    (args: ARGS) => {
      try {
        const { datos } = args;
        const IS_USER = datos?.tipo_origen === 1;
        const IS_VISIT = datos?.tipo_origen === 2;
        const IS_ENTER = datos.tipo_check == 5;
        const IS_EXIT = datos.tipo_check == 6;

        if (IS_USER) {
          if (IS_ENTER) {
            setTotalCountUsersIn((prev) => prev + 1);
            setTotalCountUsersOut((prev) => Math.max(0, prev - 1));
          }
          if (IS_EXIT) {
            setTotalCountUsersIn((prev) => Math.max(0, prev - 1));
            setTotalCountUsersOut((prev) => prev + 1);
          }
        }
        if (IS_VISIT) {
          if (IS_ENTER) {
            setTotalCountVisitsIn((prev) => prev + 1);
            setTotalCountVisitsOut((prev) => Math.max(0, prev - 1));
          }
          if (IS_EXIT) {
            setTotalCountVisitsIn((prev) => Math.max(0, prev - 1));
            setTotalCountVisitsOut((prev) => prev + 1);
          }
        }

        const updatedRows = ROWS.map((item) => {
          const eventoIdEmpleado = datos.id_empleado || datos.id_usuario;
          const rowIdEmpleado = item.id_empleado || item.id_usuario;
          if (item.tipo_origen === 1) {
            if (rowIdEmpleado === eventoIdEmpleado) {
              return { ...datos };
            }
          }
          if (item.tipo_origen === 2) {
            if (item.id_registro === datos.id_registro) {
              return { ...datos };
            }
          }
          return item;
        });
        const rowExists = updatedRows.some((row) => {
          const eventoIdEmpleado = datos.id_empleado || datos.id_usuario;
          const rowIdEmpleado = row.id_empleado || row.id_usuario;
          if (row.tipo_origen === 1) {
            return rowIdEmpleado === eventoIdEmpleado;
          }
          if (row.tipo_origen === 2) {
            return row.id_registro === datos.id_registro;
          }
          return false;
        });
        if (!rowExists) {
          if (searchDate) {
            if (
              dayjs(datos.fecha_creacion).isBetween(
                dayjs(searchDate).startOf("day"),
                dayjs(searchDate).endOf("day")
              )
            )
              updatedRows.push(datos);
          } else {
            updatedRows.push(datos);
          }
        }

        const sortedRows = updatedRows.sort((a, b) => {
          if (sorting == "desc") {
            return (
              new Date(b.fecha_creacion).getTime() -
              new Date(a.fecha_creacion).getTime()
            );
          }
          if (sorting == "asc") {
            return (
              new Date(a.fecha_creacion).getTime() -
              new Date(b.fecha_creacion).getTime()
            );
          } else {
            return (
              new Date(b.fecha_creacion).getTime() -
              new Date(a.fecha_creacion).getTime()
            );
          }
        });

        let paginatedRows: IRegistro[] = [];
        if (IS_USER) {
          const eventoIdEmpleado = datos.id_empleado || datos.id_usuario;
          const firstIdEmpleado = firstRecord?.id_empleado || firstRecord?.id_usuario;
          if (String(eventoIdEmpleado) === String(firstIdEmpleado)) {
            paginatedRows = sortedRows
              .slice(0, pageSize || 12)
              .filter(
                (item) =>
                  String(item.id_empleado || item.id_usuario) !==
                  String(eventoIdEmpleado)
              );
          } else {
            paginatedRows = (
              firstRecord ? [firstRecord, ...sortedRows] : [...sortedRows]
            )
              .slice(0, pageSize || 12)
              .filter(
                (item) =>
                  String(item.id_empleado || item.id_usuario) !==
                  String(eventoIdEmpleado)
              );
          }
        }
        if (IS_VISIT) {
          if (String(datos?.id_registro) === String(firstRecord?.id_registro)) {
            paginatedRows = sortedRows
              .slice(0, pageSize || 12)
              .filter(
                (item) => String(item.id_registro) !== String(datos.id_registro)
              );
          } else {
            paginatedRows = (
              firstRecord ? [firstRecord, ...sortedRows] : [...sortedRows]
            )
              .slice(0, pageSize || 12)
              .filter(
                (item) => String(item.id_registro) !== String(datos.id_registro)
              );
          }
        }
        setRows(paginatedRows);
        setFirstRecord(datos);
      } catch (error) {
        handleErrorFunctions(error, "actualizarEstadoEvento");
      }
    },
    [pageSize, firstRecord, ROWS, searchDate, sorting]
  );

  useEffect(() => {
    if (socket) {
      socket.on("eventos:recibir-nuevo-evento", actualizarEstadoEvento);
      return () => {
        socket.off("eventos:recibir-nuevo-evento", actualizarEstadoEvento);
      };
    }
  }, [socket, actualizarEstadoEvento]);

  //   const handleChangeDateFilter = (
  //     _event: React.MouseEvent<HTMLElement>,
  //     newAlignment: "now"
  //   ) => {
  //     setDateFilter(newAlignment);
  //     if (newAlignment === "now") {
  //       setPage(0);
  //       setPageSize(5);
  //       setSearchDate(dayjs().startOf("day"));
  //     }
  //     if (!newAlignment) {
  //       setPage(0);
  //       setPageSize(5);
  //       setSearchDate(null);
  //     }
  //   };

  const handleChangeSorting = (
    _event: React.MouseEvent<HTMLElement>,
    newAlignment: "asc" | "desc"
  ) => {
    setSorting((prev) => newAlignment || prev);
    if (newAlignment === "asc") {
      setSort([{ field: "fecha_creacion", sort: newAlignment }]);
    }
    if (newAlignment === "desc") {
      setSort([{ field: "fecha_creacion", sort: newAlignment }]);
    }
  };

  const handleChangePage = (
    _event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setPageSize(parseInt(event.target.value, pageSize));
    setPage(0);
  };

  const handleClickOpen = (registro: IRegistro) => {
    setShowModal(true);
    setSelectedReg(registro);
  };

  const handleClose = () => {
    setShowModal(false);
    setSelectedReg(null);
  };

  return (
    <Fragment>
      {puedeVerAlertasReloj && alertasReloj.length > 0 && (
        <Box component="section" sx={{ mb: 2 }}>
          <Card
            elevation={0}
            sx={(theme) => ({
              border: `1px solid ${lighten(alpha(theme.palette.warning.main, 0.4), 0.35)}`,
              backgroundColor: alpha(theme.palette.warning.light, 0.18),
            })}
          >
            <CardContent sx={{ py: 1.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <WarningAmber color="warning" fontSize="small" />
                <Typography variant="subtitle2" fontWeight={700}>
                  Alertas de reloj en paneles
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {alertasReloj.map((item) => (
                  <Chip
                    key={item._id}
                    color="warning"
                    size="small"
                    label={`${item.nombre} (${Math.round(
                      Number(item.reloj_offset_segundos || item.reloj_ultimo_desfase_segundos || 0) / 60
                    )} min)`}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}
      <Box
        component="section"
        position="relative"
        sx={{
          height: { xs: "auto", md: "calc(100dvh - 120px)" },
          minHeight: 400,
        }}
      >
        {!error && (
          <Card
            elevation={0}
            sx={(theme) => ({
              border: `1px solid ${lighten(
                alpha(theme.palette.divider, 0.3),
                0.88
              )}`,
              height: "100%",
            })}
          >
            <CardContent sx={{ pb: 0, height: "100%" }}>
              <Grid container spacing={2} sx={{ height: "100%" }}>
                <Grid
                  size={{ sm: 12, md: 5, xl: 3 }}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "space-around",
                    width: "100%",
                    height: "100%",
                    p: 1,
                  }}
                >
                  {cargando ? (
                    <Spinner />
                  ) : (
                    <Fragment>
                      {firstRecord && (
                        <Card elevation={3} sx={{ width: "100%" }}>
                          <CardActionArea
                            onClick={() => handleClickOpen(firstRecord)}
                          >
                            <CardMedia
                              component="img"
                              sx={(theme) => ({
                                bgcolor: theme.palette.grey[300],
                                height: { xs: 150, md: 150, lg: 180, xl: 250 },
                                objectFit: "contain",
                              })}
                              src={firstRecord.img_usuario}
                              title={firstRecord.nombre}
                            />
                          </CardActionArea>
                          <CardContent>
                            <Chip
                              label={getTipoEvento(firstRecord.tipo_check).nombre}
                              size="medium"
                              color="secondary"
                              sx={(theme) => ({
                                mb: 1,
                                width: "100%",
                                bgcolor: getTipoEvento(firstRecord.tipo_check).color || "secondary.main",
                                color: theme.palette.getContrastText(
                                  getTipoEvento(firstRecord.tipo_check).color || "secondary.main"
                                ),
                                fontSize: 18,
                              })}
                            />
                            <Typography
                              component="p"
                              variant="body2"
                              textAlign="justify"
                            >
                              <strong>Nombre:</strong> {firstRecord.nombre}
                            </Typography>
                            <Typography
                              component="p"
                              variant="subtitle2"
                              textAlign="justify"
                              fontSize={12}
                              color="info"
                            >
                              <strong>Origen:</strong>{" "}
                              {TYPE[firstRecord.tipo_origen]}
                            </Typography>
                            {firstRecord?.panel && (
                              <Typography
                                component="p"
                                variant="subtitle2"
                                textAlign="justify"
                                fontSize={12}
                                color="info"
                              >
                                <strong>Panel:</strong> {firstRecord?.panel}
                              </Typography>
                            )}
                            {firstRecord?.acceso && (
                              <Typography
                                component="p"
                                variant="subtitle2"
                                textAlign="justify"
                                fontSize={12}
                                color="info"
                              >
                                <strong>Acceso:</strong>
                                {firstRecord?.acceso}
                              </Typography>
                            )}
                            <Typography
                              component="p"
                              variant="body2"
                              textAlign="end"
                              fontSize={12}
                            >
                              {dayjs(firstRecord.fecha_creacion).format(
                                "DD/MM/YYYY, hh:mm:ss a"
                              )}
                              <br />
                            </Typography>
                            <Typography
                              component="p"
                              variant="body2"
                              textAlign="end"
                              fontSize={12}
                              fontWeight={700}
                            >
                              {dayjs(firstRecord.fecha_creacion).fromNow()}
                            </Typography>
                          </CardContent>
                        </Card>
                      )}
                      <Grid
                        container
                        spacing={2}
                        sx={{
                          width: "100%",
                          display: "flex",
                          flexDirection: { xs: "column", sm: "row" },
                          mt: 2,
                        }}
                      >
                        <Grid size={{ xs: 12, sm: 3, xl: 6 }}>
                          <Card
                            elevation={3}
                            sx={{
                              width: "100%",
                              height: "100%",
                              p: 0,
                              border: `2px solid ${colorIn}`,
                            }}
                          >
                            <CardContent
                              sx={{ p: 1, ":last-child": { pb: 1 } }}
                            >
                              <Typography
                                variant="h5"
                                component="span"
                                color={
                                  totalCountUsersIn ? "success" : "textPrimary"
                                }
                              >
                                {totalCountUsersIn}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                fontSize={11}
                              >
                                Usuarios In
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3, xl: 6 }}>
                          <Card
                            elevation={3}
                            sx={{
                              width: "100%",
                              height: "100%",
                              p: 0,
                              border: `2px solid ${colorOut}`,
                            }}
                          >
                            <CardContent
                              sx={{ p: 1, ":last-child": { pb: 1 } }}
                            >
                              <Typography
                                variant="h5"
                                component="span"
                                color={
                                  totalCountUsersOut ? "success" : "textPrimary"
                                }
                              >
                                {totalCountUsersOut}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                fontSize={11}
                              >
                                Usuarios Out
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3, xl: 6 }}>
                          <Card
                            elevation={3}
                            sx={{
                              width: "100%",
                              height: "100%",
                              p: 0,
                              border: `2px solid ${colorIn}`,
                            }}
                          >
                            <CardContent
                              sx={{ p: 1, ":last-child": { pb: 1 } }}
                            >
                              <Typography
                                variant="h5"
                                component="span"
                                color={
                                  totalCountVisitsIn ? "success" : "textPrimary"
                                }
                              >
                                {totalCountVisitsIn}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                fontSize={11}
                              >
                                Visitantes In
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid size={{ xs: 12, sm: 3, xl: 6 }}>
                          <Card
                            elevation={3}
                            sx={{
                              width: "100%",
                              height: "100%",
                              p: 0,
                              border: `2px solid ${colorOut}`,
                            }}
                          >
                            <CardContent
                              sx={{ p: 1, ":last-child": { pb: 1 } }}
                            >
                              <Typography
                                variant="h5"
                                component="span"
                                color={
                                  totalCountVisitsOut
                                    ? "success"
                                    : "textPrimary"
                                }
                              >
                                {totalCountVisitsOut}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                fontSize={11}
                              >
                                Visitantes Out
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </Fragment>
                  )}
                </Grid>
                <Divider
                  flexItem
                  sx={{ width: "100%", display: { xs: "block", md: "none" } }}
                />
                <Grid
                  container
                  size={{ sm: 12, md: 7, xl: 9 }}
                  sx={{ width: "100%", height: "100%", p: 0.8 }}
                >
                  <Grid
                    size={12}
                    sx={{
                      display: "flex",
                      justifyContent: { xs: "center", sm: "end" },
                      alignItems: "center",
                      p: 0.5,
                    }}
                  >
                    <StyledStack rowGap={2}>
                      <Stack
                        direction={{ xs: "column-reverse", sm: "row" }}
                        divider={<Divider orientation="vertical" flexItem />}
                        sx={{ width: "100%", height: "100%" }}
                      >
                        <ToggleButtonGroup
                          id="sorting"
                          color="primary"
                          value={sorting}
                          exclusive
                          onChange={handleChangeSorting}
                          size="small"
                          sx={{
                            width: { xs: "100%", sm: "auto" },
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <ToggleButton value="asc" fullWidth>
                            <ArrowUpward fontSize="small" />
                          </ToggleButton>
                          <ToggleButton value="desc" fullWidth>
                            <ArrowDownward fontSize="small" />
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Stack>
                      <SearchInput
                        textFieldProps={{
                          size: "small",
                          name: "general",
                          placeholder: "Buscar...",
                          margin: "none",
                          sx: {
                            float: "inline-end",
                            width: { xs: "100%", md: 400 },
                          },
                        }}
                        boxProps={{
                          width: "100%",
                          display: "flex",
                          justifyContent: "end",
                        }}
                        setValue={setQuickFilter}
                      />
                    </StyledStack>
                  </Grid>
                  <Grid
                    container
                    spacing={2}
                    sx={{
                      maxHeight: "calc(100% - 100px)",
                      width: "100%",
                      overflow: "auto",
                      p: 0.5,
                    }}
                  >
                    {cargando ? (
                      <Spinner />
                    ) : (
                      <Fragment>
                        {ROWS.length === 0 && (
                          <Box
                            component="div"
                            width="100%"
                            height="100%"
                            display="flex"
                            justifyContent="center"
                            alignItems="center"
                          >
                              <Typography
                                component="span"
                                variant="h6"
                                textAlign="center"
                              >
                              Sin registros del d&iacute;a.
                              </Typography>
                          </Box>
                        )}
                        {ROWS.map((item) => (
                          <Grid
                            key={item._id}
                            size={{ xs: 12, sm: 6, md: 4, xl: 3 }}
                          >
                            <Card elevation={3} sx={{ height: "100%" }}>
                              <CardActionArea
                                onClick={() => handleClickOpen(item)}
                              >
                                <CardMedia
                                  component="img"
                                  sx={(theme) => ({
                                    bgcolor: theme.palette.grey[300],
                                    height: { xs: 120, xl: 150 },
                                    objectFit: "contain",
                                  })}
                                  src={item.img_usuario}
                                  title={item.nombre}
                                />
                              </CardActionArea>
                              <CardContent>
                                <Chip
                                  label={getTipoEvento(item.tipo_check).nombre}
                                  size="small"
                                  color="secondary"
                                  sx={(theme) => ({
                                    mb: 1,
                                    width: "100%",
                                    bgcolor: getTipoEvento(item.tipo_check).color || "secondary.main",
                                    color: theme.palette.getContrastText(
                                      getTipoEvento(item.tipo_check).color || "secondary.main"
                                    ),
                                  })}
                                />
                                <Typography
                                  component="p"
                                  variant="subtitle2"
                                  textAlign="justify"
                                  //   marginBottom={1}
                                >
                                  <strong>Nombre:</strong> {item.nombre}
                                </Typography>
                                <Typography
                                  component="p"
                                  variant="subtitle2"
                                  textAlign="justify"
                                  fontSize={11}
                                  color="info"
                                >
                                  <strong>Origen:</strong>{" "}
                                  {TYPE[item.tipo_origen]}
                                </Typography>
                                {item?.panel && (
                                  <Typography
                                    component="p"
                                    variant="subtitle2"
                                    textAlign="justify"
                                    fontSize={11}
                                    color="info"
                                  >
                                    <strong>Panel:</strong> {item?.panel}
                                  </Typography>
                                )}
                                {item?.acceso && (
                                  <Typography
                                    component="p"
                                    variant="subtitle2"
                                    textAlign="justify"
                                    fontSize={11}
                                    color="info"
                                  >
                                    <strong>Acceso:</strong> {item?.acceso}
                                  </Typography>
                                )}
                                {/* {item.anfitrion && (
                                  <Typography
                                    component="p"
                                    variant="subtitle2"
                                    textAlign="justify"
                                    marginBottom={1}
                                  >
                                    <strong>Anfitrión:</strong> {item.anfitrion}
                                  </Typography>
                                )} */}
                                <Typography
                                  component="p"
                                  variant="subtitle2"
                                  textAlign="end"
                                  fontSize={11}
                                >
                                  {dayjs(item.fecha_creacion).format(
                                    "DD/MM/YYYY, hh:mm:ss a"
                                  )}
                                </Typography>
                                <Typography
                                  component="p"
                                  variant="subtitle2"
                                  textAlign="end"
                                  fontSize={11}
                                  fontWeight={700}
                                >
                                  {dayjs(item.fecha_creacion).fromNow()}
                                </Typography>
                                {/* <Box
                                  component="div"
                                  display="flex"
                                  flexDirection="column"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  sx={{ flexWrap: "wrap" }}
                                > */}

                                {/* </Box> */}
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Fragment>
                    )}
                  </Grid>
                  <Grid
                    size={12}
                    sx={{
                      display: "flex",
                      justifyContent: { xs: "center", sm: "end" },
                      alignItems: "center",
                    }}
                  >
                    <TablePagination
                      component="div"
                      count={totalCount}
                      page={page}
                      onPageChange={handleChangePage}
                      rowsPerPage={pageSize}
                      onRowsPerPageChange={handleChangeRowsPerPage}
                      rowsPerPageOptions={pageSizeOptions}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
        {error && <ErrorOverlay error={error} onClick={obtenerRegistros} />}
      </Box>
      <Dialog
        open={showModal}
        onClose={handleClose}
        slotProps={{
          paper: {
            sx: {
              maxWidth: { xs: 600, xl: 800 },
              minWidth: 200,
              width: { xs: 400, lg: 600, xl: 800 },
            },
          },
        }}
      >
        <DialogTitle textAlign="center">{selectedReg?.nombre}</DialogTitle>
        <DialogContent>
          <Box component="img" width={"100%"} src={selectedReg?.img_usuario} />
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}
