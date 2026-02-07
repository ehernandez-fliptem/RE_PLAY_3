import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import {
  Avatar,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { ChevronLeft, Verified } from "@mui/icons-material";
import ModalContainer from "../../utils/ModalContainer";
import Spinner from "../../utils/Spinner";
import { enqueueSnackbar } from "notistack";
import dayjs from "dayjs";
import { useConfirm } from "material-ui-confirm";
import type { GridDataSourceApiBase } from "@mui/x-data-grid";
import {
  DOCUMENTOS_CHECKS_LIST,
  areDocumentosChecksComplete,
  normalizeDocumentosChecks,
  type DocumentosChecks,
} from "./documentosChecks";

type TUsuario = {
  img_usuario: string;
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

export default function VerificarVisitante() {
  const { id } = useParams();
  const navigate = useNavigate();
  const parentGridDataRef = useOutletContext<GridDataSourceApiBase>();
  const confirm = useConfirm();
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [datos, setDatos] = useState<TUsuario>({
    img_usuario: "",
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
  const docsComplete = areDocumentosChecksComplete(checks);

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

  const verificar = async () => {
    if (!docsComplete) {
      await confirm({
        title: "Documentos incompletos",
        description:
          "Para poder verificar el visitante, se debe tener todos los documentos marcados.",
        allowClose: true,
        confirmationText: "Cerrar",
        hideCancelButton: true,
      }).catch(() => {});
      return;
    }

    try {
      const result = await confirm({
        title: "Confirmar verificación",
        description: `Confirma que los documentos de ${nombre} están completos y vigentes?`,
        allowClose: true,
        confirmationText: "Continuar",
      });
      if (!result.confirmed) return;
    } catch {
      return;
    }

    setIsVerifying(true);
    try {
      const res = await clienteAxios.patch(`/api/visitantes/verificar/${id}`);
      if (res.data.estado) {
        enqueueSnackbar("Visitante verificado.", { variant: "success" });
        parentGridDataRef?.fetchRows?.();
        navigate("/visitantes");
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <ModalContainer containerProps={{ maxWidth: "lg" }}>
      <Card elevation={5}>
        <CardContent>
          {!isVerifying && (
            <>
              <Typography variant="h5" component="h5" textAlign="center">
                Verificar Visitante{" - "}
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
            </>
          )}
          {isLoading || isVerifying ? (
            <Spinner />
          ) : (
            <Grid container spacing={2}>
              <Grid
                size={12}
                display="flex"
                justifyContent="center"
                alignItems="center"
              >
                <Avatar
                  src={img_usuario}
                  sx={{
                    width: 150,
                    height: 150,
                    my: 2,
                  }}
                />
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
                    <Grid
                      size="auto"
                      sx={{ width: { xs: "100%", sm: "30%" } }}
                    >
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
                    <Grid
                      size="auto"
                      sx={{ width: { xs: "100%", sm: "30%" } }}
                    >
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
                    <Grid
                      size="auto"
                      sx={{ width: { xs: "100%", sm: "30%" } }}
                    >
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
                <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                  <Chip
                    label={docsComplete ? "Datos completos" : "Datos incompletos"}
                    color={docsComplete ? "success" : "error"}
                    size="medium"
                  />
                </Box>
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
          {!isLoading && !isVerifying && (
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
                {!verificado && (
                  <Button
                    sx={{ width: { xs: "100%", sm: "auto" } }}
                    type="button"
                    size="medium"
                    variant="contained"
                    onClick={verificar}
                    startIcon={<Verified />}
                    disabled={isVerifying}
                  >
                    Verificar
                  </Button>
                )}
              </Stack>
            </Box>
          )}
        </CardContent>
      </Card>
    </ModalContainer>
  );
}
