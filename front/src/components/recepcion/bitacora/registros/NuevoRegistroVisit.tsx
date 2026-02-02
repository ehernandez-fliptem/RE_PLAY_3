import { Suspense, useEffect, useState } from "react";
import { useErrorBoundary } from "react-error-boundary";
import { useNavigate, useSearchParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../../app/config/axios";
import { enqueueSnackbar } from "notistack";
import dayjs from "dayjs";
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  InputAdornment,
  lighten,
  Stack,
  Typography,
} from "@mui/material";
import Spinner from "../../../utils/Spinner";
import {
  Controller,
  FormContainer,
  SelectElement,
  TextFieldElement,
  useForm,
  type SubmitHandler,
} from "react-hook-form-mui";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Abc,
  Accessible,
  DirectionsCar,
  Image,
  Save,
} from "@mui/icons-material";
import { setFormErrors } from "../../../helpers/formHelper";
import {
  REGEX_BASE64,
  REGEX_NAME,
} from "../../../../app/constants/CommonRegex";
import ProfilePicturePreview from "../../../utils/fallbackRender/ProfilePicturePreview";
import ProfilePicture from "../../../utils/ProfilePicture";
import AutocompleteOcrInput from "./partes/utils/AutocompleteOcrInput";
import { MuiTelInput } from "mui-tel-input";

type FormValues = {
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  telefono?: string;
  tipo_ide: number | null;
  img_ide_a: string;
  img_ide_b: string;
  numero_ide: string;
  empresa?: string;
  actividades?: string;
  comentarios?: string;
  placas?: string;
  desc_vehiculo?: string;
};

const resolver = yup.object().shape({
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
    .test(
      "isValidName",
      "Este campo solo acepta letras y espacios.",
      (value) => {
        if (value) {
          const hasUri = REGEX_NAME.test(value);
          if (hasUri) {
            return true;
          }
          return false;
        } else {
          return true;
        }
      }
    ),
  telefono: yup.string().notRequired().nullable(),
  tipo_ide: yup.number().min(1).max(5).required("Este campo es obligatorio."),
  img_ide_a: yup
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
          return false;
        }
      }
    ),
  img_ide_b: yup
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
          return false;
        }
      }
    ),
  numero_ide: yup.string().required("Este campo es obligatorio."),
  empresa: yup.string(),
  actividades: yup.string(),
  comentarios: yup.string(),
  placas: yup.string(),
  desc_vehiculo: yup.string(),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  telefono: "",
  tipo_ide: null,
  img_ide_a: "",
  img_ide_b: "",
  numero_ide: "",
  empresa: "",
  comentarios: "",
  placas: "",
  desc_vehiculo: "",
  actividades: "",
};

export default function NuevoRegistroVisit() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const formContext = useForm({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { showBoundary } = useErrorBoundary();
  const [citaInfo, setCitaInfo] = useState({
    anfitrion: {
      nombre: "",
      correo: "",
      telefono: "",
    },
    visitante: {
      nombre: "",
      apellido_pat: "",
      apellido_mat: "",
      telefono: "",
      empresa: "",
    },
    correo: "",
    fecha_entrada: dayjs(),
  });
  const { anfitrion } = citaInfo;

  useEffect(() => {
    const token = params.get("t");
    if (!token) {
      showBoundary(
        new Error("No tienes autorización para acceder a esta página.")
      );
      return;
    }
    setToken(token);
  }, [params, showBoundary]);

  useEffect(() => {
    const validarInformacion = async () => {
      try {
        const res = await clienteAxios.post(
          "/api/registros/validar-token-registro",
          { token }
        );
        if (res.data.datos) {
          setCitaInfo(res.data.datos);
          formContext.reset({ ...initialValue, ...res.data.datos.visitante });
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, {
            variant: "error",
          });
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 3000);
        }
      } catch (error) {
        handlingError(error);
      }
    };
    if (token) validarInformacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      const res = await clienteAxios.post("api/registros/visitante", {
        ...data,
        token,
      });
      if (res.data.estado) {
        const {
          correos_enviados: { anfitrion, visitante },
        } = res.data.datos;
        enqueueSnackbar("La cita se creó correctamente.", {
          variant: "success",
        });
        enqueueSnackbar(
          anfitrion
            ? "Se notificó correctamente al anfitrión."
            : "Hubo un problema al enviar el correo al anfitrión",
          {
            variant: anfitrion ? "success" : "warning",
          }
        );
        enqueueSnackbar(
          visitante
            ? "Se te envío un correo con los detalles de la cita."
            : "Hubo un problema al enviar el correo al visitante",
          {
            variant: visitante ? "success" : "warning",
          }
        );
        navigate("/", { replace: true });
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

  return (
    <Box component="section" sx={{ p: 5 }}>
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
              <Typography variant="h4" component="h2" textAlign="center">
                Nueva cita
              </Typography>
              <Box
                component="div"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "end",
                }}
              >
                <Typography component="p" variant="body1" fontWeight={700}>
                  Anfitrión
                </Typography>
                <Typography component="p" variant="body1">
                  {anfitrion.nombre}
                </Typography>
                <Typography component="p" variant="body1">
                  {anfitrion.correo}
                </Typography>
                {anfitrion.telefono && (
                  <Typography component="p" variant="body1">
                    {anfitrion.telefono}
                  </Typography>
                )}
              </Box>
              <Typography
                component="p"
                variant="body1"
                fontWeight={700}
                color="info"
                align="center"
              >
                * Para cualquier duda puedes contactar directamente con el
                anfitrión *
              </Typography>
              <SelectElement
                name="tipo_ide"
                label="Tipo de Identificación"
                required
                fullWidth
                margin="normal"
                options={[
                  {
                    id: "1",
                    label: "Oficial",
                  },
                  {
                    id: "2",
                    label: "Licencia de Conducir",
                  },
                  {
                    id: "3",
                    label: "Pasaporte",
                  },
                  {
                    id: "4",
                    label: "Otro",
                  },
                ]}
              />

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{
                  display: "flex",
                  justifyContent: "space-evenly",
                  alignItems: "center",
                }}
              >
                <Suspense fallback={<ProfilePicturePreview />}>
                  <ProfilePicture
                    required
                    adjustImageToBox
                    backgroundIcon={<Image />}
                    variant="square"
                    label="Identificación Frontal"
                    name="img_ide_a"
                    allowFiles={["png", "jpeg", "jpg"]}
                  />
                </Suspense>
                <Suspense fallback={<ProfilePicturePreview />}>
                  <ProfilePicture
                    required
                    adjustImageToBox
                    backgroundIcon={<Image />}
                    variant="square"
                    label="Identificación Reverso"
                    name="img_ide_b"
                    allowFiles={["png", "jpeg", "jpg"]}
                  />
                </Suspense>
              </Stack>
              <AutocompleteOcrInput
                parentImgName="img_ide_b"
                disabledCheckBox
                textFieldProps={{
                  name: "numero_ide",
                  label: "Número de identificación",
                  required: true,
                  fullWidth: true,
                  margin: "normal",
                }}
              />
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
              <Controller
                name="telefono"
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
              <TextFieldElement
                name="empresa"
                label="Empresa"
                fullWidth
                margin="normal"
              />
              <TextFieldElement
                name="actividades"
                label="Actividades"
                fullWidth
                margin="normal"
              />
              <TextFieldElement
                name="comentarios"
                label="Comentarios"
                fullWidth
                margin="normal"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Accessible />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextFieldElement
                name="placas"
                label="Placas del Vehículo"
                fullWidth
                margin="normal"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <Abc />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextFieldElement
                name="desc_vehiculo"
                label="Descripción del Vehículo"
                fullWidth
                margin="normal"
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <DirectionsCar />
                      </InputAdornment>
                    ),
                  },
                }}
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
  );
}
