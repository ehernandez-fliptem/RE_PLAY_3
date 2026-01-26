import { Fragment, useState } from "react";
import {
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom";
import { useForm, type Resolver, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ModalContainer from "../../../utils/ModalContainer";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { FormContainer } from "react-hook-form-mui";
import {
  Check,
  ChevronLeft,
  Close,
  Edit,
  PriorityHigh,
  Save,
  Warning,
} from "@mui/icons-material";
import { clienteAxios } from "../../../../app/config/axios";
import {
  DataGrid,
  GridActionsCellItem,
  type GridDataSourceApiBase,
} from "@mui/x-data-grid";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../../app/store";
import StepperForm from "./partes/StepperForm";
import {
  initialValue as initCitasForm,
  type FormCitaVisitante,
  resolverCitas,
} from "./form_init/TCitas";
import {
  initialValue as initRegistrosForm,
  type FormRegistroVisitante,
  resolverRegistros,
} from "./form_init/TRegistros";
import { useErrorBoundary } from "react-error-boundary";
import type { Dayjs } from "dayjs";
import { esES } from "@mui/x-data-grid/locales";
import { AxiosError } from "axios";
import Spinner from "../../../utils/Spinner";
import dayjs from "dayjs";

type TAccesos = {
  id_acceso: string;
  modo: number;
};

type FormTypes = {
  1: FormCitaVisitante;
  2: FormRegistroVisitante;
};

type Errores = {
  nombre?: string;
  apellido_pat?: string;
  apellido_mat?: string;
  correo?: string;
  telefono?: string;
  tipo_ide?: string;
  numero_ide?: string;
  img_usuario?: string;
  img_ide_a?: string;
  img_ide_b?: string;
  empresa?: string;
  id_pase?: string;
  id_anfitrion?: string;
  actividades?: string;
  fecha_entrada?: string;
  comentarios?: string;
  placas?: string;
  desc_vehiculo?: string;
  documentos?: string;
};

type Data = {
  folio: number;
  tipo_registro: number;
  nombre?: string;
  apellido_pat?: string;
  apellido_mat?: string;
  correo?: string;
  telefono?: string;
  tipo_ide?: number;
  numero_ide?: string;
  img_usuario?: string;
  img_ide_a?: string;
  img_ide_b?: string;
  empresa?: string;
  id_pase?: string;
  id_anfitrion?: string;
  accesos: TAccesos[];
  actividades?: string;
  fecha_entrada: Dayjs;
  comentarios?: string;
  placas?: string;
  desc_vehiculo?: string;

  // Estado al enviarse
  estado: 1 | 2 | 3 | 4 | 5;
  correos_enviados?: {
    anfitrion: boolean;
    visitante: boolean;
  };
  errores?: { fecha_entrada: string; errores: Errores }[];
};

const pageSizeOptions = [5, 10, 25];

function getFormConfig<T extends 1 | 2>(tipo: T) {
  switch (tipo) {
    case 1:
      return {
        defaultValues: {
          ...initCitasForm,
          fecha_entrada: dayjs().add(1, "hours").startOf("hour"),
          tipo_registro: tipo,
        },
        resolver: yupResolver(resolverCitas),
      };
    case 2:
      return {
        defaultValues: {
          ...initRegistrosForm,
          fecha_entrada: dayjs().add(1, "minute").startOf("minute"),
          tipo_registro: tipo,
        },
        resolver: yupResolver(resolverRegistros),
      };
    default:
      throw new Error("Tipo inválido");
  }
}

export default function NuevoRegistro() {
  const socket = useSelector((state: IRootState) => state.ws.data);
  const { rol } = useSelector((state: IRootState) => state.auth.data);
  const esRecep = rol.includes(2);
  const { tipos_registros } = useSelector(
    (state: IRootState) => state.config.data
  );
  const [searchParams] = useSearchParams({
    t: ["1", "2"],
  });
  const { showBoundary } = useErrorBoundary();
  const TIPO = Number(searchParams.get("t")) as 1 | 2;
  if (!TIPO || ![1, 2].includes(TIPO)) {
    showBoundary(Error("El tipo de registro no es válido."));
  }
  if (!esRecep && [1].includes(TIPO)) {
    showBoundary(Error("No estas autorizado para crear citas."));
  }

  const { defaultValues, resolver } = getFormConfig(TIPO);
  const formContext = useForm({
    defaultValues,
    resolver: resolver as Resolver<FormTypes[typeof TIPO]>,
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });

  const navigate = useNavigate();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase>();

  const [registros, setRegistros] = useState<Data[]>([]);
  const [isSummary, setIsSummary] = useState(false);
  const [error, setError] = useState("");
  const [isFinished, setIsFinished] = useState(true);
  const [counter, setCounter] = useState<number>(0);
  const [title, setTitle] = useState<string>("");
  const [showError, setShowError] = useState(false);
  const [isValidatingBack, setIsValidatingBack] = useState(false);
  const [errores, setErrores] = useState<
    { fecha_entrada: string; errores: Errores }[]
  >([]);
  const [showMails, setShowMails] = useState(false);
  const [mailsSended, setMailsSended] = useState({
    anfitrion: false,
    visitante: false,
  });

  const onSubmit: SubmitHandler<FormTypes[typeof TIPO]> = async (data) => {
    setCounter(0);
    setIsFinished(false);
    setTitle("Procesando...");
    setIsSummary(true);
    const { visitantes, ...generales } = data;
    const registros: Data[] = visitantes.map((item, i) => {
      return {
        folio: i + 1,
        estado: 1,
        ...item,
        ...generales,
      };
    });
    setRegistros(registros);
    for await (const registro of registros) {
      try {
        await sendData(registro);
        setCounter((preCounter) => preCounter + 1);
      } catch (error: unknown) {
        setError(
          (error instanceof Error ? error.message : undefined) ||
            (error instanceof AxiosError
              ? error.response?.data.mensaje
              : undefined) ||
            "Ocurrió un error inesperado al intentar crear los registros"
        );
      }
    }
    setTitle(
      !isValidatingBack
        ? "Registros validados correctamente"
        : "Registros creados correctamente"
    );
    setIsFinished(true);
    setIsValidatingBack((prevVal) => !prevVal);
  };

  const sendData = async (data: Data): Promise<boolean> => {
    const res = await clienteAxios.post("api/registros", {
      ...data,
      se_puede_guardar: isValidatingBack,
    });
    if (res.data.estado) {
      const { estado, info, correos_enviados } = res.data.datos;
      setRegistros((prevRegistros) =>
        prevRegistros.map((item) => {
          if (info.folio === item.folio) {
            return {
              ...item,
              ...info,
              estado,
              correos_enviados,
              errores: info.fechas,
            };
          }
          return { ...item };
        })
      );
      if (res.data.ws.registros_creados.length > 0) {
        socket?.emit("registros:notificar-nuevos", {
          registros: res.data.ws.registros_creados,
        });
      }
      return true;
    } else {
      const { estado, info } = res.data.datos;
      setRegistros((prevRegistros) =>
        prevRegistros.map((item) => {
          if (info.folio === item.folio) {
            return { ...item, ...info, estado, errores: info.fechas };
          }
          return { ...item };
        })
      );
      return false;
    }
  };

  const regresar = () => {
    navigate("/bitacora");
    if (isSummary) {
      parentGridDataRef.fetchRows();
    }
  };

  const verError = (folio: number) => {
    const datos = registros.find((item) => item.folio === folio);
    setErrores(datos?.errores || { ...errores });
    setShowError(true);
  };

  const verCorreosEnviados = (folio: number) => {
    const datos = registros.find((item) => item.folio === folio);
    setMailsSended(datos?.correos_enviados || { ...mailsSended });
    setShowMails(true);
  };

  const handleResetSummary = () => {
    setIsSummary(false);
    setError("");
    setIsFinished(true);
    setCounter(0);
    setTitle("");
    setShowError(false);
    setIsValidatingBack(false);
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box component="section">
        <Card elevation={5}>
          <CardContent>
            <FormContainer formContext={formContext} onSuccess={onSubmit}>
              {!isSummary ? (
                <Fragment>
                  <Typography variant="h4" component="h2" textAlign="center">
                    Crear {tipos_registros[TIPO].nombre}
                  </Typography>
                  <StepperForm
                    type={TIPO}
                    secondaryChildren={
                      <Button
                        type="button"
                        size="medium"
                        variant="contained"
                        color="secondary"
                        onClick={regresar}
                        disabled={!isFinished}
                        startIcon={<Close />}
                      >
                        Cancelar
                      </Button>
                    }
                  />
                </Fragment>
              ) : (
                <Box>
                  <Typography variant="h4" component="h2" textAlign="center">
                    Resúmen
                  </Typography>
                  <Typography variant="h6" component="h6" textAlign="center">
                    {title} - ({counter} / {registros.length})
                  </Typography>
                  <DataGrid
                    getRowId={(row) => row.folio}
                    sx={(theme) => ({
                      mt: 2,
                      border: error
                        ? `1px solid ${theme.palette.error.main}`
                        : `1px solid ${theme.palette.divider}`,
                    })}
                    rows={registros}
                    columns={[
                      {
                        field: "nombre",
                        headerName: "Nombre",
                        flex: 1,
                        display: "flex",
                        minWidth: 180,
                        renderCell: ({ value }) => value,
                        valueGetter: (value, row) => {
                          if (!value) return "";
                          return `${row.nombre} ${row.apellido_pat} ${String(
                            row.apellido_mat
                          )}`;
                        },
                      },
                      {
                        field: "actividades",
                        headerName: "Actividades",
                        flex: 1,
                        display: "flex",
                        minWidth: 180,
                      },
                      {
                        headerName: "Estado",
                        field: "estado",
                        filterable: true,
                        type: "actions",
                        flex: 1,
                        display: "flex",
                        minWidth: 100,
                        getActions: ({ row }) => {
                          const gridActions = [];
                          switch (row.estado) {
                            case 1:
                              gridActions.push(
                                <GridActionsCellItem
                                  icon={<Spinner size="small" />}
                                  disabled
                                  label="Cargando"
                                />
                              );
                              break;
                            case 2:
                              gridActions.push(
                                <GridActionsCellItem
                                  icon={<Check color="success" />}
                                  disabled
                                  label="Completado"
                                />
                              );
                              break;
                            case 3:
                              gridActions.push(
                                <GridActionsCellItem
                                  icon={<Warning color="warning" />}
                                  onClick={() => verCorreosEnviados(row.folio)}
                                  label="Advertencia"
                                />
                              );
                              break;
                            case 4:
                              gridActions.push(
                                <GridActionsCellItem
                                  icon={<PriorityHigh color="error" />}
                                  onClick={() => verError(row.folio)}
                                  label="Error"
                                />
                              );
                              break;
                            case 5:
                              gridActions.push(
                                <GridActionsCellItem
                                  icon={<Warning color="warning" />}
                                  onClick={() => verError(row.folio)}
                                  label="Advertencia"
                                />
                              );
                              break;
                            default:
                              break;
                          }
                          return gridActions;
                        },
                      },
                    ]}
                    disableRowSelectionOnClick
                    pagination
                    pageSizeOptions={pageSizeOptions}
                    localeText={{
                      ...esES.components.MuiDataGrid.defaultProps.localeText,
                      toolbarColumns: "",
                      toolbarFilters: "",
                      toolbarDensity: "",
                      toolbarExport: "",
                      noRowsLabel: "Sin registros",
                    }}
                  />
                  <Box
                    component="footer"
                    sx={{
                      display: "flex",
                      justifyContent: "end",
                      mt: 3,
                      mb: 0.5,
                    }}
                  >
                    <Stack
                      spacing={2}
                      direction={{ xs: "column-reverse", sm: "row" }}
                      justifyContent="end"
                      sx={{ width: "100%" }}
                    >
                      <Button
                        type="button"
                        size="medium"
                        variant="contained"
                        color="secondary"
                        onClick={regresar}
                        disabled={!isFinished}
                        startIcon={<Close />}
                      >
                        {!isValidatingBack ? "Cerrar" : "Cancelar"}
                      </Button>
                      <Box
                        sx={{
                          display: { xs: "none", sm: "flex" },
                          flex: "1 1 auto",
                        }}
                      />
                      {isValidatingBack &&
                        !formContext.formState.isSubmitting && (
                          <>
                            <Button
                              type="button"
                              size="medium"
                              variant="contained"
                              color="secondary"
                              onClick={handleResetSummary}
                              startIcon={<Edit />}
                            >
                              Editar
                            </Button>
                            <Button
                              type="submit"
                              size="medium"
                              variant="contained"
                              startIcon={<Save />}
                            >
                              Guardar
                            </Button>
                          </>
                        )}
                    </Stack>
                  </Box>
                </Box>
              )}
            </FormContainer>
          </CardContent>
        </Card>
      </Box>
      {showError && <ModalErrores errores={errores} setOpen={setShowError} />}
      {showMails && (
        <ModalCorreos correos={mailsSended} setOpen={setShowMails} />
      )}
    </ModalContainer>
  );
}

type PropsModalError = {
  errores: { fecha_entrada: string; errores: Errores }[];
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};
type ErrorEntry = Record<string, string>;

const ModalErrores = ({ errores, setOpen }: PropsModalError) => {
  const erroresArr = (errores: Errores) => {
    return Object.entries(errores).reduce((acc: ErrorEntry[], [key, value]) => {
      acc.push({ [key]: value });
      return acc;
    }, []);
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5}>
        <CardContent>
          <Typography variant="h5" component="h5" textAlign="center">
            Advertencias
          </Typography>
          <Grid container spacing={1} sx={{ my: 2 }}>
            {errores.map((item) => {
              return (
                <Grid size={{ xs: 12, sm: errores.length === 1 ? 12 : 6 }}>
                  <Card elevation={1}>
                    <CardContent>
                      <Typography variant="subtitle1" textAlign="center">
                        {dayjs(item.fecha_entrada).format(
                          "DD/MM/YYYY, HH:mm a"
                        )}
                      </Typography>
                      <Grid container spacing={1} sx={{ my: 2 }}>
                        {erroresArr(item.errores).map((err) => {
                          const [key, value] = Object.entries(err)[0];
                          return (
                            <>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography variant="subtitle1">
                                  <strong>{key.toUpperCase()}:</strong>
                                </Typography>
                              </Grid>
                              <Grid size={{ xs: 12, md: 6 }}>
                                <Typography color="warning" variant="subtitle1">
                                  {value}
                                </Typography>
                              </Grid>
                            </>
                          );
                        })}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          <Box
            component="footer"
            sx={{
              display: "flex",
              justifyContent: "end",
            }}
          >
            <Stack
              spacing={2}
              direction={{ xs: "column-reverse", sm: "row" }}
              justifyContent="end"
              sx={{ width: "100%" }}
            >
              <Button
                sx={{ width: { xs: "100%", sm: "auto" } }}
                type="button"
                size="medium"
                variant="contained"
                color="secondary"
                onClick={() => setOpen(false)}
                startIcon={<ChevronLeft />}
              >
                Regresar
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </ModalContainer>
  );
};

type PropsModalCorreos = {
  correos: { anfitrion: boolean; visitante: boolean };
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};
const ModalCorreos = ({ correos, setOpen }: PropsModalCorreos) => {
  const { rol } = useSelector((state: IRootState) => state.auth.data);
  const esVisit = rol.includes(10);
  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5}>
        <CardContent>
          <Typography variant="h5" component="h5" textAlign="center">
            Advertencias
          </Typography>
          <Grid container spacing={1} sx={{ my: 2 }}>
            <Grid size={{ xs: 12, md: 2 }}>
              <Typography variant="subtitle1">
                <strong>Anfitrión</strong>
              </Typography>
            </Grid>
            <Grid size={{ xs: 12, md: 10 }}>
              <Typography color="warning" variant="subtitle1">
                {correos.anfitrion
                  ? "Correo enviado exitosamente"
                  : "Hubo un problema para enviar el correo"}
              </Typography>
            </Grid>
            {!esVisit && (
              <Fragment>
                <Grid size={{ xs: 12, md: 2 }}>
                  <Typography variant="subtitle1">
                    <strong>Visitante</strong>
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, md: 10 }}>
                  <Typography color="warning" variant="subtitle1">
                    {correos.visitante
                      ? "Correo enviado exitosamente"
                      : "Hubo un problema para enviar el correo"}
                  </Typography>
                </Grid>
              </Fragment>
            )}
          </Grid>
          <Box
            component="footer"
            sx={{
              display: "flex",
              justifyContent: "end",
            }}
          >
            <Stack
              spacing={2}
              direction={{ xs: "column-reverse", sm: "row" }}
              justifyContent="end"
              sx={{ width: "100%" }}
            >
              <Button
                sx={{ width: { xs: "100%", sm: "auto" } }}
                type="button"
                size="medium"
                variant="contained"
                color="secondary"
                onClick={() => setOpen(false)}
                startIcon={<ChevronLeft />}
              >
                Regresar
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </ModalContainer>
  );
};
