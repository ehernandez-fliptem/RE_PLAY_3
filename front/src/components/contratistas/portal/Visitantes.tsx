import { useState, useMemo, Fragment, type ChangeEvent, useEffect } from "react";
import {
  DataGrid,
  useGridApiRef,
  type GridInitialState,
  type GridDataSource,
  GridGetRowsError,
  type GridValidRowModel,
  GridActionsCellItem,
} from "@mui/x-data-grid";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { Outlet, useNavigate } from "react-router-dom";
import { esES } from "@mui/x-data-grid/locales";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { Add, Edit, UploadFile, Visibility, Close, Refresh } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Modal,
  Tooltip,
  Typography,
} from "@mui/material";
import ErrorOverlay from "../../error/DataGridError";
import { AxiosError } from "axios";
import { enqueueSnackbar } from "notistack";
import Spinner from "../../utils/Spinner";
import InputFileUpload from "../../utils/FileUpload";
import { useSelector } from "react-redux";
import { selectCurrentData } from "../../../app/features/config/configSlice";

const pageSizeOptions = [10, 25, 50];

const DOC_LABELS: Record<string, string> = {
  identificacion_oficial: "Identificación oficial",
  sua: "SUA",
  permiso_entrada: "Permiso de entrada",
  lista_articulos: "Lista de artículos",
  repse: "REPSE",
  soporte_pago_actualizado: "Soporte de pago actualizado",
  constancia_vigencia_imss: "Constancia de Vigencia IMSS",
  constancias_habilidades: "Constancias de Habilidades",
};

const DOC_KEYS = Object.keys(DOC_LABELS);
const OPTIONAL_DOC_KEYS = ["constancia_vigencia_imss", "constancias_habilidades"];

const getEstadoLabel = (estado?: number) => {
  if (estado === 2) return { label: "Verificado", color: "success" as const };
  if (estado === 3) return { label: "Rechazado", color: "error" as const };
  return { label: "Pendiente", color: "warning" as const };
};

export default function PortalVisitantes() {
  const apiRef = useGridApiRef();
  const [error, setError] = useState<string>();
  const navigate = useNavigate();
  const config = useSelector(selectCurrentData);
  const docsVisitantes = config?.documentos_visitantes || {};
  const enabledDocKeys = useMemo(
    () => DOC_KEYS.filter((key) => docsVisitantes[key] !== false),
    [docsVisitantes]
  );
  const enabledOptionalKeys = useMemo(
    () => OPTIONAL_DOC_KEYS.filter((key) => docsVisitantes[key] !== false),
    [docsVisitantes]
  );
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showCorreccion, setShowCorreccion] = useState(false);
  const [isLoadingCorreccion, setIsLoadingCorreccion] = useState(false);
  const [correccionVisitante, setCorreccionVisitante] =
    useState<GridValidRowModel | null>(null);
  const [documentosCorreccion, setDocumentosCorreccion] = useState<
    Record<string, { name: string; dataUrl: string }>
  >({});

  useEffect(() => {
    const interval = setInterval(() => {
      apiRef.current?.dataSource?.fetchRows?.();
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [apiRef]);
  const rejectedDocKeys = useMemo(() => {
    const checks = (correccionVisitante as any)?.documentos_checks || {};
    return enabledDocKeys.filter((key) => !checks?.[key]);
  }, [correccionVisitante, enabledDocKeys]);
  const rejectedRequiredKeys = useMemo(
    () => rejectedDocKeys.filter((key) => !enabledOptionalKeys.includes(key)),
    [rejectedDocKeys, enabledOptionalKeys]
  );
  const rejectedOptionalKeys = useMemo(
    () => rejectedDocKeys.filter((key) => enabledOptionalKeys.includes(key)),
    [rejectedDocKeys, enabledOptionalKeys]
  );

  const dataSource: GridDataSource = useMemo(
    () => ({
      getRows: async (params) => {
        let rows: GridValidRowModel[] = [];
        let rowCount: number = 0;
        try {
          const urlParams = new URLSearchParams({
            filter: JSON.stringify(params.filterModel.quickFilterValues || []),
            pagination: JSON.stringify(params.paginationModel),
            sort: JSON.stringify(params.sortModel),
          });
          const res = await clienteAxios.get(
            "/api/contratistas-visitantes?" + urlParams.toString()
          );
          if (res.data.estado) {
            setError("");
            rows = res.data.datos.paginatedResults || [];
            rowCount = res.data.datos.totalCount[0]?.count || 0;
          }
        } catch (error) {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
          throw error;
        }

        return {
          rows,
          rowCount,
        };
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const initialState: GridInitialState = useMemo(
    () => ({
      pagination: {
        paginationModel: {
          pageSize: 10,
        },
        rowCount: 0,
      },
      sorting: {
        sortModel: [{ field: "estado_validacion", sort: "asc" }],
      },
    }),
    []
  );

  const nuevoRegistro = () => {
    navigate("nuevo");
  };

  const editarRegistro = (ID: string) => {
    navigate(`editar/${ID}`);
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle/${ID}`);
  };

  const cargaMasiva = () => {
    navigate("carga-masiva");
  };

  const abrirCorreccion = async (row: GridValidRowModel) => {
    setShowCorreccion(true);
    setIsLoadingCorreccion(true);
    setCorreccionVisitante(null);
    setDocumentosCorreccion({});
    try {
      const res = await clienteAxios.get(`/api/contratistas-visitantes/${row._id}`);
      if (res.data.estado) {
        setCorreccionVisitante(res.data.datos);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsLoadingCorreccion(false);
    }
  };

  const cerrarCorreccion = () => {
    setShowCorreccion(false);
    setCorreccionVisitante(null);
    setDocumentosCorreccion({});
  };

  const onUploadDoc =
    (key: string) => async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setDocumentosCorreccion((prev) => ({
          ...prev,
          [key]: { name: file.name, dataUrl: String(reader.result || "") },
        }));
      };
      reader.readAsDataURL(file);
    };

  const enviarCorreccion = async () => {
    if (!correccionVisitante) return;
    if (rejectedDocKeys.length === 0) {
      enqueueSnackbar("No hay documentos rechazados para corregir.", {
        variant: "warning",
      });
      return;
    }
    const faltan = rejectedRequiredKeys.some(
      (key) => !documentosCorreccion[key]?.dataUrl
    );
    if (faltan) {
      enqueueSnackbar("Debes subir los documentos obligatorios rechazados.", {
        variant: "warning",
      });
      return;
    }
    try {
    const payload = {
      documentos_archivos: Object.fromEntries(
        [
          ...rejectedRequiredKeys.map((key) => [
            key,
            documentosCorreccion[key].dataUrl,
          ]),
          ...rejectedOptionalKeys
            .filter((key) => documentosCorreccion[key]?.dataUrl)
            .map((key) => [key, documentosCorreccion[key].dataUrl]),
        ]
      ),
    };
      const res = await clienteAxios.patch(
        `/api/contratistas-visitantes/corregir/${correccionVisitante._id}`,
        payload
      );
      if (res.data.estado) {
        enqueueSnackbar("Corrección enviada.", { variant: "success" });
        apiRef.current?.dataSource?.fetchRows?.();
        cerrarCorreccion();
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    }
  };

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        columns={[
          {
            headerName: "Nombre",
            field: "nombre_completo",
            flex: 1,
            display: "flex",
            minWidth: 180,
            valueFormatter: (value?: string) =>
              value && String(value).trim() ? String(value) : "-",
          },
          {
            headerName: "Correo",
            field: "correo",
            flex: 1,
            display: "flex",
            minWidth: 200,
            valueFormatter: (value?: string) =>
              value && String(value).trim() ? String(value) : "-",
          },
          {
            headerName: "Teléfono",
            field: "telefono",
            flex: 1,
            display: "flex",
            minWidth: 140,
            valueFormatter: (value?: string) =>
              value && String(value).trim() ? String(value) : "-",
          },
          {
            headerName: "Estado",
            field: "estado_validacion",
            flex: 1,
            display: "flex",
            minWidth: 140,
            renderCell: ({ value }) => {
              const estado = getEstadoLabel(value);
              return (
                <Chip
                  label={estado.label}
                  color={estado.color}
                  size="small"
                  sx={{ minWidth: 110, fontWeight: 600, fontSize: 12, color: "#fff" }}
                />
              );
            },
            sortComparator: (v1, v2) => {
              const order = (value?: number) =>
                value === 3 ? 0 : value === 1 ? 1 : 2;
              return order(v1 as number) - order(v2 as number);
            },
          },
          {
            headerName: "Acciones",
            field: "acciones",
            type: "actions",
            align: "center",
            flex: 1,
            display: "flex",
            minWidth: 120,
            getActions: ({ row }) => {
              const gridActions = [];
              gridActions.push(
                <GridActionsCellItem
                  icon={<Visibility color="primary" />}
                  onClick={() => verRegistro(row._id)}
                  label="Ver"
                  title="Ver"
                />
              );
              if (row.estado_validacion === 3) {
                gridActions.push(
                  <GridActionsCellItem
                    icon={<UploadFile color="warning" />}
                    onClick={() => abrirCorreccion(row)}
                    label="Corregir"
                    title="Corregir"
                  />
                );
              } else if (row.estado_validacion === 2) {
                gridActions.push(
                  <GridActionsCellItem
                    icon={<Edit color="primary" />}
                    onClick={() => editarRegistro(row._id)}
                    label="Editar"
                    title="Editar"
                  />
                );
              }
              return gridActions;
            },
          },
        ]}
        disableColumnFilter
        disableRowSelectionOnClick
        onCellClick={(params) => {
          setSelectedRowId(String(params.id));
        }}
        onRowDoubleClick={(params) => {
          const row = params.row as GridValidRowModel;
          if (row.estado_validacion === 3) {
            abrirCorreccion(row);
            return;
          }
          verRegistro(String(params.id));
        }}
        getRowClassName={(params) =>
          params.id === selectedRowId ? "row-selected" : ""
        }
        filterDebounceMs={1000}
        dataSource={dataSource}
        dataSourceCache={null}
        onDataSourceError={(dataSourceError) => {
          if (dataSourceError.cause instanceof AxiosError) {
            setError(dataSourceError.cause.code);
            return;
          }
          if (dataSourceError instanceof GridGetRowsError) {
            setError(dataSourceError.message);
            return;
          }
        }}
        pagination
        pageSizeOptions={pageSizeOptions}
        showToolbar
        localeText={{
          ...esES.components.MuiDataGrid.defaultProps.localeText,
          toolbarColumns: "",
          toolbarFilters: "",
          toolbarDensity: "",
          toolbarExport: "",
          noRowsLabel: "Sin registros",
        }}
        sx={{
          "& .row-selected": {
            outline: "2px solid #7A3DF0",
            outlineOffset: -2,
          },
          "& .MuiDataGrid-cell.MuiDataGrid-cell--focus": {
            outline: "none",
          },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
            outline: "none",
          },
          "& .MuiDataGrid-columnSeparator": {
            display: "none",
          },
        }}
        slots={{
          toolbar: () => (
            <DataGridToolbar
              tableTitle="Mi Catálogo de Visitantes"
              customActionButtons={
                <Fragment>
                  <Tooltip title="Agregar">
                    <IconButton onClick={nuevoRegistro}>
                      <Add fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Recargar">
                    <IconButton onClick={() => apiRef.current?.dataSource?.fetchRows?.()}>
                      <Refresh fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {false && (
                    <Tooltip title="Carga masiva">
                      <IconButton onClick={cargaMasiva}>
                        <UploadFile fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Fragment>
              }
            />
          ),
        }}
      />
      {error && (
        <ErrorOverlay error={error} gridDataRef={apiRef.current?.dataSource} />
      )}
      <Outlet context={apiRef.current?.dataSource} />
      <Modal open={showCorreccion} onClose={cerrarCorreccion} sx={{ outline: "none" }}>
        <Box
          sx={{
            height: "100%",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 2,
            outline: "none",
            "&:focus, &:focus-visible": { outline: "none" },
          }}
        >
          <Card sx={{ width: "100%", maxWidth: 1100 }}>
            <CardContent>
              {isLoadingCorreccion ? (
                <Spinner />
              ) : (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mb: 2,
                    }}
                  >
                    <Typography variant="h4" component="h2" sx={{ flex: 1 }} textAlign="center">
                      Corrección de documentos
                    </Typography>
                    <IconButton onClick={cerrarCorreccion} size="small" sx={{ color: "error.main" }}>
                      <Close fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: "grid", gap: 0.5, mb: 2 }}>
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
                      <strong>Datos del visitante</strong>
                    </Typography>
                    <Box sx={{ display: "grid", gap: 1.5, mb: 2 }}>
                      <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                        <strong>Visitante:</strong>
                        <span>
                          {correccionVisitante?.nombre_completo ||
                            [correccionVisitante?.nombre, correccionVisitante?.apellido_pat, correccionVisitante?.apellido_mat]
                              .filter(Boolean)
                              .join(" ") ||
                            correccionVisitante?.correo ||
                            "-"}
                        </span>
                      </Box>
                      <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 1 }}>
                        <strong>Motivo:</strong>
                        <span>{correccionVisitante?.motivo_rechazo || "-"}</span>
                      </Box>
                    </Box>
                  </Box>
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
                  <Box
                    sx={{
                      display: "grid",
                      gap: 1.5,
                      border: "1px solid #eee",
                      borderRadius: 1,
                      p: 1.5,
                    }}
                  >
                    {rejectedRequiredKeys.map((key) => (
                      <Box
                        key={key}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 2,
                          borderBottom: "1px dashed #e6e6e6",
                          pb: 1,
                        }}
                      >
                        <Typography>{DOC_LABELS[key]}</Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="caption">
                            {documentosCorreccion[key]?.name || "-"}
                          </Typography>
                          <InputFileUpload
                            name={key}
                            label="Subir"
                            onUpload={onUploadDoc(key)}
                            buttonProps={{ size: "small" }}
                          />
                        </Box>
                      </Box>
                    ))}
                    {rejectedRequiredKeys.length === 0 && (
                      <Typography variant="body2" color="text.secondary">
                        No hay documentos pendientes de corrección.
                      </Typography>
                    )}
                  </Box>
                  {rejectedOptionalKeys.length > 0 && (
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
                          mt: 2,
                        })}
                        textAlign="center"
                        mb={2}
                      >
                        <strong>Documentos opcionales</strong>
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
                        {rejectedOptionalKeys.map((key) => (
                          <Box
                            key={key}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 2,
                              borderBottom: "1px dashed #e6e6e6",
                              pb: 1,
                            }}
                          >
                            <Typography>{DOC_LABELS[key]}</Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography variant="caption">
                                {documentosCorreccion[key]?.name || "-"}
                              </Typography>
                              <InputFileUpload
                                name={key}
                                label="Subir"
                                onUpload={onUploadDoc(key)}
                                buttonProps={{ size: "small" }}
                              />
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}
                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={enviarCorreccion}
                      disabled={
                        rejectedDocKeys.length === 0 ||
                        rejectedRequiredKeys.some(
                          (key) => !documentosCorreccion[key]?.dataUrl
                        )
                      }
                    >
                      Enviar corrección
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Box>
      </Modal>
    </div>
  );
}
