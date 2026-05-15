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
  TextFields,
  Close,
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

export default function CorreoVisitantes() {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("md"));
  const { watch, setValue } = useFormContext();
  const logoCorreo = String(watch("imgCorreo") || "");
  const asunto = String(watch("correo_visitantes_template.asunto") || "Registro del visitante");
  const secciones = (watch("correo_visitantes_template.secciones") || []) as Seccion[];
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(true);
  const [builderExpanded, setBuilderExpanded] = useState(true);
  const imgInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
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
        <Box key={item.id} sx={{ mb: 1.5 }}>
          <Typography>
            <strong>Estimado, {nombreDemo}</strong>
          </Typography>
        </Box>
      );
    }
    if (item.tipo === "qr") {
      return (
        <Box key={item.id} sx={{ mb: 2 }}>
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
      const textAlign = item.align || "left";
      const fontSize = item.fontSize || 16;
      return (
        <Box key={item.id} sx={{ mb: 1.5 }}>
          {item.titulo ? (
            <Typography variant="subtitle1" fontWeight={700} sx={{ textAlign }}>
              {item.titulo}
            </Typography>
          ) : null}
          {item.contenido ? (
            <Typography sx={{ whiteSpace: "pre-wrap", textAlign, fontSize: `${fontSize}px` }}>
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
      return (
        <Box key={item.id} sx={{ mb: 1.5 }}>
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
                sx={{ maxWidth: "100%", maxHeight: 260, borderRadius: 1, border: "1px solid #ddd" }}
              />
            </Box>
          ) : (
            <Typography color="text.secondary">(Imagen no cargada)</Typography>
          )}
        </Box>
      );
    }
    if (item.tipo === "pdf") {
      return (
        <Box key={item.id} sx={{ mb: 1.5 }}>
          {item.titulo ? (
            <Typography variant="subtitle1" fontWeight={700}>
              {item.titulo}
            </Typography>
          ) : null}
          <Typography>Adjunto: {item.fileName || "documento.pdf"}</Typography>
        </Box>
      );
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
        titulo: file.name,
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

      <TextFieldElement
        name="correo_visitantes_template.asunto"
        label="Asunto del correo de visitantes"
        fullWidth
        required
        margin="normal"
      />

      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, md: 6 }}>
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
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
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
                  <IconButton size="small" onClick={() => mover(idx, -1)} disabled={idx === 0}>
                    <ArrowUpward fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => mover(idx, 1)} disabled={idx === secciones.length - 1}>
                    <ArrowDownward fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => eliminar(idx)} disabled={!!item.fijo}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>

                {item.tipo === "texto" && (
                  <Stack spacing={1}>
                    <TextField
                      size="small"
                      label="Título"
                      value={item.titulo || ""}
                      onChange={(e) => editar(idx, { titulo: e.target.value })}
                    />
                    <TextField
                      size="small"
                      label="Contenido"
                      value={item.contenido || ""}
                      onChange={(e) => editar(idx, { contenido: e.target.value })}
                      multiline
                      minRows={3}
                    />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                        AlineaciÃ³n de texto
                      </Typography>
                      <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={item.align || "left"}
                        onChange={(_, value) => {
                          if (!value) return;
                          editar(idx, { align: value });
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
                    </Box>
                    <TextField
                      size="small"
                      label="TamaÃ±o de letra (px)"
                      type="number"
                      inputProps={{ min: 10, max: 40, step: 1 }}
                      value={item.fontSize ?? 16}
                      onChange={(e) => {
                        const next = Number(e.target.value || 16);
                        editar(idx, { fontSize: Number.isNaN(next) ? 16 : Math.max(10, Math.min(40, next)) });
                      }}
                    />
                  </Stack>
                )}

                {item.tipo === "imagen" && (
                  <Stack spacing={1}>
                    <TextField
                      size="small"
                      label="Título (opcional)"
                      value={item.titulo || ""}
                      onChange={(e) => editar(idx, { titulo: e.target.value })}
                    />
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                        Alineación de imagen
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
                    </Box>
                    {item.dataUrl ? (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent:
                            item.align === "left"
                              ? "flex-start"
                              : item.align === "right"
                              ? "flex-end"
                              : "center",
                        }}
                      >
                        <Box
                          component="img"
                          src={item.dataUrl}
                          alt={item.fileName || "imagen"}
                          sx={{ maxWidth: 260, borderRadius: 1, border: "1px solid #ddd" }}
                        />
                      </Box>
                    ) : null}
                  </Stack>
                )}

                {item.tipo === "pdf" && (
                  <Stack spacing={1}>
                    <TextField
                      size="small"
                      label="Título (opcional)"
                      value={item.titulo || ""}
                      onChange={(e) => editar(idx, { titulo: e.target.value })}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {item.fileName || "PDF adjunto"}
                    </Typography>
                  </Stack>
                )}
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
    </Box>
  );
}
