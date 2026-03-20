import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { ChevronLeft } from "@mui/icons-material";
import ModalContainer from "../../utils/ModalContainer";
import Spinner from "../../utils/Spinner";
import { enqueueSnackbar } from "notistack";
import dayjs from "dayjs";

type Visitante = {
  _id: string;
  nombre: string;
  apellido_pat: string;
  apellido_mat?: string;
  correo: string;
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

export default function DetallePortalSolicitud() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [datos, setDatos] = useState<Solicitud>({
    fecha_visita: "",
    comentario: "",
    estado: 1,
    items: [],
    visitantes: [],
  });

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/contratistas-solicitudes/${id}`);
        if (res.data.estado) {
          setDatos(res.data.datos);
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

  const regresar = () => {
    navigate(`/portal-contratistas/solicitudes`);
  };

  const estadoSolicitud = getEstadoLabel(datos.estado);

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
                  <strong>Razón de visita:</strong>
                  <span>{datos.comentario || "-"}</span>
                </Box>
              </Box>
              {datos.estado === 3 && (
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
                  <Typography sx={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 1 }}>
                    <strong>Motivo:</strong>
                    <span>-</span>
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
                <strong>Visitantes</strong>
              </Typography>
              {datos.items.map((item) => {
                const visitante = datos.visitantes.find(
                  (v) => v._id === item.id_visitante
                );
                const estadoItem = getEstadoLabel(item.estado);
                return (
                  <Box
                    key={item.id_visitante}
                    sx={{
                      p: 1.5,
                      border: "1px solid #e0e0e0",
                      borderRadius: 1.5,
                      mb: 1.5,
                      display: "grid",
                      gap: 0.75,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                      }}
                    >
                      <Typography>
                        {visitante
                          ? `${visitante.nombre} ${visitante.apellido_pat} ${visitante.apellido_mat || ""}`
                          : item.id_visitante}
                      </Typography>
                      <Chip
                        label={estadoItem.label}
                        color={estadoItem.color}
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
                        }}
                      />
                    </Box>
                    {item.motivo && (
                      <Typography variant="body2">
                        <strong>Motivo:</strong> {item.motivo}
                      </Typography>
                    )}
                  </Box>
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
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </ModalContainer>
  );
}
