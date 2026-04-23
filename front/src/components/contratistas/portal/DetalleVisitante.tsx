import { ChevronLeft } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import Spinner from "../../utils/Spinner";
import ModalContainer from "../../utils/ModalContainer";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useSelector } from "react-redux";
import { selectCurrentData } from "../../../app/features/config/configSlice";
import { getDocumentosConfig } from "../utils/documentosConfig";

type FormValues = {
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  correo: string;
  telefono?: string;
  empresa?: string;
  estado_validacion?: number;
  motivo_rechazo?: string;
  documentos_checks?: Record<string, boolean>;
  documentos_archivos?: Record<string, string>;
};

const initialValue: FormValues = {
  nombre: "",
  apellido_pat: "",
  apellido_mat: "",
  correo: "",
  telefono: "",
  empresa: "",
  estado_validacion: 1,
  motivo_rechazo: "",
  documentos_checks: {},
  documentos_archivos: {},
};

export default function DetallePortalVisitante() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [datos, setDatos] = useState<FormValues>(initialValue);
  const [expandedDocKey, setExpandedDocKey] = useState<string | false>(false);
  const config = useSelector(selectCurrentData);
  const docsCfg = getDocumentosConfig(config, "visitantes");
  const enabledDocKeys = docsCfg.required.map((d) => d.key).concat(docsCfg.optional.map((d) => d.key));
  const enabledOptionalKeys = docsCfg.optional.map((d) => d.key);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/contratistas-visitantes/${id}`);
        if (res.data.estado) {
          setDatos(res.data.datos);
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      }
    };
    obtenerRegistro();
  }, [id, navigate]);

  const regresar = () => {
    navigate("/portal-contratistas/visitantes");
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box component="section">
        <Card elevation={5}>
          <CardContent>
            {isLoading ? (
              <Spinner />
            ) : (
              <>
                <Typography variant="h4" component="h2" textAlign="center">
                  Visitante
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography
                    variant="h6"
                    component="h6"
                    color="primary"
                    bgcolor="#FFFFFF"
                    sx={(theme) => ({
                      border: `1px solid ${theme.palette.primary.main}`,
                      borderRadius: 2,
                      px: 2,
                      py: 0.5,
                    })}
                    textAlign="center"
                    mb={2}
                  >
                    <strong>Datos del visitante</strong>
                  </Typography>
                  <Box sx={{ display: "grid", gap: 1.5, mb: 3 }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                      <strong>Empresa:</strong>
                      <span>{datos.empresa || "-"}</span>
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                      <strong>Nombre:</strong>
                      <span>
                        {[datos.nombre, datos.apellido_pat, datos.apellido_mat]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </span>
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                      <strong>Correo:</strong>
                      <span>{datos.correo || "-"}</span>
                    </Box>
                    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                      <strong>Teléfono:</strong>
                      <span>{datos.telefono || "-"}</span>
                    </Box>
                  </Box>
                  {datos.estado_validacion === 3 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="h6"
                        component="h6"
                        color="primary"
                        bgcolor="#FFFFFF"
                        sx={(theme) => ({
                          border: `1px solid ${theme.palette.primary.main}`,
                          borderRadius: 2,
                          px: 2,
                          py: 0.5,
                        })}
                        textAlign="center"
                        mb={1}
                      >
                        <strong>Motivo de rechazo</strong>
                      </Typography>
                      <Typography
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "120px 1fr",
                          gap: 1,
                        }}
                      >
                        <strong>Motivo:</strong>
                        <span>{datos.motivo_rechazo || "-"}</span>
                      </Typography>
                    </Box>
                  )}
                  <Typography
                    variant="h6"
                    component="h6"
                    color="primary"
                    bgcolor="#FFFFFF"
                    sx={(theme) => ({
                      border: `1px solid ${theme.palette.primary.main}`,
                      borderRadius: 2,
                      px: 2,
                      py: 0.5,
                    })}
                    textAlign="center"
                    mb={2}
                  >
                    <strong>Documentos</strong>
                  </Typography>
                  {enabledDocKeys.filter(
                    (key) => !enabledOptionalKeys.includes(key)
                  ).map((key) => {
                    const docUrl = datos.documentos_archivos?.[key];
                    const check = datos.documentos_checks?.[key];
                    const tieneDoc = Boolean(docUrl);
                    const estadoDoc =
                      check === true
                        ? { label: "OK", color: "success.main" }
                        : check === false
                          ? {
                              label:
                                datos.estado_validacion === 3
                                  ? "Pendiente de corrección"
                                  : "Pendiente de revisión",
                              color: "error.main",
                            }
                          : tieneDoc
                            ? { label: "OK", color: "success.main" }
                            : { label: "Pendiente de subir documento", color: "error.main" };
                    return (
                      <Accordion
                        key={key}
                        disableGutters
                        expanded={expandedDocKey === key}
                        onChange={(_, isExpanded) =>
                          setExpandedDocKey(isExpanded ? key : false)
                        }
                      >
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                              pr: 2,
                            }}
                          >
                            <Typography>{docsCfg.labelByKey[key] || key}</Typography>
                            <Typography
                              variant="caption"
                              sx={{
                                color: estadoDoc.color,
                                fontWeight: 600,
                              }}
                            >
                              {estadoDoc.label}
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          {docUrl ? (
                            <Box
                              component="img"
                              src={docUrl}
                              alt={docsCfg.labelByKey[key] || key}
                              sx={{
                                maxWidth: "100%",
                                maxHeight: 360,
                                objectFit: "contain",
                                borderRadius: 1,
                                border: "1px solid #e0e0e0",
                              }}
                            />
                          ) : (
                            <Typography variant="body2">Sin archivo</Typography>
                          )}
                        </AccordionDetails>
                      </Accordion>
                    );
                  })}
                  {(() => {
                    const opcionales = enabledOptionalKeys.filter((key) =>
                      Boolean(datos.documentos_archivos?.[key])
                    );
                    if (opcionales.length === 0) return null;
                    return (
                      <>
                        <Typography
                          variant="h6"
                          component="h6"
                          color="primary"
                          bgcolor="#FFFFFF"
                          sx={(theme) => ({
                            border: `1px solid ${theme.palette.primary.main}`,
                            borderRadius: 2,
                            px: 2,
                            py: 0.5,
                          })}
                          textAlign="center"
                          mt={2}
                          mb={2}
                        >
                          <strong>Documentos opcionales</strong>
                        </Typography>
                        {opcionales.map((key) => {
                          const docUrl = datos.documentos_archivos?.[key];
                          if (!docUrl) return null;
                          const check = datos.documentos_checks?.[key];
                          const tieneDoc = Boolean(docUrl);
                          const estadoDoc =
                            check === true
                              ? { label: "OK", color: "success.main" }
                              : check === false
                                ? {
                                    label:
                                      datos.estado_validacion === 3
                                        ? "Pendiente de corrección"
                                        : "Pendiente de revisión",
                                    color: "error.main",
                                  }
                                : tieneDoc
                                  ? { label: "OK", color: "success.main" }
                                  : { label: "Pendiente de subir documento", color: "error.main" };
                          return (
                            <Accordion
                              key={key}
                              disableGutters
                              expanded={expandedDocKey === key}
                              onChange={(_, isExpanded) =>
                                setExpandedDocKey(isExpanded ? key : false)
                              }
                            >
                              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    width: "100%",
                                    pr: 2,
                                  }}
                                >
                                  <Typography>{docsCfg.labelByKey[key] || key}</Typography>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      color: estadoDoc.color,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {estadoDoc.label}
                                  </Typography>
                                </Box>
                              </AccordionSummary>
                              <AccordionDetails>
                                {docUrl ? (
                                  <Box
                                    component="img"
                                    src={docUrl}
                                    alt={docsCfg.labelByKey[key] || key}
                                    sx={{
                                      maxWidth: "100%",
                                      maxHeight: 360,
                                      objectFit: "contain",
                                      borderRadius: 1,
                                      border: "1px solid #e0e0e0",
                                    }}
                                  />
                                ) : (
                                  <Typography variant="body2">Sin archivo</Typography>
                                )}
                              </AccordionDetails>
                            </Accordion>
                          );
                        })}
                      </>
                    );
                  })()}
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
                      onClick={regresar}
                    >
                      <ChevronLeft /> Regresar
                    </Button>
                  </Stack>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    </ModalContainer>
  );
}

