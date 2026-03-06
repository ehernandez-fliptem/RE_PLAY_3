import { lazy, Suspense, useEffect, useState } from "react";
import {
  Close,
  Save,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  IconButton,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  AutocompleteElement,
  FormContainer,
  TextFieldElement,
} from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import {
  HASLOWERCASE,
  HASNUMBER,
  HASSYMBOLE,
  HASUPPERCASE,
  REGEX_BASE64,
  REGEX_NAME,
} from "../../../app/constants/CommonRegex";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import PasswordValidAdornment from "../../utils/PasswordValidAdornment";
import ProfilePicturePreview from "../../utils/fallbackRender/ProfilePicturePreview";
import { MuiTelInput } from "mui-tel-input";
import { setFormErrors } from "../../helpers/formHelper";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import { getRoleLabel } from "../../../app/utils/roleLabels";

const ProfilePicture = lazy(() => import("../../utils/ProfilePicture"));

type TEmpresas = {
  _id: string;
  nombre: string;
  activo: boolean;
};

type FormValues = {
  img_usuario: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  id_empresa: string;
  telefono?: string;
  correo: string;
  contrasena: string;
  rol: number[];
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
    .matches(REGEX_NAME, "Este campo solo acepta letras y espacios."),
  apellido_mat: yup
    .string()
    .notRequired()
    .test(
      "isValidLastName",
      "Este campo solo acepta letras y espacios.",
      (value) => {
        if (value) {
          const hasUpperCase = REGEX_NAME.test(value);
          if (hasUpperCase) {
            return true;
          }
          return false;
        } else {
          return true;
        }
      }
    ),
  id_empresa: yup.string().required("Este campo es obligatorio."),
  telefono: yup.string(),
  correo: yup
    .string()
    .required("Este campo es obligatorio.")
    .email("Formato de correo inválido."),
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
  rol: yup
    .array()
    .of(yup.number().integer())
    .required("Este campo es obligatorio")
    .min(1, "Debe contener al menos un rol"),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  img_usuario: "",
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  id_empresa: "",
  telefono: "",
  correo: "",
  contrasena: "",
  rol: [],
};

export default function NuevoUsuario() {
  const { roles } = useSelector((state: IRootState) => state.config.data);
  const ROLES = Object.entries(roles)
    .filter((item) => [1, 2, 4, 5].includes(Number(item[0])))
    .map((item) => {
      return {
        id: Number(item[0]),
        label: getRoleLabel(Number(item[0]), item[1].nombre),
      };
    });
  const theme = useTheme();
  const isTinyMobile = useMediaQuery(theme.breakpoints.down("sm"));
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
  const [empresas, setEmpresas] = useState<TEmpresas[]>([]);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get("/api/usuarios/form-nuevo");
        if (res.data.estado) {
          const { usuario, empresas } = res.data.datos;
          setEmpresas(empresas);
          formContext.reset(usuario);
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

  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const handleMouseUpPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.post("api/usuarios", data);
      if (res.data.estado) {
        enqueueSnackbar("El usuario se creó correctamente.", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
        navigate("/usuarios");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };

  const handleChange = async (value: string, name: "telefono") => {
    formContext.setValue(name, value, { shouldValidate: true });
  };

  const regresar = () => {
    navigate("/usuarios");
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
                  Crear usuario del sistema
                </Typography>
                <Suspense fallback={<ProfilePicturePreview />}>
                  <ProfilePicture
                    name="img_usuario"
                    allowFiles={["png", "jpeg", "jpg"]}
                  />
                </Suspense>
                <Typography variant="overline" component="h6">
                  Datos Generales
                </Typography>
                <TextFieldElement
                  name="nombre"
                  label="Nombre"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="apellido_pat"
                  label="Apellido Paterno"
                  required
                  fullWidth
                  margin="normal"
                />
                <TextFieldElement
                  name="apellido_mat"
                  label="Apellido Materno"
                  fullWidth
                  margin="normal"
                />
                <AutocompleteElement
                  name="id_empresa"
                  label="Empresa"
                  required
                  options={empresas.map((item) => {
                    return { id: item._id, label: item.nombre };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                    onChange: (_, value) => {
                      formContext.setValue("id_empresa", value?.id || "");
                    },
                  }}
                />
                <Controller
                  name="telefono"
                  control={formContext.control}
                  render={({ field, fieldState }) => (
                    <MuiTelInput
                      name="telefono"
                      label="Teléfono"
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
                <Divider sx={{ my: 2 }} />
                <Typography variant="overline" component="h6">
                  Acceso al sistema
                </Typography>
                <TextFieldElement
                  name="correo"
                  label="Correo"
                  required
                  fullWidth
                  margin="normal"
                  type="email"
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
                <Controller
                  name="rol"
                  control={formContext.control}
                  render={({ field, fieldState }) => (
                    <FormControl
                      component="fieldset"
                      error={!!fieldState.error}
                      sx={{ mt: 1 }}
                    >
                      <FormLabel component="legend">Perfil de acceso *</FormLabel>
                      <RadioGroup
                        row={!isTinyMobile}
                        value={field.value?.[0] ?? ""}
                        onChange={(_, value) =>
                          field.onChange(value ? [Number(value)] : [])
                        }
                      >
                        {ROLES.map((item) => (
                          <FormControlLabel
                            key={item.id}
                            value={item.id}
                            control={<Radio />}
                            label={item.label}
                          />
                        ))}
                      </RadioGroup>
                      {fieldState.error?.message && (
                        <FormHelperText>{fieldState.error.message}</FormHelperText>
                      )}
                    </FormControl>
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






