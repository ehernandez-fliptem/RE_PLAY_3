import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ChevronLeft, Save } from "@mui/icons-material";
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

export default function DetalleContratistasSolicitud() {
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
  const [items, setItems] = useState<Item[]>([]);

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

  const actualizarItem = (id_visitante: string, patch: Partial<Item>) => {
    setItems((prev) =>
      prev.map((i) => (i.id_visitante === id_visitante ? { ...i, ...patch } : i))
    );
  };

  const aprobarTodos = () => {
    setItems((prev) => prev.map((i) => ({ ...i, estado: 2, motivo: "" })));
  };

  const rechazarTodos = () => {
    setItems((prev) => prev.map((i) => ({ ...i, estado: 3 })));
  };

  const guardar = async () => {
    try {
      const res = await clienteAxios.post(`/api/contratistas-solicitudes/${id}/revisar`, {
        items,
      });
      if (res.data.estado) {
        enqueueSnackbar("Revisión guardada.", { variant: "success" });
        navigate("/contratistas/solicitudes");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      handlingError(error);
    }
  };

  const regresar = () => {
    navigate(`/contratistas/solicitudes`);
  };

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
            <>
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
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Button variant="outlined" onClick={aprobarTodos}>
                  Aprobar todos
                </Button>
                <Button variant="outlined" color="error" onClick={rechazarTodos}>
                  Rechazar todos
                </Button>
              </Stack>
              {mapItems.map((item) => (
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
                    {item.visitante
                      ? `${item.visitante.nombre} ${item.visitante.apellido_pat} ${item.visitante.apellido_mat || ""} (${item.visitante.correo})`
                      : item.id_visitante}
                  </Typography>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12, sm: 4 }}>
                      <FormControl fullWidth>
                        <InputLabel>Estado</InputLabel>
                        <Select
                          label="Estado"
                          value={item.estado}
                          onChange={(e) =>
                            actualizarItem(item.id_visitante, {
                              estado: Number(e.target.value),
                            })
                          }
                        >
                          <MenuItem value={2}>Aprobado</MenuItem>
                          <MenuItem value={3}>Rechazado</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 8 }}>
                      <TextField
                        label="Motivo (si rechazo)"
                        value={item.motivo || ""}
                        onChange={(e) =>
                          actualizarItem(item.id_visitante, {
                            motivo: e.target.value,
                          })
                        }
                        fullWidth
                      />
                    </Grid>
                    {item.visitante && (item.visitante as any).documentos_checks && (
                      <Grid size={12}>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          <strong>Docs:</strong>{" "}
                          {Object.entries((item.visitante as any).documentos_checks)
                            .filter(([, v]) => Boolean(v))
                            .map(([k]) => k.replace(/_/g, " "))
                            .join(", ") || "-"}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              ))}
            </>
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
              <Button type="button" size="medium" variant="contained" onClick={guardar}>
                <Save /> Guardar revisión
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </ModalContainer>
  );
}
