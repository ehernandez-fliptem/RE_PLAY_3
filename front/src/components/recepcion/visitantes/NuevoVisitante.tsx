import { lazy, Suspense, useState } from "react";
import { Close, Save } from "@mui/icons-material";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import { REGEX_BASE64, REGEX_NAME } from "../../../app/constants/CommonRegex";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import ProfilePicturePreview from "../../utils/fallbackRender/ProfilePicturePreview";
import { MuiTelInput } from "mui-tel-input";
import { setFormErrors } from "../../helpers/formHelper";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useOutletContext } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import {
  DOCUMENTOS_CHECKS_LIST,
  EMPTY_DOCUMENTOS_CHECKS,
  type DocumentosChecks,
} from "./documentosChecks";

const ProfilePicture = lazy(() => import("../../utils/ProfilePicture"));

type FormValues = {
  img_usuario?: string;
  img_ine?: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  empresa?: string;
  telefono?: string;
  correo: string;
  contrasena?: string;
  viene_en_coche?: boolean;
  archivo_licencia?: string;
  archivo_poliza_seguro?: string;
  archivo_tarjeta_circulacion?: string;
  documentos_checks: DocumentosChecks;
};

const resolver = yup.object().shape({
  img_usuario: yup
    .string()
    .test(
      "isValidUri",
      "La imagen de visitante debe ser una URL válida.",
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
  img_ine: yup
    .string()
    .test(
      "isValidUriIne",
      "La imagen de INE debe ser una URL válida.",
      (value) => {
        if (value) return REGEX_BASE64.test(value);
        return true;
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
  empresa: yup.string(),
  telefono: yup.string(),
  correo: yup
    .string()
    .required("Este campo es obligatorio.")
    .email("Formato de correo inválido."),
  contrasena: yup.string().notRequired(),
  viene_en_coche: yup.boolean().default(false),
  archivo_licencia: yup
    .string()
    .test("isValidLic", "El archivo de licencia es inválido.", (value) => {
      if (value) return REGEX_BASE64.test(value);
      return true;
    })
    .when("viene_en_coche", {
      is: true,
      then: (schema) => schema.required("Este campo es obligatorio."),
      otherwise: (schema) => schema.notRequired(),
    }),
  archivo_poliza_seguro: yup
    .string()
    .test("isValidPoliza", "El archivo de póliza es inválido.", (value) => {
      if (value) return REGEX_BASE64.test(value);
      return true;
    })
    .when("viene_en_coche", {
      is: true,
      then: (schema) => schema.required("Este campo es obligatorio."),
      otherwise: (schema) => schema.notRequired(),
    }),
  archivo_tarjeta_circulacion: yup
    .string()
    .test("isValidTarjeta", "El archivo de tarjeta es inválido.", (value) => {
      if (value) return REGEX_BASE64.test(value);
      return true;
    })
    .notRequired(),
  documentos_checks: yup.object({
    identificacion_oficial: yup
      .boolean()
      .oneOf([true], "Debes marcar todos los documentos."),
    sua: yup.boolean().oneOf([true], "Debes marcar todos los documentos."),
    permiso_entrada: yup
      .boolean()
      .oneOf([true], "Debes marcar todos los documentos."),
    lista_articulos: yup
      .boolean()
      .oneOf([true], "Debes marcar todos los documentos."),
  }),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  img_usuario: "",
  img_ine: "",
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  empresa: "",
  telefono: "",
  correo: "",
  contrasena: "",
  viene_en_coche: false,
  archivo_licencia: "",
  archivo_poliza_seguro: "",
  archivo_tarjeta_circulacion: "",
  documentos_checks: { ...EMPTY_DOCUMENTOS_CHECKS },
};

export default function NuevoVisitante() {
  const [isSaving, setIsSaving] = useState(false);
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
  const vieneEnCoche = formContext.watch("viene_en_coche");

  const generarContrasena = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
  try {
    setIsSaving(true);
    const payload = {
      ...data,
      contrasena: data.contrasena?.trim() ? data.contrasena : generarContrasena(),
    };
    const res = await clienteAxios.post("api/visitantes", payload);
    console.log("RESP CREATE VISITANTE:", res.data);

    if (!res.data.estado) {
      enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      return;
    }

    const sync = res.data?.datos?.sync || {};
    const subidos = Array.isArray(sync.subidos) ? sync.subidos : [];
    const fallidos = Array.isArray(sync.fallidos) ? sync.fallidos : [];
    if (fallidos.length > 0) {
      const okTxt = subidos.length > 0 ? `Subido en: ${subidos.join(", ")}.` : "No se subio en paneles.";
      const failTxt = `Pendiente en: ${fallidos.map((f: any) => f?.ip).filter(Boolean).join(", ")}.`;
      enqueueSnackbar(`${okTxt} ${failTxt}`, { variant: "warning" });
    }

    enqueueSnackbar("Visitante creado con exito", {
      variant: "success",
    });

    parentGridDataRef.fetchRows();
    navigate("/visitantes");
  } catch (error: unknown) {
    const { erroresForm, restartSession } = handlingError(error);
    if (restartSession) navigate("/logout", { replace: true });
    if (erroresForm) setFormErrors(formContext.setError, erroresForm);
  } finally {
    setIsSaving(false);
  }
};

  /*
  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {

      console.log("Ejecuta api/visitantes");
      
      const res = await clienteAxios.post("api/visitantes", data);
      if (res.data.estado) {
        enqueueSnackbar("El visitante se creó correctamente...", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
        navigate("/visitantes");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error: unknown) {
      const { erroresForm } = handlingError(error);
      if (erroresForm) setFormErrors(formContext.setError, erroresForm);
    }
  };
*/

  const handleChange = async (value: string, name: "telefono") => {
    formContext.setValue(name, value, { shouldValidate: true });
  };

  const regresar = () => {
    navigate("/visitantes");
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box component="section">
        <Card elevation={5}>
          <CardContent>
            {isSaving || formContext.formState.isSubmitting ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Nuevo Visitante
                </Typography>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  justifyContent="center"
                  alignItems={{ xs: "center", md: "flex-start" }}
                >
                  <Suspense fallback={<ProfilePicturePreview />}>
                    <ProfilePicture
                      name="img_usuario"
                      label="Foto"
                      allowFiles={["png", "jpeg", "jpg"]}
                    />
                  </Suspense>
                  <Suspense fallback={<ProfilePicturePreview />}>
                    <ProfilePicture
                      name="img_ine"
                      label="INE"
                      variant="rounded"
                      showViewButton
                      adjustImageToBox
                      allowFiles={["png", "jpeg", "jpg"]}
                    />
                  </Suspense>
                </Stack>
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
                <TextFieldElement
                  name="empresa"
                  label="Empresa"
                  fullWidth
                  margin="normal"
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
                <TextFieldElement
                  name="correo"
                  label="Correo"
                  required
                  fullWidth
                  margin="normal"
                  type="email"
                />
                <FormControlLabel
                  sx={{ mt: 1 }}
                  control={
                    <Controller
                      name="viene_en_coche"
                      control={formContext.control}
                      render={({ field }) => (
                        <Switch
                          checked={Boolean(field.value)}
                          onChange={(e) => field.onChange(e.target.checked)}
                        />
                      )}
                    />
                  }
                  label="¿Viene en coche?"
                />
                {vieneEnCoche && (
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                      <Suspense fallback={<ProfilePicturePreview />}>
                        <ProfilePicture
                          name="archivo_licencia"
                          label="Foto de Licencia"
                          variant="rounded"
                          showViewButton
                          adjustImageToBox
                          required
                          allowFiles={["png", "jpeg", "jpg", "pdf"]}
                        />
                      </Suspense>
                      <Suspense fallback={<ProfilePicturePreview />}>
                        <ProfilePicture
                          name="archivo_poliza_seguro"
                          label="Foto de Póliza de seguro"
                          variant="rounded"
                          showViewButton
                          adjustImageToBox
                          required
                          allowFiles={["png", "jpeg", "jpg", "pdf"]}
                        />
                      </Suspense>
                    </Stack>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                      <Suspense fallback={<ProfilePicturePreview />}>
                        <ProfilePicture
                          name="archivo_tarjeta_circulacion"
                          label="Tarjeta de circulación (opcional)"
                          variant="rounded"
                          showViewButton
                          adjustImageToBox
                          allowFiles={["png", "jpeg", "jpg", "pdf"]}
                        />
                      </Suspense>
                    </Stack>
                  </Stack>
                )}
                <Typography variant="overline" component="h6" sx={{ mt: 2 }}>
                  Documentos
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  flexWrap="wrap"
                  gap={1}
                >
                  {DOCUMENTOS_CHECKS_LIST.map(({ key, label }) => (
                    <Controller
                      key={key}
                      name={`documentos_checks.${key}`}
                      control={formContext.control}
                      render={({ field }) => (
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={Boolean(field.value)}
                              onChange={(e) => field.onChange(e.target.checked)}
                            />
                          }
                          label={label}
                        />
                      )}
                    />
                  ))}
                </Stack>
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



