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

type TPase = {
  codigo: string;
  fabricante?: string;
  modelo?: string;
  tipo?: string;
  empresa: string;
  fecha_creacion: Date | string;
  creado_por: string;
  fecha_modificacion: Date | string;
  modificado_por: string;
  activo: boolean;
};

export default function DetallePase() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [datos, setDatos] = useState<TPase>({
    codigo: "",
    fabricante: "",
    modelo: "",
    tipo: "",
    empresa: "",
    fecha_creacion: new Date(),
    creado_por: "",
    fecha_modificacion: new Date(),
    modificado_por: "",
    activo: false,
  });
  const {
    codigo,
    fabricante,
    modelo,
    tipo,
    empresa,
    fecha_creacion,
    creado_por,
    fecha_modificacion,
    modificado_por,
    activo,
  } = datos;

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`api/pases/${id}`);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const regresar = () => {
    navigate(`/pases`);
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5}>
        <CardContent>
          <Typography variant="h5" component="h5" textAlign="center">
            Pase{" - "}
            {!isLoading && (
              <>
                {activo ? (
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
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Código:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {codigo}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Fabricante:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {fabricante ? fabricante : "No definido"}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Modelo:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {modelo ? modelo : "No definido"}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Tipo:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {tipo ? tipo : "No definido"}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Empresa:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {empresa}
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
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Creado el:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {dayjs(fecha_creacion).format("DD/MM/YYYY, HH:mm:ss a")}
                    <br />
                    <small>
                      <strong>
                        {" hace "}
                        {dayjs(fecha_creacion).fromNow(true)}
                        {" aprox."}
                      </strong>
                    </small>
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Creado por:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {creado_por ? creado_por : "Sistema"}
                  </Grid>
                </Grid>
                {fecha_modificacion && (
                  <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                    <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                      <strong>Modificado el:</strong>
                    </Grid>
                    <Grid
                      size={{ xs: 12, sm: "grow" }}
                      sx={{ ml: { xs: 2, sm: 0 } }}
                    >
                      {dayjs(fecha_modificacion).format(
                        "DD/MM/YYYY, HH:mm:ss a"
                      )}
                      <br />
                      <small>
                        <strong>
                          {" hace "}
                          {dayjs(fecha_modificacion).fromNow(true)}
                          {" aprox."}
                        </strong>
                      </small>
                    </Grid>
                  </Grid>
                )}
                {modificado_por && (
                  <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                    <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                      <strong>Modificado por:</strong>
                    </Grid>
                    <Grid
                      size={{ xs: 12, sm: "grow" }}
                      sx={{ ml: { xs: 2, sm: 0 } }}
                    >
                      {modificado_por}
                    </Grid>
                  </Grid>
                )}
              </Grid>
            </Grid>
          )}
          <Box
            component="footer"
            sx={{
              display: "flex",
              justifyContent: "end",
            }}
          >
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
