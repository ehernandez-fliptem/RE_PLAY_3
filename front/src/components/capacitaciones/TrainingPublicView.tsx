import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Collapse,
  Divider,
  LinearProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  CheckCircle,
  Download,
  KeyboardArrowLeft,
  KeyboardArrowRight,
  OpenInNew,
  PlayCircle,
} from "@mui/icons-material";
import type { BloqueCapacitacion, Capacitacion, PasoCapacitacion } from "./types";

type Props = {
  capacitacion: Capacitacion;
  preview?: boolean;
  onFinish?: (payload: any) => Promise<void> | void;
};

type ProgressState = {
  vistos: Record<string, boolean>;
  checks: Record<string, string[]>;
  interactivos: Record<string, string[]>;
  respuestas: Record<string, any>;
  videos: Record<string, boolean>;
  links: Record<string, boolean>;
  confirmaciones: Record<string, boolean>;
};

type IdentityState = {
  nombre: string;
  correo: string;
  empresa: string;
  numero_empleado: string;
};

const initialProgress: ProgressState = {
  vistos: {},
  checks: {},
  interactivos: {},
  respuestas: {},
  videos: {},
  links: {},
  confirmaciones: {},
};

function getBlockItems(block: BloqueCapacitacion) {
  const c = block.contenido || {};
  if (Array.isArray(c.items)) return c.items;
  if (Array.isArray(c.tarjetas)) return c.tarjetas;
  if (Array.isArray(c.opciones)) return c.opciones;
  if (Array.isArray(c.secciones)) return c.secciones;
  return [];
}

function isQuestionCorrect(block: BloqueCapacitacion, value: any) {
  if (!block.reglas?.requiere_respuesta_correcta) return Boolean(value);
  const opcionesCorrectas = getBlockItems(block)
    .filter((item: any) => Boolean(item?.correcta))
    .map((item: any) => String(item.valor || item.texto || item.label || item || "").trim());
  if (opcionesCorrectas.length > 0) {
    return opcionesCorrectas.includes(String(value || "").trim());
  }
  const respuesta = String(block.contenido?.respuesta_correcta || "").trim();
  if (!respuesta) return Boolean(value);
  return String(value || "").trim() === respuesta;
}

function BlockRenderer({
  block,
  color,
  progress,
  setProgress,
  identity,
  setIdentity,
}: {
  block: BloqueCapacitacion;
  color: string;
  progress: ProgressState;
  setProgress: Dispatch<SetStateAction<ProgressState>>;
  identity: IdentityState;
  setIdentity: Dispatch<SetStateAction<IdentityState>>;
}) {
  const content = block.contenido || {};
  const items = getBlockItems(block);
  const opened = progress.interactivos[block.id] || [];
  const flipped = progress.respuestas[`flip-${block.id}`] || [];
  const checked = progress.checks[block.id] || [];
  const respuesta = progress.respuestas[block.id] || "";

  const markVisible = () =>
    setProgress((current) => ({
      ...current,
      vistos: { ...current.vistos, [block.id]: true },
    }));

  useEffect(() => {
    markVisible();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  if (block.tipo === "separador") {
    return (
      <Box sx={{ py: 1 }}>
        {block.titulo && (
          <Typography variant="overline" color="text.secondary">
            {block.titulo}
          </Typography>
        )}
        <Divider />
      </Box>
    );
  }

  if (block.tipo === "identificacion") {
    const pedirCorreo = content.pedir_correo !== false;
    const correoObligatorio = pedirCorreo && Boolean(content.correo_obligatorio);
    return (
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6">{content.titulo || block.titulo || "Identificate para continuar"}</Typography>
          <Typography color="text.secondary" variant="body2">
            {content.descripcion || "Escribe tu nombre para registrar que completaste esta capacitacion."}
          </Typography>
        </Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: pedirCorreo ? "repeat(2, minmax(0, 1fr))" : "1fr" }, gap: 2 }}>
          <TextField
            label={content.etiqueta_nombre || "Nombre completo"}
            value={identity.nombre}
            onChange={(event) => setIdentity((current) => ({ ...current, nombre: event.target.value }))}
            required
            fullWidth
          />
          {pedirCorreo && (
            <TextField
              label={content.etiqueta_correo || "Correo electronico"}
              type="email"
              value={identity.correo}
              onChange={(event) => setIdentity((current) => ({ ...current, correo: event.target.value }))}
              required={correoObligatorio}
              helperText={correoObligatorio ? "Obligatorio para continuar" : "Opcional"}
              fullWidth
            />
          )}
        </Box>
      </Stack>
    );
  }

  if (block.tipo === "imagen") {
    return (
      <Stack spacing={1}>
        {block.titulo && <Typography variant="h6">{block.titulo}</Typography>}
        <Box
          component="img"
          src={content.url || content.src || ""}
          alt={content.alt || block.titulo || "Imagen de capacitacion"}
          sx={{
            width: "100%",
            maxHeight: block.configuracion?.tamano === "pequena" ? 220 : 420,
            objectFit: "contain",
            borderRadius: block.configuracion?.bordes === false ? 0 : 2,
            bgcolor: "grey.100",
          }}
        />
        {content.pie && (
          <Typography variant="caption" color="text.secondary">
            {content.pie}
          </Typography>
        )}
      </Stack>
    );
  }

  if (block.tipo === "video") {
    const url = String(content.url || "");
    const isEmbed = url.includes("youtube.com") || url.includes("youtu.be") || url.includes("vimeo.com");
    return (
      <Stack spacing={1}>
        {block.titulo && <Typography variant="h6">{block.titulo}</Typography>}
        <Box
          sx={{
            position: "relative",
            aspectRatio: "16/9",
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "grey.100",
          }}
        >
          {isEmbed ? (
            <Box
              component="iframe"
              src={url.includes("youtu.be") ? url.replace("youtu.be/", "www.youtube.com/embed/") : url}
              sx={{ width: "100%", height: "100%", border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={block.titulo || "Video"}
            />
          ) : (
            <Box
              component="video"
              src={url}
              controls
              onEnded={() =>
                setProgress((current) => ({
                  ...current,
                  videos: { ...current.videos, [block.id]: true },
                }))
              }
              sx={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          )}
        </Box>
        <Button
          size="small"
          startIcon={<PlayCircle />}
          onClick={() =>
            setProgress((current) => ({
              ...current,
              videos: { ...current.videos, [block.id]: true },
            }))
          }
          sx={{ alignSelf: "flex-start", color }}
        >
          Marcar video visto
        </Button>
      </Stack>
    );
  }

  if (block.tipo === "link" || block.tipo === "documento") {
    const url =
      block.tipo === "documento" && content.modo === "archivo"
        ? content.dataUrl || ""
        : content.url || content.archivo || "";
    const buttonText =
      block.tipo === "documento"
        ? content.texto || content.fileName || "Abrir documento"
        : content.texto || "Abrir enlace";
    return (
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <Box sx={{ flex: 1 }}>
              <Typography fontWeight={700}>{block.titulo || buttonText || "Recurso"}</Typography>
              {content.descripcion && (
                <Typography color="text.secondary" variant="body2">
                  {content.descripcion}
                </Typography>
              )}
              {block.tipo === "documento" && content.fileName && (
                <Typography color="text.secondary" variant="caption">
                  {content.fileName}
                </Typography>
              )}
            </Box>
            <Button
              component={Link}
              href={url}
              download={block.tipo === "documento" && content.modo === "archivo" ? content.fileName || "documento" : undefined}
              target={content.nueva_pestana === false ? "_self" : "_blank"}
              rel="noreferrer"
              variant="outlined"
              disabled={!url}
              startIcon={block.tipo === "documento" ? <Download /> : <OpenInNew />}
              onClick={() =>
                setProgress((current) => ({
                  ...current,
                  links: { ...current.links, [block.id]: true },
                }))
              }
              sx={{ borderColor: color, color }}
            >
              {buttonText}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (block.tipo === "checklist") {
    return (
      <Stack spacing={1}>
        <Typography variant="h6">{block.titulo || "Checklist"}</Typography>
        {items.map((item: any, index: number) => {
          const id = String(item.id || index);
          return (
            <Stack key={id} direction="row" spacing={1} alignItems="center">
              <Checkbox
                checked={checked.includes(id)}
                onChange={(event) =>
                  setProgress((current) => {
                    const prev = current.checks[block.id] || [];
                    const next = event.target.checked ? [...prev, id] : prev.filter((x) => x !== id);
                    return { ...current, checks: { ...current.checks, [block.id]: next } };
                  })
                }
                sx={{ color, "&.Mui-checked": { color } }}
              />
              <Typography>{item.texto || item.label || item}</Typography>
            </Stack>
          );
        })}
      </Stack>
    );
  }

  if (block.tipo === "tarjetas" || block.tipo === "acordeon") {
    return (
      <Stack spacing={1.5}>
        <Typography variant="h6">{block.titulo || "Contenido interactivo"}</Typography>
        {content.instruccion && (
          <Typography color="text.secondary" variant="body2">
            {content.instruccion}
          </Typography>
        )}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
          {items.map((item: any, index: number) => {
            const id = String(item.id || index);
            const isOpen = opened.includes(id);
            const isFlipped = Array.isArray(flipped) && flipped.includes(id);
            const toggleFlip = () =>
              setProgress((current) => {
                const prevOpened = current.interactivos[block.id] || [];
                const nextOpened = prevOpened.includes(id) ? prevOpened : [...prevOpened, id];
                const prevFlipped = current.respuestas[`flip-${block.id}`] || [];
                const safeFlipped = Array.isArray(prevFlipped) ? prevFlipped : [];
                const nextFlipped = safeFlipped.includes(id)
                  ? safeFlipped.filter((value: string) => value !== id)
                  : [...safeFlipped, id];
                return {
                  ...current,
                  interactivos: { ...current.interactivos, [block.id]: nextOpened },
                  respuestas: { ...current.respuestas, [`flip-${block.id}`]: nextFlipped },
                };
              });
            return (
              <Box
                key={id}
                role="button"
                tabIndex={0}
                onClick={toggleFlip}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  toggleFlip();
                }}
                sx={{
                  cursor: "pointer",
                  perspective: "1000px",
                  minHeight: 190,
                  transition: "0.2s ease",
                  outline: "none",
                  "&:hover > .training-flip-card": { transform: isFlipped ? "rotateY(180deg) translateY(-2px)" : "rotateY(0deg) translateY(-2px)" },
                  "&:focus-visible > .training-flip-card": { boxShadow: `0 0 0 3px ${color}33` },
                }}
              >
                <Box
                  className="training-flip-card"
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    minHeight: 190,
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transition: "transform 1s cubic-bezier(.2,.8,.2,1), box-shadow 0.2s ease",
                    borderRadius: 2,
                  }}
                >
                  <Card
                    variant="outlined"
                    sx={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 2,
                      backfaceVisibility: "hidden",
                      borderColor: isOpen ? color : "divider",
                    }}
                  >
                    <CardContent sx={{ height: "100%" }}>
                      <Stack sx={{ height: "100%" }} justifyContent="space-between" spacing={2}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography fontWeight={700}>{item.titulo || `Elemento ${index + 1}`}</Typography>
                            {isOpen && <CheckCircle sx={{ color }} />}
                          </Stack>
                          <Typography color="text.secondary" sx={{ mt: 1 }}>
                            {item.frente || "Presiona para ver mas."}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color }}>
                          Presiona para girar
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                  <Card
                    variant="outlined"
                    sx={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 2,
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      borderColor: color,
                      bgcolor: `${color}0f`,
                    }}
                  >
                    <CardContent sx={{ height: "100%" }}>
                      <Stack sx={{ height: "100%" }} justifyContent="space-between" spacing={2}>
                        <Box>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography fontWeight={700}>{item.titulo || `Elemento ${index + 1}`}</Typography>
                            <CheckCircle sx={{ color }} />
                          </Stack>
                          <Typography color="text.secondary" sx={{ mt: 1, whiteSpace: "pre-line" }}>
                            {item.contenido || item.reverso || item.descripcion || "Informacion revisada."}
                          </Typography>
                        </Box>
                        <Typography variant="caption" sx={{ color }}>
                          Revisado
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Stack>
    );
  }

  if (block.tipo === "pregunta") {
    return (
      <Stack spacing={1.5}>
        <Typography variant="h6">{block.titulo || content.pregunta || "Pregunta"}</Typography>
        {items.length > 0 ? (
          <Stack spacing={1}>
            {items.map((item: any, index: number) => {
              const value = String(item.valor || item.texto || item || index);
              return (
                <Button
                  key={value}
                  variant={respuesta === value ? "contained" : "outlined"}
                  onClick={() =>
                    setProgress((current) => ({
                      ...current,
                      respuestas: { ...current.respuestas, [block.id]: value },
                    }))
                  }
                  sx={{
                    justifyContent: "flex-start",
                    bgcolor: respuesta === value ? color : undefined,
                    borderColor: color,
                    color: respuesta === value ? "white" : color,
                  }}
                >
                  {item.texto || item.label || item}
                </Button>
              );
            })}
          </Stack>
        ) : (
          <TextField
            fullWidth
            value={respuesta}
            onChange={(event) =>
              setProgress((current) => ({
                ...current,
                respuestas: { ...current.respuestas, [block.id]: event.target.value },
              }))
            }
          />
        )}
        {respuesta && (
          <Alert severity={isQuestionCorrect(block, respuesta) ? "success" : "warning"}>
            {isQuestionCorrect(block, respuesta)
              ? content.mensaje_correcto || "Respuesta registrada."
              : content.mensaje_error || "Revisa tu respuesta para continuar."}
          </Alert>
        )}
      </Stack>
    );
  }

  if (block.tipo === "aviso") {
    return (
      <Alert severity={content.severidad || "info"} sx={{ borderRadius: 2 }}>
        <Typography fontWeight={700}>{block.titulo || content.titulo || "Aviso"}</Typography>
        <Typography>{content.texto || ""}</Typography>
      </Alert>
    );
  }

  return (
    <Stack spacing={1}>
      {block.titulo && <Typography variant={content.variante || "h6"}>{block.titulo}</Typography>}
      <Typography
        sx={{
          whiteSpace: "pre-line",
          textAlign: content.alineacion || "left",
          color: block.estilos?.color || "text.primary",
          bgcolor: block.estilos?.fondo || "transparent",
          p: block.estilos?.fondo ? 2 : 0,
          borderRadius: 2,
        }}
      >
        {content.texto || "Contenido de texto."}
      </Typography>
    </Stack>
  );
}

function getMissingRules(step: PasoCapacitacion, progress: ProgressState, elapsedSeconds: number, identity: IdentityState) {
  const missing: string[] = [];
  const blocks = step.bloques || [];
  const rules = step.reglas_avance || {};
  if (rules.requiere_tiempo_minimo && elapsedSeconds < Number(step.tiempo_minimo_segundos || 0)) {
    missing.push(`Permanece al menos ${step.tiempo_minimo_segundos} segundos en este paso.`);
  }
  if (rules.requiere_ver_todos_los_bloques && blocks.some((block) => !progress.vistos[block.id])) {
    missing.push("Revisa todos los bloques para continuar.");
  }
  const bloqueIdentificacionIncompleto = blocks.some((block) => {
    if (block.tipo !== "identificacion") return false;
    const content = block.contenido || {};
    const requiereCorreo = content.pedir_correo !== false && Boolean(content.correo_obligatorio);
    return !identity.nombre.trim() || (requiereCorreo && !identity.correo.trim());
  });
  if (bloqueIdentificacionIncompleto) {
    missing.push("Completa los datos de identificacion.");
  }
  if (
    rules.requiere_checklist &&
    blocks
      .filter((block) => block.tipo === "checklist")
      .some((block) => (progress.checks[block.id] || []).length < getBlockItems(block).length)
  ) {
    missing.push("Marca todos los elementos del checklist.");
  }
  if (
    rules.requiere_abrir_interactivos &&
    blocks
      .filter((block) => block.tipo === "tarjetas" || block.tipo === "acordeon")
      .some((block) => (progress.interactivos[block.id] || []).length < getBlockItems(block).length)
  ) {
    missing.push("Abre todos los elementos interactivos.");
  }
  if (
    rules.requiere_video_completo &&
    blocks.filter((block) => block.tipo === "video").some((block) => !progress.videos[block.id])
  ) {
    missing.push("Reproduce o marca los videos como vistos.");
  }
  if (
    rules.requiere_abrir_links &&
    blocks
      .filter((block) => block.tipo === "link" || block.tipo === "documento")
      .some((block) => !progress.links[block.id])
  ) {
    missing.push("Abre los enlaces o documentos requeridos.");
  }
  if (
    rules.requiere_preguntas &&
    blocks.filter((block) => block.tipo === "pregunta").some((block) => !progress.respuestas[block.id])
  ) {
    missing.push("Responde las preguntas.");
  }
  if (
    rules.requiere_respuestas_correctas &&
    blocks.filter((block) => block.tipo === "pregunta").some((block) => !isQuestionCorrect(block, progress.respuestas[block.id]))
  ) {
    missing.push("Responde correctamente para continuar.");
  }
  if (step.confirmacion_requerida && !progress.confirmaciones[step.id]) {
    missing.push("Confirma que comprendiste este paso.");
  }
  return missing;
}

export default function TrainingPublicView({ capacitacion, preview, onFinish }: Props) {
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [stepStartedAt, setStepStartedAt] = useState(Date.now());
  const [tick, setTick] = useState(Date.now());
  const [identity, setIdentity] = useState<IdentityState>({ nombre: "", correo: "", empresa: "", numero_empleado: "" });
  const [saving, setSaving] = useState(false);
  const color = capacitacion.color_principal || "#6d00f5";
  const steps = useMemo(() => [...(capacitacion.pasos || [])].sort((a, b) => a.orden - b.orden), [capacitacion.pasos]);
  const step = steps[activeStep];
  const elapsed = Math.floor((tick - stepStartedAt) / 1000);
  const missing = step ? getMissingRules(step, progress, elapsed, identity) : [];
  const canContinue = missing.length === 0;
  const percent = steps.length ? Math.round(((activeStep + (finished ? 1 : 0)) / steps.length) * 100) : 0;
  const config = capacitacion.configuracion || {};

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setStepStartedAt(Date.now());
  }, [activeStep]);

  const finish = async () => {
    setSaving(true);
    try {
      await onFinish?.({
        ...identity,
        porcentaje: 100,
        fecha_inicio: new Date(Date.now() - Math.max(1, activeStep + 1) * elapsed * 1000),
        pasos_completados: steps.map((s) => s.id),
        respuestas: Object.entries(progress.respuestas).map(([bloque, respuesta]) => ({ bloque, respuesta })),
        tiempo_total_segundos: Math.max(1, Math.floor((Date.now() - stepStartedAt) / 1000)),
        origen: preview ? "vista_previa" : "publico",
      });
      setFinished(true);
    } finally {
      setSaving(false);
    }
  };

  const requiresIdentity = Boolean(config.requerir_identificacion);
  const identityReady =
    !requiresIdentity ||
    ((!config.campos_identificacion?.nombre || identity.nombre.trim()) &&
      (!config.campos_identificacion?.correo || identity.correo.trim()) &&
      (!config.campos_identificacion?.empresa || identity.empresa.trim()) &&
      (!config.campos_identificacion?.numero_empleado || identity.numero_empleado.trim()));

  if (finished) {
    return (
      <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2, bgcolor: "#f6f4fb" }}>
        <Card sx={{ width: "min(720px, 100%)", borderRadius: 4, boxShadow: 4 }}>
          <CardContent sx={{ p: { xs: 3, sm: 5 }, textAlign: "center" }}>
            <CheckCircle sx={{ fontSize: 72, color, mb: 2 }} />
            <Typography variant="h4" fontWeight={800}>
              Capacitacion completada
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Entrada registrada el {new Date().toLocaleString("es-MX")}.
            </Typography>
            <Chip label="100% completado" sx={{ mt: 3, bgcolor: color, color: "white", fontWeight: 700 }} />
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (!started) {
    return (
      <Box sx={{ minHeight: "100dvh", bgcolor: "#f6f4fb", p: 2, display: "grid", placeItems: "center" }}>
        <Card sx={{ width: "min(960px, 100%)", borderRadius: 4, overflow: "hidden", boxShadow: 4 }}>
          {capacitacion.portada_url && (
            <Box component="img" src={capacitacion.portada_url} sx={{ width: "100%", maxHeight: 280, objectFit: "cover" }} />
          )}
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
            <Stack spacing={2}>
              {preview && <Chip label="Vista previa" sx={{ alignSelf: "flex-start", bgcolor: color, color: "white" }} />}
              {capacitacion.logo_url && (
                <Box component="img" src={capacitacion.logo_url} sx={{ maxWidth: 140, maxHeight: 72, objectFit: "contain" }} />
              )}
              <Typography variant="h3" fontWeight={800} sx={{ fontSize: { xs: 30, sm: 44 } }}>
                {capacitacion.titulo}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 18 }}>
                {capacitacion.descripcion || "Completa esta capacitacion guiada paso a paso."}
              </Typography>
              {requiresIdentity && (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2, mt: 1 }}>
                  {config.campos_identificacion?.nombre && (
                    <TextField label="Nombre" value={identity.nombre} onChange={(e) => setIdentity({ ...identity, nombre: e.target.value })} required />
                  )}
                  {config.campos_identificacion?.correo && (
                    <TextField label="Correo" value={identity.correo} onChange={(e) => setIdentity({ ...identity, correo: e.target.value })} required />
                  )}
                  {config.campos_identificacion?.empresa && (
                    <TextField label="Empresa" value={identity.empresa} onChange={(e) => setIdentity({ ...identity, empresa: e.target.value })} required />
                  )}
                  {config.campos_identificacion?.numero_empleado && (
                    <TextField
                      label="Numero de empleado"
                      value={identity.numero_empleado}
                      onChange={(e) => setIdentity({ ...identity, numero_empleado: e.target.value })}
                      required
                    />
                  )}
                </Box>
              )}
              <Button
                variant="contained"
                disabled={!identityReady || steps.length === 0}
                onClick={() => setStarted(true)}
                sx={{ alignSelf: "flex-start", bgcolor: color, px: 4, "&:hover": { bgcolor: color } }}
              >
                Iniciar capacitacion
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: config.fondo === "morado" ? "#f3eaff" : "#f6f4fb", p: { xs: 1.5, sm: 3 } }}>
      <Box sx={{ maxWidth: config.layout === "ancho" ? 1280 : 980, mx: "auto" }}>
        <Card sx={{ borderRadius: 4, overflow: "hidden", boxShadow: 4 }}>
          <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: color, color: "white" }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
              <Box>
                <Typography variant="h5" fontWeight={800}>
                  {capacitacion.titulo}
                </Typography>
                {config.mostrar_numero_paso !== false && (
                  <Typography sx={{ opacity: 0.9 }}>
                    Paso {activeStep + 1} de {steps.length}
                  </Typography>
                )}
              </Box>
              <Chip label={`${percent}%`} sx={{ bgcolor: "rgba(255,255,255,0.18)", color: "white", fontWeight: 800 }} />
            </Stack>
            {config.mostrar_barra_progreso !== false && <LinearProgress variant="determinate" value={percent} sx={{ mt: 2, height: 8, borderRadius: 8 }} />}
          </Box>
          <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
            <Collapse in timeout={220}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h4" fontWeight={800}>
                    {step?.titulo}
                  </Typography>
                  {step?.descripcion && <Typography color="text.secondary">{step.descripcion}</Typography>}
                </Box>
                {(step?.bloques || [])
                  .slice()
                  .sort((a, b) => a.orden - b.orden)
                  .map((block) => (
                    <Card key={block.id} variant="outlined" sx={{ borderRadius: 3 }}>
                      <CardContent>
                        <BlockRenderer
                          block={block}
                          color={color}
                          progress={progress}
                          setProgress={setProgress}
                          identity={identity}
                          setIdentity={setIdentity}
                        />
                      </CardContent>
                    </Card>
                  ))}
                {step?.confirmacion_requerida && (
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Checkbox
                        checked={Boolean(progress.confirmaciones[step.id])}
                        onChange={(event) =>
                          setProgress((current) => ({
                            ...current,
                            confirmaciones: { ...current.confirmaciones, [step.id]: event.target.checked },
                          }))
                        }
                      />
                      <Typography>Confirmo que comprendi este paso.</Typography>
                    </Stack>
                  </Alert>
                )}
                {missing.length > 0 && (
                  <Alert severity="warning" sx={{ borderRadius: 2 }}>
                    {missing[0]}
                  </Alert>
                )}
                {missing.length === 0 && (
                  <Alert severity="success" sx={{ borderRadius: 2 }}>
                    Listo, puedes continuar.
                  </Alert>
                )}
                <Stack direction={{ xs: "column-reverse", sm: "row" }} justifyContent="space-between" gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<KeyboardArrowLeft />}
                    disabled={activeStep === 0}
                    onClick={() => setActiveStep((value) => Math.max(0, value - 1))}
                    sx={{ borderColor: color, color }}
                  >
                    Anterior
                  </Button>
                  {activeStep === steps.length - 1 ? (
                    <Button
                      variant="contained"
                      disabled={!canContinue || saving}
                      onClick={finish}
                      sx={{ bgcolor: color, "&:hover": { bgcolor: color } }}
                    >
                      {saving ? "Guardando..." : "Finalizar"}
                    </Button>
                  ) : (
                    <Button
                      variant="contained"
                      endIcon={<KeyboardArrowRight />}
                      disabled={!canContinue}
                      onClick={() => setActiveStep((value) => Math.min(steps.length - 1, value + 1))}
                      sx={{ bgcolor: color, "&:hover": { bgcolor: color } }}
                    >
                      Siguiente
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Collapse>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
