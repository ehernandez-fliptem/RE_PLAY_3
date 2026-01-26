import { useState, Fragment, useCallback, useEffect } from "react";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { Outlet, useNavigate } from "react-router-dom";
import {
  ArrowDownward,
  ArrowUpward,
  ChevronLeft,
  People,
  QrCode,
} from "@mui/icons-material";
import {
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardHeader,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Divider,
  Grid,
  IconButton,
  lighten,
  Stack,
  styled,
  TablePagination,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import SearchInput from "./utils/SearchInput";
import type { GridSortModel } from "@mui/x-data-grid";
import Spinner from "../../utils/Spinner";
import ErrorOverlay from "../../error/DataGridError";
import type { AxiosError } from "axios";
import { enqueueSnackbar } from "notistack";

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
  tipo_registro: number;
  nombre: string;
  anfitrion: string;
  fecha_entrada: string;
  fecha_salida: string;
  estatus: number;
  acceso?: string;
  accesos: unknown[];
  docs_faltantes: string[];
  activo: boolean;
  permitir_acceso: boolean;
  se_puede_finalizar: boolean;
  fecha_modificacion: string;
};

type ARGS = {
  estado: boolean;
  datos: IRegistro;
};

const pageSizeOptions = [5, 10, 25];

export default function BitacoraVisit() {
  const socket = useSelector((state: IRootState) => state.ws.data);
  const { tipos_eventos } = useSelector(
    (state: IRootState) => state.config.data
  );

  const navigate = useNavigate();
  const [error, setError] = useState<string>();
  const [cargando, setCargando] = useState(false);
  const [ROWS, setRows] = useState<IRegistro[]>([]);
  const [open, setOpen] = useState(false);
  const [cargandoQR, setCargandoQR] = useState(false);
  const [qr, setQr] = useState("");

  // Filtering, sorting and pagination
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [totalCount, setTotalCount] = useState(0);
  const [quickFilter, setQuickFilter] = useState<string>("");
  const [sort, setSort] = useState<GridSortModel>([
    { field: "fecha_entrada", sort: "desc" },
  ]);
  const [searchDate, setSearchDate] = useState<Dayjs | null>(dayjs());
  const [dateFilter, setDateFilter] = useState<"now" | null>("now");
  const [sorting, setSorting] = useState<"asc" | "desc">("desc");

  const obtenerRegistros = useCallback(async () => {
    setCargando(true);
    try {
      const dateFilter = searchDate?.toISOString() || "";
      const urlParams = new URLSearchParams({
        date: dateFilter,
        filter: JSON.stringify([quickFilter]),
        pagination: JSON.stringify({ page, pageSize: pageSize }),
        sort: JSON.stringify(sort),
      });
      const res = await clienteAxios.get(
        "/api/registros?" + urlParams.toString()
      );
      if (res.data.estado) {
        setError("");
        setRows(res.data.datos.paginatedResults || []);
        setTotalCount(res.data.datos.totalCount[0]?.count || 0);
      }
    } catch (error: unknown) {
      setError((error as Error | AxiosError)?.message || "Error desconocido");
      handlingError(error);
      setPage(0);
      setPageSize(5);
      setRows([]);
      setTotalCount(0);
    } finally {
      setCargando(false);
    }
  }, [searchDate, quickFilter, sort, page, pageSize]);

  useEffect(() => {
    obtenerRegistros();
  }, [obtenerRegistros]);

  const handleErrorFunctions = (error: unknown, functionName: string) => {
    console.error(functionName, error);
  };

  const actualizarEstadoRegistros = useCallback(
    (args: { datos: ARGS["datos"][] }) => {
      try {
        const { datos } = args;

        const updatedRowsMap = new Map(ROWS.map((row) => [row._id, row]));

        datos.forEach((nuevoRegistro) => {
          if (searchDate) {
            if (
              dayjs(nuevoRegistro.fecha_entrada).isBetween(
                dayjs(searchDate).startOf("day"),
                dayjs(searchDate).endOf("day")
              )
            ) {
              updatedRowsMap.set(nuevoRegistro._id, nuevoRegistro);
            }
          } else {
            updatedRowsMap.set(nuevoRegistro._id, nuevoRegistro);
          }
        });

        const updatedRows = Array.from(updatedRowsMap.values());

        const sortedRows = updatedRows
          .sort((a, b) => {
            if (sorting == "asc") {
              return (
                new Date(b.fecha_entrada).getTime() -
                new Date(a.fecha_entrada).getTime()
              );
            }
            if (sorting == "desc") {
              return (
                new Date(a.fecha_entrada).getTime() -
                new Date(b.fecha_entrada).getTime()
              );
            } else {
              return (
                new Date(b.fecha_entrada).getTime() -
                new Date(a.fecha_entrada).getTime()
              );
            }
          })
          .sort((a, b) => {
            if (a.activo && !b.activo) return -1;
            else if (!a.activo && b.activo) return 1;
            else return 0;
          });

        const paginatedRows = sortedRows.slice(0, pageSize || 10);
        if (page === 0) setRows(paginatedRows);
      } catch (error) {
        handleErrorFunctions(error, "actualizarEstadoRegistro");
      }
    },
    [page, pageSize, ROWS, searchDate, sorting]
  );

  const actualizarEstadoRegistro = useCallback(
    (args: ARGS) => {
      try {
        const { datos } = args;
        const updatedRows = ROWS.map((item) => {
          if (item._id === datos._id) {
            return { ...datos };
          }
          return item;
        });

        const rowExists = updatedRows.some((row) => row._id === datos._id);
        if (!rowExists) {
          if (searchDate) {
            if (
              dayjs(datos.fecha_entrada).isBetween(
                dayjs(searchDate).startOf("day"),
                dayjs(searchDate).endOf("day")
              )
            )
              updatedRows.push(datos);
          } else {
            updatedRows.push(datos);
          }
        }

        const sortedRows = updatedRows
          .sort((a, b) => {
            if (sorting == "desc") {
              return (
                new Date(b.fecha_entrada).getTime() -
                new Date(a.fecha_entrada).getTime()
              );
            }
            if (sorting == "asc") {
              return (
                new Date(a.fecha_entrada).getTime() -
                new Date(b.fecha_entrada).getTime()
              );
            } else {
              return (
                new Date(b.fecha_entrada).getTime() -
                new Date(a.fecha_entrada).getTime()
              );
            }
          })
          .sort((a, b) => {
            if (a.activo && !b.activo) return -1;
            else if (!a.activo && b.activo) return 1;
            else return 0;
          });

        const paginatedRows = sortedRows.slice(0, pageSize || 10);
        setRows(paginatedRows);
      } catch (error) {
        handleErrorFunctions(error, "actualizarEstadoRegistro");
      }
    },
    [pageSize, ROWS, searchDate, sorting]
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

  const verRegistro = (ID: string) => {
    navigate(`detalle-registro/${ID}`);
  };

  const handleChangeDateFilter = (
    _event: React.MouseEvent<HTMLElement>,
    newAlignment: "now"
  ) => {
    setDateFilter(newAlignment);
    if (newAlignment === "now") {
      setPage(0);
      setPageSize(5);
      setSearchDate(dayjs().startOf("day"));
    }
    if (!newAlignment) {
      setPage(0);
      setPageSize(5);
      setSearchDate(null);
    }
  };

  const handleChangeSorting = (
    _event: React.MouseEvent<HTMLElement>,
    newAlignment: "asc" | "desc"
  ) => {
    setSorting((prev) => newAlignment || prev);
    if (newAlignment === "asc") {
      setSort([{ field: "fecha_entrada", sort: newAlignment }]);
    }
    if (newAlignment === "desc") {
      setSort([{ field: "fecha_entrada", sort: newAlignment }]);
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
    setPageSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  const verQR = async () => {
    setCargandoQR(true);
    try {
      const res = await clienteAxios.get(`api/visitantes/qr`);
      if (res.data.estado) {
        setQr(res.data.datos);
        setOpen(true);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setCargandoQR(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Fragment>
      <Box
        component="section"
        position="relative"
        sx={{ width: "100%", height: "50%" }}
      >
        {!error && (
          <Card
            elevation={0}
            sx={(theme) => ({
              border: `1px solid ${lighten(
                alpha(theme.palette.divider, 0.3),
                0.88
              )}`,
            })}
          >
            <CardContent>
              <CardHeader
                avatar={
                  <Avatar
                    sx={{ bgcolor: "transparent", width: 40, height: 40 }}
                  >
                    <People
                      color="primary"
                      sx={{ width: "100%", height: "100%" }}
                    />
                  </Avatar>
                }
                title={
                  <Typography component="h6" variant="h6" fontWeight={700}>
                    Bitácora de visitantes
                  </Typography>
                }
                subheader="Visualiza todas tus citas y/o registros en Flipbot"
                action={
                  <>
                    {cargandoQR ? (
                      <Spinner size="small" />
                    ) : (
                      <IconButton color="primary" onClick={verQR}>
                        <QrCode />
                      </IconButton>
                    )}
                  </>
                }
              />
              <StyledStack rowGap={2}>
                <Stack
                  direction={{ xs: "column-reverse", sm: "row" }}
                  columnGap={2}
                  rowGap={1}
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
                      p: 0,
                      m: 0,
                      width: { xs: "100%", sm: "auto" },
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <ToggleButton value="asc" fullWidth>
                      <ArrowUpward />
                    </ToggleButton>
                    <ToggleButton value="desc" fullWidth>
                      <ArrowDownward />
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <ToggleButtonGroup
                    id="dateFilter"
                    color="primary"
                    value={dateFilter}
                    exclusive
                    onChange={handleChangeDateFilter}
                    size="small"
                    sx={{
                      p: 0,
                      m: 0,
                      width: { xs: "100%", sm: "auto" },
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <ToggleButton value="now" fullWidth>
                      Hoy
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                <SearchInput
                  textFieldProps={{
                    name: "general",
                    placeholder: "Buscar...",
                    margin: "none",
                    size: "small",
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
              <Grid container spacing={3} sx={{ mt: 2 }}>
                {cargando ? (
                  <Spinner />
                ) : (
                  <Fragment>
                    {ROWS.length === 0 && (
                      <Box
                        component="div"
                        width="100%"
                        display="flex"
                        justifyContent="center"
                      >
                        <Typography
                          component="span"
                          variant="h6"
                          textAlign="center"
                        >
                          No hay registros disponibles.
                        </Typography>
                      </Box>
                    )}
                    {ROWS.map((item) => (
                      <Grid size={12} key={item._id}>
                        <Card
                          sx={(theme) => ({
                            boxShadow: `-5px 5px 0px 0px ${theme.palette.primary.main}, 
                            0px 0px 5px 1px ${theme.palette.primary.main}`,
                          })}
                        >
                          <CardActionArea onClick={() => verRegistro(item._id)}>
                            <CardContent>
                              <Box
                                component="div"
                                sx={{
                                  display: "flex",
                                  flexDirection: {
                                    xs: "column-reverse",
                                    sm: "row",
                                  },
                                  justifyContent: {
                                    xs: "center",
                                    sm: "space-between",
                                  },
                                }}
                              >
                                <Typography
                                  component={Stack}
                                  rowGap={2}
                                  columnGap={2}
                                  variant="h6"
                                  fontSize={18}
                                  fontWeight={550}
                                  sx={{
                                    my: { xs: 2, sm: 0 },
                                    display: "flex",
                                    flexDirection: { xs: "column", sm: "row" },
                                    justifyContent: "center",
                                    alignItems: "center",
                                  }}
                                >
                                  <Box component="strong" sx={{ mr: 1 }}>
                                    {dayjs(item.fecha_entrada).format(
                                      "DD/MM/YYYY, HH:mm:ss a"
                                    )}
                                  </Box>
                                  {item.activo && (
                                    <Box
                                      component="small"
                                      fontSize={12}
                                      sx={{ mr: 1 }}
                                    >
                                      ({dayjs(item.fecha_entrada).fromNow()})
                                    </Box>
                                  )}
                                  <Chip
                                    label={tipos_eventos[item.estatus].nombre}
                                    size="small"
                                    color="secondary"
                                    sx={(theme) => ({
                                      width: { xs: "100%", sm: "auto" },
                                      bgcolor:
                                        tipos_eventos[item.estatus].color ||
                                        "secondary.main",
                                      color: theme.palette.getContrastText(
                                        tipos_eventos[item.estatus].color ||
                                          "secondary.main"
                                      ),
                                    })}
                                  />
                                </Typography>
                                {item.activo ? (
                                  <Chip
                                    label="Activo"
                                    color="success"
                                    size="small"
                                    sx={{ borderRadius: 2 }}
                                  />
                                ) : (
                                  <Chip
                                    label="Inactivo"
                                    color="error"
                                    size="small"
                                    sx={{ borderRadius: 2 }}
                                  />
                                )}
                              </Box>
                              {item.accesos.length === 0 ? (
                                <Typography
                                  component="h6"
                                  variant="subtitle2"
                                  color={"error"}
                                >
                                  <strong>Acceso:</strong> Sin acceso definido
                                </Typography>
                              ) : (
                                item.acceso && (
                                  <Typography
                                    component="h6"
                                    variant="subtitle2"
                                    color="success"
                                  >
                                    <strong>Acceso:</strong> {item.acceso}
                                  </Typography>
                                )
                              )}
                              {item.docs_faltantes?.length > 0 ? (
                                <Typography
                                  component="h6"
                                  variant="subtitle2"
                                  color="warning"
                                >
                                  <strong>Documentos faltantes:</strong>{" "}
                                  {item.docs_faltantes.join(" - ")}
                                </Typography>
                              ) : (
                                <Typography
                                  component="h6"
                                  variant="subtitle2"
                                  color="success"
                                >
                                  <strong>Documentos:</strong> Completos
                                </Typography>
                              )}
                              <Typography
                                component="h6"
                                variant="subtitle2"
                                color="textSecondary"
                              >
                                <strong>Anfitrión:</strong> {item.anfitrion}
                              </Typography>
                              <Typography
                                component="h6"
                                variant="subtitle2"
                                color="textSecondary"
                              >
                                <strong>Última modificación:</strong>{" "}
                                {dayjs(item.fecha_modificacion).format(
                                  "DD/MM/YYYY, HH:mm:ss a"
                                )}
                              </Typography>
                            </CardContent>
                          </CardActionArea>
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
            </CardContent>
          </Card>
        )}
        {error && <ErrorOverlay error={error} onClick={obtenerRegistros} />}
      </Box>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            <Box component="img" src={qr} alt="qr_visitante" width="100%" />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleClose}
            startIcon={<ChevronLeft />}
          >
            Regresar
          </Button>
        </DialogActions>
      </Dialog>
      <Outlet />
    </Fragment>
  );
}
