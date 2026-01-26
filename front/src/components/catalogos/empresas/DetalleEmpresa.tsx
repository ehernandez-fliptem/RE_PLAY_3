import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  List,
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
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";

type IAcceso = {
  identificador: string;
  nombre: string;
};

type IPiso = {
  identificador: string;
  nombre: string;
};

type IContacto = {
  numero: string;
  extension?: string[];
};

type TPuestos = {
  _id?: string;
  identificador: string;
  nombre?: string;
};

type TDepartamentos = {
  _id?: string;
  identificador: string;
  nombre?: string;
};

type TCubiculos = {
  _id?: string;
  identificador: string;
  nombre?: string;
};

type TEmpresa = {
  img_empresa: string;
  nombre: string;
  rfc: string;
  esRoot: boolean;
  telefonos: IContacto[];
  pisos: IPiso[];
  accesos: IAcceso[];
  puestos: TPuestos[];
  departamentos: TDepartamentos[];
  cubiculos: TCubiculos[];
  documentos: number[];
  fecha_creacion: Date | string;
  creado_por: string;
  fecha_modificacion: Date | string;
  modificado_por: string;
  activo: boolean;
};

export default function DetalleEmpresa() {
  const { id } = useParams();
  const { tipos_documentos } = useSelector(
    (state: IRootState) => state.config.data
  );
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [datos, setDatos] = useState<TEmpresa>({
    img_empresa: "",
    nombre: "",
    rfc: "",
    esRoot: false,
    telefonos: [],
    pisos: [],
    accesos: [],
    puestos: [],
    departamentos: [],
    cubiculos: [],
    documentos: [],
    fecha_creacion: new Date(),
    creado_por: "",
    fecha_modificacion: new Date(),
    modificado_por: "",
    activo: false,
  });
  const {
    img_empresa,
    nombre,
    rfc,
    esRoot,
    telefonos,
    pisos,
    accesos,
    puestos,
    departamentos,
    cubiculos,
    documentos,
    fecha_creacion,
    creado_por,
    fecha_modificacion,
    modificado_por,
    activo,
  } = datos;

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`api/empresas/${id}`);
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
    navigate(`/empresas`);
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5}>
        <CardContent>
          <Typography variant="h5" component="h5" textAlign="center">
            Empresa{" - "}
            {!isLoading && (
              <>
                {esRoot ? (
                  <Chip label="Maestra" color="primary" />
                ) : (
                  <>
                    {activo ? (
                      <Chip label="Activo" color="success" />
                    ) : (
                      <Chip label="Inactivo" color="error" />
                    )}
                  </>
                )}
              </>
            )}
          </Typography>
          {isLoading ? (
            <Spinner />
          ) : (
            <Grid container spacing={2}>
              <Grid
                size={12}
                display="flex"
                justifyContent="center"
                alignItems="center"
              >
                <Avatar
                  variant="square"
                  src={img_empresa}
                  sx={{
                    width: 150,
                    height: 150,
                    my: 2,
                  }}
                  slotProps={{
                    img: {
                      style: {
                        objectFit: "contain",
                      },
                    },
                  }}
                />
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
                  <strong>Generales</strong>
                </Typography>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Nombre:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {nombre}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>RFC:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {rfc}
                  </Grid>
                </Grid>
                {telefonos[0] && (
                  <Box component="div" sx={{ my: 2 }}>
                    <Typography variant="subtitle1" component="p">
                      <strong>Teléfono(s): </strong>
                    </Typography>
                    {telefonos.map((item) => (
                      <List
                        key={item.numero}
                        dense
                        disablePadding
                        sx={{ maxHeight: 250, overflowY: "auto" }}
                      >
                        <ListItem sx={{ py: 0 }}>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle1" component="p">
                                <strong>{item.numero} </strong>
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" component="p">
                                {`Ext: ${item.extension}`}
                              </Typography>
                            }
                          />
                        </ListItem>
                      </List>
                    ))}
                  </Box>
                )}
                {pisos[0] && (
                  <Box component="div" sx={{ my: 2 }}>
                    <Typography variant="subtitle1" component="p">
                      <strong>Piso(s): </strong>
                    </Typography>
                    <Grid
                      container
                      spacing={2}
                      sx={{ my: 0, maxHeight: 250, overflowY: "auto" }}
                    >
                      {pisos.map((item) => (
                        <Grid size="grow" key={item.identificador}>
                          <ListItem sx={{ py: 0 }}>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle1" component="p">
                                  <strong>{item.identificador} </strong>
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" component="p">
                                  {item.nombre}
                                </Typography>
                              }
                            />
                          </ListItem>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
                {accesos[0] && (
                  <Box component="div" sx={{ my: 2 }}>
                    <Typography variant="subtitle1" component="p">
                      <strong>Acceso(s): </strong>
                    </Typography>
                    <Grid
                      container
                      spacing={2}
                      sx={{ my: 0, maxHeight: 250, overflowY: "auto" }}
                    >
                      {accesos.map((item) => (
                        <Grid size="grow" key={item.identificador}>
                          <ListItem sx={{ py: 0 }}>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle1" component="p">
                                  <strong>{item.identificador} </strong>
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" component="p">
                                  {item.nombre}
                                </Typography>
                              }
                            />
                          </ListItem>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
                {puestos[0] && (
                  <Box component="div" sx={{ my: 2 }}>
                    <Typography variant="subtitle1" component="p">
                      <strong>Puesto(s): </strong>
                    </Typography>
                    <Grid
                      container
                      spacing={2}
                      sx={{ my: 0, maxHeight: 250, overflowY: "auto" }}
                    >
                      {puestos.map((item) => (
                        <Grid size="grow" key={item.identificador}>
                          <ListItem sx={{ py: 0 }}>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle1" component="p">
                                  <strong>{item.identificador} </strong>
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" component="p">
                                  {item.nombre}
                                </Typography>
                              }
                            />
                          </ListItem>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
                {departamentos[0] && (
                  <Box component="div" sx={{ my: 2 }}>
                    <Typography variant="subtitle1" component="p">
                      <strong>Departamentos(s): </strong>
                    </Typography>
                    <Grid
                      container
                      spacing={2}
                      sx={{ my: 0, maxHeight: 250, overflowY: "auto" }}
                    >
                      {departamentos.map((item) => (
                        <Grid size="grow" key={item.identificador}>
                          <ListItem sx={{ py: 0 }}>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle1" component="p">
                                  <strong>{item.identificador} </strong>
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" component="p">
                                  {item.nombre}
                                </Typography>
                              }
                            />
                          </ListItem>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
                {cubiculos[0] && (
                  <Box component="div" sx={{ my: 2 }}>
                    <Typography variant="subtitle1" component="p">
                      <strong>Cubiculos(s): </strong>
                    </Typography>
                    <Grid
                      container
                      spacing={2}
                      sx={{ my: 0, maxHeight: 250, overflowY: "auto" }}
                    >
                      {cubiculos.map((item) => (
                        <Grid size="grow" key={item.identificador}>
                          <ListItem sx={{ py: 0 }}>
                            <ListItemText
                              primary={
                                <Typography variant="subtitle1" component="p">
                                  <strong>{item.identificador} </strong>
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" component="p">
                                  {item.nombre}
                                </Typography>
                              }
                            />
                          </ListItem>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Documentos:</strong>
                  </Grid>
                  <Grid
                    container
                    spacing={2}
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {documentos.map((item) => (
                      <Grid key={item} size="auto">
                        <Chip
                          label={tipos_documentos[item].nombre}
                          size="small"
                          sx={(theme) => ({
                            bgcolor: tipos_documentos[item].color || "#C4C4C4",
                            color: theme.palette.getContrastText(
                              tipos_documentos[item].color || "secondary.main"
                            ),
                          })}
                        />
                      </Grid>
                    ))}
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
