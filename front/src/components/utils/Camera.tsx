import React, {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import Webcam from "react-webcam";
import {
  CameraAlt,
  ChevronLeft,
  Devices,
  Face,
  QrCode,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { QrReader, type OnResultFunction } from "react-qr-reader";
import { useFormContext } from "react-hook-form";
import { useErrorBoundary } from "react-error-boundary";
import * as faceapi from "face-api.js";
import Spinner from "./Spinner";
import { handlingError } from "../../app/config/axios";
import { useSelector } from "react-redux";
import type { IRootState } from "../../app/store";

type Props = {
  camRef?: RefObject<Webcam | null>;
  name: string;
  setShow?: React.Dispatch<React.SetStateAction<boolean>>;
  isScan?: boolean;
  isScanFace?: boolean;
  handleScan?: OnResultFunction;
  handleScanFace?: (
    scanValue:
      | faceapi.WithFaceDescriptor<
          faceapi.WithFaceLandmarks<
            {
              detection: faceapi.FaceDetection;
            },
            faceapi.FaceLandmarks68
          >
        >
      | undefined
  ) => Promise<void>;
  showButton?: boolean;
  defaultMode?: 1 | 2;
  showModeDetection?: boolean;
  disabledDevicesMenu?: boolean;
  discretMenuDevices?: boolean;
};

export default function Camera({
  camRef,
  name,
  setShow,
  isScan,
  isScanFace = false,
  handleScan,
  handleScanFace,
  showButton = true,
  defaultMode = 1,
  showModeDetection = false,
  disabledDevicesMenu = false,
  discretMenuDevices = false,
}: Props) {
  const { delayProximaFoto } = useSelector(
    (state: IRootState) => state.config.data
  );
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { showBoundary } = useErrorBoundary();
  const { setValue, clearErrors, trigger } = useFormContext();
  const [webcamReady, setWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState({
    estado: false,
    mensaje: "",
  });
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  const [deviceId, setDeviceId] = useState<MediaDeviceInfo["deviceId"]>("");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [detectionMode, setDetectionMode] = useState<1 | 2>(defaultMode);
  const [showModal, setShowModal] = useState(false);

  const handleDevices = useCallback(
    (mediaDevices: MediaDeviceInfo[]) => {
      const videoDevices = mediaDevices.filter(
        ({ kind }) => kind === "videoinput"
      );
      if (videoDevices.length > 0) {
        setDevices(videoDevices);
        setDeviceId(
          isMobile ? videoDevices[1].deviceId : videoDevices[0].deviceId
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setDevices]
  );

  const captureImage = () => {
    const picture = webcamRef.current?.getScreenshot();
    setValue(name, picture);
    trigger(name);
    clearErrors(name);
    if (setShow) setShow(false);
  };

  useEffect(() => {
    const checkCameraPermissions = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setWebcamError({
          estado: true,
          mensaje:
            "Tu navegador no soporta acceso a la cámara. Por favor, utiliza un navegador compatible como Chrome o Firefox.",
        });
      } else {
        try {
          if (isScanFace && handleScanFace) await loadModels();
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          stream.getTracks().forEach((track) => track.stop());
          setPermissionsGranted(true);
          setWebcamReady(true);
        } catch (error) {
          const mensaje =
            error && typeof error === "object" && "message" in error
              ? String((error as { message?: unknown }).message)
              : "Error desconocido al acceder a la cámara";
          setWebcamError({ estado: true, mensaje });
        }
      }
    };

    checkCameraPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (permissionsGranted && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then(handleDevices)
        .catch((error) => {
          const mensaje =
            error && typeof error === "object" && "message" in error
              ? String((error as { message?: unknown }).message)
              : "Error desconocido al acceder a la cámara";
          setWebcamError({ estado: true, mensaje });
        });
    }
  }, [permissionsGranted, handleDevices, showBoundary]);

  useEffect(() => {
    setDetectionMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined = undefined;
    if (permissionsGranted) {
      if (detectionMode == 1 && isScan) {
        if (interval) clearInterval(interval);
      }
      if (detectionMode == 2 && isScanFace) {
        if (typeof handleScanFace === "function" && deviceId) {
          interval = setTimeout(async () => await detectFace(), 2000);
        }
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    permissionsGranted,
    detectionMode,
    deviceId,
    handleScanFace,
    isScanFace,
    isScan,
  ]);

  const loadModels = async () => {
    Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    //   faceapi.nets.faceExpressionNet.loadFromUri("/models"),
    //   faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
    ]);
  };

  const handleChangeMode = (
    _event: React.MouseEvent<HTMLElement>,
    nextMode: 1 | 2
  ) => {
    setDetectionMode(nextMode);
  };

  const detectFace = useCallback(async () => {
    try {
      const videoRef = (camRef || webcamRef).current?.video;
      if (videoRef) {
        const detections = await faceapi
          .detectSingleFace(videoRef, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (detections && canvasRef.current) {
          canvasRef.current.width = videoRef.videoWidth;
          canvasRef.current.height = videoRef.videoHeight;
          const displaySize = {
            width: videoRef.videoWidth,
            height: videoRef.videoHeight,
          };
          faceapi.matchDimensions(canvasRef.current, displaySize);

          const ctx = canvasRef.current.getContext("2d");
          if (ctx)
            ctx.clearRect(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );

          faceapi.draw.drawDetections(
            canvasRef.current,
            faceapi.resizeResults(detections, displaySize)
          );
          if (typeof handleScanFace === "function")
            await handleScanFace(detections);
          setTimeout(async () => {
            await detectFace();
          }, delayProximaFoto * 1000);
        }
        if (!detections && canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) {
            ctx.clearRect(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );
          }
          setTimeout(async () => {
            await detectFace();
          }, 1000);
        }
      }
    } catch (error) {
      handlingError(error);
    }
  }, [camRef, handleScanFace, delayProximaFoto]);

  const handleDeviceChange = (newDeviceId: string) => {
    setDeviceId(newDeviceId);
  };

  const handleClickOpen = () => {
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <Box component="section">
      {!webcamReady && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
          }}
          color={webcamError.estado ? "error.main" : ""}
        >
          <Typography variant="h6" textAlign="center">
            {webcamError.estado
              ? webcamError.mensaje
              : "--- Cargando imagen---"}
          </Typography>
        </Box>
      )}
      {deviceId && showModeDetection && (
        <Box
          component="section"
          sx={{
            position: "relative",
            width: "100%",
          }}
        >
          <ToggleButtonGroup
            exclusive
            color="primary"
            value={detectionMode}
            onChange={handleChangeMode}
            fullWidth
            size="small"
          >
            <ToggleButton value={1}>
              <QrCode />
            </ToggleButton>
            <ToggleButton value={2}>
              <Face />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}
      {!webcamReady && <Spinner />}
      <Box
        sx={{
          position: "relative",
          display: webcamReady ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: 350,
          maxHeight: 350,
          padding: 0,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
        }}
      >
        {discretMenuDevices && !disabledDevicesMenu && (
          <Box sx={{ position: "absolute", top: 20, left: 20, zIndex: 90 }}>
            <Button
              variant="contained"
              color="primary"
              sx={{ p: 1, borderRadius: 25, minWidth: "100%" }}
              onClick={handleClickOpen}
            >
              <Devices />
            </Button>
          </Box>
        )}
        {detectionMode === 1 && (
          <Fragment>
            {isScan && deviceId ? (
              <Fragment>
                {isScan && handleScan ? (
                  <QrReader
                    key={deviceId}
                    scanDelay={200}
                    videoId={deviceId}
                    constraints={{ deviceId: { exact: deviceId } }}
                    onResult={handleScan}
                    containerStyle={{
                      width: "100%",
                      height: "100%",
                      margin: 0,
                      padding: 0,
                    }}
                    videoContainerStyle={{
                      width: "100%",
                      height: "100%",
                      padding: 0,
                    }}
                    videoStyle={{
                      objectFit: "fill",
                    }}
                  />
                ) : (
                  <>No se estableció la función para el escáner</>
                )}
              </Fragment>
            ) : (
              <Webcam
                key={deviceId}
                audio={false}
                ref={camRef || webcamRef}
                minScreenshotHeight={300}
                minScreenshotWidth={400}
                onUserMediaError={(error) =>
                  setWebcamError({
                    estado: true,
                    mensaje:
                      typeof error === "string"
                        ? error
                        : error &&
                          typeof error === "object" &&
                          "message" in error
                        ? String((error as { message?: unknown }).message)
                        : String(error),
                  })
                }
                screenshotFormat="image/jpeg"
                videoConstraints={{ deviceId: { exact: deviceId } }}
                style={{ width: "100%", height: "100%", objectFit: "fill" }}
              />
            )}
          </Fragment>
        )}
        {detectionMode === 2 && (
          <Fragment>
            <Webcam
              key={deviceId}
              audio={false}
              ref={camRef || webcamRef}
              minScreenshotHeight={300}
              minScreenshotWidth={400}
              onUserMediaError={(error) =>
                setWebcamError({
                  estado: true,
                  mensaje:
                    typeof error === "string"
                      ? error
                      : error && typeof error === "object" && "message" in error
                      ? String((error as { message?: unknown }).message)
                      : String(error),
                })
              }
              screenshotFormat="image/jpeg"
              videoConstraints={{ deviceId: { exact: deviceId } }}
              style={{ width: "100%", height: "100%", objectFit: "fill" }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: -30,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            />
          </Fragment>
        )}
      </Box>
      {deviceId && !disabledDevicesMenu && !discretMenuDevices && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Select
            size="small"
            sx={{ width: "100%" }}
            name="scanner"
            onChange={(e) => handleDeviceChange(e.target.value)}
            value={deviceId}
          >
            {devices.map((item) => (
              <MenuItem value={item.deviceId}>{item.label}</MenuItem>
            ))}
          </Select>
        </Box>
      )}
      <Box
        component="footer"
        sx={{
          mt: 2,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {!!setShow && (
          <Button
            size="medium"
            type="submit"
            variant="contained"
            color="secondary"
            onClick={() => setShow(false)}
            startIcon={<ChevronLeft />}
          >
            Cancelar
          </Button>
        )}
        {showButton && webcamReady && (
          <Button
            size="medium"
            type="submit"
            variant="contained"
            color="primary"
            onClick={captureImage}
            startIcon={<CameraAlt />}
          >
            Tomar foto
          </Button>
        )}
      </Box>
      <Dialog open={showModal} onClose={handleClose}>
        <DialogTitle textAlign="center">Dispositivos disponibles</DialogTitle>
        <DialogContent>
          <Select
            size="small"
            sx={{ width: "100%" }}
            name="scanner"
            onChange={(e) => {
              handleDeviceChange(e.target.value);
              handleClose();
            }}
            value={deviceId}
          >
            {devices.map((item) => (
              <MenuItem value={item.deviceId}>{item.label}</MenuItem>
            ))}
          </Select>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
