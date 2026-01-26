import { Fragment, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../../app/config/axios";
import {
  alpha,
  AppBar,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  lighten,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tab,
  Tabs,
  tabsClasses,
  Typography,
  useTheme,
  type SxProps,
  type Theme,
} from "@mui/material";
import {
  AccountCircle,
  CameraAlt,
  Close,
  EventNote,
  LibraryBooks,
  PhoneAndroid,
  QrCodeScanner,
  Settings,
  VerifiedUser,
  VideoLabel,
  Visibility,
} from "@mui/icons-material";
import ModalContainer from "../../../utils/ModalContainer";
import Spinner from "../../../utils/Spinner";
import { enqueueSnackbar } from "notistack";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../../app/store";
import DocViewer from "../../../utils/DocViewer";

const DISPOS_ICONS = {
  1: <Settings color="inherit" />,
  2: <QrCodeScanner color="inherit" />,
  3: <VideoLabel color="inherit" />,
  4: <PhoneAndroid color="inherit" />,
};

type TDocumento = {
  _id: string;
  tipo: number;
};

type TEstatus = {
  tipo_dispositivo: number;
  tipo_check: number;
  comentario?: string;
  fecha_creacion: Date | string;
  creado_por: string;
  acceso?: string;
};

type TAnfitrion = {
  nombre: string;
  correo: string;
  telefono?: string;
  movil?: string;
  empresa: string;
  piso: string;
};

type TRegistro = {
  codigo: string;
  estatus: TEstatus[];
  tipo_registro: number;
  nombre?: string;
  correo?: string;
  telefono?: string;
  img_usuario?: string;
  tipo_ide?: number;
  img_ide_a?: string;
  img_ide_b?: string;
  numero_ide?: string;
  empresa?: string;
  pase?: string;
  anfitrion?: TAnfitrion;
  actividades?: string;
  fecha_entrada: Date | string;
  fecha_salida?: Date | string;
  comentarios?: string;
  placas?: string;
  desc_vehiculo?: string;
  motivo_cancelacion?: string;
  documentos: TDocumento[];
  fecha_creacion?: Date | string;
  creado_por?: string;
  fecha_modificacion?: Date | string;
  modificado_por?: string;
  activo: boolean;
};

interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  index: number;
  value: number;
  sx?: SxProps<Theme> | undefined;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, sx, ...other } = props;

  return (
    <Box
      component="section"
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      sx={sx}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </Box>
  );
}

function a11yProps(index: number) {
  return {
    id: `full-width-tab-${index}`,
    "aria-controls": `full-width-tabpanel-${index}`,
  };
}

export default function DetalleRegistro() {
  const { id } = useParams();
  const { tipos_eventos, tipos_dispositivos, tipos_documentos } = useSelector(
    (state: IRootState) => state.config.data
  );
  const navigate = useNavigate();
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [doc, setDoc] = useState("");
  const [datos, setDatos] = useState<TRegistro>({
    codigo: "",
    estatus: [],
    tipo_registro: 0,
    nombre: "",
    correo: "",
    telefono: "",
    img_usuario: "",
    tipo_ide: 0,
    img_ide_a: "",
    img_ide_b: "",
    numero_ide: "",
    empresa: "",
    pase: "",
    anfitrion: {
      nombre: "",
      correo: "",
      empresa: "",
      piso: "",
      movil: "",
      telefono: "",
    },
    actividades: "",
    fecha_entrada: new Date(),
    fecha_salida: new Date(),
    comentarios: "",
    placas: "",
    desc_vehiculo: "",
    motivo_cancelacion: "",
    documentos: [],
    fecha_creacion: new Date(),
    creado_por: "",
    fecha_modificacion: new Date(),
    modificado_por: "",
    activo: false,
  });
  const {
    codigo,
    estatus,
    tipo_registro,
    nombre,
    correo,
    telefono,
    img_usuario,
    tipo_ide,
    img_ide_a,
    img_ide_b,
    numero_ide,
    empresa,
    pase,
    anfitrion,
    actividades,
    fecha_entrada,
    fecha_salida,
    comentarios,
    placas,
    desc_vehiculo,
    motivo_cancelacion,
    documentos,
    fecha_creacion,
    creado_por,
    fecha_modificacion,
    modificado_por,
    activo,
  } = datos;

  const TAB_VISIT = [
    {
      label: "Código",
      value: codigo,
    },

    {
      label: "Tipo de registro",
      value: tipo_registro,
    },
    {
      label: "Nombre",
      value: nombre,
    },
    {
      label: "Correo",
      value: correo,
    },
    {
      label: "Teléfono",
      value: telefono,
    },

    {
      label: "Empresa",
      value: empresa,
    },
    {
      label: "Pase",
      value: pase,
    },
    {
      label: "Actividades",
      value: actividades,
    },
    {
      label: "Tipo de identificación",
      value: tipo_ide,
    },
    {
      label: "Número de identificación",
      value: numero_ide,
    },
    {
      label: "Fecha de entrada",
      value: fecha_entrada,
    },
    {
      label: "Fecha de salida",
      value: fecha_salida,
    },
    {
      label: "Comentarios",
      value: comentarios,
    },
    {
      label: "Placas",
      value: placas,
    },
    {
      label: "Descripción de vehículo",
      value: desc_vehiculo,
    },
    {
      label: "Motivo de cancelación",
      value: motivo_cancelacion,
    },
  ];

  const TABS_ANFIT = [
    {
      label: "Nombre",
      value: anfitrion?.nombre,
    },
    {
      label: "Correo",
      value: anfitrion?.correo,
    },
    {
      label: "Teléfono",
      value: anfitrion?.telefono,
    },
    {
      label: "Móvil",
      value: anfitrion?.movil,
    },
    {
      label: "Empresa",
      value: anfitrion?.empresa,
    },
    {
      label: "Piso",
      value: anfitrion?.piso,
    },
  ];

  const [value, setValue] = useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`api/registros/${id}`);
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

  const verDocumento = async (ID: string) => {
    setDoc(ID);
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
  };

  const regresar = () => {
    navigate(`/bitacora`);
  };

  const getContentVisitante = (index: number) => {
    switch (index) {
      case 1:
        return (
          <Grid container spacing={0}>
            <Grid size={{ xs: 12, md: 6 }}>
              {TAB_VISIT.slice(0, 10).map((item, i) => {
                if (item.value) {
                  return (
                    <Grid
                      key={i}
                      container
                      spacing={{ xs: 0, sm: 2 }}
                      sx={{ mt: 2 }}
                    >
                      <Grid
                        size="auto"
                        sx={{ width: { xs: "100%", sm: "30%" } }}
                      >
                        <strong>{item.label}:</strong>
                      </Grid>
                      <Grid
                        size={{ xs: 12, sm: "grow" }}
                        sx={{ ml: { xs: 2, sm: 0 } }}
                      >
                        {String(item.value)}
                      </Grid>
                    </Grid>
                  );
                }
                return null;
              })}
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              {TAB_VISIT.slice(10).map((item, i) => {
                if (item.value) {
                  return (
                    <Grid
                      key={i}
                      container
                      spacing={{ xs: 0, sm: 2 }}
                      sx={{ mt: 2 }}
                    >
                      <Grid
                        size="auto"
                        sx={{ width: { xs: "100%", sm: "30%" } }}
                      >
                        <strong>{item.label}:</strong>
                      </Grid>
                      <Grid
                        size={{ xs: 12, sm: "grow" }}
                        sx={{ ml: { xs: 2, sm: 0 } }}
                      >
                        {typeof item.value !== "boolean" &&
                        dayjs(item.value).isValid()
                          ? dayjs(item.value).format("DD/MM/YYYY, HH:mm a")
                          : String(item.value)}
                      </Grid>
                    </Grid>
                  );
                }
                return null;
              })}
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={0}>
            <Grid size={{ xs: 12, md: 6 }}>
              {TABS_ANFIT.map((item, i) => {
                if (item.value) {
                  return (
                    <Grid
                      key={i}
                      container
                      spacing={{ xs: 0, sm: 2 }}
                      sx={{ mt: 2 }}
                    >
                      <Grid
                        size="auto"
                        sx={{ width: { xs: "100%", sm: "20%" } }}
                      >
                        <strong>{item.label}:</strong>
                      </Grid>
                      <Grid
                        size={{ xs: 12, sm: "auto" }}
                        sx={{ ml: { xs: 2, sm: 0 } }}
                      >
                        {String(item.value)}
                      </Grid>
                    </Grid>
                  );
                }
                return null;
              })}
            </Grid>
          </Grid>
        );
      default:
        return <></>;
    }
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5}>
        <CardContent>
          <Typography
            variant="h5"
            component="h5"
            textAlign="center"
            sx={{ mb: 2 }}
          >
            Detalle del Registro{" - "}
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
            <Fragment>
              <AppBar position="static" color="default">
                <Tabs
                  value={value}
                  onChange={handleChange}
                  variant="scrollable"
                  scrollButtons
                  indicatorColor="primary"
                  allowScrollButtonsMobile
                  textColor="primary"
                  aria-label="scrollable-tabs"
                  slotProps={{
                    list: {
                      sx: {
                        width: "100%",
                        display: "flex",
                        justifyContent: "space-evenly",
                      },
                    },
                  }}
                  sx={{
                    width: "100%",
                    [`& .${tabsClasses.scrollButtons}`]: {
                      "&.Mui-disabled": { opacity: 0.3 },
                    },
                  }}
                >
                  <Tab
                    icon={<CameraAlt />}
                    label="Fotografías"
                    {...a11yProps(0)}
                  />
                  <Tab
                    icon={<AccountCircle />}
                    label="Visitante"
                    {...a11yProps(1)}
                  />
                  <Tab
                    icon={<VerifiedUser />}
                    label="Anfitrión"
                    {...a11yProps(2)}
                  />
                  <Tab icon={<EventNote />} label="Eventos" {...a11yProps(3)} />
                  <Tab
                    icon={<LibraryBooks />}
                    label="Documentos"
                    {...a11yProps(4)}
                  />
                  <Tab icon={<Settings />} label="Sistema" {...a11yProps(5)} />
                </Tabs>
              </AppBar>
              <TabPanel value={value} index={0} dir={theme.direction}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{
                    display: "flex",
                    justifyContent: "space-evenly",
                    alignItems: "center",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="overline"
                      component="h2"
                      textAlign="center"
                    >
                      Visitante
                    </Typography>
                    <Avatar
                      src={img_usuario}
                      sx={{
                        width: 150,
                        height: 150,
                        my: 2,
                      }}
                    />
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="overline"
                      component="h2"
                      textAlign="center"
                    >
                      Identificación Frontal
                    </Typography>
                    <Avatar
                      src={img_ide_a}
                      variant="square"
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
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <Typography
                      variant="overline"
                      component="h2"
                      textAlign="center"
                    >
                      Identificación Reverso
                    </Typography>
                    <Avatar
                      src={img_ide_b}
                      variant="square"
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
                  </Box>
                </Stack>
              </TabPanel>
              <TabPanel value={value} index={1} dir={theme.direction}>
                {getContentVisitante(value)}
              </TabPanel>
              <TabPanel value={value} index={2} dir={theme.direction}>
                {getContentVisitante(value)}
              </TabPanel>
              <TabPanel value={value} index={3} dir={theme.direction}>
                <List
                  dense
                  disablePadding
                  sx={{ width: "100%", maxHeight: "45dvh", overflowY: "auto" }}
                >
                  {estatus.map((item, i) => (
                    <ListItem
                      key={i}
                      sx={(theme) => ({
                        mb: 2,
                        p: 1,
                        border: `1px solid ${lighten(
                          alpha(theme.palette.divider, 0.3),
                          0.88
                        )}`,
                        borderRadius: 2,
                      })}
                      secondaryAction={
                        <Chip
                          icon={
                            DISPOS_ICONS[
                              item.tipo_dispositivo as keyof typeof DISPOS_ICONS
                            ]
                          }
                          label={
                            tipos_dispositivos[item.tipo_dispositivo].nombre
                          }
                          size="small"
                          sx={(theme) => ({
                            width: "100%",
                            bgcolor:
                              tipos_dispositivos[item.tipo_dispositivo].color ||
                              "secondary.main",
                            color: theme.palette.getContrastText(
                              tipos_dispositivos[item.tipo_dispositivo].color ||
                                "secondary.main"
                            ),
                          })}
                        />
                      }
                      disablePadding
                    >
                      <ListItemText
                        primary={
                          <Typography
                            variant="subtitle1"
                            component="p"
                            sx={{ color: tipos_eventos[item.tipo_check].color }}
                          >
                            <strong>
                              {tipos_eventos[item.tipo_check].nombre}
                            </strong>
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" component="p">
                            {dayjs(item.fecha_creacion).format(
                              "DD/MM/YYYY, HH:mm:ss a"
                            )}
                            <br />
                            {item.creado_por}{" "}
                            {item.acceso ? ` / ${item.acceso}` : ""}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </TabPanel>
              <TabPanel value={value} index={4} dir={theme.direction}>
                <List
                  dense
                  disablePadding
                  sx={{ width: "100%", maxHeight: "45dvh", overflowY: "auto" }}
                >
                  {documentos.map((item, i) => (
                    <ListItem
                      key={i}
                      sx={(theme) => ({
                        mb: 2,
                        p: 1,
                        border: `1px solid ${lighten(
                          alpha(theme.palette.divider, 0.3),
                          0.88
                        )}`,
                        borderRadius: 2,
                      })}
                      secondaryAction={
                        <IconButton onClick={() => verDocumento(item._id)}>
                          <Visibility color="primary" />
                        </IconButton>
                      }
                      disablePadding
                    >
                      <ListItemText
                        primary={
                          <Typography
                            variant="subtitle1"
                            component="p"
                            sx={{ color: tipos_documentos[item.tipo].color }}
                          >
                            <strong>
                              {tipos_documentos[item.tipo].nombre}
                            </strong>
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </TabPanel>
              <TabPanel value={value} index={5} dir={theme.direction}>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "20%" } }}>
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
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "20%" } }}>
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
                    <Grid size="auto" sx={{ width: { xs: "100%", sm: "20%" } }}>
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
                    <Grid size="auto" sx={{ width: { xs: "100%", sm: "20%" } }}>
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
              </TabPanel>
            </Fragment>
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
                startIcon={<Close />}
              >
                Cerrar
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
      {openDialog && (
        <DocViewer idDoc={doc} open={openDialog} handleClose={handleClose} />
      )}
    </ModalContainer>
  );
}
