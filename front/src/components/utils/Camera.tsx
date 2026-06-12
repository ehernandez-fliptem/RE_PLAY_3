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
  FlashlightOff,
  FlashlightOn,
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

function formatCameraError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message)
      : String(error || "");
  const lower = message.toLowerCase();

  if (!window.isSecureContext) {
    return "La camara solo funciona en HTTPS o localhost. Abre la version https o usa una PC local.";
  }

  if (lower.includes("getusermedia") || lower.includes("not implemented")) {
    return "Este navegador no permite usar la camara. En iPhone usa HTTPS o un navegador compatible.";
  }

  if (
    lower.includes("notfound") ||
    lower.includes("not found") ||
    lower.includes("requested device not found") ||
    lower.includes("overconstrained")
  ) {
    return "No se encontro ninguna camara disponible en este dispositivo.";
  }

  if (
    lower.includes("notallowed") ||
    lower.includes("permission") ||
    lower.includes("denied")
  ) {
    return "Permiso de camara denegado. Habilitalo en el navegador y vuelve a intentar.";
  }

  return message || "Error al acceder a la camara. 401";
}

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
  containerHeight?: number | string;
  autoCaptureIne?: boolean;
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
  containerHeight = 350,
  autoCaptureIne = false,
}: Props) {
  const { delayProximaFoto } = useSelector(
    (state: IRootState) => state.config.data
  );
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraBoxRef = useRef<HTMLDivElement>(null);
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
  const [autoCaptureHint, setAutoCaptureHint] = useState("");
  const [autoCaptureQuality, setAutoCaptureQuality] = useState(0);
  const [autoCaptureDone, setAutoCaptureDone] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const autoCaptureBusyRef = useRef(false);
  const stableFrameRef = useRef<{ data: Uint8ClampedArray | null; count: number }>({
    data: null,
    count: 0,
  });
  const isIneCapture = String(name || "").toLowerCase().includes("ine");
  const isFluidHeight = typeof containerHeight === "string" && containerHeight === "100%";
  const cameraObjectFit = isIneCapture ? "contain" : "cover";
  const resolvedContainerHeight =
    isIneCapture && !isFluidHeight && isMobile
      ? "min(62vh, 520px)"
      : containerHeight;
  const cameraAspectRatio = !isFluidHeight
    ? isIneCapture
      ? "16 / 10"
      : isScan
        ? "4 / 3"
        : undefined
    : undefined;

  const chooseRearCamera = (videoDevices: MediaDeviceInfo[]) => {
    if (videoDevices.length <= 1) return videoDevices[0]?.deviceId || "";
    const rearRegex =
      /(back|rear|environment|trasera|posterior|world|externa|usb)/i;
    const byLabel = videoDevices.find((d) => rearRegex.test(d.label || ""));
    if (byLabel?.deviceId) return byLabel.deviceId;
    return isMobile
      ? videoDevices[videoDevices.length - 1]?.deviceId || videoDevices[0]?.deviceId || ""
      : videoDevices[0]?.deviceId || "";
  };

  const handleDevices = useCallback(
    (mediaDevices: MediaDeviceInfo[]) => {
      const videoDevices = mediaDevices.filter(
        ({ kind }) => kind === "videoinput"
      );
      if (videoDevices.length > 0) {
        setDevices(videoDevices);
        setDeviceId(chooseRearCamera(videoDevices));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setDevices, isMobile]
  );

  const getIneGuideRect = (containerW: number, containerH: number) => {
    const aspect = 1.586;
    let width = Math.min(containerW * 0.88, 640);
    let height = width / aspect;
    const maxHeight = containerH * 0.58;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspect;
    }
    return {
      x: (containerW - width) / 2,
      y: (containerH - height) / 2,
      width,
      height,
    };
  };
  const ineGuideSx = isIneCapture
    ? {
        width: "min(88%, 640px)",
        aspectRatio: "1.586 / 1",
        maxHeight: "58%",
        height: "auto",
      }
    : {};

  const cropIneFromDataUrl = (dataUrl: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const srcW = img.width;
        const srcH = img.height;
        const container = cameraBoxRef.current?.getBoundingClientRect();
        let cropX = Math.round(srcW * 0.06);
        let cropY = Math.round(srcH * 0.12);
        let cropW = Math.round(srcW * 0.88);
        let cropH = Math.round(srcH * 0.76);

        if (container?.width && container?.height) {
          const fitScale = Math.min(container.width / srcW, container.height / srcH);
          const visibleW = srcW * fitScale;
          const visibleH = srcH * fitScale;
          const visibleX = (container.width - visibleW) / 2;
          const visibleY = (container.height - visibleH) / 2;
          const guide = getIneGuideRect(container.width, container.height);
          const guideLeft = Math.max(guide.x, visibleX);
          const guideTop = Math.max(guide.y, visibleY);
          const guideRight = Math.min(guide.x + guide.width, visibleX + visibleW);
          const guideBottom = Math.min(guide.y + guide.height, visibleY + visibleH);

          cropX = Math.round(((guideLeft - visibleX) / visibleW) * srcW);
          cropY = Math.round(((guideTop - visibleY) / visibleH) * srcH);
          cropW = Math.round(((guideRight - guideLeft) / visibleW) * srcW);
          cropH = Math.round(((guideBottom - guideTop) / visibleH) * srcH);
        }

        cropX = Math.max(0, Math.min(srcW - 1, cropX));
        cropY = Math.max(0, Math.min(srcH - 1, cropY));
        cropW = Math.max(1, Math.min(srcW - cropX, cropW));
        cropH = Math.max(1, Math.min(srcH - cropY, cropH));

        const maxWidth = 1400;
        const scale = Math.min(1, maxWidth / cropW);
        const outW = Math.max(1, Math.round(cropW * scale));
        const outH = Math.max(1, Math.round(cropH * scale));

        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(
          img,
          cropX,
          cropY,
          cropW,
          cropH,
          0,
          0,
          outW,
          outH
        );
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  const captureImage = async () => {
    const picture = webcamRef.current?.getScreenshot();
    if (!picture) return;
    const finalPicture = isIneCapture
      ? await cropIneFromDataUrl(picture)
      : picture;
    setValue(name, finalPicture);
    trigger(name);
    clearErrors(name);
    if (setShow) setShow(false);
  };

  const evaluateIneFrame = useCallback(() => {
    const fail = (hint: string, quality = 0) => {
      stableFrameRef.current.count = 0;
      return { ok: false, hint, quality };
    };
    const clamp = (value: number) => Math.max(0, Math.min(1, value));
    const video = (camRef || webcamRef).current?.video;
    const container = cameraBoxRef.current?.getBoundingClientRect();
    if (!video || !container?.width || !container?.height || video.readyState < 2) {
      return fail("Preparando camara...");
    }

    const srcW = video.videoWidth;
    const srcH = video.videoHeight;
    if (!srcW || !srcH) return fail("Preparando camara...");

    const fitScale = Math.min(container.width / srcW, container.height / srcH);
    const visibleW = srcW * fitScale;
    const visibleH = srcH * fitScale;
    const visibleX = (container.width - visibleW) / 2;
    const visibleY = (container.height - visibleH) / 2;
    const guide = getIneGuideRect(container.width, container.height);
    const guideLeft = Math.max(guide.x, visibleX);
    const guideTop = Math.max(guide.y, visibleY);
    const guideRight = Math.min(guide.x + guide.width, visibleX + visibleW);
    const guideBottom = Math.min(guide.y + guide.height, visibleY + visibleH);
    const cropX = Math.round(((guideLeft - visibleX) / visibleW) * srcW);
    const cropY = Math.round(((guideTop - visibleY) / visibleH) * srcH);
    const cropW = Math.round(((guideRight - guideLeft) / visibleW) * srcW);
    const cropH = Math.round(((guideBottom - guideTop) / visibleH) * srcH);

    if (cropW < srcW * 0.35 || cropH < srcH * 0.25) {
      return fail("Centra la INE dentro del rectangulo");
    }

    const sampleW = 160;
    const sampleH = 100;
    const canvas = document.createElement("canvas");
    canvas.width = sampleW;
    canvas.height = sampleH;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return fail("No se pudo analizar la imagen");
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, sampleW, sampleH);
    const data = ctx.getImageData(0, 0, sampleW, sampleH).data;

    let brightness = 0;
    let contrast = 0;
    let edgeScore = 0;
    let darkPixels = 0;
    let lightPixels = 0;
    const gray = new Uint8ClampedArray(sampleW * sampleH);
    for (let i = 0, j = 0; i < data.length; i += 4, j++) {
      const value = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      gray[j] = value;
      brightness += value;
      if (value < 45) darkPixels += 1;
      if (value > 242) lightPixels += 1;
    }
    brightness /= gray.length;
    for (let i = 0; i < gray.length; i++) {
      contrast += Math.abs(gray[i] - brightness);
    }
    contrast /= gray.length;
    for (let y = 1; y < sampleH - 1; y++) {
      for (let x = 1; x < sampleW - 1; x++) {
        const idx = y * sampleW + x;
        edgeScore += Math.abs(gray[idx] - gray[idx - 1]) + Math.abs(gray[idx] - gray[idx - sampleW]);
      }
    }
    edgeScore /= sampleW * sampleH;
    const darkRatio = darkPixels / gray.length;
    const lightRatio = lightPixels / gray.length;

    let motion = 0;
    const prev = stableFrameRef.current.data;
    if (prev) {
      for (let i = 0; i < gray.length; i += 8) {
        motion += Math.abs(gray[i] - prev[i]);
      }
      motion /= Math.ceil(gray.length / 8);
    }
    stableFrameRef.current.data = gray;

    const brightnessScore = clamp(1 - Math.abs(brightness - 145) / 115);
    const contrastScore = clamp((contrast - 12) / 28);
    const edgeQuality = clamp((edgeScore - 7) / 18);
    const glarePenalty = clamp(lightRatio / 0.18);
    const darkPenalty = clamp(darkRatio / 0.28);
    const motionScore = prev ? clamp(1 - motion / 10) : 0.65;
    const quality = clamp(
      brightnessScore * 0.25 +
        contrastScore * 0.25 +
        edgeQuality * 0.25 +
        motionScore * 0.25 -
        glarePenalty * 0.12 -
        darkPenalty * 0.08
    );

    if (brightness < 48 || darkRatio > 0.45) return fail("Falta luz", quality);
    if (brightness > 232 || lightRatio > 0.28) return fail("Hay mucho reflejo", quality);
    if (contrast < 13 || edgeScore < 7.5) return fail("Acerca o enfoca la INE", quality);
    if (motion > 8) {
      return fail("Mantente quieto", quality);
    }
    if (quality < 0.58) return fail("Acomoda la INE en el recuadro", quality);

    stableFrameRef.current.count += 1;
    return {
      ok: stableFrameRef.current.count >= 2,
      hint: stableFrameRef.current.count >= 1 ? "Capturando..." : "Mantente quieto",
      quality,
    };
  }, [camRef]);

  useEffect(() => {
    const checkCameraPermissions = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setWebcamError({
          estado: true,
          mensaje:
            "El navegador no soporta acceso a la camara. Usa un navegador compatible.",
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
          setWebcamError({ estado: true, mensaje: formatCameraError(error) });
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
          setWebcamError({ estado: true, mensaje: formatCameraError(error) });
        });
    }
  }, [permissionsGranted, handleDevices, showBoundary]);

  useEffect(() => {
    setDetectionMode(defaultMode);
  }, [defaultMode]);

  useEffect(() => {
    setAutoCaptureDone(false);
    setAutoCaptureQuality(0);
    autoCaptureBusyRef.current = false;
    stableFrameRef.current = { data: null, count: 0 };
  }, [deviceId, name]);

  useEffect(() => {
    if (!autoCaptureIne || !isIneCapture || !webcamReady || autoCaptureDone || isScan) return;
    const interval = window.setInterval(async () => {
      if (autoCaptureBusyRef.current) return;
      const result = evaluateIneFrame();
      setAutoCaptureHint(result.hint);
      setAutoCaptureQuality(result.quality);
      if (result.ok) {
        autoCaptureBusyRef.current = true;
        setAutoCaptureDone(true);
        window.clearInterval(interval);
        await captureImage();
      }
    }, 300);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCaptureIne, isIneCapture, webcamReady, autoCaptureDone, isScan, evaluateIneFrame]);

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
    setTorchEnabled(false);
    setTorchSupported(false);
    setMediaStream(null);
    setDeviceId(newDeviceId);
  };

  const handleUserMedia = (stream: MediaStream) => {
    setMediaStream(stream);
    const track = stream.getVideoTracks()[0];
    const capabilities = track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
    setTorchSupported(Boolean(capabilities?.torch));
    setTorchEnabled(false);
  };

  const toggleTorch = async () => {
    const track = mediaStream?.getVideoTracks()[0];
    if (!track || !torchSupported) return;
    const next = !torchEnabled;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      setTorchEnabled(next);
    } catch (error) {
      setTorchSupported(false);
      setTorchEnabled(false);
      handlingError(error);
    }
  };

  const handleClickOpen = () => {
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  const scanConstraints = deviceId
    ? {
        deviceId: { exact: deviceId },
      }
    : {
        facingMode: isMobile ? ({ ideal: "environment" } as const) : ({ ideal: "user" } as const),
      };

  const webcamConstraints = deviceId
    ? {
        deviceId: { exact: deviceId },
      }
    : {
        facingMode: isMobile ? ({ ideal: "environment" } as const) : ({ ideal: "user" } as const),
      };

  return (
    <Box
      component="section"
      sx={{
        height: isFluidHeight ? "100%" : "auto",
        display: isFluidHeight ? "flex" : "block",
        flexDirection: isFluidHeight ? "column" : "unset",
        minHeight: 0,
      }}
    >
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
        ref={cameraBoxRef}
        sx={{
          position: "relative",
          display: webcamReady ? "flex" : "none",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          flex: isFluidHeight ? 1 : "unset",
          minHeight: isFluidHeight ? 0 : 220,
          height: resolvedContainerHeight,
          maxHeight: typeof resolvedContainerHeight === "number" ? resolvedContainerHeight : "none",
          aspectRatio: cameraAspectRatio,
          padding: 0,
          overflow: "hidden",
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          bgcolor: isIneCapture ? "#111" : "transparent",
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
        {isIneCapture && torchSupported && !isScan && (
          <Box sx={{ position: "absolute", top: 12, right: 12, zIndex: 95 }}>
            <Button
              variant="contained"
              color={torchEnabled ? "warning" : "secondary"}
              onClick={toggleTorch}
              sx={{ minWidth: 44, width: 44, height: 44, borderRadius: "50%", p: 0 }}
              title={torchEnabled ? "Apagar flash" : "Prender flash"}
            >
              {torchEnabled ? <FlashlightOff /> : <FlashlightOn />}
            </Button>
          </Box>
        )}
        {detectionMode === 1 && (
          <Fragment>
            {isScan ? (
              <Fragment>
                {isScan && handleScan ? (
                  <QrReader
                    key={deviceId}
                    scanDelay={200}
                    videoId={deviceId}
                    constraints={scanConstraints}
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
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
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
                    mensaje: formatCameraError(error),
                  })
                }
                onUserMedia={handleUserMedia}
                screenshotFormat="image/jpeg"
                videoConstraints={webcamConstraints}
                style={{ width: "100%", height: "100%", objectFit: cameraObjectFit }}
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
                  mensaje: formatCameraError(error),
                })
              }
              onUserMedia={handleUserMedia}
              screenshotFormat="image/jpeg"
              videoConstraints={webcamConstraints}
              style={{ width: "100%", height: "100%", objectFit: cameraObjectFit }}
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
        {!webcamError.estado && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              zIndex: 5,
              background: "rgba(0,0,0,0.45)",
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                sx={{
                  width: isScan ? { xs: "72%", sm: "58%" } : isIneCapture ? ineGuideSx.width : "62%",
                  aspectRatio: isScan ? "1 / 1" : isIneCapture ? ineGuideSx.aspectRatio : undefined,
                  maxHeight: isIneCapture ? ineGuideSx.maxHeight : undefined,
                  height: isScan ? "auto" : isIneCapture ? ineGuideSx.height : "78%",
                  borderRadius: isScan ? "18px" : isIneCapture ? "12px" : "50%",
                  border: isIneCapture
                    ? `3px solid ${
                        autoCaptureQuality >= 0.58
                          ? "#2e7d32"
                          : autoCaptureQuality >= 0.38
                            ? "#f9a825"
                            : "rgba(255,255,255,0.85)"
                      }`
                    : "2px solid rgba(255,255,255,0.85)",
                  backgroundColor: "transparent",
                  boxShadow:
                    autoCaptureQuality >= 0.58
                      ? "0 0 0 9999px rgba(0,0,0,0.45), 0 0 18px rgba(46,125,50,0.9)"
                      : "0 0 0 9999px rgba(0,0,0,0.45), 0 0 0 2px rgba(0,0,0,0.2) inset",
                }}
              />
            </Box>
            <Box
              sx={{
                position: "absolute",
                bottom: 12,
                left: 0,
                right: 0,
                textAlign: "center",
                color: "#fff",
                fontSize: 12,
                fontWeight: 600,
                textShadow: "0 1px 2px rgba(0,0,0,0.6)",
              }}
            >
              {isScan
                ? "Coloca el codigo dentro del recuadro"
                : isIneCapture
                ? autoCaptureHint || "Centra la INE dentro del rectangulo"
                : "Centra tu cara dentro del óvalo"}
            </Box>
          </Box>
        )}
      </Box>
      {deviceId && !disabledDevicesMenu && !discretMenuDevices && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexShrink: 0,
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
      {((!!setShow) || (showButton && webcamReady && !isScan)) && (
        <Box
          component="footer"
          sx={{
            mt: isFluidHeight ? 1 : 2,
            display: "flex",
            gap: 1,
            flexShrink: 0,
            justifyContent: "space-between",
            flexDirection: { xs: "column-reverse", sm: "row" },
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
          {showButton && webcamReady && !isScan && (
            <Button
              size="medium"
              type="submit"
              variant="contained"
              color="primary"
              onClick={captureImage}
              startIcon={<CameraAlt />}
              sx={{
                minHeight: 44,
                fontWeight: 700,
                width: { xs: "100%", sm: "auto" },
              }}
            >
              Tomar foto
            </Button>
          )}
        </Box>
      )}
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
