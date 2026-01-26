import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

import {
  CameraAlt,
  Check as CheckIcon,
  ChevronLeft,
  ExitToApp,
} from "@mui/icons-material";

import Timer from "./Timer";
import Done from "../../../assets/sounds/done.wav";
import ErrorB from "../../../assets/sounds/error.wav";

import { clienteAxios, handlingError } from "../../../app/config/axios";
import {
  Box,
  Button,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import Camera from "../../utils/Camera";
import { enqueueSnackbar } from "notistack";
import type { OnResultFunction } from "react-qr-reader";
import type { IRootState } from "../../../app/store";
import Spinner from "../../utils/Spinner";
import { FormProvider, useForm } from "react-hook-form";
import type Webcam from "react-webcam";
import { showDialogComment } from "../../utils/functions/showDialogComment";
import { useErrorBoundary } from "react-error-boundary";
import Access from "../../utils/Access";

type FormValues = {
  autorizacionCheck?: boolean;
  fecha_check: string;
  id_general: string;
  tipo_dispositivo: number;
  img_evento?: string;
  tipo_check: number;
  id_horario?: string;
  validado_por?: string;
  comentario?: string;
  latitud?: number;
  longitud?: number;
  similitud?: string;
  advertencia?: string;
};

const initialValue: FormValues = {
  autorizacionCheck: false,
  fecha_check: "",
  id_general: "",
  tipo_dispositivo: 1,
  img_evento: "",
  tipo_check: 1,
  id_horario: "",
  validado_por: "",
  comentario: "",
  latitud: 0,
  longitud: 0,
  similitud: "",
  advertencia: "",
};

export default function Check() {
  const { tiempoFotoVisita } = useSelector(
    (state: IRootState) => state.config.data
  );
  const webcamRef = useRef<Webcam | null>(null);
  const formContext = useForm({
    defaultValues: initialValue,
  });
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [mostrarTimer, setMostrarTimer] = useState(false);
  const [fotoTomada, setFotoTomada] = useState(false);
  const handleInOut = formContext.watch("tipo_check");
  const [locationGranted, setLocationGranted] = useState(false);
  const { showBoundary } = useErrorBoundary();
  const [showCamera, setShowCamera] = useState(false);

  useEffect(() => {
    const iniciarRastreo = async () => {
      if (!navigator.geolocation) {
        enqueueSnackbar(
          "El navegador no tiene soporte para obtener la ubicación.",
          { variant: "error" }
        );
      } else {
        navigator.geolocation.getCurrentPosition(
          async () => {
            setLocationGranted(true);
          },
          (error) => {
            if (error.PERMISSION_DENIED) {
              new Audio(ErrorB).play();
              enqueueSnackbar(
                "El sitio requiere de la ubicación para trabajar con normalidad.",
                { variant: "error" }
              );
            }
          },
          {}
        );
      }
    };
    iniciarRastreo();
  }, []);


  const handleScan: OnResultFunction = async (result) => {
    try {
      const qr = result?.getText();
      if (qr) {
        const handleInOut = formContext.getValues("tipo_check");
        if (handleInOut === 1 || handleInOut === 4) {
          setShowCamera(true);
          setIsLoading(true);
          const res = await clienteAxios.post("/api/eventos/validar-qr", {
            qr,
            tipo_check: handleInOut,
            lector: 1,
          });
          if (res.data.estado) {
            const { autorizacionCheck, comentario, fecha_check } =
              res.data.datos;
            formContext.setValue("id_general", qr);
            formContext.setValue("comentario", comentario);
            formContext.setValue("fecha_check", fecha_check);
            if (autorizacionCheck) {
              enqueueSnackbar(
                "Contacta con un recepcionista para permitirte el acceso.",
                { variant: "warning" }
              );
              formContext.setValue(
                "tipo_check",
                handleInOut === 1 ? 2 : handleInOut === 4 ? 5 : 0
              );
            } else {
              setMostrarTimer(true);
            }
          } else {
            enqueueSnackbar(res.data.mensaje, { variant: "warning" });
          }
        }
        if (handleInOut === 2 || handleInOut === 5) {
          setIsLoading(true);
          const res = await clienteAxios.post("/api/eventos/autorizar", {
            qr,
          });
          if (res.data.estado) {
            formContext.setValue("validado_por", res.data.datos);
            formContext.setValue("autorizacionCheck", res.data.datos);
            setMostrarTimer(true);
          } else {
            enqueueSnackbar(res.data.mensaje, { variant: "warning" });
          }
        }
        if (handleInOut === 3 || handleInOut === 6) {
          setIsLoading(true);
          const res = await clienteAxios.post("/api/eventos/autorizar", {
            qr,
          });
          if (res.data.estado) {
            const { isSubmitted, result } = await showDialogComment({
              title: "Motivo del rechazo",
              label: "Comentarios",
            });
            if (isSubmitted) {
              formContext.setValue("validado_por", res.data.datos);
              formContext.setValue("comentario", result?.text);
              setMostrarTimer(true);
            }
          } else {
            enqueueSnackbar(res.data.mensaje, { variant: "warning" });
          }
        }
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  const tomarFoto = async () => {
    const img_evento = webcamRef.current?.getScreenshot();
    const { latitud, longitud } = await obtenerUbicacion();
    formContext.setValue("img_evento", img_evento || "");
    formContext.setValue("latitud", latitud);
    formContext.setValue("longitud", longitud);
    setShowCamera(false);
    enviar();
  };

  const obtenerUbicacion = async (): Promise<{
    latitud: number;
    longitud: number;
  }> => {
    const geolocation = navigator.geolocation;
    return await new Promise((resolve) => {
      geolocation.getCurrentPosition(
        (geo) => {
          const latitud = geo.coords.latitude;
          const longitud = geo.coords.longitude;
          resolve({ latitud, longitud });
        },
        (error) => {
          showBoundary(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 30000,
        }
      );
    });
  };

  const enviar = async () => {
    try {
      const datos = formContext.getValues();
      const res = await clienteAxios.post("/api/eventos", datos);
      if (res.data.estado) {
        setFotoTomada(true);
        new Audio(Done).play();
        setTimeout(() => {
          setFotoTomada(false);
          formContext.reset();
          if ([1, 2, 3].includes(datos.tipo_check))
            formContext.setValue("tipo_check", 1);
          if ([4, 5, 6].includes(datos.tipo_check))
            formContext.setValue("tipo_check", 4);
        }, 2000);
      } else {
        new Audio(ErrorB).play();
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      new Audio(ErrorB).play();
      handlingError(error);
    }
  };

  const clearValues = () => {
    formContext.reset();
  };

  const regresar = () => {
    navigate("/");
  };

  const getHeaderContent = (type: number) => {
    switch (type) {
      case 1:
        return (
          <>
            <Typography variant="overline" component="h5" textAlign="center">
              Check In
            </Typography>
            <IconButton
              size="small"
              sx={{ position: "absolute", top: 0, right: 0 }}
              onClick={() => formContext.setValue("tipo_check", 4)}
            >
              <ExitToApp />
            </IconButton>
          </>
        );
      case 2:
        return (
          <>
            <Typography variant="overline" component="h5" textAlign="center">
              Check In - Autorizar Entrada
            </Typography>
            <IconButton
              size="small"
              sx={{ position: "absolute", top: 0, right: 0 }}
              onClick={() => formContext.setValue("tipo_check", 3)}
            >
              <ExitToApp />
            </IconButton>
          </>
        );
      case 3:
        return (
          <>
            <Typography variant="overline" component="h5" textAlign="center">
              Check In - Rechazar Entrada
            </Typography>
            <IconButton
              size="small"
              sx={{ position: "absolute", top: 0, right: 0 }}
              onClick={() => formContext.setValue("tipo_check", 2)}
            >
              <ExitToApp />
            </IconButton>
          </>
        );
      case 4:
        return (
          <>
            <Typography variant="overline" component="h5" textAlign="center">
              Check Out
            </Typography>
            <IconButton
              size="small"
              sx={{ position: "absolute", top: 0, right: 0 }}
              onClick={() => formContext.setValue("tipo_check", 1)}
            >
              <ExitToApp sx={{ transform: "rotate(180deg)" }} />
            </IconButton>
          </>
        );
      case 5:
        return (
          <>
            <Typography variant="overline" component="h5" textAlign="center">
              Check Out - Autorizar Salida
            </Typography>
            <IconButton
              size="small"
              sx={{ position: "absolute", top: 0, right: 0 }}
              onClick={() => formContext.setValue("tipo_check", 6)}
            >
              <ExitToApp sx={{ transform: "rotate(180deg)" }} />
            </IconButton>
          </>
        );
      case 6:
        return (
          <>
            <Typography variant="overline" component="h5" textAlign="center">
              Check Out - Rechazar Salida
            </Typography>
            <IconButton
              size="small"
              sx={{ position: "absolute", top: 0, right: 0 }}
              onClick={() => formContext.setValue("tipo_check", 5)}
            >
              <ExitToApp sx={{ transform: "rotate(180deg)" }} />
            </IconButton>
          </>
        );
      default:
        return <></>;
    }
  };

  const getBgColor = (type: number) => {
    if (![1, 2, 3, 4, 5, 6].includes(type)) return "secondary.main";
    const color = {
      1: "success.main",
      2: "info.main",
      3: "warning.main",
      4: "error.main",
      5: "info.main",
      6: "warning.main",
    };
    return color[type as keyof typeof color];
  };

  return (
    <Paper
      component="div"
      sx={{
        p: 5,
        position: "absolute",
        top: 0,
        left: 0,
        height: "100dvh",
        width: "100dvw",
        borderRadius: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1200,
      }}
    >
      {!locationGranted ? (
        <Typography variant="h6" textAlign="center">
          Por favor, acepta los permisos de ubicación para continuar.
        </Typography>
      ) : (
        <Fragment>
          <Button
            type="button"
            size="medium"
            variant="contained"
            color="secondary"
            onClick={regresar}
            sx={{
              position: "absolute",
              top: 5,
              left: 5,
            }}
            startIcon={<ChevronLeft />}
          >
            Regresar
          </Button>
          <audio typeof="audio/wav" src={Done} />
          <audio typeof="audio/wav" src={ErrorB} />
          {!mostrarTimer && <Access />}
          <Box
            component="section"
            sx={{
              position: "relative",
              backgroundColor: getBgColor(handleInOut),
              mt: 2,
              width: { xs: "100%", md: "50%", lg: "35%", xl: "30%" },
            }}
          >
            {![1, 4].includes(handleInOut) && (
              <Tooltip title="Cancelar">
                <IconButton
                  size="small"
                  sx={{ position: "absolute", top: 0, left: 0 }}
                  onClick={clearValues}
                >
                  <ChevronLeft />
                </IconButton>
              </Tooltip>
            )}
            {getHeaderContent(handleInOut)}
          </Box>
         
          {!isLoading && mostrarTimer && (
            <Box
              component="section"
              sx={{
                backgroundColor: "primary.main",
                color: "primary.contrastText",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: { xs: "100%", md: "50%", lg: "35%", xl: "30%" },
              }}
            >
              <CameraAlt sx={{ mr: 2 }} />
              <Typography variant="overline" component="h5" textAlign="center">
                La foto del usuario se tomará en:
                <Timer
                  rango={tiempoFotoVisita}
                  setMostrarTimer={setMostrarTimer}
                  tomarFoto={tomarFoto}
                />
              </Typography>
            </Box>
          )}
          {fotoTomada && (
            <Box
              component="section"
              sx={{
                backgroundColor: "primary.main",
                color: "primary.contrastText",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                width: { xs: "100%", md: "50%", lg: "35%", xl: "30%" },
              }}
            >
              <CheckIcon fontSize="small" sx={{ mr: 2 }} />
              <Typography variant="overline" component="h5" textAlign="center">
                Foto tomada
              </Typography>
            </Box>
          )}
          {isLoading && <Spinner />}
          <Box
            component="section"
            sx={{
              display: isLoading ? "none" : "block",
              width: { xs: "100%", md: "50%", lg: "35%", xl: "30%" },
            }}
          >
            <FormProvider {...formContext}>
              <Camera
                showButton={false}
                camRef={webcamRef}
                isScan={!showCamera}
                handleScan={handleScan}
				// handleScanFace={handleScanFace}
				// showModeDetection
                name="img_evento"
              />
            </FormProvider>
          </Box>
        </Fragment>
      )}
    </Paper>
  );
}
