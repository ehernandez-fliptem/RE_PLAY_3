import { Home, Mail } from "@mui/icons-material";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { clienteAxios } from "../../app/config/axios";
import Spinner from "../utils/Spinner";
import ERROR from "../../../src/assets/img/cuteKitten.png";

type Props = {
  error: unknown;
};

const extractComponentName = (error: unknown): string => {
  const stack = (error as Error)?.stack || "";

  // Buscar componentes React en el stack trace
  const reactComponentMatch = stack.match(/at\s+(\w+)\s+\(/);
  if (reactComponentMatch && reactComponentMatch[1]) {
    return reactComponentMatch[1];
  }

  // Buscar en formato de componentes funcionales
  const functionalComponentMatch = stack.match(/at\s+(\w+)\s+\(/);
  if (functionalComponentMatch && functionalComponentMatch[1]) {
    return functionalComponentMatch[1];
  }

  // Si no se encuentra, buscar cualquier función que parezca un componente
  const anyComponentMatch = stack.match(/at\s+([A-Z][a-zA-Z]*)\s+\(/);
  if (anyComponentMatch && anyComponentMatch[1]) {
    return anyComponentMatch[1];
  }

  return "ComponenteDesconocido";
};

export default function GlobalError({ error }: Props) {
  const [enviado, setEnviado] = useState(false);
  const [pensando, setPensando] = useState(false);

  const handleEnviarError = async () => {
    try {
      setPensando(true);
      const componentName = extractComponentName(error);
      const { data } = await clienteAxios.post("/api/error/notificar", {
        mensaje: (error as Error).message,
        componente: componentName,
        stack: (error as Error).stack,
        fecha: new Date(Date.now()),
      });

      if (data.estado) {
        setEnviado(true);
      } else {
        console.error("El servidor respondió con error:", data.mensaje);
        setEnviado(false);
      }
    } catch (err) {
      console.error("Error al notificar:", err);
      setEnviado(false);
    } finally {
      setPensando(false);
    }
  };

  const regresar = () => {
    window.location.href = "/";
  };

  return (
    <Box
      sx={{
        width: "100dvw",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        p: 5,
      }}
      role="alert"
      component="div"
    >
      <Typography variant="h5" color="text.secondary" sx={{ my: 1.5 }}>
        <strong>¡Ocurrió un error inesperado!</strong>
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ my: 1.5 }}>
        Póngase en contacto con el soporte del sistema.
      </Typography>
      <Box
        component="img"
        src={ERROR}
        alt="Cute Kitten"
        style={{ maxWidth: "200px" }}
      />
      <Typography color="error" textAlign="center">
        {(error as Error).name}: {(error as Error).message}
      </Typography>

      {enviado && (
        <Typography sx={{ my: 2 }} color="success.main">
          Error notificado correctamente.
        </Typography>
      )}

      <Box
        component="footer"
        sx={{
          display: "flex",
          justifyContent: "end",
          mt: 2,
          mb: 0.5,
        }}
      >
        {pensando ? (
          <Spinner />
        ) : (
          <Stack
            spacing={2}
            direction={{ xs: "column-reverse", sm: "row" }}
            justifyContent="end"
            sx={{ width: "100%" }}
          >
            <Button
              variant="contained"
              color="secondary"
              sx={{ mt: 3 }}
              onClick={regresar}
              startIcon={<Home />}
            >
               Ir a inicio
            </Button>
            {!enviado && (
              <Button
                variant="contained"
                sx={{ mt: 3 }}
                onClick={handleEnviarError}
                startIcon={<Mail />}
              >
                Notificar a soporte
              </Button>
            )}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
