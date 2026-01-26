import { Fragment, lazy, Suspense, useEffect, useState } from "react";
import { Close, Save, Visibility, VisibilityOff } from "@mui/icons-material";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  AutocompleteElement,
  CheckboxButtonGroup,
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
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";

const ProfilePicture = lazy(() => import("../../utils/ProfilePicture"));

type TAccesos = {
  _id?: string;
  nombre?: string;
};

type TPuestos = {
  _id?: string;
  identificador: string;
  nombre?: string;
};

type TDepartamentos = {
  _id?: string;
  identificador: string;
  nombre?: string;
};

type TCubiculos = {
  _id?: string;
  identificador: string;
  nombre?: string;
};

type TEmpresas = {
  _id: string;
  nombre: string;
  activo: boolean;
  pisos: TPisos[];
  puestos: TPuestos[];
  departamentos: TDepartamentos[];
  cubiculos: TCubiculos[];
  accesos: TAccesos[];
};
type TPisos = { _id: string; identificador: string; nombre: string };

type FormValues = {
  img_usuario: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  id_empresa: string;
  id_piso: string;
  accesos: string[];
  movil?: string;
  telefono?: string;
  extension?: string;
  id_puesto?: string;
  id_departamento?: string;
  id_cubiculo?: string;
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
  id_piso: yup.string().required("Este campo es obligatorio."),
  accesos: yup
    .array()
    .of(yup.string())
    .min(1, "Debes seleccionar al menos un acceso"),
  id_puesto: yup.string(),
  id_departamento: yup.string(),
  id_cubiculo: yup.string(),
  movil: yup.string(),
  telefono: yup.string(),
  extension: yup.string(),
  correo: yup
    .string()
    .required("Este campo es obligatorio.")
    .email("Formato de correo inválido."),
  contrasena: yup
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
  id_piso: "",
  accesos: [],
  id_puesto: "",
  id_departamento: "",
  id_cubiculo: "",
  movil: "",
  telefono: "",
  extension: "",
  correo: "",
  contrasena: "",
  rol: [],
};

export default function EditarUsuario() {
  const { id: ID } = useParams();
  const { roles } = useSelector((state: IRootState) => state.config.data);
  const ROLES = Object.entries(roles)
    .filter((item) => ![10].includes(Number(item[0])))
    .map((item) => {
      return {
        id: Number(item[0]),
        label: item[1].nombre,
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
  const [pisos, setPisos] = useState<TPisos[]>([]);
  const [accesos, setAccesos] = useState<TAccesos[]>([]);
  const [puestos, setPuestos] = useState<TPuestos[]>([]);
  const [departamentos, setDepartamentos] = useState<TDepartamentos[]>([]);
  const [cubiculos, setCubiculos] = useState<TCubiculos[]>([]);
  const [esUsuarioMaestro, setEsUsuarioMaestro] = useState(false);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/usuarios/form-editar/${ID}`);
        if (res.data.estado) {
          const { usuario, empresas } = res.data.datos;
          setEsUsuarioMaestro(usuario.id_general === 1);
          setEmpresas(empresas);
          setPuestos(puestos);
          setDepartamentos(departamentos);
          setCubiculos(cubiculos);
          const empresaSeleccionada = (empresas as TEmpresas[]).find(
            (e) => e._id === usuario?.id_empresa
          );
          setPisos(empresaSeleccionada?.pisos || []);
          setPuestos(empresaSeleccionada?.puestos || []);
          setDepartamentos(empresaSeleccionada?.departamentos || []);
          setCubiculos(empresaSeleccionada?.cubiculos || []);
          setAccesos(empresaSeleccionada?.accesos || []);
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
  }, [formContext, ID]);

  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  const handleMouseDownPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const handleMouseUpPassword = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    console.log("envio", data);

    try {
      const res = await clienteAxios.put(`/api/usuarios/${ID}`, data);
      if (res.data.estado) {
        enqueueSnackbar("El usuario se modificó correctamente.", {
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

  const handleChange = async (value: string, name: "telefono" | "movil") => {
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
                  Editar Usuario
                </Typography>
                <Suspense fallback={<ProfilePicturePreview />}>
                  <ProfilePicture
                    name="img_usuario"
                    allowFiles={["png", "jpeg", "jpg"]}
                  />
                </Suspense>
                <Typography variant="overline" component="h6">
                  Generales
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
                {!esUsuarioMaestro && (
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
                        const empresaSeleccionada = empresas.find(
                          (e) => e._id === value?.id
                        );
                        setPisos(empresaSeleccionada?.pisos || []);
                        setAccesos(empresaSeleccionada?.accesos || []);
                        setPuestos(empresaSeleccionada?.puestos || []);
                        setDepartamentos(empresaSeleccionada?.departamentos || []);
                        setCubiculos(empresaSeleccionada?.cubiculos || []);
                        formContext.setValue("id_piso", "");
                        formContext.setValue("accesos", []); 
                        formContext.setValue("id_puesto", "");
                        formContext.setValue("id_departamento", "");
                        formContext.setValue("id_cubiculo", "");
                      },
                    }}
                  />
                )}
                <AutocompleteElement
                  name="id_piso"
                  label="Piso"
                  required
                  matchId
                  options={pisos.map((item) => ({
                    id: item._id,
                    label: `${item.identificador} - ${item.nombre}`,
                  }))}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                  }}
                />
                <AutocompleteElement
                  name="accesos"
                  label="Acceso"
                  required
                  matchId
                  multiple
                  options={accesos.map((item) => {
                    return {
                      id: item._id,
                      label: item.nombre,
                    };
                  })}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                  }}
                />
                <AutocompleteElement
                  name="id_puesto"
                  label="Puesto"
                  matchId
                  options={puestos.map((item) => ({
                    id: item._id,
                    label: `${item.identificador} - ${item.nombre}`,
                  }))}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                  }}
                />
                <AutocompleteElement
                  name="id_departamento"
                  label="Departamento"
                  matchId
                  options={departamentos.map((item) => ({
                    id: item._id,
                    label: `${item.identificador} - ${item.nombre}`,
                  }))}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                  }}
                />
                <AutocompleteElement
                  name="id_cubiculo"
                  label="Cubículo"
                  matchId
                  options={cubiculos.map((item) => ({
                    id: item._id,
                    label: `${item.identificador} - ${item.nombre}`,
                  }))}
                  textFieldProps={{
                    margin: "normal",
                  }}
                  autocompleteProps={{
                    noOptionsText: "No hay opciones.",
                  }}
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
                {!esUsuarioMaestro && (
                  <Fragment>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="overline" component="h6">
                      Sistema
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
                      label="Nueva Contraseña"
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
                                {showPassword ? (
                                  <VisibilityOff />
                                ) : (
                                  <Visibility />
                                )}
                              </IconButton>
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                    <PasswordValidAdornment name="contrasena" />
                    <CheckboxButtonGroup
                      name="rol"
                      label="Rol"
                      required
                      row={!isTinyMobile}
                      options={ROLES}
                    />
                  </Fragment>
                )}
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
