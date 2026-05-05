import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { clienteAxios, handlingError } from "../../../app/config/axios";
import dayjs from "dayjs";

type TDispositivoSuprema = {
  nombre: string;
  usuario: string;
  direccion_ip: string;
  puerto: number;
  fecha_creacion?: Date | string;
  creado_por?: string;
  fecha_modificacion?: Date | string;
  modificado_por?: string;
  activo: boolean;
};

export default function DetalleDispositivoBiostar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [datos, setDatos] = useState<TDispositivoSuprema>({
    nombre: "",
    usuario: "",
    direccion_ip: "",
    puerto: 443,
    fecha_creacion: "",
    creado_por: "",
    fecha_modificacion: "",
    modificado_por: "",
    activo: false,
  });

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`/api/dispositivos-biostar/${id}`);
        if (res.data.estado) {
          setDatos(res.data.datos);
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje || "No se pudo obtener el dispositivo.", {
            variant: "warning",
          });
        }
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      }
    };
    obtenerRegistro();
  }, [id, navigate]);

  const regresar = () => {
    navigate("/biostarar/dispositivos");
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5}>
        <CardContent>
          <Typography variant="h5" component="h5" textAlign="center" mb={2}>
            Dispositivo{" - "}
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
            <Grid container spacing={2}>
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
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Nombre:</strong>
                  </Grid>
                  <Grid size={{ xs: 12, sm: "grow" }} sx={{ ml: { xs: 2, sm: 0 } }}>
                    {datos.nombre}
                  </Grid>
                </Grid>

                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Direccion IP:</strong>
                  </Grid>
                  <Grid size={{ xs: 12, sm: "grow" }} sx={{ ml: { xs: 2, sm: 0 } }}>
                    {datos.direccion_ip}
                  </Grid>
                </Grid>

                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Puerto:</strong>
                  </Grid>
                  <Grid size={{ xs: 12, sm: "grow" }} sx={{ ml: { xs: 2, sm: 0 } }}>
                    {datos.puerto}
                  </Grid>
                </Grid>

                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Usuario:</strong>
                  </Grid>
                  <Grid size={{ xs: 12, sm: "grow" }} sx={{ ml: { xs: 2, sm: 0 } }}>
                    {datos.usuario}
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
                  <b>Sistema</b>
                </Typography>

                {datos.fecha_creacion && (
                  <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                    <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                      <strong>Creado el:</strong>
                    </Grid>
                    <Grid size={{ xs: 12, sm: "grow" }} sx={{ ml: { xs: 2, sm: 0 } }}>
                      {dayjs(datos.fecha_creacion).format("DD/MM/YYYY, HH:mm:ss a")}
                      <br />
                      <small>
                        <strong>
                          {" hace "}
                          {dayjs(datos.fecha_creacion).fromNow(true)}
                          {" aprox."}
                        </strong>
                      </small>
                    </Grid>
                  </Grid>
                )}

                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Creado por:</strong>
                  </Grid>
                  <Grid size={{ xs: 12, sm: "grow" }} sx={{ ml: { xs: 2, sm: 0 } }}>
                    {datos.creado_por ? datos.creado_por : "Sistema"}
                  </Grid>
                </Grid>

                {datos.fecha_modificacion && (
                  <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                    <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                      <strong>Modificado el:</strong>
                    </Grid>
                    <Grid size={{ xs: 12, sm: "grow" }} sx={{ ml: { xs: 2, sm: 0 } }}>
                      {dayjs(datos.fecha_modificacion).format("DD/MM/YYYY, HH:mm:ss a")}
                      <br />
                      <small>
                        <strong>
                          {" hace "}
                          {dayjs(datos.fecha_modificacion).fromNow(true)}
                          {" aprox."}
                        </strong>
                      </small>
                    </Grid>
                  </Grid>
                )}

                {datos.modificado_por && (
                  <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                    <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                      <strong>Modificado por:</strong>
                    </Grid>
                    <Grid size={{ xs: 12, sm: "grow" }} sx={{ ml: { xs: 2, sm: 0 } }}>
                      {datos.modificado_por}
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
          )}

          <Box component="footer" sx={{ display: "flex", justifyContent: "end" }}>
            <Stack
              spacing={2}
              direction={{ xs: "column-reverse", sm: "row" }}
              justifyContent="end"
              sx={{ width: "100%" }}
            >
              <Button
                sx={{ width: { xs: "100%", sm: "auto" } }}
                type="button"
                size="medium"
                variant="contained"
                color="secondary"
                onClick={regresar}
                startIcon={<ChevronLeft />}
              >
                Regresar
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </ModalContainer>
  );
}
