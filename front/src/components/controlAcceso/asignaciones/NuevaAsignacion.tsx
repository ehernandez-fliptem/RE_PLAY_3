import { ChevronLeft, Save } from "@mui/icons-material";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Divider,
  FormControlLabel,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { AutocompleteElement, FormContainer } from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import { setFormErrors } from "../../helpers/formHelper";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { Fragment, useEffect, useState } from "react";
import { DatePicker } from "@mui/x-date-pickers";
import { AxiosError } from "axios";

type Usuarios = {
  _id?: string;
  id?: string;
  nombre?: string;
  label?: string;
  errores?: string;
};

type Horarios = {
  _id: string;
  nombre: string;
};

type Periodo = {
  inicio: Dayjs;
  fin: Dayjs;
};

type FormValues = {
  usuarios: Usuarios[];
  id_horario: string;
  esIndeterminado: boolean;
  periodo: Periodo;
};

const resolver = yup.object().shape({
  usuarios: yup
    .array()
    .min(1, "Debes agregar al menos un usuario.")
    .required("Este campo es obligatorio."),
  id_horario: yup.string().required("Este campo es obligatorio."),
  periodo: yup.object().shape({
    inicio: yup
      .mixed()
      .test(
        "isDayjs",
        "La hora de entrada debe ser menor a la hora de salida.",
        (value) => {
          return dayjs.isDayjs(value) && value.isValid();
        }
      )
      .required("Este campo es obligatorio."),
    fin: yup
      .mixed()
      .test(
        "isFurther",
        "La fecha no puede ser menor a la fecha actual.",
        (value) => {
          if (dayjs.isDayjs(value) && value.isValid()) {
            return !dayjs(value).isBefore(dayjs());
          } else {
            return false;
          }
        }
      )
      .required("Este campo es obligatorio."),
  }),
}) as yup.ObjectSchema<FormValues>;

const inicio = dayjs().startOf("month").startOf("day");
const fin = dayjs().endOf("month").endOf("day");

const initialValue: FormValues = {
  usuarios: [],
  id_horario: "",
  esIndeterminado: false,
  periodo: {
    inicio,
    fin,
  },
};

export default function NuevaAsignacion() {
  const formContext = useForm({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });
  const navigate = useNavigate();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase>();
  const [isLoading, setIsLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<Usuarios[]>([]);
  const [horarios, setHorarios] = useState<Horarios[]>([]);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get("/api/asignaciones/form-nuevo");
        if (res.data.estado) {
          const { usuarios, horarios } = res.data.datos;
          setUsuarios(usuarios);
          setHorarios(horarios);
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        const { erroresForm } = handlingError(error);
        if (erroresForm) setFormErrors(formContext.setError, erroresForm);
      }
    };
    obtenerRegistro();
  }, [formContext]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const newData = {
        ...data,
        usuarios: data.usuarios.map((item) => {
          return { _id: item.id, nombre: item.label };
        }),
        periodo: {
          inicio: data.periodo.inicio.startOf("day").toDate(),
          fin: data.periodo.fin.endOf("day").toDate(),
        },
      };
      const res = await clienteAxios.post("api/asignaciones", newData);
      
      if (res.data.estado) {
        enqueueSnackbar(res.data?.mensaje ?? "Operación realizada", { variant: "success" });
        parentGridDataRef.fetchRows();
        navigate("/asignaciones");
      } else {
        enqueueSnackbar(res.data?.mensaje ?? "Ocurrió un error", { variant: "warning" });
      }

      /*
      if (res.data.estado) {
        enqueueSnackbar("La asignación se creó correctamente.", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
        navigate("/asignaciones");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
      */
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
      if (error instanceof AxiosError) {
        const usuarios: Usuarios[] = error.response?.data.datos;
        setUsuarios((prevValue) =>
          prevValue.map((item) => {
            const encontrado = usuarios.find((el) => el._id === item._id);
            return encontrado ? { ...item, errores: encontrado.errores } : item;
          })
        );
      }
    }
  };

  const regresar = () => {
    navigate("/asignaciones");
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box component="section">
        <Card elevation={5}>
          <CardContent>
            {formContext.formState.isSubmitting || isLoading ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Nueva Asignación
                </Typography>
                <AutocompleteElement
                  name="id_horario"
                  label="Horario"
                  required
                  matchId
                  options={horarios.map((item) => {
                    return { id: item._id, label: item.nombre };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                  }}
                />
                <AutocompleteElement
                  name="usuarios"
                  label="Usuarios"
                  required
                  multiple
                  options={usuarios.map((item) => {
                    return {
                      id: item._id,
                      label: item.nombre,
                      errores: item.errores,
                    };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                    limitTags: 4,
                    renderValue: (value, getItemProps) =>
                      value.map((option, index: number) => {
                        const { key, ...itemProps } = getItemProps({ index });
                        return (
                          <Tooltip title={option.errores}>
                            <Chip
                              color={option.errores ? "error" : "default"}
                              label={option.label}
                              key={key}
                              {...itemProps}
                            />
                          </Tooltip>
                        );
                      }),
                  }}
                />
                <Controller
                  control={formContext.control}
                  name="esIndeterminado"
                  render={({ field }) => (
                    <Fragment>
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        useFlexGap
                        sx={{
                          justifyContent: "space-between",
                          alignItems: { xs: "start", sm: "center" },
                        }}
                      >
                        <FormControlLabel
                          control={
                            <Checkbox
                              name={field.name}
                              checked={field.value}
                              onChange={(e) => field.onChange(e)}
                            />
                          }
                          label="Habilitar periodo indeterminado"
                        />
                        {!field.value ? (
                          <Fragment>
                            <Controller
                              control={formContext.control}
                              name="periodo.inicio"
                              render={({ field }) => (
                                <DatePicker
                                  {...field}
                                  label="Inicio"
                                  name={field.name}
                                  value={field.value || dayjs()}
                                  onChange={(value) => field.onChange(value)}
                                  slotProps={{
                                    textField: {
                                      margin: "normal",
                                      sx: {
                                        width: { xs: "100%", sm: "auto" },
                                      },
                                    },
                                  }}
                                />
                              )}
                            />
                            <Typography
                              variant="body1"
                              component="span"
                              sx={{
                                display: { xs: "none", sm: "block" },
                              }}
                            >
                              -
                            </Typography>
                            <Controller
                              control={formContext.control}
                              name="periodo.fin"
                              render={({ field }) => (
                                <DatePicker
                                  {...field}
                                  label="Fin"
                                  name={field.name}
                                  value={field.value || dayjs()}
                                  onChange={(value) => field.onChange(value)}
                                  slotProps={{
                                    textField: {
                                      margin: "normal",
                                      sx: {
                                        width: { xs: "100%", sm: "auto" },
                                      },
                                    },
                                  }}
                                />
                              )}
                            />
                          </Fragment>
                        ) : (
                          <></>
                        )}
                      </Stack>
                    </Fragment>
                  )}
                />

                <Divider sx={{ my: 2 }} />
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
                    >
                      <ChevronLeft /> Cancelar
                    </Button>
                    <Button
                      disabled={!formContext.formState.isValid}
                      type="submit"
                      size="medium"
                      variant="contained"
                    >
                      <Save /> Guardar
                    </Button>
                  </Stack>
                </Box>
              </FormContainer>
            )}
          </CardContent>
        </Card>
      </Box>
    </ModalContainer>
  );
}
