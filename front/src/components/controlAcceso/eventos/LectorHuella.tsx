import { useCallback, useEffect, useRef, useState } from "react";
import { Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import UsbOffIcon from "@mui/icons-material/UsbOff";
import { clienteAxios } from "../../../app/config/axios";
import {
  cancelarLectura,
  identificar,
  obtenerEstadoAgente,
  sincronizarPlantillas,
  type EstadoAgente,
} from "../../../app/config/agenteBiometrico";

/**
 * Modo caseta por huella.
 *
 * El ciclo es un bucle: identificar() se queda esperando a que alguien ponga el
 * dedo, resuelve, muestra el resultado unos segundos y vuelve a esperar. Nadie
 * tiene que tocar la pantalla.
 *
 * La autorizacion NO se decide aqui: el agente solo dice "es la persona X" y
 * /api/eventos/validar-huella aplica las mismas reglas que el QR.
 */

type Fase = "iniciando" | "esperando" | "leyendo" | "validando" | "autorizado" | "rechazado" | "sin-lector";

type Resultado = { nombre?: string; mensaje: string; entrada?: boolean };

/** Cuanto se queda en pantalla el resultado antes de volver a esperar. */
const MS_RESULTADO = 3500;

export default function LectorHuella({ activo }: { activo: boolean }) {
  const [fase, setFase] = useState<Fase>("iniciando");
  const [estado, setEstado] = useState<EstadoAgente | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  // El bucle vive fuera de React: un flag para poder cortarlo al desmontar o al
  // cambiar de metodo, sin depender de que un setState llegue a tiempo.
  const corriendo = useRef(false);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      corriendo.current = false;
      void cancelarLectura();
    };
  }, []);

  const validarEnBackend = useCallback(async (personId: string): Promise<Resultado> => {
    try {
      const res = await clienteAxios.post("/api/eventos/validar-huella", { personId });
      if (!res.data?.estado) {
        return { mensaje: res.data?.mensaje || "No se pudo validar el acceso." };
      }
      const d = res.data.datos;
      return {
        nombre: d?.nombre,
        entrada: d?.tipo_check !== 6,
        mensaje: d?.advertencia_apertura
          ? `Registrado, pero la puerta no abrio: ${d.advertencia_apertura}`
          : d?.tipo_check === 6
            ? "Salida registrada"
            : "Adelante",
      };
    } catch {
      // handlingError no: en caseta un toast rojo por cada error de red es ruido
      // sobre una pantalla que ya muestra el estado en grande.
      return { mensaje: "Error de comunicacion con el servidor." };
    }
  }, []);

  const bucle = useCallback(async () => {
    if (corriendo.current) return;
    corriendo.current = true;

    while (corriendo.current && montado.current) {
      const st = await obtenerEstadoAgente();
      if (!montado.current) break;
      setEstado(st);

      if (!st.disponible || !st.conectado) {
        setFase("sin-lector");
        // Reintento lento: el lector desconectado no se arregla con insistir.
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }

      if (st.plantillasCargadas === 0) {
        const sync = await sincronizarPlantillas();
        if (!montado.current) break;
        if (!sync.ok) {
          setEstado({ ...st, problema: sync.mensaje, hint: "Recarga la pagina. Si sigue, avisa a sistemas." });
          setFase("sin-lector");
          await new Promise((r) => setTimeout(r, 4000));
          continue;
        }
      }

      setFase("esperando");
      const ident = await identificar();
      if (!montado.current || !corriendo.current) break;

      if (!ident.ok) {
        // Calidad baja o dedo mal puesto: se dice y se vuelve a esperar.
        setResultado({ mensaje: ident.mensaje || "No se pudo leer la huella." });
        setFase("rechazado");
        await new Promise((r) => setTimeout(r, MS_RESULTADO));
        continue;
      }

      if (!ident.identificado || !ident.personId) {
        setResultado({ mensaje: "Huella no reconocida" });
        setFase("rechazado");
        await new Promise((r) => setTimeout(r, MS_RESULTADO));
        continue;
      }

      setFase("validando");
      const r = await validarEnBackend(ident.personId);
      if (!montado.current) break;

      setResultado(r);
      setFase(r.nombre ? "autorizado" : "rechazado");
      await new Promise((res) => setTimeout(res, MS_RESULTADO));
    }

    corriendo.current = false;
  }, [validarEnBackend]);

  useEffect(() => {
    if (activo) {
      void bucle();
    } else {
      corriendo.current = false;
      void cancelarLectura();
      setFase("iniciando");
      setResultado(null);
    }
  }, [activo, bucle]);

  const vista = (() => {
    switch (fase) {
      case "sin-lector":
        return {
          icono: <UsbOffIcon sx={{ fontSize: 96 }} />,
          color: "warning.main",
          titulo: "Lector no disponible",
          sub: estado?.problema || "No se detecta el lector de huella.",
          hint: estado?.hint,
        };
      case "leyendo":
        return { icono: <FingerprintIcon sx={{ fontSize: 120 }} />, color: "info.main", titulo: "Leyendo huella", sub: "No retires el dedo" };
      case "validando":
        return { icono: <CircularProgress size={96} />, color: "info.main", titulo: "Validando tu acceso", sub: "Un momento" };
      case "autorizado":
        return {
          icono: <CheckCircleIcon sx={{ fontSize: 120 }} />,
          color: "success.main",
          titulo: resultado?.nombre || "Acceso autorizado",
          sub: resultado?.mensaje || "Adelante",
        };
      case "rechazado":
        return {
          icono: <CancelIcon sx={{ fontSize: 120 }} />,
          color: "error.main",
          titulo: "Acceso rechazado",
          sub: resultado?.mensaje || "No se encontro autorizacion",
        };
      case "iniciando":
        return { icono: <CircularProgress size={72} />, color: "text.secondary", titulo: "Preparando lector", sub: "" };
      default:
        return {
          icono: <FingerprintIcon sx={{ fontSize: 120 }} />,
          color: "primary.main",
          titulo: "Coloca tu dedo en el lector",
          sub: "Esperando huella",
        };
    }
  })();

  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={2}
      sx={{ height: "100%", width: "100%", textAlign: "center", p: 3 }}
    >
      <Box sx={{ color: vista.color, display: "flex" }}>{vista.icono}</Box>
      <Typography variant="h4" sx={{ color: vista.color, fontWeight: 600 }}>
        {vista.titulo}
      </Typography>
      {vista.sub && (
        <Typography variant="h6" color="text.secondary">
          {vista.sub}
        </Typography>
      )}
      {"hint" in vista && vista.hint && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 520 }}>
          {vista.hint}
        </Typography>
      )}

      {fase === "sin-lector" && (
        <Button variant="outlined" onClick={() => void bucle()} sx={{ mt: 1 }}>
          Reintentar ahora
        </Button>
      )}

      {estado?.modo === "mock" && (
        <Typography variant="caption" sx={{ color: "warning.main", mt: 2 }}>
          Lector simulado (modo desarrollo) &mdash; no usar en produccion
        </Typography>
      )}
    </Stack>
  );
}
