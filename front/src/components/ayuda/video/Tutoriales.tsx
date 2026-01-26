import {
  alpha,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  lighten,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";

import RecuperarContrasena from "../../../assets/videos/ayuda/RecuperarContrasena.mp4";
import CreacionCitas from "../../../assets/videos/ayuda/CreacionCitas.mp4";
import CitaRecurrente from "../../../assets/videos/ayuda/CitaRecurrente.mp4";
import SubirDocumentos from "../../../assets/videos/ayuda/SubirDocumentos.mp4";

import RecuperarContrasenaPoster from "../../../assets/img/ayuda/RecuperarContrasena.png";
import CreacionCitasPoster from "../../../assets/img/ayuda/CreacionCitas.png";
import CitaRecurrentePoster from "../../../assets/img/ayuda/CitaRecurrente.png";
import { useState } from "react";
import { Close } from "@mui/icons-material";
import { useErrorBoundary } from "react-error-boundary";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";

const VIDEOS = [
  {
    id: 1,
    src: RecuperarContrasena,
    poster: RecuperarContrasenaPoster,
    title: "Recuperar contraseña",
    rol: [1, 2, 4, 5, 6, 7, 8],
    description: "Pasos para recuperar correctamente la contraseña.",
  },
  {
    id: 2,
    src: CreacionCitas,
    poster: CreacionCitasPoster,
    title: "Crear citas",
    rol: [1, 2, 4, 5, 6, 7, 8],
    description: "Cómo crear citas en el sistema, para una o varias personas.",
  },
  {
    id: 3,
    src: CitaRecurrente,
    poster: CitaRecurrentePoster,
    title: "Crear citas recurrentes",
    rol: [1, 2, 4, 5, 6, 7, 8],
    description:
      "Cómo crear citas recurrentes en el sistema, es decir se puede agendar para varios días y para varias personas.",
  },
  {
    id: 4,
    src: SubirDocumentos,
    poster: CitaRecurrentePoster,
    title: "Subir documentación",
    rol: [1, 2, 4, 5, 6, 7, 8, 10],
    description: "Cómo subir documentos en el sistema, para los visitantes.",
  },
];

export default function Tutoriales() {
  const { rol } = useSelector((state: IRootState) => state.auth.data);
  const { showBoundary } = useErrorBoundary();
  const [open, setOpen] = useState(false);
  const [videoSrc, setVideoSrc] = useState({
    src: "",
    title: "",
    description: "",
  });

  const handleOpen = (ID: number) => {
    const videoSource = VIDEOS.find((item) => item.id === ID);
    if (!videoSource) {
      showBoundary(new Error("El video al que se intenta acceder no existe."));
      return;
    }
    setVideoSrc(videoSource);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Box component="section">
      <Card
        elevation={0}
        sx={(theme) => ({
          border: `1px solid ${lighten(
            alpha(theme.palette.divider, 0.3),
            0.88
          )}`,
        })}
      >
        <CardContent>
          <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography
              component="h4"
              variant="h4"
              textAlign="center"
              sx={{ pb: 4 }}
            >
              Videotutoriales
            </Typography>
            <Grid container spacing={4}>
              {VIDEOS.map((vid) => {
                const seeItem = obtenerDuplicados(rol, vid.rol);
                if (!seeItem) return <></>;
                return (
                  <Grid key={vid.id} size={{ xs: 12, sm: 6, md: 4 }}>
                    <Card elevation={5} sx={{ height: "100%" }}>
                      <CardActionArea
                        onClick={() => handleOpen(vid.id)}
                        sx={{ height: "100%" }}
                      >
                        <CardContent
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "flex-start", // alineamos desde arriba
                            alignItems: "center",
                            height: "100%", // ocupa toda la altura de la tarjeta
                          }}
                        >
                          {/* Contenedor del video con borderRadius */}
                          <div
                            style={{
                              width: "100%",
                              height: "150px", // altura fija para todos los videos
                              overflow: "hidden",
                              borderRadius: "8px",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              marginBottom: "16px", // espacio debajo del video
                            }}
                          >
                            <video
                              poster={vid.poster}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain", // mantiene la proporción sin recortar
                              }}
                            />
                          </div>
                          <Typography
                            variant="h6"
                            fontWeight="bold"
                            textAlign="center"
                            sx={{ mb: 1 }}
                          >
                            {vid.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            textAlign="center"
                          >
                            {vid.description}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Container>
        </CardContent>
      </Card>
      <Dialog
        open={open}
        onClose={handleClose}
        aria-labelledby="responsive-dialog-title"
      >
        <DialogTitle id="responsive-dialog-title" textAlign="center">
          {videoSrc.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <video
              src={videoSrc.src}
              controls
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                borderRadius: "8px",
              }}
            />
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            color="secondary"
            autoFocus
            onClick={handleClose}
            startIcon={<Close />}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function obtenerDuplicados(array1: number[], array2: number[]): boolean {
  const set1 = new Set(array1);
  const set2 = new Set(array2);
  const duplicados = [...set1].filter((x) => set2.has(x));
  return duplicados.length > 0;
}
