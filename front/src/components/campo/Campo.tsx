import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { CameraAlt, Close, Login, Logout, Visibility } from "@mui/icons-material";
import Webcam from "react-webcam";
import { enqueueSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import { clienteAxios, handlingError } from "../../app/config/axios";
import { useSelector } from "react-redux";
import type { IRootState } from "../../app/store";
import Spinner from "../utils/Spinner";

type EstadoCampo = {
  id_empleado: string;
  empleado: { id_empleado: number; nombre: string };
  siguiente: "IN" | "OUT";
  ultimo: null | {
    tipo: "IN" | "OUT";
    fecha_hora_servidor: string;
    latitud: number;
    longitud: number;
    precision?: number;
  };
  habilitado: boolean;
};

type RegistroCampo = {
  _id: string;
  tipo: "IN" | "OUT";
  fecha_hora_servidor: string;
  latitud: number;
  longitud: number;
  precision?: number;
  origen: string;
  estatus: string;
};

export default function Campo() {
  const navigate = useNavigate();
  const webcamRef = useRef<Webcam | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [estado, setEstado] = useState<EstadoCampo | null>(null);
  const [registros, setRegistros] = useState<RegistroCampo[]>([]);
  const [mensajeBloqueo, setMensajeBloqueo] = useState("");
  const [codigoBloqueo, setCodigoBloqueo] = useState("");
  const [openCam, setOpenCam] = useState(false);
  const [tipoSeleccionado, setTipoSeleccionado] = useState<"IN" | "OUT" | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string>("");
  const [openMapa, setOpenMapa] = useState(false);
  const [registroMapa, setRegistroMapa] = useState<RegistroCampo | null>(null);
  const { rol } = useSelector((state: IRootState) => state.auth.data);
  const esSuperAdmin = rol.includes(1);

  const cargarEstado = async () => {
    const res = await clienteAxios.get("/api/campo/estado");
    if (!res.data.estado) {
      setEstado(null);
      setCodigoBloqueo(res.data.codigo || "");
      setMensajeBloqueo(res.data.mensaje || "No fue posible obtener tu estado de campo.");
      return;
    }
    setCodigoBloqueo("");
    setMensajeBloqueo("");
    setEstado(res.data.datos as EstadoCampo);
  };

  const cargarRegistros = async () => {
    const res = await clienteAxios.get("/api/campo/mis-registros?limite=8");
    if (res.data.estado) {
      setRegistros((res.data.datos || []) as RegistroCampo[]);
    }
  };

  const cargarTodo = async () => {
    try {
      setIsLoading(true);
      await Promise.all([cargarEstado(), cargarRegistros()]);
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) {
        navigate("/logout", { replace: true });
        return;
      }
      setMensajeBloqueo("No fue posible obtener la información del módulo.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const obtenerUbicacion = async (): Promise<{
    latitud: number;
    longitud: number;
    precision: number;
  }> => {
    return await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (geo) => {
          resolve({
            latitud: geo.coords.latitude,
            longitud: geo.coords.longitude,
            precision: geo.coords.accuracy || 0,
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
      );
    });
  };

  const abrirCamara = (tipo: "IN" | "OUT") => {
    if (estado?.siguiente !== tipo) {
      enqueueSnackbar(`Ahora solo puedes registrar ${estado?.siguiente || "IN"}.`, {
        variant: "warning",
      });
      return;
    }
    setTipoSeleccionado(tipo);
    setPreviewFoto("");
    setOpenCam(true);
  };

  const capturar = async () => {
    const foto = webcamRef.current?.getScreenshot();
    if (!foto) {
      enqueueSnackbar("No se pudo capturar la foto.", { variant: "warning" });
      return;
    }
    setPreviewFoto(foto);
  };

  const confirmarRegistro = async () => {
    if (!tipoSeleccionado || !previewFoto) return;
    try {
      setIsSaving(true);
      const ubicacion = await obtenerUbicacion();
      const res = await clienteAxios.post("/api/campo/registrar", {
        tipo: tipoSeleccionado,
        latitud: ubicacion.latitud,
        longitud: ubicacion.longitud,
        precision: ubicacion.precision,
        foto: previewFoto,
      });
      if (!res.data.estado) {
        enqueueSnackbar(res.data.mensaje || "No fue posible registrar el movimiento.", {
          variant: "warning",
        });
        return;
      }
      enqueueSnackbar(`Check ${tipoSeleccionado} guardado correctamente.`, {
        variant: "success",
      });
      setOpenCam(false);
      setTipoSeleccionado(null);
      setPreviewFoto("");
      await cargarTodo();
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) {
        navigate("/logout", { replace: true });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Spinner />;

  const abrirMapa = (registro: RegistroCampo) => {
    setRegistroMapa(registro);
    setOpenMapa(true);
  };

  const urlMapaEmbed = (() => {
    if (!registroMapa) return "";
    const lat = registroMapa.latitud;
    const lng = registroMapa.longitud;
    const delta = 0.005;
    const left = lng - delta;
    const right = lng + delta;
    const top = lat + delta;
    const bottom = lat - delta;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
  })();

  const ocultarBloqueoSuperAdmin =
    esSuperAdmin && codigoBloqueo === "CAMPO_EMP_NOT_FOUND";
  const mostrarBloqueo = !!mensajeBloqueo && !ocultarBloqueoSuperAdmin;

  return (
    <Box component="section" sx={{ maxWidth: 920, mx: "auto" }}>
      <Card elevation={5}>
        <CardContent>
          <Typography variant="h5" textAlign="center" sx={{ mb: 2 }}>
            Registro de Campo
          </Typography>
          {mostrarBloqueo ? (
            <Alert severity="warning">{mensajeBloqueo}</Alert>
          ) : (
            <Stack spacing={2}>
              <Typography variant="body2">
                Empleado: <strong>{estado?.empleado?.nombre || "Super Admin"}</strong>
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<Login />}
                  onClick={() => abrirCamara("IN")}
                  disabled={estado?.siguiente !== "IN"}
                  sx={{
                    color: "common.white",
                    fontWeight: 700,
                    "&.Mui-disabled": {
                      bgcolor: "grey.500",
                      color: "common.white",
                    },
                  }}
                >
                  Check In
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<Logout />}
                  onClick={() => abrirCamara("OUT")}
                  disabled={estado?.siguiente !== "OUT"}
                  sx={{
                    fontWeight: 700,
                    "&.Mui-disabled": {
                      bgcolor: "grey.500",
                      color: "common.white",
                    },
                  }}
                >
                  Check Out
                </Button>
              </Stack>

              <Divider />
              <Typography variant="subtitle2">Resumen de tus últimos movimientos</Typography>
              {registros.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Aún no tienes movimientos registrados.
                </Typography>
              ) : (
                <List dense>
                  {registros.map((item) => (
                    <ListItem key={item._id} divider sx={{ pr: 6 }}>
                      <ListItemText
                        primary={`${item.tipo} - ${new Date(item.fecha_hora_servidor).toLocaleString()}`}
                        secondary={item.origen ? `Origen: ${item.origen}` : ""}
                      />
                      <ListItemSecondaryAction>
                        <IconButton edge="end" onClick={() => abrirMapa(item)} title="Ver mapa">
                          <Visibility />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={openCam} fullWidth maxWidth="sm" onClose={() => !isSaving && setOpenCam(false)}>
        <DialogTitle>
          {previewFoto ? "Confirmar registro" : `Capturar foto para ${tipoSeleccionado || ""}`}
        </DialogTitle>
        <DialogContent>
          {!previewFoto ? (
            <Box sx={{ borderRadius: 2, overflow: "hidden", bgcolor: "black" }}>
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                audio={false}
                style={{ width: "100%", height: "auto", display: "block" }}
                videoConstraints={{ facingMode: "user" }}
              />
            </Box>
          ) : (
            <Box
              component="img"
              src={previewFoto}
              alt="Preview"
              sx={{ width: "100%", borderRadius: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCam(false)} color="secondary" disabled={isSaving}>
            Cancelar
          </Button>
          {!previewFoto ? (
            <Button onClick={capturar} variant="contained" startIcon={<CameraAlt />}>
              Capturar
            </Button>
          ) : (
            <>
              <Button onClick={() => setPreviewFoto("")} disabled={isSaving}>
                Repetir
              </Button>
              <Button onClick={confirmarRegistro} variant="contained" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar"}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={openMapa} fullWidth maxWidth="lg" onClose={() => setOpenMapa(false)}>
        <DialogTitle sx={{ position: "relative" }}>
          <IconButton
            size="small"
            onClick={() => setOpenMapa(false)}
            sx={{ position: "absolute", right: 10, top: 10, color: "error.main" }}
          >
            <Close fontSize="small" />
          </IconButton>
          <Typography variant="h5" textAlign="center">
            Ubicación del movimiento
          </Typography>
        </DialogTitle>
        <DialogContent>
          {registroMapa && (
            <Stack spacing={1}>
              <Typography variant="body1" sx={{ fontSize: "1.05rem" }}>
                {registroMapa.tipo} - {new Date(registroMapa.fecha_hora_servidor).toLocaleString()}
              </Typography>
              <Box
                component="iframe"
                src={urlMapaEmbed}
                sx={{ width: "100%", height: 560, border: 0, borderRadius: 2 }}
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {registroMapa && (
            <Button
              component="a"
              href={`https://www.google.com/maps?q=${registroMapa.latitud},${registroMapa.longitud}`}
              target="_blank"
              rel="noreferrer"
              variant="contained"
            >
              Abrir en Google Maps
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
