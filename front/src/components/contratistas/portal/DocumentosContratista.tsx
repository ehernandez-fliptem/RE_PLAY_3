import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Modal,
  Stack,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef, GridActionsCellItem } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import {
  ChevronLeft,
  Edit,
  ExpandMore,
  Refresh,
  UploadFile,
  Visibility,
} from "@mui/icons-material";
import Swal from "sweetalert2";
import { enqueueSnackbar } from "notistack";
import { useSelector } from "react-redux";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { selectCurrentData } from "../../../app/features/config/configSlice";
import { getDocumentosConfig } from "../utils/documentosConfig";
import DocumentPreview from "../utils/DocumentPreview";
import DataGridToolbar from "../../utils/DataGridToolbar";
import InputFileUpload from "../../utils/FileUpload";
import Spinner from "../../utils/Spinner";

const getEstadoLabel = (estado?: number) => {
  if (estado === 2) return { label: "Verificado", color: "success" as const };
  if (estado === 3) return { label: "Rechazado", color: "error" as const };
  return { label: "Pendiente", color: "warning" as const };
};

const portalModalShellSx = {
  height: "100%",
  width: "100%",
  display: "flex",
  alignItems: { xs: "stretch", sm: "center" },
  justifyContent: "center",
  p: { xs: 1, sm: 2 },
  outline: "none",
  "&:focus, &:focus-visible": { outline: "none" },
};

const portalModalCardSx = {
  width: "100%",
  maxWidth: 1100,
  maxHeight: { xs: "calc(100dvh - 16px)", sm: "calc(100dvh - 32px)" },
  display: "flex",
  flexDirection: "column",
};

const portalModalContentSx = {
  overflowY: "auto",
  overflowX: "hidden",
  maxHeight: { xs: "calc(100dvh - 16px)", sm: "calc(100dvh - 32px)" },
};

const documentoRowSx = {
  display: "flex",
  alignItems: { xs: "flex-start", sm: "center" },
  justifyContent: "space-between",
  flexDirection: { xs: "column", sm: "row" },
  gap: { xs: 1, sm: 2 },
  borderBottom: "1px dashed #e6e6e6",
  pb: 1,
};

const documentoActionsSx = {
  display: "flex",
  alignItems: "center",
  justifyContent: { xs: "space-between", sm: "flex-end" },
  gap: 1,
  width: { xs: "100%", sm: "auto" },
  minWidth: 0,
  "& .MuiTypography-root": {
    minWidth: 0,
    overflowWrap: "anywhere",
  },
};

export default function DocumentosContratista() {
  const config = useSelector(selectCurrentData);
  const [configDocs, setConfigDocs] = useState<any>(config);
  const docsCfg = useMemo(() => getDocumentosConfig(configDocs, "contratistas"), [configDocs]);
  const requiredKeys = useMemo(() => docsCfg.required.map((d) => d.key), [docsCfg]);
  const optionalKeys = useMemo(() => docsCfg.optional.map((d) => d.key), [docsCfg]);

  const [registro, setRegistro] = useState<any | null>(null);
  const [documentosArchivos, setDocumentosArchivos] = useState<
    Record<string, { name: string; dataUrl: string }>
  >({});
  const [expandedDocKey, setExpandedDocKey] = useState<string | false>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [autoOpenedEditor, setAutoOpenedEditor] = useState(false);

  const cargar = async () => {
    setIsLoading(true);
    try {
      const res = await clienteAxios.get("/api/contratistas-documentos");
      if (res.data.estado) {
        setRegistro(res.data.datos || null);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      handlingError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    setConfigDocs(config);
  }, [config]);

  useEffect(() => {
    const refreshConfig = async () => {
      try {
        const res = await clienteAxios.get("/api/validacion/session-config");
        if (res.data?.estado) {
          setConfigDocs(res.data?.datos?.configuracion || config);
        }
      } catch {
        // Si falla, se mantiene config de redux
      }
    };
    refreshConfig();
  }, [config]);

  useEffect(() => {
    if (isLoading || autoOpenedEditor || showEditor || showViewer) return;
    const archivos = registro?.documentos_archivos || {};
    const tieneAlgunDocumento = Object.values(archivos).some((value) =>
      Boolean(String(value || "").trim())
    );
    if (!tieneAlgunDocumento) {
      setDocumentosArchivos(
        Object.fromEntries(
          Object.entries(archivos).map(([key, value]) => [
            key,
            { name: "", dataUrl: String(value || "") },
          ])
        )
      );
      setShowEditor(true);
      setAutoOpenedEditor(true);
    }
  }, [isLoading, autoOpenedEditor, showEditor, showViewer, registro]);

  const abrirEditor = () => {
    const archivos = registro?.documentos_archivos || {};
    setDocumentosArchivos(
      Object.fromEntries(
        Object.entries(archivos).map(([key, value]) => [
          key,
          { name: "", dataUrl: String(value || "") },
        ])
      )
    );
    setShowEditor(true);
  };

  const abrirViewer = () => {
    setExpandedDocKey(false);
    setShowViewer(true);
  };

  const onUploadDoc =
    (key: string) => async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setDocumentosArchivos((prev) => ({
          ...prev,
          [key]: { name: file.name, dataUrl: String(reader.result || "") },
        }));
      };
      reader.readAsDataURL(file);
    };

  const guardar = async () => {
    const faltan = requiredKeys.some((key) => !documentosArchivos[key]?.dataUrl);
    if (faltan) {
      enqueueSnackbar("Debes subir todos los documentos obligatorios.", {
        variant: "warning",
      });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        documentos_archivos: Object.fromEntries(
          Object.entries(documentosArchivos).map(([key, value]) => [
            key,
            value.dataUrl,
          ])
        ),
      };
      const res = await clienteAxios.put("/api/contratistas-documentos", payload);
      if (res.data.estado) {
        setRegistro(res.data.datos || null);
        setShowEditor(false);
        await Swal.fire({
          icon: "success",
          title: "Enviado con éxito",
          confirmButtonText: "OK",
          allowOutsideClick: false,
        });
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      handlingError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const rows = registro ? [registro] : [];
  const columns: GridColDef[] = [
    {
      field: "empresa",
      headerName: "Empresa",
      flex: 1,
      minWidth: 200,
      valueFormatter: (value) => (value ? String(value) : "-"),
    },
    {
      field: "estado_validacion",
      headerName: "Estado",
      flex: 1,
      minWidth: 140,
      renderCell: ({ value }) => {
        const estado = getEstadoLabel(value as number);
        return (
          <Chip
            label={estado.label}
            color={estado.color}
            size="small"
            sx={{ minWidth: 110, fontWeight: 600, fontSize: 12, color: "#fff" }}
          />
        );
      },
    },
    {
      field: "acciones",
      headerName: "Acciones",
      type: "actions",
      align: "center",
      flex: 1,
      minWidth: 140,
      getActions: () => [
        <GridActionsCellItem
          key="ver"
          icon={<Visibility color="primary" />}
          onClick={abrirViewer}
          label="Ver"
          title="Ver"
        />,
        <GridActionsCellItem
          key="editar"
          icon={<Edit color="primary" />}
          onClick={abrirEditor}
          label="Editar"
          title="Editar"
        />,
      ],
    },
  ];

  const estado = getEstadoLabel(registro?.estado_validacion);

  return (
    <Box sx={{ minHeight: 400, position: "relative", pb: { xs: 2, sm: 3 } }}>
      {isLoading ? (
        <Spinner />
      ) : (
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row._id || row.id || row.id_contratista}
          disableColumnFilter
          disableRowSelectionOnClick
          pagination
          showToolbar
          pageSizeOptions={[10]}
          localeText={{
            ...esES.components.MuiDataGrid.defaultProps.localeText,
            toolbarColumns: "",
            toolbarFilters: "",
            toolbarDensity: "",
            toolbarExport: "",
            noRowsLabel: "Sin registros",
          }}
          slots={{
            toolbar: () => (
              <DataGridToolbar
                tableTitle="Documentos del Contratista"
                customActionButtons={
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Refresh />}
                    onClick={cargar}
                  >
                    Recargar
                  </Button>
                }
              />
            ),
            noRowsOverlay: () => (
              <Stack
                height="100%"
                minHeight={{ xs: 320, sm: 420 }}
                alignItems="center"
                justifyContent="center"
                spacing={1.5}
                sx={{ py: { xs: 4, sm: 6 }, px: 2, textAlign: "center" }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(122, 61, 240, 0.10)",
                    color: "#6d00f5",
                  }}
                >
                  <UploadFile fontSize="medium" />
                </Box>
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    Aún no hay documentación cargada
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Agrega los documentos de tu empresa para iniciar la revisión.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<UploadFile />}
                  onClick={abrirEditor}
                  sx={{
                    textTransform: "none",
                    width: { xs: "100%", sm: "auto" },
                    maxWidth: 280,
                    whiteSpace: "nowrap",
                  }}
                >
                  Agregar documentación
                </Button>
              </Stack>
            ),
          }}
          sx={{
            bgcolor: "#fff",
            "& .MuiDataGrid-cell.MuiDataGrid-cell--focus": {
              outline: "none",
            },
            "& .MuiDataGrid-overlayWrapper": {
              minHeight: "100%",
            },
            "& .MuiDataGrid-overlayWrapperInner": {
              minHeight: "inherit",
            },
            "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
              outline: "none",
            },
            "& .MuiDataGrid-columnSeparator": {
              display: "none",
            },
          }}
        />
      )}

      <Modal open={showEditor} onClose={() => setShowEditor(false)} sx={{ outline: "none" }}>
        <Box sx={portalModalShellSx}>
          <Card sx={portalModalCardSx}>
            <CardContent sx={portalModalContentSx}>
              {isSaving ? (
                <Spinner />
              ) : (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2,
                      gap: 2,
                    }}
                  >
                    <Typography variant="h4" component="h2">
                      Documentos del Contratista
                    </Typography>
                    <Chip
                      label={estado.label}
                      color={estado.color}
                      size="small"
                      sx={{ minWidth: 110, fontWeight: 600, fontSize: 12, color: "#fff" }}
                    />
                  </Box>
                  {registro?.estado_validacion === 3 && registro?.motivo_rechazo && (
                    <Typography variant="body2" color="error" sx={{ mb: 2 }}>
                      Motivo de rechazo: {registro.motivo_rechazo}
                    </Typography>
                  )}
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                    Documentos obligatorios
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gap: 1.5,
                      border: "1px solid #eee",
                      borderRadius: 1,
                      p: 1.5,
                    }}
                  >
                    {requiredKeys.map((key) => (
                      <Box
                        key={key}
                        sx={documentoRowSx}
                      >
                        <Typography>{docsCfg.labelByKey[key] || key}</Typography>
                        <Box sx={documentoActionsSx}>
                          <Typography variant="caption">
                            {documentosArchivos[key]?.name
                              ? documentosArchivos[key]?.name
                              : documentosArchivos[key]?.dataUrl
                              ? "Archivo cargado"
                              : "Sin archivo"}
                          </Typography>
                          <InputFileUpload
                            name={key}
                            label={
                              documentosArchivos[key]?.dataUrl ? "Re-subir" : "Subir"
                            }
                            onUpload={onUploadDoc(key)}
                            buttonProps={{ size: "small" }}
                          />
                        </Box>
                      </Box>
                    ))}
                    {requiredKeys.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No hay documentos obligatorios configurados.
                      </Typography>
                    )}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" component="h3" sx={{ mb: 1 }}>
                    Documentos opcionales
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gap: 1.5,
                      border: "1px solid #eee",
                      borderRadius: 1,
                      p: 1.5,
                    }}
                  >
                    {optionalKeys.map((key) => (
                      <Box
                        key={key}
                        sx={documentoRowSx}
                      >
                        <Typography>{docsCfg.labelByKey[key] || key}</Typography>
                        <Box sx={documentoActionsSx}>
                          <Typography variant="caption">
                            {documentosArchivos[key]?.name
                              ? documentosArchivos[key]?.name
                              : documentosArchivos[key]?.dataUrl
                              ? "Archivo cargado"
                              : "Sin archivo"}
                          </Typography>
                          <InputFileUpload
                            name={key}
                            label={
                              documentosArchivos[key]?.dataUrl ? "Re-subir" : "Subir"
                            }
                            onUpload={onUploadDoc(key)}
                            buttonProps={{ size: "small" }}
                          />
                        </Box>
                      </Box>
                    ))}
                    {optionalKeys.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No hay documentos opcionales configurados.
                      </Typography>
                    )}
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Box
                    component="footer"
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 1,
                    }}
                  >
                    <Button variant="outlined" onClick={() => setShowEditor(false)}>
                      Cerrar
                    </Button>
                    <Button variant="contained" onClick={guardar} disabled={isSaving}>
                      Guardar
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      </Modal>

      <Modal open={showViewer} onClose={() => setShowViewer(false)} sx={{ outline: "none" }}>
        <Box sx={portalModalShellSx}>
          <Card sx={portalModalCardSx}>
            <CardContent sx={portalModalContentSx}>
              <Typography variant="h4" component="h2" textAlign="center">
                Documentos del Contratista
              </Typography>
              <Box sx={{ mt: 2 }}>
                {registro?.estado_validacion === 3 && registro?.motivo_rechazo && (
                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="h6"
                      component="h6"
                      color="primary"
                      bgcolor="#FFFFFF"
                      sx={(theme) => ({
                        border: `1px solid ${theme.palette.primary.main}`,
                        borderRadius: 2,
                        px: 2,
                        py: 0.5,
                      })}
                      textAlign="center"
                      mb={1}
                    >
                      <strong>Motivo de rechazo</strong>
                    </Typography>
                    <Typography
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "120px 1fr",
                        gap: 1,
                      }}
                    >
                      <strong>Motivo:</strong>
                      <span>{registro?.motivo_rechazo || "-"}</span>
                    </Typography>
                  </Box>
                )}
                <Typography
                  variant="h6"
                  component="h6"
                  color="primary"
                  bgcolor="#FFFFFF"
                  sx={(theme) => ({
                    border: `1px solid ${theme.palette.primary.main}`,
                    borderRadius: 2,
                    px: 2,
                    py: 0.5,
                  })}
                  textAlign="center"
                  mb={2}
                >
                  <strong>Documentos</strong>
                </Typography>
                {requiredKeys.map((key) => {
                  const docUrl = registro?.documentos_archivos?.[key];
                  const check = registro?.documentos_checks?.[key];
                  const tieneDoc = Boolean(docUrl);
                  const estadoDoc =
                    check === true
                      ? { label: "OK", color: "success.main" }
                      : check === false
                      ? {
                          label:
                            registro?.estado_validacion === 3
                              ? "Pendiente de corrección"
                              : "Pendiente de revisión",
                          color: "error.main",
                        }
                      : tieneDoc
                      ? { label: "OK", color: "success.main" }
                      : { label: "Pendiente de subir documento", color: "error.main" };
                  return (
                    <Accordion
                      key={key}
                      disableGutters
                      expanded={expandedDocKey === key}
                      onChange={(_, isExpanded) =>
                        setExpandedDocKey(isExpanded ? key : false)
                      }
                    >
                      <AccordionSummary expandIcon={<ExpandMore /> }>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            pr: 2,
                          }}
                        >
                          <Typography>{docsCfg.labelByKey[key] || key}</Typography>
                          <Typography
                            variant="caption"
                            sx={{ color: estadoDoc.color, fontWeight: 600 }}
                          >
                            {estadoDoc.label}
                          </Typography>
                        </Box>
                      </AccordionSummary>
                      <AccordionDetails>
                        <DocumentPreview
                          docUrl={docUrl}
                          label={docsCfg.labelByKey[key] || key}
                        />
                      </AccordionDetails>
                    </Accordion>
                  );
                })}
                {(() => {
                  const opcionales = optionalKeys.filter(
                    (key) => Boolean(registro?.documentos_archivos?.[key])
                  );
                  if (opcionales.length === 0) return null;
                  return (
                    <>
                      <Typography
                        variant="h6"
                        component="h6"
                        color="primary"
                        bgcolor="#FFFFFF"
                        sx={(theme) => ({
                          border: `1px solid ${theme.palette.primary.main}`,
                          borderRadius: 2,
                          px: 2,
                          py: 0.5,
                        })}
                        textAlign="center"
                        mt={2}
                        mb={2}
                      >
                        <strong>Documentos opcionales</strong>
                      </Typography>
                      {opcionales.map((key) => {
                        const docUrl = registro?.documentos_archivos?.[key];
                        const check = registro?.documentos_checks?.[key];
                        const tieneDoc = Boolean(docUrl);
                        const estadoDoc =
                          check === true
                            ? { label: "OK", color: "success.main" }
                            : check === false
                            ? {
                                label:
                                  registro?.estado_validacion === 3
                                    ? "Pendiente de corrección"
                                    : "Pendiente de revisión",
                                color: "error.main",
                              }
                            : tieneDoc
                            ? { label: "OK", color: "success.main" }
                            : { label: "Pendiente de subir documento", color: "error.main" };
                        return (
                          <Accordion
                            key={key}
                            disableGutters
                            expanded={expandedDocKey === key}
                            onChange={(_, isExpanded) =>
                              setExpandedDocKey(isExpanded ? key : false)
                            }
                          >
                            <AccordionSummary expandIcon={<ExpandMore /> }>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  width: "100%",
                                  pr: 2,
                                }}
                              >
                                <Typography>{docsCfg.labelByKey[key] || key}</Typography>
                                <Typography
                                  variant="caption"
                                  sx={{ color: estadoDoc.color, fontWeight: 600 }}
                                >
                                  {estadoDoc.label}
                                </Typography>
                              </Box>
                            </AccordionSummary>
                            <AccordionDetails>
                              <DocumentPreview
                                docUrl={docUrl}
                                label={docsCfg.labelByKey[key] || key}
                              />
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </>
                  );
                })()}
              </Box>
              <Divider sx={{ my: 2 }} />
              <Box
                component="footer"
                sx={{
                  display: "flex",
                  justifyContent: "end",
                  mt: 3,
                  mb: 0.5,
                }}
              >
                <Stack
                  spacing={2}
                  direction={{ xs: "column-reverse", sm: "row" }}
                  justifyContent="end"
                  sx={{ width: "100%" }}
                >
                  <Button
                    type="button"
                    size="medium"
                    variant="contained"
                    color="secondary"
                    onClick={() => setShowViewer(false)}
                  >
                    <ChevronLeft /> Regresar
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Modal>
    </Box>
  );
}



