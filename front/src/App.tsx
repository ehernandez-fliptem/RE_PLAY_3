import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Container,
  CssBaseline,
  IconButton,
  ThemeProvider,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/es";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import advancedFormat from "dayjs/plugin/advancedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";
import isBetween from "dayjs/plugin/isBetween";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "react-error-boundary";

import Spinner from "./components/utils/Spinner";
import { addAuth } from "./app/features/auth/authSlice";
import { ConfirmProvider } from "material-ui-confirm";
import {
  MaterialDesignContent,
  SnackbarProvider,
  closeSnackbar,
} from "notistack";

import { clienteAxios, handlingError } from "./app/config/axios";
import Setup from "./components/setup/Setup";
import Login from "./components/auth/Login";
import Application from "./components/Application";
import Restablecer from "./components/auth/Restablecer";
import Logout from "./components/auth/Logout";
import Unauthorized from "./components/error/401";
import { Close } from "@mui/icons-material";
import type { IRootState } from "./app/store";
import type { AxiosError } from "axios";
//Themes
import ThemeButton from "./themes/ThemeButton";
import ColorModeContext from "./components/context/ColorModeContext";
import styled from "@emotion/styled";
import GlobalError from "./components/error/GlobalError";
import { globalTheme } from "./themes/theme";
import NuevoRegistroVisit from "./components/recepcion/bitacora/registros/NuevoRegistroVisit";

dayjs.extend(utc);
dayjs.extend(advancedFormat);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(duration);
dayjs.extend(isBetween);
dayjs.locale("es");

const SNACKBAR_AUTO_HIDE_MS = 3000;

function App() {
  const { token } = useSelector((state: IRootState) => state.auth.data);
  const { palette } = useSelector((state: IRootState) => state.config.data);
  const config = useSelector((state: IRootState) => state.config.data);
  dayjs.tz.setDefault(config?.zonaHoraria || "America/Mexico_City");
  const [empresas, setEmpresas] = useState(0);
  const [pisos, setPisos] = useState(0);
  const [accesos, setAccesos] = useState(0);
  const [usuarios, setUsuarios] = useState(0);
  const [configuracion, setConfiguracion] = useState(0);
  const [pensando, setPensando] = useState(true);
  const dispatch = useDispatch();

  // Theme mode
  const themeStorage = localStorage.getItem("theme") as "dark" | "light";
  const [mode, setMode] = useState<"light" | "dark">(
    themeStorage ? themeStorage : "light"
  );
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === "light" ? "dark" : "light"));
        localStorage.setItem("theme", mode === "light" ? "dark" : "light");
      },
    }),
    [mode]
  );
  const theme = useMemo(() => globalTheme(mode, palette), [mode, palette]); // Generar el tema dinámicamente

  const StyledMaterialDesignContent = styled(MaterialDesignContent)(() => ({
    "&.notistack-MuiContent-success": {
      backgroundColor:
        theme.palette.mode === "dark"
          ? theme.palette.success.dark
          : theme.palette.success.main,
    },
    "&.notistack-MuiContent-error": {
      backgroundColor:
        theme.palette.mode === "dark"
          ? theme.palette.error.dark
          : theme.palette.error.main,
    },
    "&.notistack-MuiContent-warning": {
      backgroundColor:
        theme.palette.mode === "dark"
          ? theme.palette.warning.dark
          : theme.palette.warning.main,
    },
    "&.notistack-MuiContent-info": {
      backgroundColor:
        theme.palette.mode === "dark"
          ? theme.palette.info.dark
          : theme.palette.info.main,
    },
  }));

  const validarApp = async () => {
    try {
      const res = await clienteAxios.get("/api/validacion/app");
      if (res.data.estado) {
        const { empresas, usuarios, configuracion, pisos, accesos } =
          res.data.datos;
        if (usuarios === 0) {
          localStorage.removeItem("SESSION");
          localStorage.removeItem("PAGE_INDEX");
        }
        setEmpresas(empresas);
        setPisos(pisos);
        setAccesos(accesos);
        setUsuarios(usuarios);
        setConfiguracion(configuracion);
        setPensando(false);
      }
    } catch (error) {
      handlingError(error as Error | AxiosError);
    }
  };

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem("SESSION") || "{}");
    dispatch(addAuth(session));
    validarApp();
  }, [dispatch]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
          <ConfirmProvider
            defaultOptions={{
              cancellationText: "Cancelar",
              titleProps: { align: "center" },
              cancellationButtonProps: {
                color: "secondary",
                variant: "contained",
              },
              confirmationButtonProps: {
                color: "primary",
                variant: "contained",
              },
            }}
          >
            <SnackbarProvider
              Components={{
                success: StyledMaterialDesignContent,
                error: StyledMaterialDesignContent,
                default: StyledMaterialDesignContent,
                info: StyledMaterialDesignContent,
                warning: StyledMaterialDesignContent,
              }}
              maxSnack={5}
              preventDuplicate
              action={(snackbarId) => (
                <IconButton
                  color="inherit"
                  onClick={() => closeSnackbar(snackbarId)}
                >
                  <Close />
                </IconButton>
              )}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              autoHideDuration={SNACKBAR_AUTO_HIDE_MS}
            >
              <CssBaseline />
              <Container
                id="app"
                component="main"
                fixed
                disableGutters
                sx={{
                  margin: 0,
                  minWidth: "100%",
                  height: "100dvh",
                  overflow: "auto",
                  bgcolor: (theme) =>
                    theme.palette.mode === "light" ? "white" : "#292929",
                }}
              >
                {!token && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 5,
                      left: 5,
                      zIndex: 200,
                    }}
                  >
                    <ThemeButton mode={mode} />
                  </Box>
                )}
                {pensando ? (
                  <Spinner fullPage />
                ) : (
                  <ErrorBoundary
                    FallbackComponent={GlobalError}
                    onReset={(details) => {
                      console.log(details);
                    }}
                  >
                    <BrowserRouter>
                      <Routes>
                        <Route
                          path="/*"
                          element={
                            <>
                              {empresas === 0 ||
                              pisos === 0 ||
                              usuarios === 0 ||
                              configuracion === 0 ? (
                                <Setup
                                  empresas={empresas}
                                  pisos={pisos}
                                  accesos={accesos}
                                  usuarios={usuarios}
                                  configuracion={configuracion}
                                  setEmpresas={setEmpresas}
                                  setPisos={setPisos}
                                  setAccesos={setAccesos}
                                  setUsuarios={setUsuarios}
                                  setConfiguracion={setConfiguracion}
                                />
                              ) : token ? (
                                <Application />
                              ) : (
                                <Login />
                              )}
                            </>
                          }
                        />
                        <Route path="/restablecer" element={<Restablecer />} />
                        <Route
                          path="/nuevo-registro-visitante"
                          element={<NuevoRegistroVisit />}
                        />
                        <Route path="/logout" element={<Logout />} />
                        <Route path="*" element={<Unauthorized />} />
                      </Routes>
                    </BrowserRouter>
                  </ErrorBoundary>
                )}
              </Container>
            </SnackbarProvider>
          </ConfirmProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default App;
