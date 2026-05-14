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
} from "@mui/material";
import { CheckCircle, Cancel, Replay } from "@mui/icons-material";
import type { OnResultFunction } from "react-qr-reader";
import { useFormContext } from "react-hook-form";
import Camera from "../../utils/Camera";
import Spinner from "../../utils/Spinner";

type ResultState = {
  ok: boolean;
  message: string;
  img_ine?: string;
  nombre?: string;
};

type Props = {
  name: string;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  onQrValidate: (value: string) => Promise<ResultState>;
  testQr?: string;
  hideBackdrop?: boolean;
  hideActions?: boolean;
  allowBackdropClose?: boolean;
  allowEscapeClose?: boolean;
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
}: Props) {
  const formContext = useFormContext();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResultState | null>(null);

  const handleScan: OnResultFunction = async (scan) => {
    if (!scan?.getText()) return;
    setIsLoading(true);
    const value = scan.getText();
    formContext.setValue(name, value);
    try {
      const next = await onQrValidate(value);
      setResult(next);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    setResult(null);
    formContext.setValue(name, "");
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
      setResult(next);
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
            : undefined
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

        {!isLoading && result && (
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
      {!hideActions && (
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
            : { xs: "92%", md: "50%", lg: "40%", xl: "30%" },
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
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }),
        }}
      >
        {content}
      </Card>
    </Modal>
  );
}
