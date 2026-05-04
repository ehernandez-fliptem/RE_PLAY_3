import { useEffect, useState } from "react";
import { Box, Button, Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { useNavigate, useParams } from "react-router-dom";
import ModalContainer from "../../utils/ModalContainer";
import Spinner from "../../utils/Spinner";
import { clienteAxios, handlingError } from "../../../app/config/axios";

type Detalle = {
  nombre: string;
  direccion_ip: string;
  puerto: number;
  usuario: string;
  activo: boolean;
  fecha_creacion?: string;
  fecha_modificacion?: string;
  creado_por?: string;
  modificado_por?: string;
};

export default function DetalleDispositivoBiostar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [detalle, setDetalle] = useState<Detalle | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await clienteAxios.get(`/api/dispositivos-biostar/${id}`);
        if (res.data.estado) {
          setDetalle(res.data.datos);
        }
      } catch (error) {
        handlingError(error);
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [id]);

  return (
    <ModalContainer containerProps={{ maxWidth: "sm" }}>
      <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
        Detalle Dispositivo BioStar
      </Typography>
      {isLoading ? (
        <Spinner />
      ) : (
        <Card elevation={0}>
          <CardContent>
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}><Typography variant="body2"><strong>Nombre:</strong> {detalle?.nombre || "-"}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 8 }}><Typography variant="body2"><strong>IP:</strong> {detalle?.direccion_ip || "-"}</Typography></Grid>
                <Grid size={{ xs: 12, sm: 4 }}><Typography variant="body2"><strong>Puerto:</strong> {detalle?.puerto || "-"}</Typography></Grid>
                <Grid size={{ xs: 12 }}><Typography variant="body2"><strong>Usuario:</strong> {detalle?.usuario || "-"}</Typography></Grid>
                <Grid size={{ xs: 12 }}><Typography variant="body2"><strong>Activo:</strong> {detalle?.activo ? "Si" : "No"}</Typography></Grid>
              </Grid>
              <Box display="flex" justifyContent="end">
                <Button startIcon={<ArrowBack />} onClick={() => navigate("/dispositivos-biostar")}>Regresar</Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </ModalContainer>
  );
}
