import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import ModalContainer from "../../../utils/ModalContainer";
import {
  AutocompleteElement,
  Controller,
  FormContainer,
  TextFieldElement,
  useForm,
  type SubmitHandler,
} from "react-hook-form-mui";
import { yupResolver } from "@hookform/resolvers/yup";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import * as yup from "yup";
import { useNavigate } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../../app/config/axios";
import { setFormErrors } from "../../../helpers/formHelper";
import { enqueueSnackbar } from "notistack";
import { Close, Save } from "@mui/icons-material";
import { DateTimePicker } from "@mui/x-date-pickers";
import Spinner from "../../../utils/Spinner";
import Accesos from "./partes/steps/Accesos/Accesos";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../../app/store";

type Usuarios = {
  _id: string;
  nombre: string;
};
type TAccesos = {
  id_acceso: string;
  modo: number;
};

type FormValues = {
  correo: string;
  fecha_entrada: Dayjs;
  id_anfitrion?: string;
  accesos: TAccesos[];
};

const resolverAccesos = yup.object().shape({
  id_acceso: yup.string().required("Este campo es obligatorio."),
  modo: yup.number(),
}) as yup.ObjectSchema<TAccesos>;

const resolver = yup.object().shape({
  correo: yup
    .string()
    .email("Formato de correo inválido.")
    .required("Este campo es obligatorio."),
  fecha_entrada: yup
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
    .required("Este campo es obligatorio"),
  id_anfitrion: yup.string().notRequired(),
  accesos: yup
    .array()
    .of(resolverAccesos)
    .min(1, "Debes agregar al menos un acceso")
    .test("unique-accesos", "El número debe ser único.", (value) => {
      if (!value) return true;
      const existAcceso = value.map((p) => p.id_acceso);
      return new Set(existAcceso).size === existAcceso.length;
    }),
}) as yup.ObjectSchema<FormValues>;

const startDay = dayjs().add(1, "day").startOf("day");

const initialValue: FormValues = {
  correo: "",
  fecha_entrada: startDay,
  id_anfitrion: "",
  accesos: [],
};

export default function EnviarCorreoVisit() {
  const { rol } = useSelector((state: IRootState) => state.auth.data);
  const esRecep = rol.includes(2);
  const formContext = useForm({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [anfitriones, setAnfitriones] = useState<Usuarios[]>([]);

  useEffect(() => {
    const obtenerRegistros = async () => {
      try {
        const res = await clienteAxios.get(`/api/registros/form-nuevo`);
        if (res.data.estado) {
          const { anfitriones } = res.data.datos;
          setAnfitriones(anfitriones);
          if (anfitriones.length === 1) {
            formContext.setValue("id_anfitrion", anfitriones[0]._id);
            formContext.clearErrors("id_anfitrion");
          }
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        handlingError(error);
      }
    };
    obtenerRegistros();
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.post(
        "api/registros/enviar-liga-registro",
        data
      );
      if (res.data.estado) {
        enqueueSnackbar("El correo se envió correctamente", {
          variant: "success",
        });
        navigate("/bitacora");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  const regresar = () => {
    navigate("/bitacora");
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box component="section">
        <Card elevation={5}>
          <CardContent>
            {formContext.formState.isSubmitting ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Enviar liga de creación para cita
                </Typography>
                <TextFieldElement
                  name="correo"
                  label="Correo"
                  required
                  fullWidth
                  margin="normal"
                  type="email"
                />
                <Controller
                  name="fecha_entrada"
                  render={({ field, fieldState }) => (
                    <DateTimePicker
                      {...field}
                      label="Fecha de Entrada"
                      minDate={startDay}
                      onChange={(value) => field.onChange(value)}
                      slotProps={{
                        textField: {
                          required: true,
                          margin: "normal",
                          fullWidth: true,
                          size: "small",
                          error: !!fieldState.error?.message,
                          helperText: fieldState.error?.message,
                        },
                      }}
                    />
                  )}
                />
                <AutocompleteElement
                  name="id_anfitrion"
                  label="Persona a Visitar"
                  matchId
                  loading={isLoading}
                  options={anfitriones.map((item) => {
                    return { id: item._id, label: item.nombre };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    disabled: !esRecep,
                    noOptionsText: "No hay opciones.",
                  }}
                />
                <Accesos name="accesos" label="Acceso(s)" />
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
                      startIcon={<Close />}
                    >
                      Cancelar
                    </Button>
                    <Button
                      disabled={!formContext.formState.isValid}
                      type="submit"
                      size="medium"
                      variant="contained"
                      startIcon={<Save />}
                    >
                      Guardar
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
