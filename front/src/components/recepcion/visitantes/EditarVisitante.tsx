import { lazy, Suspense, useEffect, useRef, useState } from "react";
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
  Typography,
} from "@mui/material";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import {
    REGEX_BASE64,
  REGEX_NAME,
} from "../../../app/constants/CommonRegex";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import ProfilePicturePreview from "../../utils/fallbackRender/ProfilePicturePreview";
import { MuiTelInput } from "mui-tel-input";
import { setFormErrors } from "../../helpers/formHelper";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { useConfirm } from "material-ui-confirm";
import {
  DOCUMENTOS_CHECKS_LIST,
  EMPTY_DOCUMENTOS_CHECKS,
  areDocumentosChecksEqual,
  type DocumentosChecks,
} from "./documentosChecks";

const ProfilePicture = lazy(() => import("../../utils/ProfilePicture"));

type FormValues = {
  img_usuario: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  empresa?: string;
  telefono?: string;
  correo: string;
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
  documentos_checks: yup.object({
    identificacion_oficial: yup.boolean(),
    sua: yup.boolean(),
    permiso_entrada: yup.boolean(),
    lista_articulos: yup.boolean(),
  }),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  img_usuario: "",
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  empresa: "",
  telefono: "",
  correo: "",
  documentos_checks: { ...EMPTY_DOCUMENTOS_CHECKS },
};

export default function EditarVisitante() {
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
  const confirm = useConfirm();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase>();
  const [isLoading, setIsLoading] = useState(true);
  const [isVerificado, setIsVerificado] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const originalDocChecksRef = useRef<DocumentosChecks>({
    ...EMPTY_DOCUMENTOS_CHECKS,
  });

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/visitantes/form-editar/${ID}`);
        if (res.data.estado) {
          const { visitante } = res.data.datos;
          const normalizedChecks = {
            ...EMPTY_DOCUMENTOS_CHECKS,
            ...(visitante.documentos_checks || {}),
          };
          formContext.reset({
            ...visitante,
            documentos_checks: normalizedChecks,
          });
          originalDocChecksRef.current = normalizedChecks;
          setIsVerificado(Boolean(visitante.verificado));
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
      const docsChanged = !areDocumentosChecksEqual(
        originalDocChecksRef.current,
        data.documentos_checks
      );
      if (isVerificado && docsChanged) {
        try {
          const result = await confirm({
            title: "¿Seguro que deseas modificar los documentos?",
            description:
              "Al guardar los cambios en la lista de documentos, el visitante quedara sin acceso y se requerirá nuevamente la verificación.",
            allowClose: true,
            confirmationText: "Continuar",
          });
          if (!result.confirmed) return;
        } catch {
          return;
        }
      }

      setIsSaving(true);
      const res = await clienteAxios.put(`/api/visitantes/${ID}`, data);
      if (res.data.estado) {
        if (res.data.datos?.verificado) {
          try {
            const pRes = await clienteAxios.get(
              "/api/dispositivos-hikvision/demonio"
            );
            const paneles = pRes.data?.datos || [];
            if (Array.isArray(paneles) && paneles.length > 0 && ID) {
              for (const p of paneles) {
                try {
                  const panelId = p._id;
                  await clienteAxios.get(
                    `/api/dispositivos-hikvision/sincronizar-visitante/${panelId}/${ID}`
                  );
                } catch {
                  // no bloquea si un panel falla
                }
              }
            }
          } catch {
            // no bloquea si no se pudieron listar paneles
          }
        }
        if (res.data.datos?.requiereReverificacion) {
          enqueueSnackbar("Se requieren nuevas verificaciones de documentos.", {
            variant: "warning",
          });
        }
        enqueueSnackbar("El visitante se modificó correctamente.", {
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
    } finally {
      setIsSaving(false);
    }
  };

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
            {isLoading || isSaving ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Editar Visitante
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
                      disabled={!formContext.formState.isValid || isSaving}
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


