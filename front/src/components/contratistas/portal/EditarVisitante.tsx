import { ChevronLeft, Save } from "@mui/icons-material";
import { useForm } from "react-hook-form";
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
import { FormContainer, TextFieldElement } from "react-hook-form-mui";
import { enqueueSnackbar } from "notistack";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import { setFormErrors } from "../../helpers/formHelper";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { useEffect, useState, type ChangeEvent } from "react";
import { REGEX_EMAIL, REGEX_NAME, REGEX_PHONE } from "../../../app/constants/CommonRegex";
import InputFileUpload from "../../utils/FileUpload";

type FormValues = {
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  correo: string;
  telefono?: string;
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
    .notRequired()
    .test("isValidLastName", "Este campo solo acepta letras y espacios.", (value) => {
      if (!value) return true;
      return REGEX_NAME.test(value);
    }),
  correo: yup
    .string()
    .required("Este campo es obligatorio.")
    .matches(REGEX_EMAIL, "Formato de correo inválido."),
  telefono: yup
    .string()
    .notRequired()
    .test("isValidPhone", "Teléfono inválido.", (value) => {
      if (!value) return true;
      return REGEX_PHONE.test(value);
    }),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  correo: "",
  telefono: "",
};

const DOC_LABELS: Record<string, string> = {
  identificacion_oficial: "Identificación oficial",
  sua: "SUA",
  permiso_entrada: "Permiso de entrada",
  lista_articulos: "Lista de artículos",
  repse: "REPSE",
  soporte_pago_actualizado: "Soporte de pago actualizado",
  constancia_vigencia_imss: "Constancia de Vigencia IMSS",
  constancias_habilidades: "Constancias de Habilidades",
};

const DOCS_REQUIRED = [
  "identificacion_oficial",
  "sua",
  "permiso_entrada",
  "lista_articulos",
  "repse",
  "soporte_pago_actualizado",
];

const DOCS_OPTIONAL = [
  "constancia_vigencia_imss",
  "constancias_habilidades",
];

export default function EditarPortalVisitante() {
  const { id } = useParams();
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
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [formSnapshot, setFormSnapshot] = useState<FormValues | null>(null);
  const [documentosArchivos, setDocumentosArchivos] = useState<
    Record<string, { name: string; dataUrl: string }>
  >({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/contratistas-visitantes/${id}`);
        if (res.data.estado) {
          formContext.reset(res.data.datos);
          const archivos = res.data.datos?.documentos_archivos || {};
          setDocumentosArchivos(
            Object.fromEntries(
              Object.entries(archivos).map(([key, value]) => [
                key,
                {
                  name: "",
                  dataUrl: String(value || ""),
                },
              ])
            )
          );
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        const { erroresForm, restartSession } = handlingError(error);
        if (erroresForm) setFormErrors(formContext.setError, erroresForm);
        if (restartSession) navigate("/logout", { replace: true });
      }
    };
    obtenerRegistro();
  }, [formContext, id, navigate]);

  const handleNext = async () => {
    const isValid = await formContext.trigger();
    if (!isValid) return;
    setFormSnapshot(formContext.getValues());
    setShowDocsModal(true);
  };

  const onUploadDoc =
    (key: string) => async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setDocumentosArchivos((prev) => ({
          ...prev,
          [key]: { name: file.name, dataUrl: String(reader.result || "") },
        }));
      };
      reader.readAsDataURL(file);
    };

  const guardarVisitante = async () => {
    if (!formSnapshot) return;
    const faltanObligatorios = DOCS_REQUIRED.some(
      (key) => !documentosArchivos[key]?.dataUrl
    );
    if (faltanObligatorios) {
      enqueueSnackbar("Debes subir todos los documentos obligatorios.", {
        variant: "warning",
      });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...formSnapshot,
        documentos_archivos: Object.fromEntries(
          Object.entries(documentosArchivos).map(([key, value]) => [
            key,
            value.dataUrl,
          ])
        ),
      };
      const res = await clienteAxios.put(`api/contratistas-visitantes/${id}`, payload);
      if (res.data.estado) {
        enqueueSnackbar("El visitante se actualizó correctamente.", {
          variant: "success",
        });
        parentGridDataRef.fetchRows();
        navigate("/portal-contratistas/visitantes");
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

  const regresar = () => {
    navigate("/portal-contratistas/visitantes");
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box component="section">
        <Card elevation={5}>
          <CardContent>
            {isLoading || isSaving ? (
              <Spinner />
            ) : (
              <>
                {!showDocsModal ? (
                  <FormContainer formContext={formContext} onSuccess={handleNext}>
                    <Typography variant="h4" component="h2" textAlign="center">
                      Editar Visitante
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
                      label="Apellido paterno"
                      required
                      fullWidth
                      margin="normal"
                    />
                    <TextFieldElement
                      name="apellido_mat"
                      label="Apellido materno"
                      fullWidth
                      margin="normal"
                    />
                    <TextFieldElement
                      name="correo"
                      label="Correo"
                      required
                      fullWidth
                      margin="normal"
                    />
                    <TextFieldElement
                      name="telefono"
                      label="Teléfono"
                      fullWidth
                      margin="normal"
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
                        >
                          <ChevronLeft /> Regresar
                        </Button>
                        <Button
                          disabled={!formContext.formState.isValid}
                          type="submit"
                          size="medium"
                          variant="contained"
                        >
                          Siguiente
                        </Button>
                      </Stack>
                    </Box>
                  </FormContainer>
                ) : (
                  <>
                    <Typography variant="h4" component="h2" textAlign="center">
                      Editar Documentos
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                      Documentos obligatorios
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Todos los documentos obligatorios son requeridos para guardar.
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 1.5,
                        border: "1px solid #eee",
                        borderRadius: 1,
                        p: 1.5,
                      }}
                    >
                      {DOCS_REQUIRED.map((key) => (
                        <Box
                          key={key}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 2,
                            borderBottom: "1px dashed #e6e6e6",
                            pb: 1,
                          }}
                        >
                          <Typography>{DOC_LABELS[key]}</Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="caption">
                              {documentosArchivos[key]?.name
                                ? documentosArchivos[key]?.name
                                : documentosArchivos[key]?.dataUrl
                                ? "Archivo cargado"
                                : "Sin archivo"}
                            </Typography>
                            <InputFileUpload
                              name={key}
                              label={
                                documentosArchivos[key]?.dataUrl
                                  ? "Re-subir"
                                  : "Subir"
                              }
                              onUpload={onUploadDoc(key)}
                              buttonProps={{ size: "small" }}
                            />
                          </Box>
                        </Box>
                      ))}
                    </Box>
                    <Divider sx={{ my: 2 }} />
                    <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                      Documentos opcionales
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 1.5,
                        border: "1px solid #eee",
                        borderRadius: 1,
                        p: 1.5,
                      }}
                    >
                      {DOCS_OPTIONAL.map((key) => (
                        <Box
                          key={key}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 2,
                            borderBottom: "1px dashed #e6e6e6",
                            pb: 1,
                          }}
                        >
                          <Typography>{DOC_LABELS[key]}</Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography variant="caption">
                              {documentosArchivos[key]?.name
                                ? documentosArchivos[key]?.name
                                : documentosArchivos[key]?.dataUrl
                                ? "Archivo cargado"
                                : "Sin archivo"}
                            </Typography>
                            <InputFileUpload
                              name={key}
                              label={
                                documentosArchivos[key]?.dataUrl
                                  ? "Re-subir"
                                  : "Subir"
                              }
                              onUpload={onUploadDoc(key)}
                              buttonProps={{ size: "small" }}
                            />
                          </Box>
                        </Box>
                      ))}
                    </Box>
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
                          onClick={() => setShowDocsModal(false)}
                        >
                          <ChevronLeft /> Regresar
                        </Button>
                        <Button
                          type="button"
                          size="medium"
                          variant="contained"
                          onClick={guardarVisitante}
                          disabled={DOCS_REQUIRED.some(
                            (key) => !documentosArchivos[key]?.dataUrl
                          )}
                        >
                          Guardar <Save />
                        </Button>
                      </Stack>
                    </Box>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </ModalContainer>
  );
}
