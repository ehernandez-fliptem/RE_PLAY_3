import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { clienteAxios } from "../../app/config/axios";
import type { Capacitacion } from "./types";
import TrainingPublicView from "./TrainingPublicView";

export default function CapacitacionPublica() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [capacitacion, setCapacitacion] = useState<Capacitacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await clienteAxios.get(`/api/capacitaciones/publica/${slug}`);
        if (res.data?.estado) {
          setCapacitacion(res.data.datos);
          return;
        }
        setError(res.data?.mensaje || "Esta capacitacion no esta disponible.");
      } catch (error: any) {
        if (error?.response?.data?.codigo === "CAPACITACION_PUBLICA_DESACTIVADA") {
          navigate("/", { replace: true });
          return;
        }
        setError(error?.response?.data?.mensaje || "Esta capacitacion no esta disponible.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate, slug]);

  useEffect(() => {
    if (!capacitacion?.titulo) return;
    const previousTitle = document.title;
    document.title = capacitacion.titulo;
    return () => {
      document.title = previousTitle;
    };
  }, [capacitacion?.titulo]);

  const registrarResultado = async (payload: any) => {
    if (!capacitacion?._id) return;
    await clienteAxios.post(`/api/capacitaciones/publica/${capacitacion._id}/resultados`, payload);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", bgcolor: "#f6f4fb" }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography>Cargando capacitacion...</Typography>
        </Stack>
      </Box>
    );
  }

  if (error || !capacitacion) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", bgcolor: "#f6f4fb", p: 2 }}>
        <Stack spacing={2} sx={{ width: "min(560px, 100%)" }}>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            {error || "Esta capacitacion no esta disponible."}
          </Alert>
          <Button variant="contained" onClick={() => navigate("/", { replace: true })}>
            Ir al login
          </Button>
        </Stack>
      </Box>
    );
  }

  return <TrainingPublicView capacitacion={capacitacion} onFinish={registrarResultado} />;
}
