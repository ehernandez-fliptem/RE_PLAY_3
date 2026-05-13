import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import {
  Avatar,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { ChevronLeft, Close } from "@mui/icons-material";
import ModalContainer from "../../utils/ModalContainer";
import Spinner from "../../utils/Spinner";
import { enqueueSnackbar } from "notistack";
import dayjs from "dayjs";
import {
  DOCUMENTOS_CHECKS_LIST,
  normalizeDocumentosChecks,
  type DocumentosChecks,
} from "./documentosChecks";

type TUsuario = {
  img_usuario: string;
  img_ine?: string;
  nombre: string;
  empresa: string;
  telefono?: string;
  correo: string;
  fecha_creacion: Date | string;
  creado_por: string;
  fecha_modificacion: Date | string;
  modificado_por: string;
  activo: boolean;
  verificado: boolean;
  documentos_checks: DocumentosChecks;
};

export default function DetalleVisitante() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [datos, setDatos] = useState<TUsuario>({
    img_usuario: "",
    img_ine: "",
    nombre: "",
    empresa: "",
    telefono: "",
    correo: "",
    fecha_creacion: new Date(),
    creado_por: "",
    fecha_modificacion: new Date(),
    modificado_por: "",
    activo: false,
    verificado: false,
    documentos_checks: {
      identificacion_oficial: false,
      sua: false,
      permiso_entrada: false,
      lista_articulos: false,
    },
  });
  const {
    img_usuario,
    img_ine,
    nombre,
    empresa,
    telefono,
    correo,
    fecha_creacion,
    creado_por,
    fecha_modificacion,
    modificado_por,
    activo,
    verificado,
    documentos_checks,
  } = datos;
  const checks = normalizeDocumentosChecks(documentos_checks);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`api/visitantes/${id}`);
        if (res.data.estado) {
          setDatos(res.data.datos);
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      }
    };
    obtenerRegistro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const regresar = () => {
    navigate(`/visitantes`);
  };

  const abrirPreview = (src?: string, title = "Vista previa") => {
    if (!src) return;
    setPreviewSrc(src);
    setPreviewTitle(title);
    setPreviewOpen(true);
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5}>
        <CardContent>
          <Typography variant="h5" component="h5" textAlign="center">
            Visitante{" - "}
            {!isLoading && (
              <>
                {activo ? (
                  <Chip label="Activo" color="success" />
                ) : (
                  <Chip label="Inactivo" color="error" />
                )}
                {verificado ? (
                  <Chip label="Verificado" color="success" sx={{ ml: 1 }} />
                ) : (
                  <Chip label="No verificado" color="error" sx={{ ml: 1 }} />
                )}
              </>
            )}
          </Typography>
          {isLoading ? (
            <Spinner />
          ) : (
            <Grid container spacing={2}>
              <Grid size={12}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={3}
                  justifyContent="center"
                  alignItems="center"
                  sx={{ my: 2 }}
                >
                  <Box textAlign="center">
                    <Typography variant="overline" display="block">
                      Foto
                    </Typography>
                    <Avatar
                      src={img_usuario}
                      sx={{
                        width: 150,
                        height: 150,
                        cursor: img_usuario ? "zoom-in" : "default",
                      }}
                      onClick={() => abrirPreview(img_usuario, "Foto del visitante")}
                    />
                  </Box>
                  <Box textAlign="center">
                    <Typography variant="overline" display="block">
                      INE
                    </Typography>
                    {img_ine ? (
                      <Box
                        component="img"
                        src={img_ine}
                        alt="INE visitante"
                        onClick={() => abrirPreview(img_ine, "INE del visitante")}
                        sx={{
                          width: 220,
                          height: 140,
                          objectFit: "contain",
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                          bgcolor: "grey.100",
                          cursor: "zoom-in",
                        }}
                      />
                    ) : (
                      <Chip label="Sin INE registrada" color="default" size="small" />
                    )}
                  </Box>
                </Stack>
              </Grid>
              {activo && !verificado && (
                <Grid size={12}>
                  <Alert severity="error">
                    El visitante está activo, pero su verificación de documentos
                    está pendiente. No cuenta con acceso a las instalaciones.
                  </Alert>
                </Grid>
              )}
              <Grid size={{ xs: 12 }} width={"100%"}>
                <Typography
                  variant="h4"
                  component="h6"
                  color="primary"
                  bgcolor="#FFFFFF"
                  sx={(theme) => ({
                    border: `1px solid ${theme.palette.primary.main}`,
                    borderRadius: 2,
                  })}
                  textAlign="center"
                  mb={2}
                >
                  <strong>Generales</strong>
                </Typography>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Nombre:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {nombre}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Correo:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {correo}
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Empresa:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {empresa}
                  </Grid>
                </Grid>
                {telefono && (
                  <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                    <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                      <strong>Teléfono:</strong>
                    </Grid>
                    <Grid
                      size={{ xs: 12, sm: "grow" }}
                      sx={{ ml: { xs: 2, sm: 0 } }}
                    >
                      {telefono}
                    </Grid>
                  </Grid>
                )}
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Creado el:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {dayjs(fecha_creacion).format("DD/MM/YYYY, HH:mm:ss a")}
                    <br />
                    <small>
                      <strong>
                        {" hace "}
                        {dayjs(fecha_creacion).fromNow(true)}
                        {" aprox."}
                      </strong>
                    </small>
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Creado por:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    {creado_por ? creado_por : "Sistema"}
                  </Grid>
                </Grid>
                {fecha_modificacion && (
                  <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                    <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                      <strong>Modificado el:</strong>
                    </Grid>
                    <Grid
                      size={{ xs: 12, sm: "grow" }}
                      sx={{ ml: { xs: 2, sm: 0 } }}
                    >
                      {dayjs(fecha_modificacion).format(
                        "DD/MM/YYYY, HH:mm:ss a"
                      )}
                      <br />
                      <small>
                        <strong>
                          {" hace "}
                          {dayjs(fecha_modificacion).fromNow(true)}
                          {" aprox."}
                        </strong>
                      </small>
                    </Grid>
                  </Grid>
                )}
                {modificado_por && (
                  <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                    <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                      <strong>Modificado por:</strong>
                    </Grid>
                    <Grid
                      size={{ xs: 12, sm: "grow" }}
                      sx={{ ml: { xs: 2, sm: 0 } }}
                    >
                      {modificado_por}
                    </Grid>
                  </Grid>
                )}
                <Typography
                  variant="h4"
                  component="h6"
                  color="primary"
                  bgcolor="#FFFFFF"
                  sx={(theme) => ({
                    border: `1px solid ${theme.palette.primary.main}`,
                    borderRadius: 2,
                  })}
                  textAlign="center"
                  mb={2}
                  mt={3}
                >
                  <strong>Lista de documentos obligatorios para realizar el registro</strong>
                </Typography>
                <Grid container spacing={{ xs: 2, sm: 2 }} sx={{ my: 2 }}>
                  {DOCUMENTOS_CHECKS_LIST.map(({ key, label }) => (
                    <Grid
                      key={key}
                      size={{ xs: 12, sm: 6 }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        justifyContent: "flex-start",
                      }}
                    >
                      <Box sx={{ minWidth: 190 }}>
                        <strong>{label}:</strong>
                      </Box>
                      {checks[key] ? (
                        <Chip
                          label="OK"
                          color="success"
                          size="small"
                          sx={{ minWidth: 90, justifyContent: "center" }}
                        />
                      ) : (
                        <Chip
                          label="Pendiente"
                          color="error"
                          size="small"
                          sx={{ minWidth: 90, justifyContent: "center" }}
                        />
                      )}
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          )}
          <Box
            component="footer"
            sx={{
              display: "flex",
              justifyContent: "end",
            }}
          >
            <Stack
              spacing={2}
              direction={{ xs: "column-reverse", sm: "row" }}
              justifyContent="end"
              sx={{ width: "100%" }}
            >
              <Button
                sx={{ width: { xs: "100%", sm: "auto" } }}
                type="button"
                size="medium"
                variant="contained"
                color="secondary"
                onClick={regresar}
                startIcon={<ChevronLeft />}
              >
                Regresar
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        fullWidth
        maxWidth="lg"
      >
        <DialogContent sx={{ p: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 0.5 }}>
            <IconButton
              size="small"
              onClick={() => setPreviewOpen(false)}
              aria-label="Cerrar vista previa"
            >
              <Close fontSize="small" />
            </IconButton>
          </Box>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {previewTitle}
          </Typography>
          <Box
            component="img"
            src={previewSrc}
            alt={previewTitle}
            sx={{
              width: "100%",
              maxHeight: "80vh",
              objectFit: "contain",
              bgcolor: "grey.100",
              borderRadius: 1,
            }}
          />
        </DialogContent>
      </Dialog>
    </ModalContainer>
  );
}
