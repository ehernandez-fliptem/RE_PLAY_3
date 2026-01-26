import { ChevronLeft, Save } from "@mui/icons-material";
import { useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import {
  AutocompleteElement,
  FormContainer,
  TextFieldElement,
} from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import { REGEX_NAME } from "../../../app/constants/CommonRegex";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import { setFormErrors } from "../../helpers/formHelper";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import StandardHours from "../../utils/StandardHours";
import { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

type Empresa = {
  _id: string;
  nombre: string;
};

type Horario = {
  entrada: Dayjs;
  salida: Dayjs;
  esNocturno: boolean;
  activo: boolean;
};

type FormValues = {
  nombre: string;
  id_empresa: string;
  horario: Horario[];
};

const resolverHorario = yup.object().shape({
  entrada: yup
    .mixed()
    .test(
      "isDayjs",
      "La hora de entrada debe ser menor a la hora de salida.",
      (value, context) => {
        if (dayjs.isDayjs(value) && value.isValid()) {
          if (!context.parent.esNocturno) {
            return dayjs(value).isBefore(context.parent.salida);
          }
          return true;
        } else {
          return false;
        }
      }
    )
    .required("Este campo es obligatorio."),
  salida: yup
    .mixed()
    .test(
      "isFurther",
      "La fecha no es válida.",
      (value) => dayjs.isDayjs(value) && value.isValid()
    )
    .test(
      "isDayjs",
      "La hora de salida debe ser mayor a la hora de salida.",
      (value, context) => {
        if (dayjs.isDayjs(value) && value.isValid()) {
          if (!context.parent.esNocturno) {
            return dayjs(value).isAfter(context.parent.entrada);
          }
          return true;
        } else {
          return false;
        }
      }
    )
    .required("Este campo es obligatorio."),
  esNocturno: yup.boolean(),
  activo: yup.boolean(),
}) as yup.ObjectSchema<Horario>;

const resolver = yup.object().shape({
  nombre: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_NAME, "Este campo solo acepta letras y espacios."),
  id_empresa: yup.string().required("Este campo es obligatorio."),
  horario: yup.array().of(resolverHorario),
}) as yup.ObjectSchema<FormValues>;

const entrada = dayjs().hour(9).startOf("hour");
const salida = dayjs().hour(18).startOf("hour");

const initialValue: FormValues = {
  nombre: "",
  id_empresa: "",
  horario: [
    {
      entrada,
      salida,
      esNocturno: false,
      activo: false,
    },
    {
      entrada,
      salida,
      esNocturno: false,
      activo: false,
    },
    {
      entrada,
      salida,
      esNocturno: false,
      activo: false,
    },
    {
      entrada,
      salida,
      esNocturno: false,
      activo: false,
    },
    {
      entrada,
      salida,
      esNocturno: false,
      activo: false,
    },
    {
      entrada,
      salida,
      esNocturno: false,
      activo: false,
    },
  ],
};

export default function EditarHorario() {
  const { id: ID } = useParams();
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
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/horarios/form-editar/${ID}`);
        if (res.data.estado) {
          const { horario, empresas } = res.data.datos;
          const formatHorario = horario.horario.map(
            (item: {
              entrada: { hora: number; minuto: number };
              salida: { hora: number; minuto: number };
            }) => {
              return {
                ...item,
                entrada: dayjs()
                  .set("hour", item.entrada.hora)
                  .set("minute", item.entrada.minuto),
                salida: dayjs()
                  .set("hour", item.salida.hora)
                  .set("minute", item.salida.minuto),
              };
            }
          );
          const newData = {
            ...res.data.datos.horario,
            horario: formatHorario,
          };
          formContext.reset(newData);
          setEmpresas(empresas);
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
  }, [formContext, ID]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const formatHorario = data.horario.map((item) => {
        return {
          ...item,
          entrada: {
            hora: item.entrada.get("hours"),
            minuto: item.entrada.get("minute"),
          },
          salida: {
            hora: item.salida.get("hours"),
            minuto: item.salida.get("minute"),
          },
        };
      });
      const newData = {
        ...data,
        horario: formatHorario,
      };
      const res = await clienteAxios.put(`/api/horarios/${ID}`, newData);
      if (res.data.estado) {
        enqueueSnackbar("El horario se modificó correctamente.", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
        navigate("/horarios");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  const regresar = () => {
    navigate("/horarios");
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
                  Editar Horario
                </Typography>
                <TextFieldElement
                  name="nombre"
                  label="Nombre"
                  required
                  fullWidth
                  margin="normal"
                />
                <AutocompleteElement
                  name="id_empresa"
                  label="Empresa"
                  required
                  matchId
                  options={empresas.map((item) => {
                    return { id: item._id, label: item.nombre };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                  }}
                />
                <StandardHours name="horario" />
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
