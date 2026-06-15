import { useEffect, useMemo, useState } from "react";
import {
  Add,
  ArrowDownward,
  ArrowUpward,
  ChevronLeft,
  ContentCopy,
  Delete,
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

function normalizeOrden<T extends { orden: number }>(items: T[]) {
  return items.map((item, index) => ({ ...item, orden: index + 1 }));
}

function parseLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((texto, index) => ({ id: String(index + 1), texto }));
}

function stringifyItems(items: any[]) {
  return (items || []).map((item) => item.texto || item.label || item.titulo || item).join("\n");
}

function defaultContentForType(tipo: TipoBloqueCapacitacion) {
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

  const errors = useMemo(() => {
    const current: Record<string, string> = {};
    if (!data.titulo.trim()) current.titulo = "El titulo es obligatorio.";
    if (!data.slug.trim()) current.slug = "El slug es obligatorio.";
    if (data.estado === "publicada") {
      if (data.pasos.length === 0) current.pasos = "Agrega al menos un paso.";
      if (data.pasos.some((paso) => paso.bloques.length === 0)) current.pasos = "Todos los pasos deben tener bloques.";
    }
    return current;
  }, [data]);

  const setField = (field: keyof Capacitacion, value: any) => setData((current) => ({ ...current, [field]: value }));

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
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession, erroresForm } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
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
                <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                  <Button variant="contained" color="secondary" onClick={() => navigate("/capacitaciones")} startIcon={<ChevronLeft />}>
                    Regresar
                  </Button>
                  <Button variant="contained" onClick={save} startIcon={<Save />}>
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
                        label="Titulo"
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
                        label="Descripcion"
                        value={data.descripcion || ""}
                        onChange={(event) => setField("descripcion", event.target.value)}
                        fullWidth
                        margin="dense"
                        multiline
                        minRows={2}
                      />
                      <TextField
                        label="Slug publico"
                        value={data.slug}
                        onChange={(event) => setField("slug", slugifyCapacitacion(event.target.value))}
                        error={Boolean(errors.slug)}
                        helperText={errors.slug || `/capacitacion/${data.slug || "slug"}`}
                        fullWidth
                        margin="dense"
                        required
                      />
                      <FormControl fullWidth margin="dense">
                        <InputLabel>Estado</InputLabel>
                        <Select value={data.estado} label="Estado" onChange={(event) => setField("estado", event.target.value as EstadoCapacitacion)}>
                          <MenuItem value="borrador">Borrador</MenuItem>
                          <MenuItem value="publicada">Publicada</MenuItem>
                          <MenuItem value="inactiva">Inactiva</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        label="Color principal"
                        value={data.color_principal || "#6d00f5"}
                        onChange={(event) => setField("color_principal", event.target.value)}
                        fullWidth
                        margin="dense"
                      />
                      <TextField label="Logo URL" value={data.logo_url || ""} onChange={(event) => setField("logo_url", event.target.value)} fullWidth margin="dense" />
                      <TextField label="Portada URL" value={data.portada_url || ""} onChange={(event) => setField("portada_url", event.target.value)} fullWidth margin="dense" />
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
                        <TextField label="Titulo del paso" value={activeStep.titulo} onChange={(e) => updateStep({ titulo: e.target.value })} fullWidth margin="dense" />
                        <TextField
                          label="Descripcion"
                          value={activeStep.descripcion || ""}
                          onChange={(e) => updateStep({ descripcion: e.target.value })}
                          fullWidth
                          margin="dense"
                          multiline
                          minRows={2}
                        />
                        <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                          <TextField
                            label="Tiempo minimo en segundos"
                            type="number"
                            value={activeStep.tiempo_minimo_segundos || 0}
                            onChange={(e) => updateStep({ tiempo_minimo_segundos: Number(e.target.value || 0) })}
                            fullWidth
                            margin="dense"
                          />
                          <FormControlLabel
                            control={<Checkbox checked={Boolean(activeStep.confirmacion_requerida)} onChange={(e) => updateStep({ confirmacion_requerida: e.target.checked })} />}
                            label="Requiere confirmacion"
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
                              label={label}
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
                                  <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
                                    <FormControl sx={{ minWidth: 180 }}>
                                      <InputLabel>Tipo</InputLabel>
                                      <Select
                                        value={bloque.tipo}
                                        label="Tipo"
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
                                    <TextField label="Titulo" value={bloque.titulo || ""} onChange={(e) => updateBlock(bloque.id, { titulo: e.target.value })} fullWidth />
                                    <Button
                                      color="primary"
                                      onClick={() => {
                                        const copia = { ...bloque, id: `bloque-${Date.now()}`, orden: activeStep.bloques.length + 1 };
                                        updateStep({ bloques: [...activeStep.bloques, copia] });
                                      }}
                                    >
                                      <ContentCopy />
                                    </Button>
                                    <Button
                                      color="error"
                                      onClick={() => updateStep({ bloques: normalizeOrden(activeStep.bloques.filter((b) => b.id !== bloque.id)) })}
                                    >
                                      <Delete />
                                    </Button>
                                  </Stack>
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
  if (bloque.tipo === "imagen") {
    return (
      <Stack spacing={1}>
        <TextField label="URL de imagen" value={content.url || ""} onChange={(e) => setContent({ url: e.target.value })} fullWidth />
        <TextField label="Texto alternativo" value={content.alt || ""} onChange={(e) => setContent({ alt: e.target.value })} fullWidth />
        <TextField label="Pie de imagen" value={content.pie || ""} onChange={(e) => setContent({ pie: e.target.value })} fullWidth />
      </Stack>
    );
  }
  if (bloque.tipo === "video") {
    return <TextField label="URL de video" value={content.url || ""} onChange={(e) => setContent({ url: e.target.value })} fullWidth />;
  }
  if (bloque.tipo === "link") {
    return (
      <Stack spacing={1}>
        <TextField label="Texto" value={content.texto || ""} onChange={(e) => setContent({ texto: e.target.value })} fullWidth />
        <TextField label="URL" value={content.url || ""} onChange={(e) => setContent({ url: e.target.value })} fullWidth />
        <TextField label="Descripcion" value={content.descripcion || ""} onChange={(e) => setContent({ descripcion: e.target.value })} fullWidth />
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
          label="Nombre o texto del boton"
          value={content.texto || ""}
          onChange={(e) => setContent({ texto: e.target.value })}
          fullWidth
        />
        <TextField
          label="Descripcion"
          value={content.descripcion || ""}
          onChange={(e) => setContent({ descripcion: e.target.value })}
          fullWidth
        />
        {modo === "link" ? (
          <TextField
            label="URL del documento"
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
              <Typography variant="subtitle2" fontWeight={700}>
                Elementos del checklist
              </Typography>
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
                  label={`Elemento ${index + 1}`}
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
        <TextField label="Instruccion" value={content.instruccion || ""} onChange={(e) => setContent({ instruccion: e.target.value })} fullWidth />
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" fontWeight={700}>
                  {bloque.tipo === "tarjetas" ? "Tarjetas" : "Secciones"}
                </Typography>
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
                          label="Titulo"
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
                        label="Frente"
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
                        label="Parte trasera"
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
        <TextField label="Pregunta" value={content.pregunta || ""} onChange={(e) => setContent({ pregunta: e.target.value })} fullWidth />
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Stack spacing={1}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2" fontWeight={700}>
                  Opciones
                </Typography>
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
                    label={`Opcion ${index + 1}`}
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
          label="Requerir respuesta correcta"
        />
      </Stack>
    );
  }
  if (bloque.tipo === "aviso") {
    return (
      <Stack spacing={1}>
        <FormControl fullWidth>
          <InputLabel>Severidad</InputLabel>
          <Select value={content.severidad || "info"} label="Severidad" onChange={(e) => setContent({ severidad: e.target.value })}>
            <MenuItem value="info">Informacion</MenuItem>
            <MenuItem value="warning">Advertencia</MenuItem>
            <MenuItem value="error">Peligro</MenuItem>
            <MenuItem value="success">Exito</MenuItem>
          </Select>
        </FormControl>
        <TextField label="Texto" value={content.texto || ""} onChange={(e) => setContent({ texto: e.target.value })} fullWidth multiline minRows={3} />
      </Stack>
    );
  }
  return <TextField label="Texto" value={content.texto || ""} onChange={(e) => setContent({ texto: e.target.value })} fullWidth multiline minRows={4} />;
}
