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
  Switch,
  Typography,
} from "@mui/material";
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import Swal from "sweetalert2";
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
import { flushSync } from "react-dom";
import {
  DOCUMENTOS_CHECKS_LIST,
  EMPTY_DOCUMENTOS_CHECKS,
  areDocumentosChecksEqual,
  type DocumentosChecks,
} from "./documentosChecks";

const ProfilePicture = lazy(() => import("../../utils/ProfilePicture"));

type FormValues = {
  img_usuario: string;
  img_ine?: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  empresa?: string;
  telefono?: string;
  correo: string;
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
    identificacion_oficial: yup.boolean(),
    sua: yup.boolean(),
    permiso_entrada: yup.boolean(),
    lista_articulos: yup.boolean(),
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
  viene_en_coche: false,
  archivo_licencia: "",
  archivo_poliza_seguro: "",
  archivo_tarjeta_circulacion: "",
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
  const vieneEnCoche = formContext.watch("viene_en_coche");
  const [isLoading, setIsLoading] = useState(true);
  const [isVerificado, setIsVerificado] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const originalDocChecksRef = useRef<DocumentosChecks>({
    ...EMPTY_DOCUMENTOS_CHECKS,
  });
  const originalFormRef = useRef<FormValues | null>(null);
  const getErrorMessages = (obj: unknown): string[] => {
    if (!obj || typeof obj !== "object") return [];
    const current = obj as Record<string, unknown>;
    const out: string[] = [];
    if (typeof current.message === "string" && current.message.trim()) {
      out.push(current.message);
    }
    Object.values(current).forEach((value) => {
      if (value && typeof value === "object") {
        out.push(...getErrorMessages(value));
      }
    });
    return out;
  };

  const handleGuardarClick = async () => {
    const isValid = await formContext.trigger();
    if (!isValid) {
      const messages = Array.from(
        new Set(getErrorMessages(formContext.formState.errors))
      );
      enqueueSnackbar(
        messages.length > 0
          ? `Faltan campos por completar: ${messages.join(" | ")}`
          : "Faltan campos obligatorios por completar.",
        { variant: "warning" }
      );
      return;
    }
    await formContext.handleSubmit(onSubmit)();
  };

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
          originalFormRef.current = {
            img_usuario: visitante.img_usuario || "",
            img_ine: visitante.img_ine || "",
            nombre: visitante.nombre || "",
            apellido_pat: visitante.apellido_pat || "",
            apellido_mat: visitante.apellido_mat || "",
            empresa: visitante.empresa || "",
            telefono: visitante.telefono || "",
            correo: visitante.correo || "",
            viene_en_coche: Boolean(visitante.viene_en_coche),
            archivo_licencia: visitante.archivo_licencia || "",
            archivo_poliza_seguro: visitante.archivo_poliza_seguro || "",
            archivo_tarjeta_circulacion:
              visitante.archivo_tarjeta_circulacion || "",
            documentos_checks: normalizedChecks,
          };
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
          let faceInvalid = false;
          const syncedPanelIds: string[] = [];
          let failedPanelId: string | null = null;
          let faceInvalidMessage =
            "La foto no es válida para el panel. Intenta con otra imagen.";
          try {
            const pRes = await clienteAxios.get(
              "/api/dispositivos-hikvision/demonio"
            );
            const paneles = pRes.data?.datos || [];
            if (Array.isArray(paneles) && paneles.length > 0 && ID) {
              for (const p of paneles) {
                try {
                  const panelId = p._id;
                  const syncRes = await clienteAxios.get(
                    `/api/dispositivos-hikvision/sincronizar-visitante/${panelId}/${ID}`
                  );
                  console.log("[SYNC-VIS] respuesta FDSetUp", syncRes.data);
                  if (syncRes.data?.estado === false) {
                    faceInvalid = true;
                    faceInvalidMessage =
                      syncRes.data?.mensaje || faceInvalidMessage;
                    failedPanelId = String(panelId);
                    break;
                  } else {
                    syncedPanelIds.push(String(panelId));
                  }
                } catch {
                  // no bloquea si un panel falla
                }
                if (faceInvalid) break;
              }
            }
          } catch {
            // no bloquea si no se pudieron listar paneles
          }
          if (faceInvalid) {
            const original = originalFormRef.current;
            if (original && ID) {
              try {
                await clienteAxios.put(`/api/visitantes/${ID}`, original);
                const panelesARevertir = Array.from(
                  new Set([
                    ...syncedPanelIds,
                    ...(failedPanelId ? [failedPanelId] : []),
                  ])
                );
                for (const panelId of panelesARevertir) {
                  try {
                    await clienteAxios.get(
                      `/api/dispositivos-hikvision/sincronizar-visitante/${panelId}/${ID}`
                    );
                  } catch {
                    // Si una restauracion de panel falla, no bloquea el modal final.
                  }
                }
              } catch {
                // Si falla restauracion en BD, de todas formas mostramos el error principal.
              }
            }
            flushSync(() => {
              setIsSaving(false);
              setShowForm(false);
            });
            await Swal.fire({
              icon: "error",
              title: "No se pudo subir la foto",
              text: faceInvalidMessage,
              showConfirmButton: true,
              allowOutsideClick: false,
              showClass: { popup: "swal2-show" },
              hideClass: { popup: "swal2-hide" },
            });
            flushSync(() => {
              setShowForm(true);
            });
            return;
          }
        }
        originalFormRef.current = {
          ...data,
          documentos_checks: { ...data.documentos_checks },
        };
        originalDocChecksRef.current = { ...data.documentos_checks };
        setIsVerificado(Boolean(res.data.datos?.verificado));
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

  if (!showForm) {
    return null;
  }

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
                <Box
                  sx={{
                    mt: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 2,
                  }}
                >
                  <Typography variant="body2">
                    Ingreso en veh�culo
                  </Typography>
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
                </Box>
                {vieneEnCoche && (
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                      <Box sx={{ flex: 1, width: "100%" }}>
                      <Suspense fallback={<ProfilePicturePreview />}>
                        <ProfilePicture
                          name="archivo_licencia"
                          label="Foto de Licencia"
                          compact
                          variant="rounded"
                          showViewButton
                          adjustImageToBox
                          required
                          allowFiles={["png", "jpeg", "jpg", "pdf"]}
                        />
                      </Suspense>
                    </Box>
                      <Box sx={{ flex: 1, width: "100%" }}>
                      <Suspense fallback={<ProfilePicturePreview />}>
                        <ProfilePicture
                          name="archivo_poliza_seguro"
                          label="Foto de Póliza de seguro"
                          compact
                          variant="rounded"
                          showViewButton
                          adjustImageToBox
                          required
                          allowFiles={["png", "jpeg", "jpg", "pdf"]}
                        />
                      </Suspense>
                    </Box>
                    </Stack>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                      <Box sx={{ flex: 1, width: "100%" }}>
                        <Suspense fallback={<ProfilePicturePreview />}>
                          <ProfilePicture
                            name="archivo_tarjeta_circulacion"
                            label="Tarjeta de circulación (opcional)"
                            compact
                            variant="rounded"
                            showViewButton
                            adjustImageToBox
                            allowFiles={["png", "jpeg", "jpg", "pdf"]}
                          />
                        </Suspense>
                      </Box>
                      <Box sx={{ flex: 1, display: { xs: "none", md: "block" } }} />
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
                      disabled={isSaving}
                      type="button"
                      size="medium"
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleGuardarClick}
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
















