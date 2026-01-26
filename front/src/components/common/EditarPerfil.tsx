import { useState, useEffect, Fragment } from "react";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { clienteAxios, handlingError } from "../../app/config/axios";
import { enqueueSnackbar } from "notistack";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  HASLOWERCASE,
  HASNUMBER,
  HASSYMBOLE,
  HASUPPERCASE,
  REGEX_FABRI,
  REGEX_BASE64,
  REGEX_NAME,
} from "../../app/constants/CommonRegex";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Typography,
  InputAdornment,
  IconButton,
  Stack,
  lighten,
  alpha,
  Avatar,
} from "@mui/material";
import {
  Save,
  Close,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { setFormErrors } from "../helpers/formHelper";
import PasswordValidAdornment from "../utils/PasswordValidAdornment";
import { MuiTelInput } from "mui-tel-input";
import Spinner from "../utils/Spinner";

type FormValues = {
  img_usuario: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  nueva_contrasena?: string;
  movil?: string;
  telefono?: string;
  extension?: string;
};

const resolver = yup.object().shape({
  img_usuario: yup
    .string()
    .test(
      "isValidUri",
      "La imagen de usuario debe ser una URL válida.",
      (value) => {
        if (value) {
          const hasUri = REGEX_BASE64.test(value);
          if (hasUri) {
            return true;
          }
          return false;
        } else {
          return true;
        }
      }
    ),
  nombre: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_NAME, "Este campo solo acepta letras y espacios."),
  apellido_pat: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_FABRI, "Este campo solo acepta letras."),
  apellido_mat: yup
    .string()
    .nullable()
    .notRequired()
    .matches(REGEX_FABRI, "Este campo solo acepta letras."),
  nueva_contrasena: yup
    .string()
    .min(8, "La contraseña debe contener mínimo 8 caracteres.")
    .test("isValidPass", "", (value) => {
      if (value) {
        const hasUpperCase = HASUPPERCASE.test(value);
        const hasNumber = HASNUMBER.test(value);
        const hasLowerCase = HASLOWERCASE.test(value);
        const hasSymbole = HASSYMBOLE.test(value);
        let validConditions = 0;
        const numberOfMustBeValidConditions = 4;
        const conditions = [hasUpperCase, hasLowerCase, hasNumber, hasSymbole];
        conditions.forEach((condition) =>
          condition ? validConditions++ : null
        );
        if (validConditions >= numberOfMustBeValidConditions) {
          return true;
        }
        return false;
      } else {
        return true;
      }
    }),
  movil: yup.string(),
  telefono: yup.string(),
  extension: yup.string(),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  img_usuario: "",
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  nueva_contrasena: "",
  movil: "",
  telefono: "",
  extension: "",
};

export default function EditarPerfil() {
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
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const traerUsuario = async () => {
      try {
        const res = await clienteAxios.get(`/api/perfil/`);
        if (res.data.estado) {
          formContext.reset(res.data.datos);
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "error" });
        }
      } catch (error: unknown) {
        const { erroresForm } = handlingError(error);
        if (erroresForm) setFormErrors(formContext.setError, erroresForm);
      }
    };
    traerUsuario();
  }, [formContext]);

  const handleClickShowPassword = () => setShowPassword((show) => !show);
  const handleMouseDownPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };
  const handleMouseUpPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.put("/api/perfil", data);
      if (res.data.estado) {
        enqueueSnackbar("Perfil actualizado correctamente.", {
          variant: "success",
        });
        navigate("/perfil");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  const handleChange = async (value: string, name: "telefono" | "movil") => {
    formContext.setValue(name, value, { shouldValidate: true });
  };

  const regresar = () => {
    navigate("/");
  };

  return (
    <Fragment>
      <Box component="section">
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
            {formContext.formState.isSubmitting || isLoading ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Typography variant="h5" component="h2" textAlign="center">
                  Perfil
                </Typography>
                <Box
                  component="div"
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Controller
                    name="img_usuario"
                    render={({ field }) => (
                      <Avatar
                        src={field.value}
                        sx={{
                          width: 150,
                          height: 150,
                          my: 2,
                        }}
                      />
                    )}
                  />
                </Box>
                <Typography variant="subtitle1" component="h2">
                  Generales
                </Typography>
                <TextFieldElement
                  margin="normal"
                  fullWidth
                  name="nombre"
                  label="Nombre"
                  required
                />
                <TextFieldElement
                  margin="normal"
                  fullWidth
                  name="apellido_pat"
                  label="Apellido Paterno"
                  required
                />
                <TextFieldElement
                  margin="normal"
                  fullWidth
                  name="apellido_mat"
                  label="Apellido Materno"
                />
                <Controller
                  name="movil"
                  control={formContext.control}
                  render={({ field, fieldState }) => (
                    <MuiTelInput
                      name="movil"
                      label="Teléfono Móvil"
                      fullWidth
                      margin="normal"
                      value={field.value}
                      onChange={(value: string) => handleChange(value, "movil")}
                      defaultCountry="MX"
                      continents={["SA", "NA"]}
                      langOfCountryName="es"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disableFormatting
                    />
                  )}
                />
                <Controller
                  name="telefono"
                  control={formContext.control}
                  render={({ field, fieldState }) => (
                    <MuiTelInput
                      name="telefono"
                      label="Teléfono de Casa/Oficina"
                      fullWidth
                      margin="normal"
                      value={field.value}
                      onChange={(value: string) =>
                        handleChange(value, "telefono")
                      }
                      defaultCountry="MX"
                      continents={["SA", "NA"]}
                      langOfCountryName="es"
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      disableFormatting
                    />
                  )}
                />
                <TextFieldElement
                  name="extension"
                  label="Extensión"
                  fullWidth
                  margin="normal"
                  type="text"
                />
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" component="h2">
                  Sistema
                </Typography>
                <TextFieldElement
                  margin="normal"
                  fullWidth
                  name="nueva_contrasena"
                  label="Nueva Contraseña"
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
                <PasswordValidAdornment name="nueva_contrasena" />
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
    </Fragment>
  );
}
