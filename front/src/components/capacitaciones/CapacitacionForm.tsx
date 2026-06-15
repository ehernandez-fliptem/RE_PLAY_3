import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Add,
  ArrowDownward,
  ArrowUpward,
  ChevronLeft,
  ContentCopy,
  Delete,
  HelpOutline,
  Save,
  UploadFile,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import { clienteAxios, handlingError } from "../../app/config/axios";
import ModalContainer from "../utils/ModalContainer";
import Spinner from "../utils/Spinner";
import { readFileData } from "../utils/functions/extras";
import {
  bloqueInicial,
  capacitacionInicial,
  pasoInicial,
  slugifyCapacitacion,
  type BloqueCapacitacion,
  type Capacitacion,
  type EstadoCapacitacion,
  type TipoBloqueCapacitacion,
} from "./types";

const tiposBloque: Array<{ value: TipoBloqueCapacitacion; label: string }> = [
  { value: "identificacion", label: "Identificacion" },
  { value: "texto", label: "Texto" },
  { value: "imagen", label: "Imagen" },
  { value: "video", label: "Video" },
  { value: "link", label: "Enlace" },
  { value: "checklist", label: "Checklist" },
  { value: "tarjetas", label: "Tarjetas" },
  { value: "acordeon", label: "Acordeon" },
  { value: "pregunta", label: "Pregunta" },
  { value: "documento", label: "Documento" },
  { value: "aviso", label: "Aviso" },
  { value: "separador", label: "Separador" },
];

const ayudaTipoBloque: Record<TipoBloqueCapacitacion, string> = {
  identificacion: "Pide el nombre de la persona y, si lo decides, su correo. Sirve para saber quien completo la capacitacion.",
  texto: "Sirve para explicar informacion con parrafos, titulos o instrucciones. Es el bloque mas simple para contenido escrito.",
  imagen: "Muestra una imagen por URL. Usalo para ejemplos visuales, diagramas, fotos o referencias que ayuden a entender el paso.",
  video: "Muestra un video por URL. Puedes activar la regla de ver videos para pedir que la persona lo marque como visto antes de avanzar.",
  link: "Muestra un boton o enlace externo. Puedes usarlo para mandar a una pagina, politica, manual o recurso fuera del sistema.",
  checklist: "Crea una lista de puntos que la persona debe marcar. Si activas completar checklist, no podra avanzar hasta marcar todos.",
  tarjetas: "Crea tarjetas que giran al presionarlas. Sirven para revelar informacion poco a poco y confirmar que cada tarjeta fue revisada.",
  acordeon: "Crea secciones expandibles. Sirve para organizar informacion larga sin saturar la pantalla.",
  pregunta: "Agrega una pregunta de validacion. Puedes marcar opciones correctas y exigir respuesta correcta para avanzar.",
  documento: "Permite agregar un documento como link externo o como archivo subido. Solo se usa una fuente por bloque.",
  aviso: "Muestra un mensaje destacado: informacion, advertencia, peligro o exito. Sirve para resaltar algo importante.",
  separador: "Agrega una linea o division visual para separar contenido dentro del paso.",
};

const ayudaReglas: Record<string, string> = {
  requiere_ver_todos_los_bloques: "Pide que el usuario pase por todos los bloques del paso. Es util cuando quieres asegurar que no avance sin ver la informacion.",
  requiere_tiempo_minimo: "Bloquea el avance hasta que pasen los segundos configurados en este paso.",
  requiere_checklist: "Si hay checklist, obliga a marcar todos sus elementos antes de continuar.",
  requiere_preguntas: "Si hay preguntas, obliga a responderlas antes de continuar.",
  requiere_respuestas_correctas: "Si hay preguntas con opciones correctas, exige contestar correctamente para avanzar.",
  requiere_abrir_interactivos: "Si hay tarjetas o acordeones, obliga a abrirlos todos antes de continuar.",
  requiere_video_completo: "Si hay videos, obliga a marcarlos como vistos antes de continuar.",
  requiere_abrir_links: "Si hay enlaces o documentos, obliga a abrirlos antes de continuar.",
};

const HELP_POPOVER_OPEN_EVENT = "capacitacion-help-popover-open";
const DEFAULT_CAPACITACION_COLOR = "#6d00f5";
const hexColorRegex = /^#[0-9a-fA-F]{6}$/;

function getSafeHexColor(value?: string) {
  return value && hexColorRegex.test(value) ? value : DEFAULT_CAPACITACION_COLOR;
}

function HelpPopover({ title, children }: { title: string; children: ReactNode }) {
  const instanceIdRef = useRef(`help-${Math.random().toString(36).slice(2)}`);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [pinned, setPinned] = useState(false);
  const open = Boolean(position);

  const close = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setPosition(null);
    setPinned(false);
  };

  const show = (pin = false) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    window.dispatchEvent(
      new CustomEvent(HELP_POPOVER_OPEN_EVENT, {
        detail: instanceIdRef.current,
      }),
    );

    const width = 340;
    const margin = 12;
    const left = Math.min(Math.max(rect.left, margin), window.innerWidth - width - margin);
    const top = rect.bottom + 8;

    setPosition({ top, left });
    if (pin) setPinned(true);
  };

  const cancelClose = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    if (pinned) return;
    cancelClose();
    closeTimerRef.current = window.setTimeout(close, 140);
  };

  useEffect(() => {
    const handleOtherPopoverOpen = (event: Event) => {
      const { detail } = event as CustomEvent<string>;
      if (detail !== instanceIdRef.current) close();
    };

    window.addEventListener(HELP_POPOVER_OPEN_EVENT, handleOtherPopoverOpen);

    return () => {
      window.removeEventListener(HELP_POPOVER_OPEN_EVENT, handleOtherPopoverOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
  }, []);

  return (
    <>
      <IconButton
        ref={buttonRef}
        size="small"
        aria-label={`Ayuda: ${title}`}
        onMouseEnter={() => show(false)}
        onMouseLeave={scheduleClose}
        onClick={(event) => {
          event.stopPropagation();
          if (open && pinned) {
            close();
            return;
          }
          show(true);
        }}
        sx={{ color: "primary.main", p: 0.4, pointerEvents: "auto", position: "relative", zIndex: 2 }}
      >
        <HelpOutline fontSize="small" />
      </IconButton>
      {position &&
        createPortal(
          <Box
            ref={panelRef}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            sx={{
              position: "fixed",
              top: position.top,
              left: position.left,
              width: "min(340px, calc(100vw - 24px))",
              p: 1.5,
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 10px 30px rgba(15, 23, 42, 0.24)",
              bgcolor: "background.paper",
              zIndex: 50000,
              pointerEvents: "auto",
            }}
          >
            <Typography fontWeight={800} sx={{ mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {children}
            </Typography>
          </Box>,
          document.body,
        )}
    </>
  );
}

function LabelHelp({ label, help }: { label: string; help: ReactNode }) {
  return (
    <Stack
      component="span"
      direction="row"
      spacing={0.5}
      alignItems="center"
      sx={{ pointerEvents: "auto", display: "inline-flex" }}
    >
      <span>{label}</span>
      <HelpPopover title={label}>{help}</HelpPopover>
    </Stack>
  );
}

function normalizeOrden<T extends { orden: number }>(items: T[]) {
  return items.map((item, index) => ({ ...item, orden: index + 1 }));
}

function defaultContentForType(tipo: TipoBloqueCapacitacion) {
  if (tipo === "identificacion") {
    return {
      titulo: "Identificate para continuar",
      descripcion: "Escribe tu nombre para registrar que completaste esta capacitacion.",
      etiqueta_nombre: "Nombre completo",
      pedir_correo: true,
      correo_obligatorio: false,
      etiqueta_correo: "Correo electronico",
    };
  }
  if (tipo === "imagen") return { url: "", alt: "", pie: "" };
  if (tipo === "video") return { url: "" };
  if (tipo === "link") return { texto: "Abrir recurso", url: "", nueva_pestana: true };
  if (tipo === "documento") return { modo: "link", descripcion: "", url: "", dataUrl: "", fileName: "" };
  if (tipo === "checklist") return { items: [{ id: "1", texto: "Confirmo que lei esta informacion." }] };
  if (tipo === "tarjetas" || tipo === "acordeon") {
    return { instruccion: "Presiona cada elemento para revisar la informacion.", items: [{ id: "1", titulo: "Elemento 1", contenido: "Informacion del elemento." }] };
  }
  if (tipo === "pregunta") return { pregunta: "Pregunta de validacion", opciones: [{ id: "1", texto: "Opcion 1" }], respuesta_correcta: "" };
  if (tipo === "aviso") return { severidad: "info", texto: "Mensaje importante." };
  return { texto: "Escribe el contenido de este bloque." };
}

export default function CapacitacionForm({ mode }: { mode: "new" | "edit" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase | undefined>();
  const [data, setData] = useState<Capacitacion>(JSON.parse(JSON.stringify(capacitacionInicial)));
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [tiempoMinimoInput, setTiempoMinimoInput] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = data.pasos[activeStepIndex] || data.pasos[0];

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await clienteAxios.get(`/api/capacitaciones/${id}`);
        if (res.data.estado) {
          setData({ ...capacitacionInicial, ...res.data.datos });
        }
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, mode, navigate]);

  useEffect(() => {
    setTiempoMinimoInput(null);
  }, [activeStepIndex]);

  const localErrors = useMemo(() => {
    const current: Record<string, string> = {};
    if (!data.titulo.trim()) current.titulo = "El titulo es obligatorio.";
    if (!data.slug.trim()) current.slug = "El slug es obligatorio.";
    if (data.estado === "publicada") {
      if (data.pasos.length === 0) current.pasos = "Agrega al menos un paso.";
      if (data.pasos.some((paso) => paso.bloques.length === 0)) current.pasos = "Todos los pasos deben tener bloques.";
    }
    return current;
  }, [data]);

  const errors = useMemo(() => ({ ...serverErrors, ...localErrors }), [localErrors, serverErrors]);

  const setField = (field: keyof Capacitacion, value: any) => {
    setData((current) => ({ ...current, [field]: value }));
    setServerErrors((current) => {
      if (!current[field as string]) return current;
      const next = { ...current };
      delete next[field as string];
      return next;
    });
  };

  const updateStep = (patch: any) => {
    setData((current) => {
      const pasos = current.pasos.map((paso, index) => (index === activeStepIndex ? { ...paso, ...patch } : paso));
      return { ...current, pasos };
    });
  };

  const updateBlock = (blockId: string, patch: Partial<BloqueCapacitacion>) => {
    updateStep({
      bloques: activeStep.bloques.map((bloque) => (bloque.id === blockId ? { ...bloque, ...patch } : bloque)),
    });
  };

  const addStep = () => {
    const next = { ...pasoInicial(), orden: data.pasos.length + 1, titulo: `Paso ${data.pasos.length + 1}` };
    setData((current) => ({ ...current, pasos: [...current.pasos, next] }));
    setActiveStepIndex(data.pasos.length);
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= data.pasos.length) return;
    const pasos = [...data.pasos];
    [pasos[index], pasos[nextIndex]] = [pasos[nextIndex], pasos[index]];
    setData((current) => ({ ...current, pasos: normalizeOrden(pasos) }));
    setActiveStepIndex(nextIndex);
  };

  const addBlock = () => {
    updateStep({ bloques: [...activeStep.bloques, { ...bloqueInicial(), orden: activeStep.bloques.length + 1 }] });
  };

  const save = async () => {
    if (Object.keys(errors).length > 0) {
      enqueueSnackbar(Object.values(errors)[0], { variant: "warning" });
      return;
    }
    try {
      setSaving(true);
      setServerErrors({});
      const payload = { ...data, slug: slugifyCapacitacion(data.slug || data.titulo) };
      const res =
        mode === "edit" && id
          ? await clienteAxios.put(`/api/capacitaciones/${id}`, payload)
          : await clienteAxios.post("/api/capacitaciones", payload);
      if (res.data.estado) {
        enqueueSnackbar("Capacitacion guardada correctamente.", { variant: "success" });
        parentGridDataRef?.fetchRows?.();
        navigate("/capacitaciones");
      } else {
        if (res.data.mensajes) setServerErrors(res.data.mensajes);
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession, erroresForm } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
      if (erroresForm) setServerErrors(erroresForm as Record<string, string>);
      const firstError = erroresForm ? Object.values(erroresForm)[0] : "";
      enqueueSnackbar(String(firstError || "No se pudo guardar la capacitacion."), { variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "xl" }}>
      <Card elevation={5} sx={{ borderRadius: 2 }}>
        <CardContent>
          {loading || saving ? (
            <Spinner title={saving ? "Guardando" : "Cargando"} />
          ) : (
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
                <Box>
                  <Typography variant="h4" fontWeight={800}>
                    {mode === "new" ? "Nueva capacitacion" : "Editar capacitacion"}
                  </Typography>
                  <Typography color="text.secondary">Configura pasos, bloques y reglas de avance.</Typography>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} gap={1} alignItems={{ xs: "stretch", sm: "center" }}>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => navigate("/capacitaciones")}
                    startIcon={<ChevronLeft />}
                    sx={{ minHeight: 40, py: 0.75, px: 2 }}
                  >
                    Regresar
                  </Button>
                  <Button
                    variant="contained"
                    onClick={save}
                    startIcon={<Save />}
                    sx={{ minHeight: 40, py: 0.75, px: 2 }}
                  >
                    Guardar
                  </Button>
                </Stack>
              </Stack>
              {Object.keys(errors).length > 0 && <Alert severity="info">{Object.values(errors)[0]}</Alert>}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "320px 1fr" }, gap: 2 }}>
                <Stack spacing={2}>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Typography fontWeight={800} sx={{ mb: 1 }}>
                        Datos generales
                      </Typography>
                      <TextField
                        label={<LabelHelp label="Titulo" help="Nombre principal de la capacitacion. Es lo primero que vera el usuario en la vista publica." />}
                        value={data.titulo}
                        onChange={(event) => {
                          setField("titulo", event.target.value);
                          if (!data.slug) setField("slug", slugifyCapacitacion(event.target.value));
                        }}
                        error={Boolean(errors.titulo)}
                        helperText={errors.titulo}
                        fullWidth
                        margin="dense"
                        required
                      />
                      <TextField
                        label={<LabelHelp label="Descripcion" help="Resumen corto de la capacitacion. Sirve para explicar de que trata antes de iniciar." />}
                        value={data.descripcion || ""}
                        onChange={(event) => setField("descripcion", event.target.value)}
                        fullWidth
                        margin="dense"
                        multiline
                        minRows={2}
                      />
                      <TextField
                        label={<LabelHelp label="Slug publico" help="Texto que forma la URL publica. Por ejemplo, seguridad-basica crea /capacitacion/seguridad-basica." />}
                        value={data.slug}
                        onChange={(event) => setField("slug", slugifyCapacitacion(event.target.value))}
                        error={Boolean(errors.slug)}
                        helperText={errors.slug || `/capacitacion/${data.slug || "slug"}`}
                        fullWidth
                        margin="dense"
                        required
                      />
                      <FormControl fullWidth margin="dense">
                        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">Estado</Typography>
                          <HelpPopover title="Estado">
                            Borrador no aparece al publico. Publicada queda disponible por la liga publica. Inactiva conserva la capacitacion pero la deja fuera de uso.
                          </HelpPopover>
                        </Stack>
                        <InputLabel>Estado</InputLabel>
                        <Select value={data.estado} label="Estado" onChange={(event) => setField("estado", event.target.value as EstadoCapacitacion)}>
                          <MenuItem value="borrador">Borrador</MenuItem>
                          <MenuItem value="publicada">Publicada</MenuItem>
                          <MenuItem value="inactiva">Inactiva</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        label={<LabelHelp label="Color principal" help="Color que usara la vista publica en botones, encabezado y progreso. Puedes elegirlo con la paleta o escribirlo en formato hexadecimal." />}
                        value={data.color_principal || DEFAULT_CAPACITACION_COLOR}
                        onChange={(event) => setField("color_principal", event.target.value)}
                        helperText="Puedes usar la paleta o escribir un color como #6d00f5."
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Box
                                component="input"
                                type="color"
                                value={getSafeHexColor(data.color_principal)}
                                aria-label="Seleccionar color principal"
                                onChange={(event) => setField("color_principal", event.target.value)}
                                sx={{
                                  width: 34,
                                  height: 30,
                                  p: 0,
                                  border: "1px solid",
                                  borderColor: "divider",
                                  borderRadius: 1,
                                  bgcolor: "transparent",
                                  cursor: "pointer",
                                  "&::-webkit-color-swatch-wrapper": { p: 0 },
                                  "&::-webkit-color-swatch": { border: 0, borderRadius: "6px" },
                                  "&::-moz-color-swatch": { border: 0, borderRadius: "6px" },
                                }}
                              />
                            </InputAdornment>
                          ),
                        }}
                        fullWidth
                        margin="dense"
                      />
                      <TextField label={<LabelHelp label="Logo URL" help="Liga de una imagen de logo que se mostrara al inicio de la capacitacion. Es opcional." />} value={data.logo_url || ""} onChange={(event) => setField("logo_url", event.target.value)} fullWidth margin="dense" />
                      <TextField label={<LabelHelp label="Portada URL" help="Liga de una imagen de portada para la pantalla inicial. Es opcional y ayuda a que la capacitacion se vea mas clara." />} value={data.portada_url || ""} onChange={(event) => setField("portada_url", event.target.value)} fullWidth margin="dense" />
                    </CardContent>
                  </Card>
                  <Card variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={800}>Pasos</Typography>
                        <Button size="small" onClick={addStep} startIcon={<Add />}>
                          Agregar
                        </Button>
                      </Stack>
                      <Stack spacing={1} sx={{ mt: 1 }}>
                        {data.pasos.map((paso, index) => (
                          <Card
                            key={paso.id}
                            variant={index === activeStepIndex ? "elevation" : "outlined"}
                            onClick={() => setActiveStepIndex(index)}
                            sx={{
                              cursor: "pointer",
                              borderRadius: 2,
                              borderColor: index === activeStepIndex ? data.color_principal : "divider",
                            }}
                          >
                            <CardContent sx={{ py: 1.2, "&:last-child": { pb: 1.2 } }}>
                              <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Box>
                                  <Typography fontWeight={700}>{paso.titulo}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {paso.bloques.length} bloque(s)
                                  </Typography>
                                </Box>
                                <Stack direction="row">
                                  <Button size="small" onClick={(e) => { e.stopPropagation(); moveStep(index, -1); }}>
                                    <ArrowUpward fontSize="small" />
                                  </Button>
                                  <Button size="small" onClick={(e) => { e.stopPropagation(); moveStep(index, 1); }}>
                                    <ArrowDownward fontSize="small" />
                                  </Button>
                                </Stack>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Stack>
                {activeStep && (
                  <Stack spacing={2}>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Typography fontWeight={800}>Editor del paso</Typography>
                        <TextField label={<LabelHelp label="Titulo del paso" help="Nombre de esta etapa de la capacitacion. Debe decir que se revisa en este paso." />} value={activeStep.titulo} onChange={(e) => updateStep({ titulo: e.target.value })} fullWidth margin="dense" />
                        <TextField
                          label={<LabelHelp label="Descripcion del paso" help="Texto breve que explica al usuario que debe hacer o revisar en este paso." />}
                          value={activeStep.descripcion || ""}
                          onChange={(e) => updateStep({ descripcion: e.target.value })}
                          fullWidth
                          margin="dense"
                          multiline
                          minRows={2}
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                          <TextField
                            label={<LabelHelp label="Tiempo minimo en segundos" help="Cantidad de segundos que el usuario debe permanecer en el paso si activas la regla de tiempo minimo." />}
                            type="number"
                            value={tiempoMinimoInput ?? String(activeStep.tiempo_minimo_segundos ?? 0)}
                            onFocus={() => {
                              if (Number(activeStep.tiempo_minimo_segundos || 0) === 0) setTiempoMinimoInput("");
                            }}
                            onChange={(e) => {
                              const value = e.target.value;
                              setTiempoMinimoInput(value);
                              if (value !== "") updateStep({ tiempo_minimo_segundos: Number(value) });
                            }}
                            onBlur={(e) => {
                              const value = e.target.value;
                              updateStep({ tiempo_minimo_segundos: Number(value || 0) });
                              setTiempoMinimoInput(null);
                            }}
                            fullWidth
                            margin="dense"
                          />
                          <FormControlLabel
                            control={<Checkbox checked={Boolean(activeStep.confirmacion_requerida)} onChange={(e) => updateStep({ confirmacion_requerida: e.target.checked })} />}
                            label={<LabelHelp label="Requiere confirmacion" help="Agrega una casilla donde el usuario confirma que entendio el paso antes de continuar." />}
                          />
                        </Stack>
                        <Divider sx={{ my: 1.5 }} />
                        <Typography fontWeight={700}>Reglas de avance</Typography>
                        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" } }}>
                          {[
                            ["requiere_ver_todos_los_bloques", "Ver todos los bloques"],
                            ["requiere_tiempo_minimo", "Cumplir tiempo minimo"],
                            ["requiere_checklist", "Completar checklist"],
                            ["requiere_preguntas", "Responder preguntas"],
                            ["requiere_respuestas_correctas", "Respuestas correctas"],
                            ["requiere_abrir_interactivos", "Abrir interactivos"],
                            ["requiere_video_completo", "Ver videos"],
                            ["requiere_abrir_links", "Abrir enlaces"],
                          ].map(([key, label]) => (
                            <FormControlLabel
                              key={key}
                              control={
                                <Checkbox
                                  checked={Boolean((activeStep.reglas_avance as any)?.[key])}
                                  onChange={(e) =>
                                    updateStep({
                                      reglas_avance: { ...(activeStep.reglas_avance || {}), [key]: e.target.checked },
                                    })
                                  }
                                />
                              }
                              label={<LabelHelp label={label} help={ayudaReglas[key]} />}
                            />
                          ))}
                        </Box>
                      </CardContent>
                    </Card>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography fontWeight={800}>Bloques</Typography>
                          <Button startIcon={<Add />} onClick={addBlock}>
                            Agregar bloque
                          </Button>
                        </Stack>
                        <Stack spacing={1.5} sx={{ mt: 1 }}>
                          {activeStep.bloques.map((bloque, index) => (
                            <Card key={bloque.id} variant="outlined" sx={{ borderRadius: 2 }}>
                              <CardContent>
                                <Stack spacing={1.2}>
                                  <Box
                                    sx={{
                                      display: "grid",
                                      gridTemplateColumns: { xs: "1fr", md: "180px minmax(220px, 1fr) auto" },
                                      gap: 1,
                                      alignItems: "start",
                                    }}
                                  >
                                    <FormControl fullWidth>
                                      <InputLabel id={`tipo-bloque-${bloque.id}`}>
                                        <LabelHelp label="Tipo de bloque" help={ayudaTipoBloque[bloque.tipo]} />
                                      </InputLabel>
                                      <Select
                                        labelId={`tipo-bloque-${bloque.id}`}
                                        value={bloque.tipo}
                                        label="Tipo de bloque"
                                        onChange={(e) =>
                                          updateBlock(bloque.id, {
                                            tipo: e.target.value as TipoBloqueCapacitacion,
                                            contenido: defaultContentForType(e.target.value as TipoBloqueCapacitacion),
                                          })
                                        }
                                      >
                                        {tiposBloque.map((tipo) => (
                                          <MenuItem key={tipo.value} value={tipo.value}>
                                            {tipo.label}
                                          </MenuItem>
                                        ))}
                                      </Select>
                                    </FormControl>
                                    <TextField label={<LabelHelp label="Titulo del bloque" help="Nombre interno o visible del bloque. Ayuda a identificar que contiene esta pieza." />} value={bloque.titulo || ""} onChange={(e) => updateBlock(bloque.id, { titulo: e.target.value })} fullWidth />
                                    <Stack
                                      direction="row"
                                      spacing={0.5}
                                      justifyContent={{ xs: "flex-end", md: "center" }}
                                      alignItems="center"
                                      sx={{ minHeight: 56 }}
                                    >
                                      <Tooltip title="Duplicar bloque">
                                        <IconButton
                                          color="primary"
                                          onClick={() => {
                                            const copia = { ...bloque, id: `bloque-${Date.now()}`, orden: activeStep.bloques.length + 1 };
                                            updateStep({ bloques: [...activeStep.bloques, copia] });
                                          }}
                                        >
                                          <ContentCopy />
                                        </IconButton>
                                      </Tooltip>
                                      <Tooltip title="Eliminar bloque">
                                        <IconButton
                                          color="error"
                                          onClick={() => updateStep({ bloques: normalizeOrden(activeStep.bloques.filter((b) => b.id !== bloque.id)) })}
                                        >
                                          <Delete />
                                        </IconButton>
                                      </Tooltip>
                                    </Stack>
                                  </Box>
                                  <BlockFields
                                    bloque={bloque}
                                    activeStep={activeStep}
                                    updateBlock={updateBlock}
                                    updateStep={updateStep}
                                  />
                                  <Stack direction="row" justifyContent="end">
                                    <Button
                                      size="small"
                                      disabled={index === 0}
                                      onClick={() => {
                                        const blocks = [...activeStep.bloques];
                                        [blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]];
                                        updateStep({ bloques: normalizeOrden(blocks) });
                                      }}
                                    >
                                      Subir
                                    </Button>
                                    <Button
                                      size="small"
                                      disabled={index === activeStep.bloques.length - 1}
                                      onClick={() => {
                                        const blocks = [...activeStep.bloques];
                                        [blocks[index + 1], blocks[index]] = [blocks[index], blocks[index + 1]];
                                        updateStep({ bloques: normalizeOrden(blocks) });
                                      }}
                                    >
                                      Bajar
                                    </Button>
                                  </Stack>
                                </Stack>
                              </CardContent>
                            </Card>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Stack>
                )}
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>
    </ModalContainer>
  );
}

function BlockFields({
  bloque,
  activeStep,
  updateBlock,
  updateStep,
}: {
  bloque: BloqueCapacitacion;
  activeStep: Capacitacion["pasos"][number];
  updateBlock: (id: string, patch: Partial<BloqueCapacitacion>) => void;
  updateStep: (patch: any) => void;
}) {
  const content = bloque.contenido || {};
  const setContent = (patch: any) => updateBlock(bloque.id, { contenido: { ...content, ...patch } });
  if (bloque.tipo === "identificacion") {
    const pedirCorreo = content.pedir_correo !== false;
    return (
      <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: "grey.50" }}>
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Stack spacing={1.5}>
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Este bloque registra quien esta tomando la capacitacion. El nombre siempre es obligatorio; el correo puede ser opcional u obligatorio.
            </Alert>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1 }}>
              <TextField
                label={<LabelHelp label="Titulo visible" help="Titulo que vera la persona arriba de los campos de identificacion." />}
                value={content.titulo || ""}
                onChange={(e) => setContent({ titulo: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label={<LabelHelp label="Etiqueta del nombre" help="Texto del campo donde la persona escribira su nombre completo." />}
                value={content.etiqueta_nombre || ""}
                onChange={(e) => setContent({ etiqueta_nombre: e.target.value })}
                fullWidth
                size="small"
              />
            </Box>
            <TextField
              label={<LabelHelp label="Descripcion" help="Texto corto que explica por que se pide esta informacion." />}
              value={content.descripcion || ""}
              onChange={(e) => setContent({ descripcion: e.target.value })}
              fullWidth
              multiline
              minRows={2}
              size="small"
            />
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1, alignItems: "center" }}>
              <FormControlLabel
                control={<Checkbox checked={pedirCorreo} onChange={(e) => setContent({ pedir_correo: e.target.checked, correo_obligatorio: e.target.checked ? Boolean(content.correo_obligatorio) : false })} />}
                label={<LabelHelp label="Pedir correo" help="Muestra un campo de correo junto al nombre. Si lo apagas, solo se pedira nombre." />}
              />
              <FormControlLabel
                control={<Checkbox checked={pedirCorreo && Boolean(content.correo_obligatorio)} disabled={!pedirCorreo} onChange={(e) => setContent({ correo_obligatorio: e.target.checked })} />}
                label={<LabelHelp label="Correo obligatorio" help="Si esta activo, la persona no podra avanzar sin escribir un correo." />}
              />
            </Box>
            {pedirCorreo && (
              <TextField
                label={<LabelHelp label="Etiqueta del correo" help="Texto del campo donde la persona escribira su correo. Puede ser opcional u obligatorio." />}
                value={content.etiqueta_correo || ""}
                onChange={(e) => setContent({ etiqueta_correo: e.target.value })}
                fullWidth
                size="small"
              />
            )}
          </Stack>
        </CardContent>
      </Card>
    );
  }
  if (bloque.tipo === "imagen") {
    return (
      <Stack spacing={1}>
        <TextField label={<LabelHelp label="URL de imagen" help="Pega la liga directa de la imagen que quieres mostrar. Debe ser accesible desde el navegador." />} value={content.url || ""} onChange={(e) => setContent({ url: e.target.value })} fullWidth />
        <TextField label={<LabelHelp label="Texto alternativo" help="Descripcion corta de la imagen. Sirve para accesibilidad y para entender que representa si no carga." />} value={content.alt || ""} onChange={(e) => setContent({ alt: e.target.value })} fullWidth />
        <TextField label={<LabelHelp label="Pie de imagen" help="Texto opcional que aparece debajo de la imagen, como una nota o explicacion." />} value={content.pie || ""} onChange={(e) => setContent({ pie: e.target.value })} fullWidth />
      </Stack>
    );
  }
  if (bloque.tipo === "video") {
    return <TextField label={<LabelHelp label="URL de video" help="Pega la liga del video. Puede ser un enlace externo o un archivo de video accesible por URL." />} value={content.url || ""} onChange={(e) => setContent({ url: e.target.value })} fullWidth />;
  }
  if (bloque.tipo === "link") {
    return (
      <Stack spacing={1}>
        <TextField label={<LabelHelp label="Texto del enlace" help="Texto que vera el usuario en el boton o liga." />} value={content.texto || ""} onChange={(e) => setContent({ texto: e.target.value })} fullWidth />
        <TextField label={<LabelHelp label="URL" help="Direccion a la que se enviara al usuario cuando abra el enlace." />} value={content.url || ""} onChange={(e) => setContent({ url: e.target.value })} fullWidth />
        <TextField label={<LabelHelp label="Descripcion" help="Explicacion opcional para decir por que debe abrir este recurso." />} value={content.descripcion || ""} onChange={(e) => setContent({ descripcion: e.target.value })} fullWidth />
      </Stack>
    );
  }
  if (bloque.tipo === "documento") {
    const modo = content.modo === "archivo" ? "archivo" : "link";
    const handleFile = async (file?: File) => {
      if (!file) return;
      const dataUrl = await readFileData(file);
      setContent({
        modo: "archivo",
        dataUrl: String(dataUrl || ""),
        fileName: file.name,
        url: "",
      });
    };
    return (
      <Stack spacing={1.5}>
        <FormControl fullWidth>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Origen del documento</Typography>
            <HelpPopover title="Origen del documento">
              {modo === "archivo"
                ? "Archivo subido guarda un documento dentro de esta capacitacion. Al elegirlo se limpia el link para que solo exista una fuente."
                : "Link externo abre una URL. Al elegirlo se limpia el archivo subido para evitar confusiones."}
            </HelpPopover>
          </Stack>
          <InputLabel>Origen del documento</InputLabel>
          <Select
            value={modo}
            label="Origen del documento"
            onChange={(event) => {
              const nextModo = event.target.value;
              setContent(
                nextModo === "archivo"
                  ? { modo: "archivo", url: "" }
                  : { modo: "link", dataUrl: "", fileName: "" }
              );
            }}
          >
            <MenuItem value="link">Link externo</MenuItem>
            <MenuItem value="archivo">Archivo subido</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label={<LabelHelp label="Nombre o texto del boton" help="Texto que vera el usuario para abrir o descargar el documento." />}
          value={content.texto || ""}
          onChange={(e) => setContent({ texto: e.target.value })}
          fullWidth
        />
        <TextField
          label={<LabelHelp label="Descripcion" help="Texto opcional para explicar que contiene el documento y por que debe revisarlo." />}
          value={content.descripcion || ""}
          onChange={(e) => setContent({ descripcion: e.target.value })}
          fullWidth
        />
        {modo === "link" ? (
          <TextField
            label={<LabelHelp label="URL del documento" help="Liga externa al documento. Se usa solo cuando el origen es Link externo." />}
            value={content.url || ""}
            onChange={(e) =>
              setContent({
                modo: "link",
                url: e.target.value,
                dataUrl: "",
                fileName: "",
              })
            }
            fullWidth
          />
        ) : (
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                <Button component="label" variant="outlined" startIcon={<UploadFile />}>
                  {content.dataUrl ? "Cambiar archivo" : "Subir archivo"}
                  <input
                    hidden
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                    onChange={(event) => handleFile(event.target.files?.[0])}
                  />
                </Button>
                <Typography variant="body2" color={content.dataUrl ? "text.primary" : "text.secondary"} sx={{ flex: 1 }}>
                  {content.fileName || "Sin archivo seleccionado"}
                </Typography>
                <HelpPopover title="Archivo subido">
                  Selecciona un solo archivo para este bloque. Si subes uno nuevo, reemplaza al anterior. Si cambias a Link externo, este archivo se limpia.
                </HelpPopover>
                {content.dataUrl && (
                  <Button
                    color="error"
                    onClick={() => setContent({ modo: "archivo", dataUrl: "", fileName: "" })}
                  >
                    Quitar
                  </Button>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    );
  }
  if (bloque.tipo === "checklist") {
    const items = Array.isArray(content.items) ? content.items : [];
    const setItems = (next: any[]) => setContent({ items: next });
    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Stack spacing={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Elementos del checklist
                </Typography>
                <HelpPopover title="Elementos del checklist">
                  Cada fila es una confirmacion que el usuario debe marcar. Si activas la regla Completar checklist, todos estos elementos deben estar marcados para avanzar.
                </HelpPopover>
              </Stack>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={() =>
                  setItems([
                    ...items,
                    {
                      id: `check-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      texto: `Elemento ${items.length + 1}`,
                    },
                  ])
                }
              >
                Agregar
              </Button>
            </Stack>
            {items.length === 0 && (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                Agrega los puntos que la persona debe confirmar.
              </Alert>
            )}
            {items.map((item: any, index: number) => (
              <Stack key={item.id || index} direction="row" spacing={1} alignItems="center">
                <TextField
                  label={<LabelHelp label={`Elemento ${index + 1}`} help="Texto de la confirmacion que aparecera junto a una casilla en la vista publica." />}
                  value={item.texto || ""}
                  onChange={(event) => {
                    const next = [...items];
                    next[index] = {
                      ...item,
                      id: item.id || `check-${index + 1}`,
                      texto: event.target.value,
                    };
                    setItems(next);
                  }}
                  fullWidth
                  size="small"
                />
                <IconButton
                  color="error"
                  aria-label="Eliminar elemento"
                  onClick={() => setItems(items.filter((_: any, i: number) => i !== index))}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  }
  if (bloque.tipo === "tarjetas" || bloque.tipo === "acordeon") {
    const items = Array.isArray(content.items) ? content.items : [];
    const setItems = (next: any[]) => setContent({ items: next });
    return (
      <Stack spacing={1}>
        <TextField label={<LabelHelp label="Instruccion" help="Texto que le dice al usuario que debe hacer con estas tarjetas o secciones." />} value={content.instruccion || ""} onChange={(e) => setContent({ instruccion: e.target.value })} fullWidth />
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {bloque.tipo === "tarjetas" ? "Tarjetas" : "Secciones"}
                  </Typography>
                  <HelpPopover title={bloque.tipo === "tarjetas" ? "Tarjetas" : "Secciones"}>
                    {bloque.tipo === "tarjetas"
                      ? "Cada tarjeta tiene un frente y una parte trasera. En publico gira al hacer clic y queda marcada como revisada."
                      : "Cada seccion sirve para mostrar informacion en piezas. Puede usarse para organizar contenido que el usuario debe abrir."}
                  </HelpPopover>
                </Stack>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() =>
                    setItems([
                      ...items,
                      {
                        id: `tarjeta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        titulo: `${bloque.tipo === "tarjetas" ? "Tarjeta" : "Seccion"} ${items.length + 1}`,
                        frente: "Presiona para ver mas.",
                        contenido: "Informacion posterior.",
                      },
                    ])
                  }
                >
                  Agregar
                </Button>
              </Stack>
              {items.length === 0 && (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  Agrega elementos para que la persona los abra durante la capacitacion.
                </Alert>
              )}
              {items.map((item: any, index: number) => (
                <Card key={item.id || index} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField
                          label={<LabelHelp label="Titulo" help="Nombre de esta tarjeta o seccion." />}
                          value={item.titulo || ""}
                          onChange={(event) => {
                            const next = [...items];
                            next[index] = {
                              ...item,
                              id: item.id || `tarjeta-${index + 1}`,
                              titulo: event.target.value,
                            };
                            setItems(next);
                          }}
                          fullWidth
                          size="small"
                        />
                        <IconButton
                          color="error"
                          aria-label="Eliminar tarjeta"
                          onClick={() => setItems(items.filter((_: any, i: number) => i !== index))}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Stack>
                      <TextField
                        label={<LabelHelp label="Frente" help="Texto que se ve antes de abrir o girar la tarjeta." />}
                        value={item.frente || ""}
                        onChange={(event) => {
                          const next = [...items];
                          next[index] = { ...item, id: item.id || `tarjeta-${index + 1}`, frente: event.target.value };
                          setItems(next);
                        }}
                        fullWidth
                        size="small"
                      />
                      <TextField
                        label={<LabelHelp label="Parte trasera" help="Texto que aparece despues de abrir la tarjeta. Aqui va la informacion que quieres revelar." />}
                        value={item.contenido || ""}
                        onChange={(event) => {
                          const next = [...items];
                          next[index] = { ...item, id: item.id || `tarjeta-${index + 1}`, contenido: event.target.value };
                          setItems(next);
                        }}
                        fullWidth
                        multiline
                        minRows={2}
                        size="small"
                      />
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    );
  }
  if (bloque.tipo === "pregunta") {
    const opciones = Array.isArray(content.opciones) ? content.opciones : [];
    const setOpciones = (next: any[]) => setContent({ opciones: next });
    const toggleRequiereRespuestaCorrecta = (checked: boolean) => {
      const reglaSuperiorYaMarcada = Boolean(activeStep.reglas_avance?.requiere_respuestas_correctas);
      const autoMarcoRegla = Boolean(bloque.reglas?.auto_marco_regla_respuestas_correctas);
      const reglasBloque = {
        ...(bloque.reglas || {}),
        requiere_respuesta_correcta: checked,
        auto_marco_regla_respuestas_correctas: checked && !reglaSuperiorYaMarcada,
      };

      updateBlock(bloque.id, { reglas: reglasBloque });

      if (checked && !reglaSuperiorYaMarcada) {
        updateStep({
          reglas_avance: {
            ...(activeStep.reglas_avance || {}),
            requiere_respuestas_correctas: true,
          },
        });
        return;
      }

      if (!checked && autoMarcoRegla) {
        const otroBloqueMantieneRegla = activeStep.bloques.some(
          (item) => item.id !== bloque.id && Boolean(item.reglas?.requiere_respuesta_correcta)
        );
        if (!otroBloqueMantieneRegla) {
          updateStep({
            reglas_avance: {
              ...(activeStep.reglas_avance || {}),
              requiere_respuestas_correctas: false,
            },
          });
        }
      }
    };
    return (
      <Stack spacing={1}>
        <TextField label={<LabelHelp label="Pregunta" help="Texto de la pregunta que respondera el usuario. Sirve para validar comprension del contenido." />} value={content.pregunta || ""} onChange={(e) => setContent({ pregunta: e.target.value })} fullWidth />
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Opciones
                  </Typography>
                  <HelpPopover title="Opciones">
                    Agrega las respuestas posibles. Marca con el check las opciones correctas. Si activas Requerir respuesta correcta, el usuario debe elegir una correcta.
                  </HelpPopover>
                </Stack>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={() =>
                    setOpciones([
                      ...opciones,
                      {
                        id: `opcion-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        texto: `Opcion ${opciones.length + 1}`,
                      },
                    ])
                  }
                >
                  Agregar
                </Button>
              </Stack>
              {opciones.length === 0 && (
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                  Agrega al menos una opcion o deja la pregunta como respuesta corta.
                </Alert>
              )}
              {opciones.map((opcion: any, index: number) => (
                <Stack key={opcion.id || index} direction="row" spacing={1} alignItems="center">
                  <Tooltip title="Marcar como respuesta correcta">
                    <Checkbox
                      checked={Boolean(opcion.correcta)}
                      onChange={(event) => {
                        const next = [...opciones];
                        next[index] = {
                          ...opcion,
                          id: opcion.id || `opcion-${index + 1}`,
                          correcta: event.target.checked,
                        };
                        setOpciones(next);
                      }}
                    />
                  </Tooltip>
                  <TextField
                    label={<LabelHelp label={`Opcion ${index + 1}`} help="Texto de una respuesta posible. El check de la izquierda indica si esta opcion es correcta." />}
                    value={opcion.texto || ""}
                    onChange={(event) => {
                      const next = [...opciones];
                      next[index] = {
                        ...opcion,
                        id: opcion.id || `opcion-${index + 1}`,
                        texto: event.target.value,
                      };
                      setOpciones(next);
                    }}
                    fullWidth
                    size="small"
                  />
                  <IconButton
                    color="error"
                    aria-label="Eliminar opcion"
                    onClick={() => setOpciones(opciones.filter((_: any, i: number) => i !== index))}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </CardContent>
        </Card>
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(bloque.reglas?.requiere_respuesta_correcta)}
              onChange={(e) => toggleRequiereRespuestaCorrecta(e.target.checked)}
            />
          }
          label={<LabelHelp label="Requerir respuesta correcta" help="Si lo activas, la persona no podra avanzar si elige una opcion incorrecta. Tambien activa la regla superior Respuestas correctas si no estaba marcada." />}
        />
      </Stack>
    );
  }
  if (bloque.tipo === "aviso") {
    return (
      <Stack spacing={1}>
        <FormControl fullWidth>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Severidad</Typography>
            <HelpPopover title="Severidad">
              Define el tono visual del aviso: informacion para notas normales, advertencia para cuidado, peligro para riesgos y exito para mensajes positivos.
            </HelpPopover>
          </Stack>
          <InputLabel>Severidad</InputLabel>
          <Select value={content.severidad || "info"} label="Severidad" onChange={(e) => setContent({ severidad: e.target.value })}>
            <MenuItem value="info">Informacion</MenuItem>
            <MenuItem value="warning">Advertencia</MenuItem>
            <MenuItem value="error">Peligro</MenuItem>
            <MenuItem value="success">Exito</MenuItem>
          </Select>
        </FormControl>
        <TextField label={<LabelHelp label="Texto del aviso" help="Mensaje destacado que aparecera dentro del aviso." />} value={content.texto || ""} onChange={(e) => setContent({ texto: e.target.value })} fullWidth multiline minRows={3} />
      </Stack>
    );
  }
  return <TextField label={<LabelHelp label="Texto" help="Contenido principal del bloque. Escribe aqui la explicacion, instruccion o informacion que vera el usuario." />} value={content.texto || ""} onChange={(e) => setContent({ texto: e.target.value })} fullWidth multiline minRows={4} />;
}
