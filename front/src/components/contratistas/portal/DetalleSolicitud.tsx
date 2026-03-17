import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
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
      <Card elevation={5}>
        <CardContent>
          <Typography variant="h5" component="h5" textAlign="center">
            Solicitud{" "}
            {!isLoading && (
              <Chip label={estadoSolicitud.label} color={estadoSolicitud.color} />
            )}
          </Typography>
          {isLoading ? (
            <Spinner />
          ) : (
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid size={12}>
                <Typography>
                  <strong>Fecha de visita:</strong>{" "}
                  {dayjs(datos.fecha_visita).format("DD/MM/YYYY")}
                </Typography>
              </Grid>
              <Grid size={12}>
                <Typography>
                  <strong>Comentario:</strong> {datos.comentario || "-"}
                </Typography>
              </Grid>
              <Grid size={12}>
                <Typography variant="h6" component="h6">
                  Visitantes
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
                        p: 1,
                        border: "1px solid #ddd",
                        borderRadius: 1,
                        mb: 1,
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
                        sx={{ mt: 1 }}
                      />
                      {item.motivo && (
                        <Typography sx={{ mt: 1 }}>
                          <strong>Motivo:</strong> {item.motivo}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Grid>
            </Grid>
          )}
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
    </ModalContainer>
  );
}
