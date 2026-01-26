import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { ChevronLeft } from "@mui/icons-material";
import ModalContainer from "../../utils/ModalContainer";
import Spinner from "../../utils/Spinner";
import { enqueueSnackbar } from "notistack";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import PdfVierwer from "../../utils/PdfVierwer";

type TUsuario = {
  tipo: number;
  estatus: number;
  documento?: string;
  imagenes: string[];
  tiempo_indefinido: boolean;
  validado_por: string;
  fecha_entrada: Date | string;
  fecha_salida: Date | string;
  fecha_creacion: Date | string;
  creado_por: string;
  fecha_modificacion: Date | string;
  modificado_por: string;
  activo: boolean;
};

const ESTATUS: Record<
  number,
  { nombre: string; color: "warning" | "error" | "success" }
> = {
  1: { nombre: "Por validar", color: "warning" },
  2: { nombre: "Rechazado", color: "error" },
  3: { nombre: "Aceptado", color: "success" },
};

const IDENAMES = ["Frontal", "Reverso"];

export default function DetalleDocumento() {
  const { tipos_documentos } = useSelector(
    (state: IRootState) => state.config.data
  );
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [doc, setDoc] = useState({
    type: "",
    content: "",
  });
  const [datos, setDatos] = useState<TUsuario>({
    tipo: 0,
    estatus: 0,
    documento: "",
    imagenes: [],
    tiempo_indefinido: false,
    validado_por: "",
    fecha_entrada: new Date(),
    fecha_salida: new Date(),
    fecha_creacion: new Date(),
    creado_por: "",
    fecha_modificacion: new Date(),
    modificado_por: "",
    activo: false,
  });
  const {
    tipo,
    estatus,
    documento,
    imagenes,
    tiempo_indefinido,
    validado_por,
    fecha_entrada,
    fecha_salida,
    fecha_creacion,
    creado_por,
    fecha_modificacion,
    modificado_por,
    activo,
  } = datos;

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get(`api/documentos/${id}`);
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
    const returnPath = location.pathname.split("/")[1];
    navigate(`/${returnPath}`);
  };

  const handleClickOpen = (content: string, type: string) => {
    setOpenDialog(true);
    setDoc({ type, content });
  };

  const handleClose = () => {
    setOpenDialog(false);
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5}>
        <CardContent>
          <Typography variant="h5" component="h5" textAlign="center">
            Documento{" - "}
            {!isLoading && (
              <>
                {activo ? (
                  <Chip label="Activo" color="success" />
                ) : (
                  <Chip label="Inactivo" color="error" />
                )}
              </>
            )}
          </Typography>
          {isLoading ? (
            <Spinner />
          ) : (
            <Grid container spacing={2} sx={{ mt: 2 }}>
              {documento && (
                <Grid
                  size={12}
                  width={"100%"}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Typography fontWeight={700} sx={{ mb: 2 }}>
                    Documento
                  </Typography>
                  <Card elevation={5} sx={{ width: 150 }}>
                    <CardActionArea
                      onClick={() => handleClickOpen(documento, "pdf")}
                    >
                      <CardMedia component="img" src={imagenes[0]} />
                    </CardActionArea>
                  </Card>
                </Grid>
              )}
              {!documento && (
                <Grid container size={12} width={"100%"}>
                  {imagenes.map((item, i) => (
                    <Grid
                      key={i}
                      size={{ xs: 12, sm: "grow" }}
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Typography fontWeight={700} sx={{ mb: 2 }}>
                        Identificación {IDENAMES[i]}
                      </Typography>
                      <Card elevation={5} sx={{ width: 250 }}>
                        <CardActionArea
                          onClick={() => handleClickOpen(item, "img")}
                        >
                          <CardMedia component="img" src={item} />
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              <Grid size={{ xs: 12, sm: 6 }} width={"100%"}>
                <Typography
                  variant="h6"
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
                    <strong>Tipo:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    <Chip
                      label={tipos_documentos[tipo].nombre}
                      size="small"
                      sx={(theme) => ({
                        bgcolor: tipos_documentos[tipo].color || "#C4C4C4",
                        color: theme.palette.getContrastText(
                          tipos_documentos[tipo].color || "secondary.main"
                        ),
                      })}
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                  <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                    <strong>Estatus:</strong>
                  </Grid>
                  <Grid
                    size={{ xs: 12, sm: "grow" }}
                    sx={{ ml: { xs: 2, sm: 0 } }}
                  >
                    <Chip
                      label={ESTATUS[estatus].nombre}
                      size="small"
                      color={ESTATUS[estatus].color}
                    />
                  </Grid>
                </Grid>
                {[2, 3].includes(estatus) && (
                  <>
                    <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                      <Grid
                        size="auto"
                        sx={{ width: { xs: "100%", sm: "30%" } }}
                      >
                        <strong>Vencimiento:</strong>
                      </Grid>
                      <Grid
                        size={{ xs: 12, sm: "grow" }}
                        sx={{ ml: { xs: 2, sm: 0 } }}
                      >
                        <Chip
                          label={tiempo_indefinido ? "Indefinido" : "Limitado"}
                          size="small"
                          color="secondary"
                        />
                      </Grid>
                    </Grid>
                    {!tiempo_indefinido && fecha_entrada && fecha_salida && (
                      <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                        <Grid
                          size="auto"
                          sx={{ width: { xs: "100%", sm: "30%" } }}
                        >
                          <strong>Periodo:</strong>
                        </Grid>
                        <Grid
                          size={{ xs: 12, sm: "grow" }}
                          sx={{ ml: { xs: 2, sm: 0 } }}
                        >
                          {dayjs(fecha_entrada).format("DD/MM/YYYY")} -{" "}
                          {dayjs(fecha_salida).format("DD/MM/YYYY")}
                        </Grid>
                      </Grid>
                    )}
                  </>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }} width={"100%"}>
                <Typography
                  variant="h6"
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
                  <b>Sistema</b>
                </Typography>

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
                {validado_por && (
                  <Grid container spacing={{ xs: 0, sm: 2 }} sx={{ my: 2 }}>
                    <Grid size="auto" sx={{ width: { xs: "100%", sm: "30%" } }}>
                      <strong>Validado por:</strong>
                    </Grid>
                    <Grid
                      size={{ xs: 12, sm: "grow" }}
                      sx={{ ml: { xs: 2, sm: 0 } }}
                    >
                      {validado_por}
                    </Grid>
                  </Grid>
                )}
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
        fullScreen
        open={openDialog}
        onClose={handleClose}
        aria-labelledby="responsive-dialog-title"
      >
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            my: 2,
          }}
        >
          {doc.type === "pdf" && doc.content && (
            <PdfVierwer doc={doc.content} />
          )}
          {doc.type === "img" && doc.content && (
            <Avatar
              variant="square"
              src={doc.content}
              sx={{
                width: "60%",
                height: "60%",
              }}
              slotProps={{
                img: {
                  style: {
                    objectFit: "contain",
                  },
                },
              }}
            />
          )}
        </DialogContent>
        <Divider sx={{ my: 1 }} />
        <DialogActions>
          <Button
            variant="contained"
            color="secondary"
            autoFocus
            onClick={handleClose}
            startIcon={<ChevronLeft />}
          >
            Regresar
          </Button>
        </DialogActions>
      </Dialog>
    </ModalContainer>
  );
}
