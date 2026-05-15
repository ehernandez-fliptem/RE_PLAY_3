import { useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Alert,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  ArrowDownward,
  ArrowUpward,
  Delete,
  DragIndicator,
  Email,
  ExpandMore,
  FormatAlignCenter,
  FormatAlignLeft,
  FormatAlignRight,
  Image,
  PictureAsPdf,
  RestartAlt,
  TextFields,
  Close,
  Visibility,
} from "@mui/icons-material";
import { TextFieldElement, useFormContext } from "react-hook-form-mui";

type Seccion = {
  id: string;
  tipo: "nombre" | "qr" | "texto" | "imagen" | "pdf";
  titulo?: string;
  contenido?: string;
  dataUrl?: string;
  fileName?: string;
  fijo?: boolean;
  align?: "left" | "center" | "right";
  fontSize?: number;
  imageSizePx?: number;
  titleAlign?: "left" | "center" | "right";
  contentAlign?: "left" | "center" | "right";
  titleFontSize?: number;
  contentFontSize?: number;
};

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const makeId = () =>
  `sec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const DEFAULT_TITLE_FONT_SIZE = 16;
const DEFAULT_CONTENT_FONT_SIZE = 16;
const DEFAULT_IMAGE_SIZE_PX = 260;
const DEFAULT_VISITORS_SUBJECT = "Registro del visitante";
const DEFAULT_VISITORS_SECTIONS: Seccion[] = [
  { id: "fixed_nombre", tipo: "nombre", fijo: true },
  { id: "fixed_qr", tipo: "qr", fijo: true },
];

export default function CorreoVisitantes() {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const { watch, setValue, formState } = useFormContext();
  const logoCorreo = String(watch("imgCorreo") || "");
  const asunto = String(watch("correo_visitantes_template.asunto") || DEFAULT_VISITORS_SUBJECT);
  const secciones = (watch("correo_visitantes_template.secciones") || []) as Seccion[];
  const cambiosPendientes = !!(formState.dirtyFields as any)?.correo_visitantes_template;
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState("");
  const [pdfPreviewName, setPdfPreviewName] = useState("");
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [builderExpanded, setBuilderExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [sizeDrafts, setSizeDrafts] = useState<Record<string, string>>({});
  const imgInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const qrDemo =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">
        <rect width="320" height="320" fill="#fff"/>
        <rect x="0" y="0" width="320" height="320" fill="none" stroke="#ddd"/>
        <g fill="#000">
          <rect x="18" y="18" width="84" height="84"/>
          <rect x="30" y="30" width="60" height="60" fill="#fff"/>
          <rect x="42" y="42" width="36" height="36"/>

          <rect x="218" y="18" width="84" height="84"/>
          <rect x="230" y="30" width="60" height="60" fill="#fff"/>
          <rect x="242" y="42" width="36" height="36"/>

          <rect x="18" y="218" width="84" height="84"/>
          <rect x="30" y="230" width="60" height="60" fill="#fff"/>
          <rect x="42" y="242" width="36" height="36"/>
        </g>
        <g fill="#000">
          <rect x="126" y="22" width="12" height="12"/>
          <rect x="150" y="22" width="12" height="12"/>
          <rect x="174" y="22" width="12" height="12"/>
          <rect x="114" y="46" width="12" height="12"/>
          <rect x="138" y="46" width="12" height="12"/>
          <rect x="162" y="46" width="12" height="12"/>
          <rect x="126" y="70" width="12" height="12"/>
          <rect x="150" y="70" width="12" height="12"/>
          <rect x="174" y="70" width="12" height="12"/>

          <rect x="114" y="114" width="12" height="12"/>
          <rect x="138" y="114" width="12" height="12"/>
          <rect x="162" y="114" width="12" height="12"/>
          <rect x="186" y="114" width="12" height="12"/>
          <rect x="210" y="114" width="12" height="12"/>
          <rect x="114" y="138" width="12" height="12"/>
          <rect x="162" y="138" width="12" height="12"/>
          <rect x="186" y="138" width="12" height="12"/>
          <rect x="210" y="138" width="12" height="12"/>
          <rect x="114" y="162" width="12" height="12"/>
          <rect x="138" y="162" width="12" height="12"/>
          <rect x="162" y="162" width="12" height="12"/>
          <rect x="210" y="162" width="12" height="12"/>
          <rect x="114" y="186" width="12" height="12"/>
          <rect x="138" y="186" width="12" height="12"/>
          <rect x="186" y="186" width="12" height="12"/>
          <rect x="210" y="186" width="12" height="12"/>

          <rect x="126" y="210" width="12" height="12"/>
          <rect x="150" y="210" width="12" height="12"/>
          <rect x="174" y="210" width="12" height="12"/>
          <rect x="198" y="210" width="12" height="12"/>
          <rect x="222" y="210" width="12" height="12"/>
          <rect x="126" y="234" width="12" height="12"/>
          <rect x="174" y="234" width="12" height="12"/>
          <rect x="222" y="234" width="12" height="12"/>
          <rect x="126" y="258" width="12" height="12"/>
          <rect x="150" y="258" width="12" height="12"/>
          <rect x="198" y="258" width="12" height="12"/>
          <rect x="222" y="258" width="12" height="12"/>
          <rect x="126" y="282" width="12" height="12"/>
          <rect x="174" y="282" width="12" height="12"/>
          <rect x="198" y="282" width="12" height="12"/>
          <rect x="222" y="282" width="12" height="12"/>
        </g>
      </svg>
    `);
  const nombreDemo = "Visitante de Prueba";
  const fromDemo = "Flipbot <recepcionelectronica@fliptem-mx.com>";
  const toDemo = "visitante@correo.com";
  const dateDemo = "15/05/2026 13:27";

  const renderPreviewSection = (item: Seccion) => {
    if (item.tipo === "nombre") {
      return (
        <Box key={item.id} data-preview-section-id={item.id} sx={{ mb: 1.5 }}>
          <Typography>
            <strong>Estimado, {nombreDemo}</strong>
          </Typography>
        </Box>
      );
    }
    if (item.tipo === "qr") {
      return (
        <Box key={item.id} data-preview-section-id={item.id} sx={{ mb: 2 }}>
          <Typography sx={{ textAlign: "center", mb: 1 }}>
            Presenta este código para poder ingresar a nuestras instalaciones
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Box
              component="img"
              src={qrDemo}
              alt="QR demo"
              sx={{ width: 180, height: 180, borderRadius: 1, bgcolor: "white" }}
            />
          </Box>
        </Box>
      );
    }
    if (item.tipo === "texto") {
      const titleAlign = item.titleAlign || item.align || "left";
      const contentAlign = item.contentAlign || item.align || "left";
      const titleFontSize = item.titleFontSize || DEFAULT_TITLE_FONT_SIZE;
      const contentFontSize = item.contentFontSize || item.fontSize || DEFAULT_CONTENT_FONT_SIZE;
      return (
        <Box key={item.id} data-preview-section-id={item.id} sx={{ mb: 1.5 }}>
          {item.titulo ? (
            <Typography
              variant="subtitle1"
              fontWeight={700}
              sx={{ textAlign: titleAlign, fontSize: `${titleFontSize}px` }}
            >
              {item.titulo}
            </Typography>
          ) : null}
          {item.contenido ? (
            <Typography sx={{ whiteSpace: "pre-wrap", textAlign: contentAlign, fontSize: `${contentFontSize}px` }}>
              {item.contenido}
            </Typography>
          ) : (
            <Typography color="text.secondary">(Sin contenido)</Typography>
          )}
        </Box>
      );
    }
    if (item.tipo === "imagen") {
      const justifyContent =
        item.align === "left"
          ? "flex-start"
          : item.align === "right"
          ? "flex-end"
          : "center";
      const maxHeight = item.imageSizePx || DEFAULT_IMAGE_SIZE_PX;
      return (
        <Box key={item.id} data-preview-section-id={item.id} sx={{ mb: 1.5 }}>
          {item.titulo ? (
            <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
              {item.titulo}
            </Typography>
          ) : null}
          {item.dataUrl ? (
            <Box sx={{ display: "flex", justifyContent }}>
              <Box
                component="img"
                src={item.dataUrl}
                alt={item.fileName || "imagen"}
                sx={{ maxWidth: "100%", maxHeight, borderRadius: 1, border: "1px solid #ddd" }}
              />
            </Box>
          ) : (
            <Typography color="text.secondary">(Imagen no cargada)</Typography>
          )}
        </Box>
      );
    }
    if (item.tipo === "pdf") {
      return null;
    }
    return null;
  };

  const actualizar = (next: Seccion[]) => {
    setValue("correo_visitantes_template.secciones", next, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const agregarTexto = () => {
    actualizar([...secciones, { id: makeId(), tipo: "texto", titulo: "", contenido: "" }]);
  };

  const agregarImagen = async (file?: File) => {
    if (!file) return;
    const dataUrl = await toDataUrl(file);
    actualizar([
      ...secciones,
      {
        id: makeId(),
        tipo: "imagen",
        titulo: file.name,
        dataUrl,
        fileName: file.name,
        align: "center",
        imageSizePx: DEFAULT_IMAGE_SIZE_PX,
      },
    ]);
  };

  const agregarPdf = async (file?: File) => {
    if (!file) return;
    const dataUrl = await toDataUrl(file);
    actualizar([
      ...secciones,
      {
        id: makeId(),
        tipo: "pdf",
        dataUrl,
        fileName: file.name,
      },
    ]);
  };

  const mover = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= secciones.length) return;
    const next = [...secciones];
    [next[index], next[target]] = [next[target], next[index]];
    actualizar(next);
  };

  const eliminar = (index: number) => {
    const item = secciones[index];
    if (item?.fijo) return;
    actualizar(secciones.filter((_, i) => i !== index));
  };

  const editar = (index: number, patch: Partial<Seccion>) => {
    const next = [...secciones];
    next[index] = { ...next[index], ...patch };
    actualizar(next);
    if (!previewExpanded) return;
    const sectionId = next[index]?.id;
    if (!sectionId) return;
    setTimeout(() => {
      const container = previewContainerRef.current;
      const section = container?.querySelector(
        `[data-preview-section-id="${sectionId}"]`
      ) as HTMLElement | null;
      section?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? false),
    }));
  };

  const setDraft = (key: string, value: string) => {
    setSizeDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const clearDraft = (key: string) => {
    setSizeDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const reiniciarTodo = () => {
    setValue("correo_visitantes_template.asunto", DEFAULT_VISITORS_SUBJECT, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue("correo_visitantes_template.secciones", DEFAULT_VISITORS_SECTIONS, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setExpandedSections({});
    setSizeDrafts({});
  };

  return (
    <Box>
      <Typography
        variant="overline"
        component="h2"
        sx={{ mb: 2 }}
        display="flex"
        alignItems="center"
      >
        <Email color="primary" sx={{ mr: 1 }} /> <strong>Correo Visitantes</strong>
      </Typography>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<RestartAlt />}
          onClick={reiniciarTodo}
        >
          Reiniciar todo
        </Button>
      </Box>

      {cambiosPendientes ? (
        <Alert severity="warning" sx={{ mb: 1.5 }}>
          Tienes cambios sin guardar en la plantilla de correo.
        </Alert>
      ) : null}

      <TextFieldElement
        name="correo_visitantes_template.asunto"
        label="Asunto del correo de visitantes"
        fullWidth
        required
        margin="normal"
      />

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid
          size={{ xs: 12, md: 6 }}
          sx={{
            alignSelf: "flex-start",
            position: { xs: "static", md: "sticky" },
            top: { md: 76 },
            zIndex: { md: 1 },
          }}
        >
          <Card
            variant="outlined"
            sx={{
              borderStyle: "dashed",
              borderColor: "divider",
              bgcolor: "background.paper",
            }}
          >
            <CardContent sx={{ p: 1.5 }}>
              <Button
                fullWidth
                variant="text"
                onClick={() => setPreviewExpanded((v) => !v)}
                endIcon={
                  <ExpandMore
                    sx={{
                      transition: "transform 200ms ease",
                      transform: previewExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  />
                }
                sx={{ justifyContent: "space-between", mb: 1, textTransform: "none" }}
              >
                <Typography variant="caption" color="text.secondary">
                  Vista previa en tiempo real del correo
                </Typography>
              </Button>
              <Collapse in={previewExpanded} timeout={260} unmountOnExit>
                <Box
                  ref={previewContainerRef}
                  sx={{
                    maxHeight: { xs: 360, md: 700 },
                    overflow: "auto",
                    p: 1.5,
                    borderRadius: 1,
                    bgcolor: "#f7f7f7",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Card variant="outlined" sx={{ maxWidth: 760, mx: "auto", bgcolor: "#fff" }}>
                    <CardContent>
                      {logoCorreo ? (
                        <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                          <Box
                            component="img"
                            src={logoCorreo}
                            alt="Logo de la app"
                            sx={{ maxHeight: 70, maxWidth: 220, objectFit: "contain" }}
                          />
                        </Box>
                      ) : null}

                      <Typography variant="h6" fontWeight={700} textAlign="center" sx={{ mb: 2 }}>
                        {asunto}
                      </Typography>
                      {secciones.map((item) => renderPreviewSection(item))}
                    </CardContent>
                  </Card>
                </Box>
              </Collapse>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Button
            fullWidth
            variant="text"
            onClick={() => setBuilderExpanded((v) => !v)}
            endIcon={
              <ExpandMore
                sx={{
                  transition: "transform 200ms ease",
                  transform: builderExpanded ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            }
            sx={{ justifyContent: "space-between", mt: 0.5, mb: 0.5, textTransform: "none" }}
          >
            <Typography variant="subtitle2">Agregar secciones al correo</Typography>
          </Button>
          <Collapse in={builderExpanded} timeout={260} unmountOnExit>
          <Stack direction="row" spacing={1} sx={{ my: 1, flexWrap: "wrap", gap: 1 }}>
            <Button size="small" variant="outlined" startIcon={<TextFields />} onClick={agregarTexto}>
              Texto
            </Button>
            <Button size="small" variant="outlined" startIcon={<Image />} onClick={() => imgInputRef.current?.click()}>
              Imagen
            </Button>
            <Button size="small" variant="outlined" startIcon={<PictureAsPdf />} onClick={() => pdfInputRef.current?.click()}>
              PDF
            </Button>
            <Button size="small" variant="contained" onClick={() => setPreviewOpen(true)}>
              Vista previa
            </Button>
          </Stack>
      <input
        ref={imgInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          await agregarImagen(file);
          e.target.value = "";
        }}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          await agregarPdf(file);
          e.target.value = "";
        }}
      />

      <Grid container spacing={1} sx={{ mt: 1 }}>
        {secciones.map((item, idx) => (
          <Grid key={item.id} size={12}>
            <Card variant="outlined">
              <CardContent sx={{ py: "10px !important" }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mb: 1, cursor: "pointer", borderRadius: 1, px: 0.5, py: 0.25 }}
                  onClick={() => toggleSection(item.id)}
                >
                  <DragIndicator fontSize="small" />
                  <Typography variant="body2" sx={{ flexGrow: 1, fontWeight: 600 }}>
                    {item.tipo === "nombre"
                      ? "Nombre del visitante (fijo)"
                      : item.tipo === "qr"
                      ? "QR de acceso (fijo)"
                      : item.tipo === "texto"
                      ? "Bloque de texto"
                      : item.tipo === "imagen"
                      ? "Imagen"
                      : "PDF adjunto"}
                  </Typography>
                  {item.fijo && <Chip size="small" color="primary" label="Obligatorio" />}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      mover(idx, -1);
                    }}
                    disabled={idx === 0}
                  >
                    <ArrowUpward fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      mover(idx, 1);
                    }}
                    disabled={idx === secciones.length - 1}
                  >
                    <ArrowDownward fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminar(idx);
                    }}
                    disabled={!!item.fijo}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>

                <Collapse in={expandedSections[item.id] ?? false} timeout={220}>
                {item.tipo === "texto" && (
                  <Stack spacing={1}>
                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Titulo
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <ToggleButtonGroup
                          size="small"
                          exclusive
                          value={item.titleAlign || item.align || "left"}
                          onChange={(_, value) => {
                            if (!value) return;
                            editar(idx, { titleAlign: value });
                          }}
                        >
                          <ToggleButton value="left" aria-label="Alinear texto a la izquierda">
                            <FormatAlignLeft fontSize="small" />
                          </ToggleButton>
                          <ToggleButton value="center" aria-label="Alinear texto al centro">
                            <FormatAlignCenter fontSize="small" />
                          </ToggleButton>
                          <ToggleButton value="right" aria-label="Alinear texto a la derecha">
                            <FormatAlignRight fontSize="small" />
                          </ToggleButton>
                        </ToggleButtonGroup>
                        <TextField
                          size="small"
                          label="Tamano (px)"
                          type="number"
                          inputProps={{ min: 0, max: 40, step: 1 }}
                          value={
                            sizeDrafts[`title:${item.id}`] ??
                            String(item.titleFontSize ?? DEFAULT_TITLE_FONT_SIZE)
                          }
                          onChange={(e) => {
                            const key = `title:${item.id}`;
                            const raw = e.target.value;
                            setDraft(key, raw);
                            const parsed = Number(raw);
                            if (raw.trim() === "" || Number.isNaN(parsed) || parsed <= 0) {
                              editar(idx, { titleFontSize: DEFAULT_TITLE_FONT_SIZE });
                              return;
                            }
                            editar(idx, { titleFontSize: Math.max(10, Math.min(40, parsed)) });
                          }}
                          onBlur={() => clearDraft(`title:${item.id}`)}
                          sx={{ width: 140 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => {
                            clearDraft(`title:${item.id}`);
                            editar(idx, {
                              titleFontSize: DEFAULT_TITLE_FONT_SIZE,
                              titleAlign: "left",
                            });
                          }}
                          title="Restaurar tamaño predeterminado"
                          aria-label="Restaurar tamaño predeterminado de título"
                        >
                          <RestartAlt fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                    <TextField
                      size="small"
                      label="Titulo"
                      value={item.titulo || ""}
                      onChange={(e) => editar(idx, { titulo: e.target.value })}
                    />
                    <Stack spacing={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Contenido
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <ToggleButtonGroup
                          size="small"
                          exclusive
                          value={item.contentAlign || item.align || "left"}
                          onChange={(_, value) => {
                            if (!value) return;
                            editar(idx, { contentAlign: value });
                          }}
                        >
                          <ToggleButton value="left" aria-label="Alinear contenido a la izquierda">
                            <FormatAlignLeft fontSize="small" />
                          </ToggleButton>
                          <ToggleButton value="center" aria-label="Alinear contenido al centro">
                            <FormatAlignCenter fontSize="small" />
                          </ToggleButton>
                          <ToggleButton value="right" aria-label="Alinear contenido a la derecha">
                            <FormatAlignRight fontSize="small" />
                          </ToggleButton>
                        </ToggleButtonGroup>
                        <TextField
                          size="small"
                          label="Tamano (px)"
                          type="number"
                          inputProps={{ min: 0, max: 40, step: 1 }}
                          value={
                            sizeDrafts[`content:${item.id}`] ??
                            String(item.contentFontSize ?? item.fontSize ?? DEFAULT_CONTENT_FONT_SIZE)
                          }
                          onChange={(e) => {
                            const key = `content:${item.id}`;
                            const raw = e.target.value;
                            setDraft(key, raw);
                            const parsed = Number(raw);
                            if (raw.trim() === "" || Number.isNaN(parsed) || parsed <= 0) {
                              editar(idx, { contentFontSize: DEFAULT_CONTENT_FONT_SIZE });
                              return;
                            }
                            editar(idx, { contentFontSize: Math.max(10, Math.min(40, parsed)) });
                          }}
                          onBlur={() => clearDraft(`content:${item.id}`)}
                          sx={{ width: 140 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => {
                            clearDraft(`content:${item.id}`);
                            editar(idx, {
                              contentFontSize: DEFAULT_CONTENT_FONT_SIZE,
                              contentAlign: "left",
                            });
                          }}
                          title="Restaurar tamaño predeterminado"
                          aria-label="Restaurar tamaño predeterminado de contenido"
                        >
                          <RestartAlt fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                    <TextField
                      size="small"
                      label="Contenido"
                      value={item.contenido || ""}
                      onChange={(e) => editar(idx, { contenido: e.target.value })}
                      multiline
                      minRows={3}
                    />
                  </Stack>
                )}

                {item.tipo === "imagen" && (
                  <Stack spacing={1}>
                    <TextField
                      size="small"
                      label="Titulo (opcional)"
                      value={item.titulo || ""}
                      onChange={(e) => editar(idx, { titulo: e.target.value })}
                    />
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 110 }}>
                        Imagen
                      </Typography>
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={item.align || "center"}
                        onChange={(_, value) => {
                          if (!value) return;
                          editar(idx, { align: value });
                        }}
                      >
                        <ToggleButton value="left" aria-label="Alinear a la izquierda">
                          <FormatAlignLeft fontSize="small" />
                        </ToggleButton>
                        <ToggleButton value="center" aria-label="Alinear al centro">
                          <FormatAlignCenter fontSize="small" />
                        </ToggleButton>
                        <ToggleButton value="right" aria-label="Alinear a la derecha">
                          <FormatAlignRight fontSize="small" />
                        </ToggleButton>
                      </ToggleButtonGroup>
                      <TextField
                        size="small"
                        label="Tamano (px)"
                        type="number"
                        inputProps={{ min: 0, max: 700, step: 1 }}
                        value={
                          sizeDrafts[`image:${item.id}`] ??
                          String(item.imageSizePx ?? DEFAULT_IMAGE_SIZE_PX)
                        }
                        onChange={(e) => {
                          const key = `image:${item.id}`;
                          const raw = e.target.value;
                          setDraft(key, raw);
                          const parsed = Number(raw);
                          if (raw.trim() === "" || Number.isNaN(parsed) || parsed <= 0) {
                            editar(idx, { imageSizePx: DEFAULT_IMAGE_SIZE_PX });
                            return;
                          }
                          editar(idx, { imageSizePx: Math.max(120, Math.min(700, parsed)) });
                        }}
                        onBlur={() => clearDraft(`image:${item.id}`)}
                        sx={{ width: 140 }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => {
                          clearDraft(`image:${item.id}`);
                          editar(idx, { imageSizePx: DEFAULT_IMAGE_SIZE_PX, align: "center" });
                        }}
                        title="Restaurar predeterminado"
                        aria-label="Restaurar tamaño y alineación predeterminados de imagen"
                      >
                        <RestartAlt fontSize="small" />
                      </IconButton>
                    </Stack>
                    {item.dataUrl ? (
                      <Stack spacing={0.5} alignItems="flex-start">
                        <Box
                          component="img"
                          src={item.dataUrl}
                          alt={item.fileName || "imagen"}
                          sx={{
                            width: 84,
                            height: 84,
                            objectFit: "cover",
                            borderRadius: 1,
                            border: "1px solid #ddd",
                          }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Vista real de tamaño y alineación en la vista previa izquierda.
                        </Typography>
                      </Stack>
                    ) : null}
                  </Stack>
                )}

                {item.tipo === "pdf" && (
                  <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                      Archivo actual
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {item.fileName || "Sin archivo PDF"}
                      </Typography>
                      <IconButton
                        size="small"
                        color="primary"
                        disabled={!item.dataUrl}
                        aria-label="Ver archivo PDF"
                        title={item.dataUrl ? "Ver archivo" : "No hay archivo para ver"}
                        onClick={() => {
                          if (!item.dataUrl) return;
                          setPdfPreviewUrl(item.dataUrl);
                          setPdfPreviewName(item.fileName || "archivo.pdf");
                          setPdfPreviewOpen(true);
                        }}
                      >
                        <Visibility fontSize="small" />
                      </IconButton>
                    </Stack>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PictureAsPdf />}
                      component="label"
                      sx={{ width: "fit-content", minWidth: 150 }}
                    >
                      Cambiar archivo
                      <input
                        hidden
                        type="file"
                        accept="application/pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const dataUrl = await toDataUrl(file);
                          editar(idx, {
                            dataUrl,
                            fileName: file.name,
                          });
                          e.currentTarget.value = "";
                        }}
                      />
                    </Button>
                  </Stack>
                )}
                </Collapse>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
          </Collapse>
        </Grid>
      </Grid>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="xl"
        PaperProps={{
          sx: {
            width: fullScreen ? "100%" : "96vw",
            maxWidth: fullScreen ? "100%" : "96vw",
            height: fullScreen ? "100%" : "94vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 1,
          }}
        >
          Vista previa de correo de visitantes
          <IconButton
            onClick={() => setPreviewOpen(false)}
            aria-label="Cerrar vista previa"
            sx={{
              color: "error.main",
              "&:hover": { bgcolor: "error.lighter" },
            }}
          >
            <Close sx={{ fontSize: 28 }} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1.5, md: 2 }, bgcolor: "#f7f7f7" }}>
          <Card
            variant="outlined"
            sx={{
              maxWidth: 900,
              mx: "auto",
              bgcolor: "#fff",
              minHeight: fullScreen ? "calc(100vh - 170px)" : "calc(94vh - 150px)",
            }}
          >
            <CardContent>
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "grey.50",
                }}
              >
                <Typography variant="body2"><strong>From:</strong> {fromDemo}</Typography>
                <Typography variant="body2"><strong>To:</strong> {toDemo}</Typography>
                <Typography variant="body2"><strong>Date:</strong> {dateDemo}</Typography>
                <Typography variant="body2"><strong>Subject:</strong> {asunto}</Typography>
              </Box>

              {logoCorreo ? (
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  <Box
                    component="img"
                    src={logoCorreo}
                    alt="Logo de la app"
                    sx={{ maxHeight: 90, maxWidth: 260, objectFit: "contain" }}
                  />
                </Box>
              ) : null}

              <Typography variant="h5" fontWeight={700} textAlign="center" sx={{ mb: 2 }}>
                {asunto}
              </Typography>
              {secciones.map((item) => renderPreviewSection(item))}

              <Box sx={{ mt: 3 }}>
                <Box
                  sx={{
                    borderTop: "1px solid",
                    borderColor: "divider",
                    pt: 1.5,
                    textAlign: "center",
                  }}
                >
                  <Typography variant="body2">
                    <strong>Nota:</strong> No responda a este mensaje de correo electrónico.
                    El mensaje se envió desde una dirección que no puede aceptar correo electrónico entrante.
                  </Typography>
                </Box>
                <Box
                  sx={{
                    mt: 2,
                    pt: 1.5,
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                    La información contenida en este correo electrónico y en cualquier archivo adjunto es confidencial y está destinada exclusivamente a la persona o entidad a la que se dirige. Puede contener información privilegiada o sujeta a protección legal. Queda estrictamente prohibida cualquier revisión, uso, divulgación, copia, distribución o cualquier otra acción relacionada con su contenido por parte de personas distintas al destinatario.
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, whiteSpace: "pre-wrap" }}>
                    The information contained in this email and any attached files is confidential and intended solely for the use of the individual or entity to whom it is addressed. Any unauthorized review, use, disclosure, copying, distribution, or any other action related to its content is strictly prohibited.
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      <Dialog
        open={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pr: 1,
          }}
        >
          {pdfPreviewName || "Vista de archivo"}
          <IconButton
            onClick={() => setPdfPreviewOpen(false)}
            aria-label="Cerrar vista de archivo"
            sx={{ color: "error.main" }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0, height: { xs: "70vh", md: "78vh" } }}>
          {pdfPreviewUrl ? (
            <Box
              component="iframe"
              src={pdfPreviewUrl}
              title={pdfPreviewName || "Vista de PDF"}
              sx={{ width: "100%", height: "100%", border: 0 }}
            />
          ) : (
            <Box sx={{ p: 2 }}>
              <Typography color="text.secondary">No hay archivo para previsualizar.</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}


