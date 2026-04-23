import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { ChevronLeft, Verified } from "@mui/icons-material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ModalContainer from "../../utils/ModalContainer";
import Spinner from "../../utils/Spinner";
import { enqueueSnackbar } from "notistack";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { selectCurrentData } from "../../../app/features/config/configSlice";
import { getDocumentosConfig } from "../utils/documentosConfig";

type Visitante = {
  _id: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  correo: string;
  estado_validacion?: number;
  documentos_checks?: Record<string, boolean>;
  documentos_archivos?: Record<string, string>;
};

type Item = {
  id_visitante: string;
  estado: number;
  motivo?: string;
};

type Solicitud = {
  fecha_visita: string;
  comentario?: string;
  estado: number;
  items: Item[];
  visitantes: Visitante[];
};

const getEstadoLabel = (estado?: number) => {
  if (estado === 2) return { label: "Aprobada", color: "success" as const };
  if (estado === 3) return { label: "Rechazada", color: "error" as const };
  if (estado === 4) return { label: "Parcial", color: "warning" as const };
  return { label: "Pendiente", color: "warning" as const };
};

const getEstadoVisitante = (estado?: number) => {
  if (estado === 2) return { label: "Verificado", color: "success.main" };
  return { label: "No verificado", color: "error.main" };
};

export default function DetalleContratistasSolicitud() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [datos, setDatos] = useState<Solicitud>({
    fecha_visita: "",
    comentario: "",
    estado: 1,
    items: [],
    visitantes: [],
  });
  const [items, setItems] = useState<Item[]>([]);
  const [expandedVisitanteId, setExpandedVisitanteId] = useState<string | false>(false);
  const config = useSelector(selectCurrentData);
  const docsCfg = useMemo(() => getDocumentosConfig(config, "visitantes"), [config]);
  const enabledDocKeys = useMemo(() => docsCfg.required.map((d) => d.key).concat(docsCfg.optional.map((d) => d.key)), [docsCfg]);
  const isAprobarMode = new URLSearchParams(location.search).get("modo") === "aprobar";

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/contratistas-solicitudes/${id}`);
        if (res.data.estado) {
          setDatos(res.data.datos);
          setItems(res.data.datos.items || []);
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      }
    };
    obtenerRegistro();
  }, [id, navigate]);

  const estadoSolicitud = getEstadoLabel(datos.estado);

  const mapItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        visitante: datos.visitantes.find((v) => v._id === item.id_visitante),
      })),
    [items, datos.visitantes]
  );

  const regresar = () => {
    navigate(`/contratistas/solicitudes`);
  };

  const aprobarSolicitud = async () => {
    try {
      setIsSaving(true);
      const payload = items.map((item) => ({
        ...item,
        estado: 2,
        motivo: "",
      }));
      const res = await clienteAxios.post(`/api/contratistas-solicitudes/${id}/revisar`, {
        items: payload,
      });
      if (res.data.estado) {
        enqueueSnackbar("Solicitud aprobada.", { variant: "success" });
        navigate("/contratistas/solicitudes");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      handlingError(error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Box
        component="section"
        sx={{
          minHeight: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          py: 2,
        }}
      >
        <Card elevation={5} sx={{ width: "100%" }}>
          <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <Typography variant="h4" component="h2" textAlign="center">
              Solicitud
            </Typography>
            {!isLoading && (
              <Chip
                label={estadoSolicitud.label}
                color={estadoSolicitud.color}
                size="small"
                sx={{
                  minWidth: 130,
                  height: 24,
                  justifyContent: "center",
                  "& .MuiChip-label": {
                    px: 1.5,
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: 12,
                    textAlign: "center",
                  },
                }}
              />
            )}
          </Box>
          {isLoading ? (
            <Spinner />
          ) : (
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
                <strong>Datos de la visita</strong>
              </Typography>
              <Box sx={{ display: "grid", gap: 1.5, mb: 3 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 1 }}>
                  <strong>Fecha de visita:</strong>
                  <span>{dayjs(datos.fecha_visita).format("DD/MM/YYYY")}</span>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 1 }}>
                  <strong>Razon de visita:</strong>
                  <span>{datos.comentario || "-"}</span>
                </Box>
              </Box>
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
                <strong>Visitantes</strong>
              </Typography>
              {mapItems.map((item) => {
                const visitante = item.visitante as Visitante | undefined;
                const checks = visitante?.documentos_checks || {};
                const archivos = visitante?.documentos_archivos || {};
                const estadoVisitante = getEstadoVisitante(visitante?.estado_validacion);
                return (
                  <Accordion
                    key={item.id_visitante}
                    disableGutters
                    expanded={expandedVisitanteId === item.id_visitante}
                    onChange={(_, isExpanded) =>
                      setExpandedVisitanteId(isExpanded ? item.id_visitante : false)
                    }
                    sx={{ mb: 1.5 }}
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
                        <Typography>
                          {visitante
                            ? `${visitante.nombre} ${visitante.apellido_pat} ${visitante.apellido_mat || ""} (${visitante.correo})`
                            : item.id_visitante}
                        </Typography>
                        <Chip
                          label={estadoVisitante.label}
                          size="small"
                          sx={{
                            minWidth: 120,
                            height: 24,
                            justifyContent: "center",
                            "& .MuiChip-label": {
                              px: 1.5,
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: 12,
                              textAlign: "center",
                            },
                            bgcolor: estadoVisitante.color,
                          }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {enabledDocKeys.map((key) => {
                        const tieneArchivo = Boolean(archivos?.[key]);
                        const check = checks?.[key];
                        const estadoDoc =
                          check === true
                            ? { label: "OK", color: "success.main" }
                            : check === false
                              ? { label: "Pendiente de revision", color: "error.main" }
                              : tieneArchivo
                                ? { label: "OK", color: "success.main" }
                                : { label: "-", color: "text.secondary" };
                        return (
                          <Box
                            key={`${item.id_visitante}-${key}`}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              border: "1px solid #e0e0e0",
                              borderRadius: 1,
                              px: 2,
                              py: 1,
                              mb: 1,
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
                        );
                      })}
                      {item.motivo && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Motivo:</strong> {item.motivo}
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>
                );
              })}
            </Box>
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
              >
                <ChevronLeft /> Regresar
              </Button>
              {isAprobarMode && (
                <Button
                  type="button"
                  size="medium"
                  variant="contained"
                  onClick={aprobarSolicitud}
                  disabled={isSaving}
                  startIcon={<Verified />}
                >
                  Aprobar visita
                </Button>
              )}
            </Stack>
          </Box>
          </CardContent>
        </Card>
      </Box>
    </ModalContainer>
  );
}




