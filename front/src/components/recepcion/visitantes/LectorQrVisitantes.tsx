import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Fade,
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
  const [identityValidationFailed, setIdentityValidationFailed] = useState(false);
  const [ineCameraKey, setIneCameraKey] = useState(0);

  const handleScan: OnResultFunction = async (scan) => {
    if (!scan?.getText()) return;
    setIsLoading(true);
    const value = scan.getText();
    formContext.setValue(name, value);
    setIdentityValidationFailed(false);
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
    setIdentityValidationFailed(false);
    setIneCameraKey((value) => value + 1);
    formContext.setValue(name, "");
    formContext.setValue("img_ine_validacion", "");
  };

  const handleRetryIdentity = () => {
    setIdentityError("");
    setIdentityValidationFailed(false);
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
    setIdentityValidationFailed(false);
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
    setIdentityValidationFailed(false);
    try {
      const next = await onAuthorizeIdentity({ qr: result.qr, img_ine: ineCapture });
      if (next.ok) {
        setIdentityValidationFailed(false);
        setResult({ ...next, qr: result.qr });
      } else {
        setIdentityError(next.message || "No se pudo validar la INE. Captura otra foto.");
        setIdentityValidationFailed(true);
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
  const flowStep = !result
    ? "scanningQR"
    : identityValidationFailed
      ? "error"
    : isIdentityValidation && !ineCapture
      ? "capturingINE"
      : isIdentityValidation && ineCapture
        ? "previewINE"
        : result.ok
          ? "success"
          : "error";
  const activeStep = flowStep === "scanningQR" ? 0 : flowStep === "capturingINE" ? 1 : 2;
  const visitorLabel = result?.nombre ? `QR de ${result.nombre}` : result?.message || "";
  const isValidatingIdentity = isLoading && isIdentityValidation;

  const StepIndicator = () => (
    <Stack
      direction="row"
      spacing={0.75}
      sx={{
        width: "100%",
        justifyContent: "center",
        mb: { xs: 1.25, sm: 2 },
      }}
    >
      {["QR", "INE", "Validar"].map((label, index) => {
        const isActive = index === activeStep;
        const isDone = index < activeStep || flowStep === "success";
        return (
          <Box
            key={label}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              minHeight: 30,
              px: { xs: 1, sm: 1.4 },
              borderRadius: 999,
              bgcolor: isActive || isDone ? "primary.main" : "grey.100",
              color: isActive || isDone ? "primary.contrastText" : "text.secondary",
              fontSize: { xs: 12, sm: 13 },
              fontWeight: 800,
              transition: "all 180ms ease",
            }}
          >
            <Box
              component="span"
              sx={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                bgcolor: isActive || isDone ? "rgba(255,255,255,0.22)" : "background.paper",
                fontSize: 11,
              }}
            >
              {index + 1}
            </Box>
            {label}
          </Box>
        );
      })}
    </Stack>
  );

  const Header = ({
    title,
    subtitle,
  }: {
    title: string;
    subtitle?: string;
  }) => (
    <Box sx={{ textAlign: "center", mb: { xs: 1.25, sm: 2 } }}>
      <Typography variant="h6" fontWeight={900} sx={{ lineHeight: 1.15 }}>
        {title}
      </Typography>
      {!!subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );

  const ActionBar = ({ children }: { children: React.ReactNode }) => (
    <Box
      sx={{
        width: "100%",
        pt: { xs: 1.25, sm: 1.5 },
        mt: "auto",
        borderTop: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {children}
    </Box>
  );

  const ResultPanel = () => {
    const ok = !!result?.ok;
    const identityResult = identityValidationFailed || result?.img_ine !== undefined;
    const resultTitle = ok
      ? identityResult
        ? "Identidad validada"
        : result?.message || "Acceso permitido"
      : identityResult
        ? "No se pudo validar"
        : "Acceso denegado";
    const resultMessage = ok
      ? identityResult
        ? "Entrada habilitada"
        : result?.message || "Acceso permitido"
      : identityError || result?.message || "Captura la INE de nuevo.";
    return (
      <Fade in timeout={220}>
        <Stack
          spacing={2}
          alignItems="center"
          sx={{
            width: "100%",
            maxWidth: 520,
            mx: "auto",
            py: { xs: 2, sm: 3 },
            px: { xs: 1, sm: 2 },
          }}
        >
          <Box
            sx={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              bgcolor: ok ? "success.light" : "error.light",
              color: ok ? "success.contrastText" : "error.contrastText",
              boxShadow: ok
                ? "0 16px 32px rgba(46,125,50,0.22)"
                : "0 16px 32px rgba(211,47,47,0.22)",
            }}
          >
            {ok ? <CheckCircle sx={{ fontSize: 46 }} /> : <Cancel sx={{ fontSize: 46 }} />}
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h6" fontWeight={900}>
              {resultTitle}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 0.75 }}>
              {resultMessage}
            </Typography>
          </Box>
          {ok && result?.img_ine !== undefined && (
            <Box
              sx={{
                width: "100%",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 2,
                p: 1.5,
                bgcolor: "background.paper",
                boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
              }}
            >
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
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
                    borderRadius: 1.5,
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
          {ok && result?.biostar_modo_manual && result.tipo_check === 5 && onManualClose && (
            <Stack spacing={1.2} alignItems="center" sx={{ width: "100%" }}>
              <Button
                variant="contained"
                color="warning"
                onClick={handleManualClose}
                disabled={isClosingManual}
                sx={{
                  px: 3,
                  py: 1.1,
                  borderRadius: 2,
                  fontWeight: 800,
                  textTransform: "none",
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
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: "100%" }}>
            {!ok && (
              <Button fullWidth variant="outlined" startIcon={<Replay />} onClick={handleRetryIdentity}>
                Capturar de nuevo
              </Button>
            )}
            <Button fullWidth variant={ok ? "contained" : "outlined"} color={ok ? "primary" : "secondary"} onClick={handleRetry}>
              Otro QR
            </Button>
            <Button fullWidth variant="text" color="inherit" onClick={() => setShow(false)}>
              Salir
            </Button>
          </Stack>
        </Stack>
      </Fade>
    );
  };

  const content = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <CardContent
        sx={
          hideBackdrop
            ? {
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                p: { xs: 1.5, sm: 2 },
              }
            : {
                height: { xs: "100dvh", sm: "auto" },
                maxHeight: { xs: "100dvh", sm: "calc(90dvh - 24px)" },
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                p: { xs: 1.5, sm: 2.5 },
              }
        }
      >
        <StepIndicator />

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            overflowX: "hidden",
            pr: { xs: 0, sm: 0.5 },
          }}
        >
          {isLoading && !isValidatingIdentity && (
            <Fade in timeout={180}>
              <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary">
                  Procesando QR...
                </Typography>
              </Stack>
            </Fade>
          )}

          {isValidatingIdentity && (
            <Fade in timeout={180}>
              <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
                <CircularProgress />
                <Typography variant="h6" fontWeight={900}>
                  Procesando...
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Validando la INE y habilitando la entrada.
                </Typography>
              </Stack>
            </Fade>
          )}

          {!isLoading && flowStep === "scanningQR" && (
            <Fade in timeout={220}>
              <Stack spacing={1.5} sx={{ minHeight: "100%" }}>
                <Header title="Escanear QR" subtitle="Coloca el codigo dentro del recuadro." />
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 640,
                    mx: "auto",
                    borderRadius: 2,
                    overflow: "hidden",
                    boxShadow: "0 14px 34px rgba(0,0,0,0.14)",
                  }}
                >
                  <Camera
                    showButton={false}
                    isScan
                    handleScan={handleScan}
                    name={name}
                    containerHeight={hideBackdrop ? "100%" : isMobile ? "min(52dvh, 430px)" : 440}
                  />
                </Box>
                <ActionBar>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
                    {testQr && (
                      <Button variant="outlined" color="info" onClick={handleTestQr} disabled={isLoading}>
                        Validar prueba
                      </Button>
                    )}
                    {!hideActions && (
                      <Button variant="outlined" color="secondary" onClick={() => setShow(false)}>
                        Salir
                      </Button>
                    )}
                  </Stack>
                </ActionBar>
              </Stack>
            </Fade>
          )}

          {!isLoading && flowStep === "capturingINE" && (
            <Fade in timeout={220}>
              <Stack spacing={1.5} sx={{ minHeight: "100%" }}>
                <Header title="Validar identidad" subtitle={visitorLabel} />
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Coloca la INE dentro del recuadro y mantente quieto.
                </Typography>
                {!!identityError && (
                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: "error.light",
                      bgcolor: "rgba(211, 47, 47, 0.08)",
                      color: "error.main",
                      borderRadius: 1.5,
                      px: 1.5,
                      py: 1,
                    }}
                  >
                    <Typography variant="body2" textAlign="center" fontWeight={800}>
                      {identityError}
                    </Typography>
                  </Box>
                )}
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 720,
                    mx: "auto",
                    borderRadius: 2,
                    overflow: "hidden",
                    boxShadow: "0 14px 34px rgba(0,0,0,0.14)",
                  }}
                >
                  <Camera
                    key={ineCameraKey}
                    name="img_ine_validacion"
                    showButton
                    defaultMode={1}
                    containerHeight={isMobile ? "min(48dvh, 390px)" : 420}
                    disabledDevicesMenu={false}
                    autoCaptureIne
                  />
                </Box>
                <ActionBar>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
                    <Button variant="outlined" color="secondary" onClick={handleRetry}>
                      Otro QR
                    </Button>
                    <Button variant="text" color="inherit" onClick={() => setShow(false)}>
                      Salir
                    </Button>
                  </Stack>
                </ActionBar>
              </Stack>
            </Fade>
          )}

          {!isLoading && flowStep === "previewINE" && (
            <Fade in timeout={220}>
              <Stack spacing={1.5} alignItems="center" sx={{ minHeight: "100%" }}>
                <Header title="Revisar captura" subtitle="Verifica que la INE se vea clara antes de continuar." />
                <Box
                  sx={{
                    width: "100%",
                    maxWidth: 620,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    p: { xs: 1, sm: 1.5 },
                    bgcolor: "background.paper",
                    boxShadow: "0 14px 34px rgba(0,0,0,0.12)",
                  }}
                >
                  <Box
                    component="img"
                    src={ineCapture}
                    alt="INE capturada"
                    sx={{
                      width: "100%",
                      maxHeight: { xs: "42dvh", sm: 360 },
                      objectFit: "contain",
                      borderRadius: 1.5,
                      bgcolor: "grey.100",
                    }}
                  />
                </Box>
                <ActionBar>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end">
                    <Button variant="outlined" startIcon={<Replay />} onClick={handleRetryIdentity}>
                      Capturar de nuevo
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      disabled={!ineCapture || !onAuthorizeIdentity}
                      onClick={handleAuthorizeIdentity}
                      sx={{ fontWeight: 900, minHeight: 44 }}
                    >
                      Validar INE y habilitar entrada
                    </Button>
                  </Stack>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} justifyContent="flex-end" sx={{ mt: 1 }}>
                    <Button variant="outlined" color="secondary" onClick={handleRetry}>
                      Otro QR
                    </Button>
                    <Button variant="text" color="inherit" onClick={() => setShow(false)}>
                      Salir
                    </Button>
                  </Stack>
                </ActionBar>
              </Stack>
            </Fade>
          )}

          {!isLoading && (flowStep === "success" || flowStep === "error") && <ResultPanel />}
        </Box>
      </CardContent>
    </Box>
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
