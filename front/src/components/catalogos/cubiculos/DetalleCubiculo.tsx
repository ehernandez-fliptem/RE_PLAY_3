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
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { ChevronLeft } from "@mui/icons-material";
import ModalContainer from "../../utils/ModalContainer";
import Spinner from "../../utils/Spinner";
import { enqueueSnackbar } from "notistack";
import dayjs from "dayjs";

type Empresa = {
  rfc: string;
  nombre: string;
};

type TCubiculo = {
  identificador: string;
  nombre: string;
  empresas: Empresa[];
  fecha_creacion: Date | string;
  creado_por: string;
  fecha_modificacion: Date | string;
  modificado_por: string;
  activo: boolean;
};

export default function DetalleCubiculo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [datos, setDatos] = useState<TCubiculo>({
    identificador: "",
    nombre: "",
    empresas: [],
    fecha_creacion: new Date(),
    creado_por: "",
    fecha_modificacion: new Date(),
    modificado_por: "",
    activo: false,
  });
  const {
    identificador,
    nombre,
    empresas,
    fecha_creacion,
    creado_por,
    fecha_modificacion,
    modificado_por,
    activo,
  } = datos;

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`api/cubiculos/${id}`);
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
    navigate(`/cubiculos`);
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5}>
        <CardContent>
          <Typography variant="h5" component="h5" textAlign="center">
            Cubiculo{" - "}
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
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "35%" } }}>
                    <strong>Identificador:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {identificador}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "35%" } }}>
                    <strong>Nombre:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {nombre}
                  </Grid>
                </Grid>
                {empresas[0] && (
                  <Box component="div" sx={{ my: 2 }}>
                    <Typography variant="subtitle1" component="p">
                      <strong>Empresa(s): </strong>
                    </Typography>
                    <Grid
                      container
                      spacing={0}
                      sx={{ my: 0, maxHeight: 250, overflowY: "auto" }}
                    >
                      {empresas.map((item) => (
                        <Grid size={12} key={item.nombre}>
                          <ListItem sx={{ py: 0 }}>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle1" component="p">
                                  <strong>{item.nombre} </strong>
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" component="p">
                                  {item.rfc}
                                </Typography>
                              }
                            />
                          </ListItem>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
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
                      {dayjs(fecha_modificacion).format("DD/MM/YYYY, HH:mm:ss a")}
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
