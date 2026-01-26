import {
  AccountTree,
  Apps,
  HowToReg,
  Assignment,
  ChevronLeft,
  Settings,
} from "@mui/icons-material";
import {
  alpha,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Divider,
  Grid,
  lighten,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router";
import { Fragment } from "react";
import { useErrorBoundary } from "react-error-boundary";
import { Outlet, useSearchParams } from "react-router-dom";
import ABitacora from "./bitacora/ABitacora";
import ANuevaCita from "./bitacora/ANuevaCita";
import ANuevoRegistro from "./bitacora/ANuevoRegistro";
import ANuevosPisos from "./catalogos/ANuevosPisos";
import ANuevoAcceso from "./catalogos/ANuevoAcceso";
import ANuevaEmpresa from "./catalogos/ANuevaEmpresa";
import ANuevoUsuario from "./catalogos/ANuevoUsuario";
import ANuevoPase from "./catalogos/ANuevoPase";
import ADirectorio from "./recepcion/ADirectorio";
import AReportes from "./recepcion/AReportes";
import AEventos from "./controlAcceso/AEventos";
import AReporteHoras from "./controlAcceso/AReporteHoras";
import ACheck from "./controlAcceso/ACheck";
import AConfiguracion from "./configuracion/AConfiguracion";

const MANUALES = [
  {
    title: "Bitácora",
    icon: <Assignment sx={{ width: "100%", height: "60%" }} />,
    manual: 1,
    description:
      "Manuales relacionados con la gestión de la bitácora, lectura de QR y accesos a visitantes.",
    items: [
      {
        title: "Bitácora",
        section: 1.1,
        content: <ABitacora />,
      },
      {
        title: "Nueva cita",
        section: 1.2,
        content: <ANuevaCita />,
      },
      {
        title: "Nuevo registro",
        section: 1.3,
        content: <ANuevoRegistro />,
      },
    ],
  },
  {
    title: "Catálogos",
    icon: <AccountTree sx={{ width: "100%", height: "60%" }} />,
    manual: 2,
    description:
      "Manuales relacionados con la gestión de pisos, accesos, empresas, usuarios y pases.",
    items: [
      {
        title: "Gestión de pisos",
        section: 2.1,
        content: <ANuevosPisos />,
      },
      {
        title: "Gestión de Accesos",
        section: 2.2,
        content: <ANuevoAcceso />,
      },
      {
        title: "Gestión de Empresas",
        section: 2.3,
        content: <ANuevaEmpresa />,
      },
      {
        title: "Gestión de Usuarios",
        section: 2.4,
        content: <ANuevoUsuario />,
      },
      {
        title: "Gestión de Pases",
        section: 2.5,
        content: <ANuevoPase />,
      },
    ],
  },
  {
    title: "Recepción",
    icon: <HowToReg sx={{ width: "100%", height: "60%" }} />,
    manual: 3,
    description:
      "Manuales relacionados con la visualización de directorio, reportes y visitantes bloqueados.",
    items: [
      {
        title: "Directorio",
        section: 3.1,
        content: <ADirectorio />,
      },
      {
        title: "Reportes",
        section: 3.2,
        content: <AReportes />,
      },
    ],
  },
  {
    title: "Control de Acceso",
    icon: <Apps sx={{ width: "100%", height: "60%" }} />,
    manual: 4,
    description:
      "Manuales relacionados con la visualización de eventos, reporte de horas y check.",
    items: [
      {
        title: "Eventos",
        section: 4.1,
        content: <AEventos />,
      },
      {
        title: "Reporte de Horas",
        section: 4.2,
        content: <AReporteHoras />,
      },
      {
        title: "Check",
        section: 4.3,
        content: <ACheck />,
      },
    ],
  },
  {
    title: "Configuración",
    icon: <Settings sx={{ width: "100%", height: "60%" }} />,
    manual: 5,
    description: "Manual relacionado con la configuración del sistema.",
    items: [
      {
        title: "Configuración",
        section: 5.1,
        content: <AConfiguracion />,
      },
    ],
  },
];

export default function ManualUsuario() {
  const navigate = useNavigate();
  const regresar = () => {
    navigate(`/manual-usuario`);
  };
  const [searchParams, setSearchParams] = useSearchParams({
    manual: "",
    seccion: "",
  });
  const MANUAL = searchParams.get("manual");
  const SECTION = searchParams.get("seccion");
  const { showBoundary } = useErrorBoundary();

  const handleManual = (manual: number) => {
    searchParams.set("manual", String(manual));
    searchParams.delete("seccion");
    setSearchParams(searchParams);
  };

  const handleSection = (section: number) => {
    searchParams.set("seccion", String(section));
    setSearchParams(searchParams);
  };

  if (MANUAL) {
    const ITEM_MANUAL = MANUALES.find((item) => item.manual === Number(MANUAL));
    if (!ITEM_MANUAL) showBoundary(new Error("El manual no existe"));
    if (SECTION) {
      const ITEM_SECTION = ITEM_MANUAL?.items.find(
        (item) => item.section === Number(SECTION)
      );
      if (!ITEM_SECTION) showBoundary(new Error("La sección no existe"));
      return (
        <Fragment>
          <Box component="section">
            <Card
              elevation={0}
              sx={(theme) => ({
                border: `1px solid ${lighten(
                  alpha(theme.palette.divider, 0.3),
                  0.88
                )}`,
              })}
            >
              <CardContent>
                <Typography component="h4" variant="h4" textAlign="center">
                  {ITEM_SECTION?.title}
                </Typography>
                {ITEM_SECTION?.content}
              </CardContent>
            </Card>
          </Box>
          <Outlet />
        </Fragment>
      );
    }
    return (
      <Fragment>
        <Box component="section">
          <Card
            elevation={0}
            sx={(theme) => ({
              border: `1px solid ${lighten(
                alpha(theme.palette.divider, 0.3),
                0.88
              )}`,
            })}
          >
            <CardContent>
              <Typography component="h4" variant="h4" textAlign="center">
                Manuales ({ITEM_MANUAL?.title})
              </Typography>
              <Grid container spacing={2} sx={{ my: 2 }}>
                {ITEM_MANUAL?.items.map((manual) => (
                  <Grid size={{ xs: 12, sm: 6, md: 3, xl: 3 }}>
                    <Card elevation={5} sx={{ width: "100%", height: "100%" }}>
                      <CardActionArea
                        sx={{ width: "100%", height: "100%" }}
                        onClick={() => handleSection(manual.section)}
                      >
                        <CardContent
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Typography
                            component="h6"
                            variant="h6"
                            textAlign="center"
                            sx={{ my: 1 }}
                          >
                            {manual.title}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
            <Divider sx={{ my: 3 }} />
            <Box
              component="footer"
              sx={{
                display: "flex",
                justifyContent: "end",
                m: 3,
                //mb: 0.5,
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
                  startIcon={<ChevronLeft />}
                >
                  Regresar
                </Button>
              </Stack>
            </Box>
          </Card>
        </Box>
        <Outlet />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Box component="section">
        <Card
          elevation={0}
          sx={(theme) => ({
            border: `1px solid ${lighten(
              alpha(theme.palette.divider, 0.3),
              0.88
            )}`,
          })}
        >
          <CardContent>
            <Typography component="h4" variant="h4" textAlign="center">
              Manuales de usuario
            </Typography>
            <Grid container spacing={2} sx={{ my: 2 }}>
              {MANUALES.map((manual) => (
                <Grid size={{ xs: 12, sm: 6, md: 3, xl: 3 }}>
                  <Card elevation={5} sx={{ width: "100%", height: "100%" }}>
                    <CardActionArea
                      sx={{ width: "100%", height: "100%" }}
                      onClick={() => handleManual(manual.manual)}
                    >
                      <CardContent
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Avatar
                          sx={{
                            bgcolor: "primary.main",
                            width: 80,
                            height: 80,
                          }}
                        >
                          {manual.icon}
                        </Avatar>
                        <Typography
                          component="h6"
                          variant="h6"
                          textAlign="center"
                          sx={{ my: 1 }}
                        >
                          {manual.title}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "text.secondary" }}
                          textAlign="justify"
                        >
                          {manual.description}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Box>
      <Outlet />
    </Fragment>
  );
}
