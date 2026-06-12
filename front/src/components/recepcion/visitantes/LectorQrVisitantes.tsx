import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Modal,
  type ModalProps,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { CheckCircle, Cancel, Replay } from "@mui/icons-material";
import type { OnResultFunction } from "react-qr-reader";
import { useFormContext } from "react-hook-form";
import { useWatch } from "react-hook-form";
import Camera from "../../utils/Camera";
import Spinner from "../../utils/Spinner";

type ResultState = {
  ok: boolean;
  message: string;
  img_ine?: string;
  nombre?: string;
  tipo_check?: number;
  biostar_modo_manual?: boolean;
  requiere_validacion_identidad?: boolean;
  qr?: string;
};

type Props = {
  name: string;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  onQrValidate: (value: string) => Promise<ResultState>;
  onAuthorizeIdentity?: (value: { qr: string; img_ine: string }) => Promise<ResultState>;
  testQr?: string;
  hideBackdrop?: boolean;
  hideActions?: boolean;
  allowBackdropClose?: boolean;
  allowEscapeClose?: boolean;
  onManualClose?: () => Promise<{ ok: boolean; message: string }>;
};

export default function LectorQrVisitantes({
  name,
  setShow,
  onQrValidate,
  testQr,
  hideBackdrop = false,
  hideActions = false,
  allowBackdropClose = false,
  allowEscapeClose = true,
  onManualClose,
  onAuthorizeIdentity,
}: Props) {
  const formContext = useFormContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const ineCapture = useWatch({ control: formContext.control, name: "img_ine_validacion" }) as string;
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);
  const [isClosingManual, setIsClosingManual] = useState(false);
  const [manualCloseMessage, setManualCloseMessage] = useState<string>("");
  const [identityError, setIdentityError] = useState("");
  const [ineCameraKey, setIneCameraKey] = useState(0);

  const handleScan: OnResultFunction = async (scan) => {
    if (!scan?.getText()) return;
    setIsLoading(true);
    const value = scan.getText();
    formContext.setValue(name, value);
    try {
      const next = await onQrValidate(value);
      setResult({ ...next, qr: value });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    setManualCloseMessage("");
    setIdentityError("");
    setIneCameraKey((value) => value + 1);
    formContext.setValue(name, "");
    formContext.setValue("img_ine_validacion", "");
  };

  const handleRetryIdentity = () => {
    setIdentityError("");
    setIneCameraKey((value) => value + 1);
    formContext.setValue("img_ine_validacion", "");
    if (result?.qr) {
      setResult({
        ...result,
        ok: false,
        requiere_validacion_identidad: true,
        message: result.nombre
          ? `QR de ${result.nombre}. Captura la INE para habilitar entrada.`
          : "Captura la INE para habilitar entrada.",
      });
    }
  };

  const handleManualClose = async () => {
    if (!onManualClose || isClosingManual) return;
    setIsClosingManual(true);
    setManualCloseMessage("");
    try {
      const response = await onManualClose();
      setManualCloseMessage(response.message || (response.ok ? "Acceso cerrado." : "No se pudo cerrar."));
    } finally {
      setIsClosingManual(false);
    }
  };

  useEffect(() => {
    if (!allowEscapeClose) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setShow(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [setShow, allowEscapeClose]);

  const handleTestQr = async () => {
    if (!testQr) return;
    setIsLoading(true);
    formContext.setValue(name, testQr);
    try {
      const next = await onQrValidate(testQr);
      setResult({ ...next, qr: testQr });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthorizeIdentity = async () => {
    if (!result?.qr || !ineCapture || !onAuthorizeIdentity) return;
    setIsLoading(true);
    setIdentityError("");
    try {
      const next = await onAuthorizeIdentity({ qr: result.qr, img_ine: ineCapture });
      if (next.ok) {
        setResult({ ...next, qr: result.qr });
      } else {
        setIdentityError(next.message || "No se pudo validar la INE. Captura otra foto.");
        formContext.setValue("img_ine_validacion", "");
        setResult({
          ...result,
          ...next,
          ok: false,
          qr: result.qr,
          requiere_validacion_identidad: true,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose: NonNullable<ModalProps["onClose"]> = (
    _event,
    reason
  ) => {
    if (reason === "escapeKeyDown" && !allowEscapeClose) return;
    if (reason === "backdropClick" && !allowBackdropClose) return;
    if (reason === "escapeKeyDown" && allowEscapeClose) {
      setShow(false);
      return;
    }
    if (reason === "backdropClick" && allowBackdropClose) {
      setShow(false);
    }
  };

  const isIdentityValidation = !!result?.requiere_validacion_identidad;

  const content = (
    <>
      <CardContent
        sx={
          hideBackdrop
            ? {
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                p: 2,
              }
            : {
                maxHeight: { xs: "calc(100dvh - 72px)", sm: "calc(90dvh - 88px)" },
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                p: { xs: 1.5, sm: 2 },
              }
        }
      >
        <Box
          component="section"
          sx={{
            backgroundColor: "info.main",
            color: "info.contrastText",
            mb: 1,
          }}
        >
          <Typography variant="overline" component="h5" textAlign="center">
            ESCANEAR QR
          </Typography>
        </Box>

        {isLoading && <Spinner />}

        {!isLoading && !result && (
          <Box component="section" sx={hideBackdrop ? { flex: 1, minHeight: 0 } : undefined}>
            <Camera
              showButton={false}
              isScan
              handleScan={handleScan}
              name={name}
              containerHeight={hideBackdrop ? "100%" : 350}
            />
          </Box>
        )}

        {!isLoading && result && result.requiere_validacion_identidad && (
          <Stack
            spacing={{ xs: 1.25, sm: 1.75 }}
            sx={{
              py: { xs: 0.5, sm: 1.5 },
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              overflowX: "hidden",
              px: { xs: 0.25, sm: 0 },
            }}
          >
            <Box sx={{ width: "100%", textAlign: "center" }}>
              <Typography variant="h6" fontWeight={800}>
                Validar identidad
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {result.nombre ? `QR de ${result.nombre}` : result.message}
              </Typography>
            </Box>
            {!!identityError && (
              <Box
                sx={{
                  width: "100%",
                  border: "1px solid",
                  borderColor: "error.light",
                  bgcolor: "rgba(211, 47, 47, 0.08)",
                  color: "error.main",
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 1,
                }}
              >
                <Typography variant="body2" textAlign="center" fontWeight={700}>
                {identityError}
                </Typography>
              </Box>
            )}
            <Box
              sx={{
                width: "100%",
                display: "grid",
                gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 280px" },
                gap: { xs: 1.25, md: 2 },
                alignItems: "stretch",
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  minWidth: 0,
                }}
              >
                <Camera
                  key={ineCameraKey}
                  name="img_ine_validacion"
                  showButton
                  defaultMode={1}
                  containerHeight={isMobile ? "min(48dvh, 390px)" : 390}
                  disabledDevicesMenu={false}
                  autoCaptureIne
                />
              </Box>
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  bgcolor: "background.paper",
                  p: 1.25,
                  minHeight: { xs: 96, md: "auto" },
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 1,
                }}
              >
                <Typography variant="subtitle2" fontWeight={800}>
                  Captura actual
                </Typography>
                {ineCapture ? (
                  <Box
                    component="img"
                    src={ineCapture}
                    alt="INE capturada"
                    sx={{
                      width: "100%",
                      maxHeight: { xs: 120, md: 210 },
                      objectFit: "contain",
                      borderRadius: 1,
                      bgcolor: "grey.100",
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Coloca la INE en el recuadro y toma la foto.
                  </Typography>
                )}
              </Box>
            </Box>
            <Box
              sx={{
                width: "100%",
                position: { xs: "sticky", sm: "static" },
                bottom: 0,
                zIndex: 2,
                bgcolor: "background.paper",
                borderTop: { xs: "1px solid", sm: "none" },
                borderColor: "divider",
                pt: { xs: 1, sm: 0 },
              }}
            >
              <Stack spacing={1} sx={{ width: "100%" }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={!ineCapture || !onAuthorizeIdentity}
                  onClick={handleAuthorizeIdentity}
                  sx={{ minHeight: 46, fontWeight: 800 }}
                >
                  Validar INE y habilitar entrada
                </Button>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button fullWidth variant="outlined" startIcon={<Replay />} onClick={handleRetryIdentity}>
                    Capturar de nuevo
                  </Button>
                  <Button fullWidth variant="outlined" color="secondary" onClick={handleRetry}>
                    Otro QR
                  </Button>
                  <Button fullWidth variant="text" color="inherit" onClick={() => setShow(false)}>
                    Salir
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Stack>
        )}

        {!isLoading && result && !result.requiere_validacion_identidad && (
          <Stack spacing={2} alignItems="center" sx={{ py: 3 }}>
            {result.ok ? (
              <CheckCircle color="success" sx={{ fontSize: 64 }} />
            ) : (
              <Cancel color="error" sx={{ fontSize: 64 }} />
            )}
            <Typography variant="h6" textAlign="center">
              {result.ok ? result.message || "Acceso permitido" : "Acceso denegado"}
            </Typography>
            {result.ok && result.img_ine !== undefined && (
              <Box
                sx={{
                  width: "100%",
                  maxWidth: 420,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 1.5,
                  bgcolor: "background.paper",
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  INE registrada
                </Typography>
                {result.img_ine ? (
                  <Box
                    component="img"
                    src={result.img_ine}
                    alt={`INE ${result.nombre || "visitante"}`}
                    sx={{
                      width: "100%",
                      maxHeight: 220,
                      objectFit: "contain",
                      borderRadius: 1,
                      bgcolor: "grey.100",
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Sin INE registrada.
                  </Typography>
                )}
              </Box>
            )}
            {!result.ok && (
              <Typography variant="body2" textAlign="center">
                {result.message}
              </Typography>
            )}
            {result.ok && result.biostar_modo_manual && result.tipo_check === 5 && onManualClose && (
              <Stack spacing={1.2} alignItems="center" sx={{ width: "100%", maxWidth: 420 }}>
                <Button
                  variant="contained"
                  color="warning"
                  onClick={handleManualClose}
                  disabled={isClosingManual}
                  sx={{
                    px: 3,
                    py: 1.1,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: "none",
                    boxShadow: "0 10px 24px rgba(255,152,0,0.3)",
                  }}
                >
                  {isClosingManual ? "Cerrando..." : "Cerrar pluma"}
                </Button>
                {!!manualCloseMessage && (
                  <Typography
                    variant="body2"
                    textAlign="center"
                    color={manualCloseMessage.toLowerCase().includes("no se pudo") ? "error.main" : "success.main"}
                  >
                    {manualCloseMessage}
                  </Typography>
                )}
              </Stack>
            )}
            {hideActions && (
              <Button
                variant="outlined"
                startIcon={<Replay />}
                onClick={handleRetry}
                disabled={isLoading}
              >
                Escanear de nuevo
              </Button>
            )}
          </Stack>
        )}
      </CardContent>
      {!hideActions && !isIdentityValidation && (
        <CardActions sx={{ px: 3, pb: 3 }}>
          <Stack
            spacing={2}
            direction={{ xs: "column-reverse", sm: "row" }}
            justifyContent="end"
            sx={{ width: "100%" }}
          >
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setShow(false)}
            >
              Cerrar
            </Button>
            {testQr && !result && (
              <Button
                variant="outlined"
                color="info"
                onClick={handleTestQr}
                disabled={isLoading}
              >
                Validar prueba
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Replay />}
              onClick={handleRetry}
              disabled={isLoading}
            >
              Escanear de nuevo
            </Button>
          </Stack>
        </CardActions>
      )}
    </>
  );

  if (hideBackdrop) {
    return (
      <Card
        elevation={2}
        sx={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {content}
      </Card>
    );
  }

  return (
    <Modal
      disableEscapeKeyDown
      disableAutoFocus={hideBackdrop}
      disableEnforceFocus={hideBackdrop}
      disableRestoreFocus={hideBackdrop}
      open
      onClose={handleModalClose}
      sx={
        hideBackdrop
          ? {
              pointerEvents: "none",
              zIndex: (theme) => theme.zIndex.appBar - 1,
            }
          : undefined
      }
      slotProps={{
        backdrop: {
          invisible: hideBackdrop,
        },
      }}
    >
      <Card
        elevation={5}
        sx={{
          pointerEvents: "auto",
          position: "absolute",
          width: hideBackdrop
            ? { xs: "calc(100vw - 16px)", sm: "min(680px, calc(100vw - 32px))" }
            : { xs: "100vw", sm: "92%", md: "min(78vw, 980px)", lg: "min(68vw, 1100px)" },
          ...(hideBackdrop
            ? {
                left: "50%",
                top: { xs: 72, sm: 80 },
                bottom: 8,
                transform: "translateX(-50%)",
                maxHeight: { xs: "calc(100dvh - 80px)", sm: "calc(100dvh - 96px)" },
                overflow: "hidden",
              }
            : {
                top: { xs: 0, sm: "50%" },
                left: { xs: 0, sm: "50%" },
                transform: { xs: "none", sm: "translate(-50%, -50%)" },
                height: { xs: "100dvh", sm: "auto" },
                maxHeight: { xs: "100dvh", sm: "90dvh" },
                overflow: "hidden",
                borderRadius: { xs: 0, sm: 2 },
              }),
        }}
      >
        {content}
      </Card>
    </Modal>
  );
}
