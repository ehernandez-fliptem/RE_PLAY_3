import { useEffect, useState } from "react";
import {
  Close,
  NetworkCheck,
  Save,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { useForm, type SubmitHandler } from "react-hook-form";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
  InputAdornment,
  IconButton,
  Grid,
} from "@mui/material";
import {
  AutocompleteElement,
  SwitchElement,
  FormContainer,
  TextFieldElement,
} from "react-hook-form-mui";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  HASLOWERCASE,
  HASNUMBER,
  HASSYMBOLE,
  HASUPPERCASE,
  REGEX_IP,
  REGEX_USERNAME,
} from "../../../app/constants/CommonRegex";
import { useNavigate, useOutletContext } from "react-router-dom";
import ModalContainer from "../../utils/ModalContainer";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import PasswordValidAdornment from "../../utils/PasswordValidAdornment";
import { setFormErrors } from "../../helpers/formHelper";
import { enqueueSnackbar } from "notistack";

type TEvento = {
  _id: string;
  nombre: string;
  tipo: number;
};

type TAcceso = {
  _id: string;
  nombre: string;
};

type FormValues = {
  usuario?: string;
  contrasena?: string;
  direccion_ip: string;
  nombre: string;
  habilitar_citas: boolean;
  tipo_evento: number;
  id_acceso: string;
};

const resolver = yup.object().shape({
  usuario: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_USERNAME, "Formato de usuario inválido."),
  contrasena: yup
    .string()
    .required("Este campo es obligatorio.")
    .min(8, "La contraseña debe contener mínimo 8 caracteres.")
    .test("isValidPass", "", (value) => {
      const hasUpperCase = HASUPPERCASE.test(value);
      const hasNumber = HASNUMBER.test(value);
      const hasLowerCase = HASLOWERCASE.test(value);
      const hasSymbole = HASSYMBOLE.test(value);
      let validConditions = 0;
      const numberOfMustBeValidConditions = 4;
      const conditions = [hasUpperCase, hasLowerCase, hasNumber, hasSymbole];
      conditions.forEach((condition) => (condition ? validConditions++ : null));
      if (validConditions >= numberOfMustBeValidConditions) {
        return true;
      }
      return false;
    }),
  direccion_ip: yup
    .string()
    .required("Este campo es obligatorio")
    .matches(REGEX_IP, "Formato inválido"),
  nombre: yup.string().required("Este campo es obligatorio"),
  habilitar_citas: yup.boolean(),
  tipo_evento: yup.number().required("Este campo es obligatorio"),
  id_acceso: yup.string().required("Este campo es obligatorio"),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  usuario: "",
  contrasena: "",
  direccion_ip: "",
  nombre: "",
  habilitar_citas: false,
  tipo_evento: 0,
  id_acceso: "",
};

export default function NuevoDispositivoHV() {
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
  const [isConnected, setIsConnected] = useState({
    estado: false,
    mensaje: "",
  });
  const [tipo_evento, setEvento] = useState<TEvento[]>([]);
  const [accesos, setAccesos] = useState<TAcceso[]>([]);

  useEffect(() => {
  const obtenerRegistro = async () => {
    try {
      const res = await clienteAxios.get("/api/dispositivos-hikvision/form-nuevo");

      if (res?.data?.estado) {
        const { tipos_eventos, accesos } = res.data?.datos ?? {};
        setAccesos(accesos ?? []);
        setEvento(tipos_eventos ?? []);
      } else {
        enqueueSnackbar(res?.data?.mensaje ?? "No se pudo cargar el formulario", {
          variant: "warning",
        });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
      enqueueSnackbar("Error cargando datos del formulario", { variant: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  obtenerRegistro();
}, []);
  
  /*
  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(
          "/api/dispositivos-hikvision/form-nuevo"
        );
        if (res.data.estado) {
          const { tipos_eventos, accesos } = res.data.datos;
          setAccesos(accesos);
          setEvento(tipos_eventos);
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
*/
  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const handleMouseUpPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };



//////////////////////////
const testConnection: SubmitHandler<FormValues> = async (data) => {
  try {
    const res = await clienteAxios.post(
      "/api/dispositivos-hikvision/probar-conexion",
      data
    );

    if (res?.data?.estado) {
      enqueueSnackbar("El dispositivo se conectó correctamente.", {
        variant: "success",
      });
      setIsConnected(res.data);
    } else {
      enqueueSnackbar(res?.data?.mensaje ?? "No se pudo conectar", {
        variant: "warning",
      });
      setIsConnected({ estado: false, mensaje: res?.data?.mensaje ?? "" });
    }
  } catch (error: unknown) {
    const { erroresForm } = handlingError(error);
    if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    enqueueSnackbar("Error probando conexión", { variant: "error" });
    setIsConnected({ estado: false, mensaje: "" });
  }
};

//////////////////////////


  /*
  const testConnection: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.post(
        "api/dispositivos-hikvision/probar-conexion",
        data
      );
      if (res.data.estado) {
        enqueueSnackbar("El dispositivo se conectó correctamente.", {
          variant: "success",
        });
        setIsConnected(res.data);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };
*/

//////////////////////////
const onSubmit: SubmitHandler<FormValues> = async (data) => {
  try {
    const res = await clienteAxios.post("/api/dispositivos-hikvision", data);

    if (res?.data?.estado) {
      enqueueSnackbar("El dispositivo se creó correctamente.", {
        variant: "success",
      });
      parentGridDataRef?.fetchRows?.();
      navigate("/dispositivos-hikvision");
    } else {
      enqueueSnackbar(res?.data?.mensaje ?? "No se pudo crear el dispositivo", {
        variant: "warning",
      });
    }
  } catch (error: unknown) {
    const { erroresForm } = handlingError(error);
    if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    enqueueSnackbar("Error creando el dispositivo", { variant: "error" });
  }
};
//////////////////////////


/*
  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.post("api/dispositivos-hikvision", data);
      if (res.data.estado) {
        enqueueSnackbar("El dispositivo se creó correctamente.", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
        navigate("/dispositivos-hikvision");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };
*/
  const regresar = () => {
    navigate("/dispositivos-hikvision");
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box component="section">
        <Card elevation={5}>
          <CardContent>
            {formContext.formState.isSubmitting || isLoading ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Nuevo Dispositivo
                </Typography>
                <TextFieldElement
                  name="direccion_ip"
                  label="Dirección IP"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="nombre"
                  label="Nombre"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="usuario"
                  label="Usuario"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="contrasena"
                  label="Contraseña"
                  required
                  fullWidth
                  margin="normal"
                  type={showPassword ? "text" : "password"}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={
                              showPassword
                                ? "hide the password"
                                : "display the password"
                            }
                            onClick={handleClickShowPassword}
                            onMouseDown={handleMouseDownPassword}
                            onMouseUp={handleMouseUpPassword}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <PasswordValidAdornment name="contrasena" />
                <AutocompleteElement
                  name="id_acceso"
                  label="Acceso en el que se usará"
                  matchId
                  options={accesos.map((item) => {
                    return { id: item._id, label: item.nombre };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                />
                <AutocompleteElement
                  name="tipo_evento"
                  label="Uso de panel para Entrada/Salida/Indefinido"
                  required
                  matchId
                  options={tipo_evento.map((item) => {
                    return { id: item.tipo, label: item.nombre };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                />
                <Grid container spacing={2} sx={{ my: 2 }}>
                  <Grid size={{ xs: 12, sm: 10 }}>
                    <Stack spacing={0}>
                      <Typography variant="overline" component="h2">
                        <strong>Habilitar panel para citas</strong>
                      </Typography>
                      <Typography
                        variant="body2"
                        component="span"
                        sx={{ ml: { xs: 0, sm: 2 } }}
                      >
                        <small>
                          Esta opción habilita la lectura del panel para que
                          ingresen personas que cuentan con cita.
                        </small>
                      </Typography>
                    </Stack>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: 2 }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: { xs: "center", sm: "end" },
                    }}
                  >
                    <SwitchElement
                      label=""
                      labelPlacement="start"
                      name="habilitar_citas"
                    />
                  </Grid>
                </Grid>
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
                    {isConnected.estado ? (
                      <Button
                        disabled={!formContext.formState.isValid}
                        type="submit"
                        size="medium"
                        variant="contained"
                        onClick={formContext.handleSubmit(onSubmit)}
                        startIcon={<Save />}
                      >
                        Guardar
                      </Button>
                    ) : (
                      <Button
                        disabled={!formContext.formState.isValid}
                        type="submit"
                        size="medium"
                        variant="contained"
                        onClick={formContext.handleSubmit(testConnection)}
                        startIcon={<NetworkCheck />}
                      >
                        Probar conexión
                      </Button>
                    )}
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
