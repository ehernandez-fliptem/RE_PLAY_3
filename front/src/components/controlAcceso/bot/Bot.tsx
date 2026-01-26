import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  alpha,
  Box,
  Card,
  CardContent,
  Grid,
  IconButton,
  lighten,
  Typography,
} from "@mui/material";
import { FormProvider, useForm } from "react-hook-form";
import * as faceapi from "face-api.js";
import type Webcam from "react-webcam";
import { enqueueSnackbar } from "notistack";

import Camera from "../../utils/Camera";
import AnimatedBot from "./utils/AnimatedBot";

import ErrorB from "../../../assets/sounds/error.wav";
import Done from "../../../assets/sounds/done.wav";

import { clienteAxios, handlingError } from "../../../app/config/axios";
import { useErrorBoundary } from "react-error-boundary";
import type { OnResultFunction } from "react-qr-reader";
import { useNavigate } from "react-router-dom";
import { useTimer } from "../../../hooks/useTimer";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import { CameraAlt, Check, Close } from "@mui/icons-material";
import { useAsyncSpeech } from "../../../hooks/useAsyncSpeech";

type FormValues = {
  id_general?: string;
  fecha_check: string;
  tipo_dispositivo: number;
  img_evento?: string;
  latitud?: number;
  longitud?: number;
  tipo_check?: number;
};

const initialValue: FormValues = {
  fecha_check: "",
  tipo_dispositivo: 1,
  img_evento: "",
  latitud: 0,
  longitud: 0,
};

const TIMEOUT_DURATION = 15000;

export default function Bot() {
  const { tiempoFotoVisita } = useSelector(
    (state: IRootState) => state.config.data
  );
  const webcamRef = useRef<Webcam | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { showBoundary } = useErrorBoundary();
  const navigate = useNavigate();
  const formContext = useForm({
    defaultValues: initialValue,
  });
  const [message, setMessage] = useState<string>("");
  const [locationGranted, setLocationGranted] = useState(false);
  const [scannerMode, setScannerMode] = useState<1 | 2>(2);
  const [isScanningQr, setIsScanningQr] = useState(false);
  const { counter, AudioElement, startTimer, isActive } = useTimer();
  const [fotoTomada, setFotoTomada] = useState(false);
  const { speak } = useAsyncSpeech();

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

  const stopScanningTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const startScanningTimeout = useCallback(() => {
    if (isScanningQr) return;
    timeoutRef.current = setTimeout(async () => {
      setMessage(
        "Tiempo de escaneo agotado. Volviendo al reconocimiento facial."
      );
      await speak(
        "Tiempo de escaneo agotado. Volviendo al reconocimiento facial."
      );
      setMessage("");
      setScannerMode(2);
      setIsScanningQr(false);
      timeoutRef.current = null;
    }, TIMEOUT_DURATION);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanningQr]);

  const handleCancelQR = () => {
    stopScanningTimeout();
    setIsScanningQr(false);
    setScannerMode(2);
  };

  const handleScan: OnResultFunction = async (result) => {
    try {
      const qr = result?.getText();
      if (qr) {
        stopScanningTimeout();
        setIsScanningQr(true);
        const res = await clienteAxios.post("/api/eventos/validar-qr", {
          qr,
          tipo_check: 7,
          lector: 1,
        });
        if (res.data.estado) {
          const result = await startTimer({
            rango: tiempoFotoVisita,
            nextFunction: async () => {
              await new Promise((resolve) =>
                resolve(webcamRef.current?.getScreenshot())
              );
            },
          });
          if (result.isFinished) {
            const img_evento = result.nextFunctionResult as string;
            const { latitud, longitud } = await obtenerUbicacion();
            formContext.setValue("id_general", qr);
            formContext.setValue("tipo_check", 7);
            formContext.setValue("img_evento", img_evento);
            formContext.setValue("latitud", latitud);
            formContext.setValue("longitud", longitud);
            formContext.setValue("fecha_check", res.data.datos.fecha_check);
            await enviar();
          }
        } else {
          setMessage(res.data.mensaje + " Volviendo al reconocimiento facial");
          await speak(res.data.mensaje + " Volviendo al reconocimiento facial");
          setMessage("");
          setScannerMode(2);
          setIsScanningQr(false);
        }
      }
    } catch (error) {
      new Audio(ErrorB).play();
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
      setScannerMode(2);
      setIsScanningQr(false);
    }
  };

  const handleScanFace = useCallback(
    async (
      value:
        | faceapi.WithFaceDescriptor<
            faceapi.WithFaceLandmarks<
              {
                detection: faceapi.FaceDetection;
              },
              faceapi.FaceLandmarks68
            >
          >
        | undefined
    ) => {
      if (value) {
        try {
          const img_evento = await new Promise((resolve) =>
            resolve(webcamRef.current?.getScreenshot())
          );
          const { latitud, longitud } = await obtenerUbicacion();
          const res = await clienteAxios.post("/api/eventos/validar-rostro", {
            descriptor: Array.from(value.descriptor),
            tipo_dispositivo: 1,
            img_evento,
            latitud,
            longitud,
            fecha_evento: new Date(),
          });
          if (res.data.estado) {
            setMessage(`Bienvenido ${res.data.datos.nombre}`);
            await speak(`Bienvenido ${res.data.datos.nombre}`);
            setMessage("");
          } else {
            setMessage(res.data.mensaje + " Prepara tu QR");
            await speak(res.data.mensaje + " Prepara tu QR");
            setMessage("");
            setScannerMode(1);
            startScanningTimeout();
          }
        } catch (error) {
          new Audio(ErrorB).play();
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [webcamRef]
  );

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
        setMessage(`Bienvenido ${res.data.datos.nombre}`);
        await speak(`Bienvenido ${res.data.datos.nombre}`);
        setFotoTomada(false);
        formContext.reset();
      } else {
        new Audio(ErrorB).play();
        setMessage(res.data.mensaje);
        await speak(res.data.mensaje);
      }
    } catch (error) {
      new Audio(ErrorB).play();
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setMessage("Volviendo al escaneo facial.");
      await speak("Volviendo al escaneo facial.");
      setMessage("");
      setScannerMode(2);
      setIsScanningQr(false);
    }
  };

  return (
    <Fragment>
      <audio typeof="audio/wav" src={Done} />
      <AudioElement />
      <Box component="section">
        <Card
          elevation={0}
          sx={(theme) => ({
            border: `1px solid ${lighten(
              alpha(theme.palette.divider, 0.3),
              0.88
            )}`,
            height: { xs: "auto", md: "calc(100dvh - 120px)" },
            minHeight: 400,
          })}
        >
          <CardContent sx={{ pb: 0, height: "100%" }}>
            <Grid container spacing={2} sx={{ height: "100%", px: 4 }}>
              <Grid
                size={{ xs: 12, sm: 4 }}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {!locationGranted ? (
                  <Typography variant="h6" textAlign="center">
                    Por favor, acepta los permisos de ubicación para continuar.
                  </Typography>
                ) : (
                  <Fragment>
                    <Box
                      component="section"
                      sx={{
                        display: "block",
                        width: "100%",
                      }}
                    >
                      {isActive && (
                        <Box
                          component="section"
                          sx={{
                            position: "relative",
                            backgroundColor: "primary.main",
                            color: "primary.contrastText",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "100%",
                          }}
                        >
                          <CameraAlt
                            fontSize="small"
                            sx={{ position: "absolute", left: 10 }}
                          />
                          <Typography
                            variant="overline"
                            component="h5"
                            textAlign="center"
                          >
                            La foto del usuario se tomará en: {counter}
                          </Typography>
                        </Box>
                      )}
                      {fotoTomada && (
                        <Box
                          component="section"
                          sx={{
                            position: "relative",
                            backgroundColor: "success.main",
                            color: "success.contrastText",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "100%",
                          }}
                        >
                          <Check
                            fontSize="small"
                            sx={{ position: "absolute", left: 10 }}
                          />
                          <Typography
                            variant="overline"
                            component="h5"
                            textAlign="center"
                          >
                            Foto tomada correctamente
                          </Typography>
                        </Box>
                      )}
                      {scannerMode === 1 && (
                        <Box
                          component="section"
                          sx={{
                            position: "relative",
                            backgroundColor: "info.main",
                            color: "info.contrastText",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "100%",
                          }}
                        >
                          <IconButton
                            sx={{ position: "absolute", left: 0 }}
                            onClick={handleCancelQR}
                            disabled={isActive}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                          <Typography
                            variant="overline"
                            component="h5"
                            textAlign="center"
                          >
                            Lector QR disponible
                          </Typography>
                        </Box>
                      )}
                      <FormProvider {...formContext}>
                        <Camera
                          showButton={false}
                          camRef={webcamRef}
                          isScan={!isScanningQr}
                          isScanFace={true}
                          handleScan={handleScan}
                          handleScanFace={handleScanFace}
                          defaultMode={scannerMode}
                          name="img_evento"
                          discretMenuDevices
                        />
                      </FormProvider>
                    </Box>
                  </Fragment>
                )}
              </Grid>
              <Grid
                size={{ xs: 12, sm: 8 }}
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <AnimatedBot message={message} discretMenuVoices />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Fragment>
  );
}
