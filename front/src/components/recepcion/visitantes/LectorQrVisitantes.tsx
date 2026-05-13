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
          width: { xs: "92%", md: "50%", lg: "40%", xl: "30%" },
          ...(hideBackdrop
            ? {
                left: "50%",
                bottom: { xs: 8, sm: 16 },
                top: { xs: "72px", sm: "50%" },
                transform: { xs: "translateX(-50%)", sm: "translate(-50%, -50%)" },
                maxHeight: { xs: "calc(100dvh - 84px)", sm: "unset" },
                overflowY: { xs: "auto", sm: "visible" },
              }
            : {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }),
        }}
      >
        <CardContent>
          <Box
            component="section"
            sx={{
              backgroundColor: "info.main",
              color: "info.contrastText",
            }}
          >
            <Typography
              variant="overline"
              component="h5"
              textAlign="center"
              sx={{ mb: 2 }}
            >
              ESCANEAR QR
            </Typography>
          </Box>

          {isLoading && <Spinner />}

          {!isLoading && !result && (
            <Box component="section">
              <Camera
                showButton={false}
                isScan
                handleScan={handleScan}
                name={name}
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
      </Card>
    </Modal>
  );
}
