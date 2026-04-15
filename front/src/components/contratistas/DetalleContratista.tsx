import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../app/config/axios";
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
import { ChevronLeft, MarkEmailRead } from "@mui/icons-material";
import ModalContainer from "../utils/ModalContainer";
import Spinner from "../utils/Spinner";
import { enqueueSnackbar } from "notistack";
import dayjs from "dayjs";

type TUsuario = {
  nombre?: string;
  nombre_completo?: string;
  correo?: string;
  apellido_pat?: string;
  apellido_mat?: string;
};

type TContratista = {
  empresa: string;
  correos: string[];
  telefono?: string;
  usuario?: TUsuario;
  fecha_creacion?: Date | string;
  fecha_modificacion?: Date | string;
  activo: boolean;
};

export default function DetalleContratista() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isResending, setIsResending] = useState(false);
  const [datos, setDatos] = useState<TContratista>({
    empresa: "",
    correos: [],
    telefono: "",
    usuario: {},
    fecha_creacion: new Date(),
    fecha_modificacion: new Date(),
    activo: false,
  });

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`api/contratistas/${id}`);
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
    navigate(`/contratistas`);
  };

  const reenviarCorreo = async () => {
    if (!id || isResending) return;
    setIsResending(true);
    try {
      const res = await clienteAxios.patch(`api/contratistas/reenviar/${id}`);
      if (res.data.estado) {
        enqueueSnackbar("Correo de acceso reenviado correctamente.", {
          variant: "success",
        });
      } else {
        enqueueSnackbar(
          res.data.mensaje || "No se pudo reenviar el correo de acceso.",
          { variant: "warning" }
        );
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5}>
        <CardContent>
          <Typography variant="h5" component="h5" textAlign="center">
            Contratista{" - "}
            {!isLoading && (
              <>
                {datos.activo ? (
                  <Chip label="Activo" color="success" />
                ) : (
                  <Chip label="Inactivo" color="error" />
                )}
              </>
            )}
          </Typography>
          {isLoading ? (
            <Spinner />
          ) : (
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid size={{ xs: 12, sm: 6 }} width={"100%"}>
                <Typography
                  variant="h6"
                  component="h6"
                  color="primary"
                  bgcolor="#FFFFFF"
                  sx={(theme) => ({
                    border: `1px solid ${theme.palette.primary.main}`,
                    borderRadius: 2,
                  })}
                  textAlign="center"
                  mb={2}
                >
                  <strong>Generales</strong>
                </Typography>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "35%" } }}>
                    <strong>Empresa:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {datos.empresa}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "35%" } }}>
                    <strong>Telefono:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {datos.telefono || "-"}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "35%" } }}>
                    <strong>Correos:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {Array.isArray(datos.correos) && datos.correos.length > 0
                      ? datos.correos.join(", ")
                      : "-"}
                  </Grid>
                </Grid>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} width={"100%"}>
                <Typography
                  variant="h6"
                  component="h6"
                  color="primary"
                  bgcolor="#FFFFFF"
                  sx={(theme) => ({
                    border: `1px solid ${theme.palette.primary.main}`,
                    borderRadius: 2,
                  })}
                  textAlign="center"
                  mb={2}
                >
                  <strong>Usuario Manager</strong>
                </Typography>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "35%" } }}>
                    <strong>Nombre:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {datos.usuario?.nombre || "-"}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "35%" } }}>
                    <strong>Nombre completo:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {datos.usuario?.nombre_completo ||
                      [datos.usuario?.nombre, datos.usuario?.apellido_pat, datos.usuario?.apellido_mat]
                        .filter(Boolean)
                        .join(" ") ||
                      "-"}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "35%" } }}>
                    <strong>Correo:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {datos.usuario?.correo || "-"}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "35%" } }}>
                    <strong>Creacion:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {datos.fecha_creacion
                      ? dayjs(datos.fecha_creacion).format("DD/MM/YYYY HH:mm")
                      : "-"}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "35%" } }}>
                    <strong>Modificacion:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {datos.fecha_modificacion
                      ? dayjs(datos.fecha_modificacion).format("DD/MM/YYYY HH:mm")
                      : "-"}
                  </Grid>
                </Grid>
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
                onClick={reenviarCorreo}
                disabled={isLoading || isResending || !datos.usuario?.correo}
              >
                <MarkEmailRead /> Reenviar correo
              </Button>
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
