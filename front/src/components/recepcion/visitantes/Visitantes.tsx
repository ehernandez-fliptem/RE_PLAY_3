import { useState, useMemo, Fragment, useRef } from "react";
import {
  DataGrid,
  useGridApiRef,
  type GridInitialState,
  type GridDataSource,
  GridGetRowsError,
  type GridValidRowModel,
  GridActionsCellItem,
  type GridRowSelectionModel,
} from "@mui/x-data-grid";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { Outlet, useNavigate } from "react-router-dom";
import { esES } from "@mui/x-data-grid/locales";
import DataGridToolbar from "../../utils/DataGridToolbar";
import {
  Add,
  Delete,
  Edit,
  GetApp,
  Lock,
  LockOpen,
  QrCodeScanner,
  Restore,
  Upload,
  Verified,
  WarningAmber,
  // Upload, // Carga masiva oculta temporalmente
  Visibility,
} from "@mui/icons-material";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { enqueueSnackbar } from "notistack";
import { useConfirm } from "material-ui-confirm";
import { AxiosError } from "axios";
import { base64ToFile } from "../../helpers/generalHelpers";
import ErrorOverlay from "../../error/DataGridError";
import Spinner from "../../utils/Spinner";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import LectorQrVisitantes from "./LectorQrVisitantes";
import Camera from "../../utils/Camera";

import { isBlockedNow } from "../../../utils/bloqueo";

import CircularProgress from "@mui/material/CircularProgress";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { areDocumentosChecksComplete } from "./documentosChecks";
// sin helpers de documentos en tabla


const pageSizeOptions = [10, 25, 50];

type VisitanteConfirmTone = "warning" | "success" | "danger";

const VISITANTE_CONFIRM_COLORS: Record<VisitanteConfirmTone, string> = {
  warning: "#ed6c02",
  success: "#2e7d32",
  danger: "#d32f2f",
};

const VisitanteConfirmContent = ({
  tone,
  message,
  support,
}: {
  tone: VisitanteConfirmTone;
  message: string;
  support: string;
}) => {
  const color = VISITANTE_CONFIRM_COLORS[tone];
  return (
    <Box
      sx={{
        textAlign: "center",
        px: { xs: 0, sm: 1 },
        pt: 0.5,
        pb: 1,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          mx: "auto",
          mb: 1.5,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: `${color}14`,
          color,
        }}
      >
        <WarningAmber fontSize="medium" />
      </Box>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.75 }}>
        {message}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {support}
      </Typography>
    </Box>
  );
};

export default function Visitantes() {
  //Pruebas para catalogo de visitantes
  // console.log("[VISITANTES] render");
  // console.log("Prueba 01");

  const apiRef = useGridApiRef();
  const theme = useTheme();
  const fullScreenAccessModal = useMediaQuery(theme.breakpoints.down("sm"));
  const [error, setError] = useState<string>();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { rol } = useSelector((state: IRootState) => state.auth.data);
  const esRecep = rol.includes(5);
  const formContext = useForm({ defaultValues: { qr: "" } });
  const accessForm = useForm({ defaultValues: { img_ine_manual: "" } });
  const manualIne = useWatch({ control: accessForm.control, name: "img_ine_manual" }) as string;
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [accessModal, setAccessModal] = useState<{
    open: boolean;
    row: any | null;
    modo: "entrada" | "salida" | "ambos";
    motivo: string;
  }>({ open: false, row: null, modo: "salida", motivo: "" });
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [isDownloadingQr, setIsDownloadingQr] = useState({
    id_usuario: "",
    descargando: false,
  });

  const [loadingRows, setLoadingRows] = useState<Record<string, boolean>>({});
  const [estadoFiltro, setEstadoFiltro] = useState<"activos" | "inactivos" | "todos">("activos");
  const autoBlockedByTrashRef = useRef<Record<string, boolean>>({});
  const setRowLoading = (id: string, isLoading: boolean) =>
    setLoadingRows((prev) => ({ ...prev, [id]: isLoading }));
  const refrescarTabla = () => {
    apiRef.current?.dataSource?.fetchRows?.();
  };
  const refrescarDespuesCambioEstado = (id: string) => {
    if (selectedRowId === id) setSelectedRowId(null);
    refrescarTabla();
  };

  const handleOpenScanner = () => {
    setShowQRScanner(true);
  };

  const onQrValidate = async (
    qr: string
  ): Promise<{ ok: boolean; message: string; img_ine?: string; nombre?: string; tipo_check?: number; biostar_modo_manual?: boolean; requiere_validacion_identidad?: boolean }> => {
    const regexCardCode = /^VST[A-Z0-9]{16}$/;
    const isValid = regexCardCode.test(qr);
    if (!isValid) {
      const message = "QR inválido o no corresponde a un visitante.";
      enqueueSnackbar(message, { variant: "error" });
      return { ok: false, message };
    }

    try {
      const res = await clienteAxios.post("/api/eventos/validar-qr", {
        qr,
        lector: 0,
      });
      if (res.data.estado) {
        const puedeAcceder = res.data.datos?.puedeAcceder;
        const nombre = res.data.datos?.nombre;
        const tipoCheck = res.data.datos?.tipo_check;
        if (res.data.datos?.requiere_validacion_identidad) {
          const message = res.data.datos?.mensaje || "Captura la INE para habilitar entrada.";
          enqueueSnackbar(message, { variant: "info" });
          return {
            ok: false,
            message,
            nombre,
            img_ine: String(res.data?.datos?.img_ine || ""),
            requiere_validacion_identidad: true,
          };
        }
        if (puedeAcceder === false) {
          const message = nombre
            ? `Acceso pendiente para ${nombre}. Requiere validación.`
            : "Acceso pendiente de autorización. Requiere validación.";
          enqueueSnackbar(message, { variant: "warning" });
          return { ok: false, message, nombre };
        }
        const esEntrada = tipoCheck === 6 ? false : true;
        const ineRaw = String(res.data?.datos?.img_ine || "").trim();
        const message = nombre
          ? `Acceso a ${nombre}. ${esEntrada ? "Bienvenido." : "Hasta luego."}`
          : esEntrada
            ? "Acceso permitido. Bienvenido."
            : "Salida registrada. Hasta luego.";
        enqueueSnackbar(message, { variant: "success" });
        return {
          ok: true,
          message,
          img_ine: ineRaw || "",
          nombre,
          tipo_check: tipoCheck,
          biostar_modo_manual: !!res.data?.datos?.biostar_modo_manual,
        };
      }
      const message = res.data.mensaje || "No se pudo validar el QR.";
      enqueueSnackbar(message, { variant: "error" });
      return { ok: false, message };
    } catch (error) {
      handlingError(error);
      return {
        ok: false,
        message: "Error al validar el QR. Intenta de nuevo.",
      };
    }
  };

  const onAuthorizeIdentity = async ({
    qr,
    img_ine,
  }: {
    qr: string;
    img_ine: string;
  }): Promise<{ ok: boolean; message: string; img_ine?: string; nombre?: string; tipo_check?: number; biostar_modo_manual?: boolean; requiere_validacion_identidad?: boolean }> => {
    try {
      const res = await clienteAxios.post("/api/visitantes/autorizar-qr", {
        qr,
        img_ine,
        modo: "entrada",
        guardar_ine: true,
        actualizar_datos: true,
      });
      const ok = !!res.data?.estado;
      const message = res.data?.mensaje || (ok ? "Entrada habilitada." : "No se pudo validar la identidad.");
      enqueueSnackbar(message, { variant: ok ? "success" : "warning" });
      if (ok) {
        apiRef.current?.dataSource?.fetchRows?.();
      }
      return {
        ok,
        message,
        nombre: res.data?.datos?.nombre,
        img_ine,
        tipo_check: 5,
      };
    } catch (error) {
      handlingError(error);
      return {
        ok: false,
        message: "Error al validar INE. Intenta de nuevo.",
      };
    }
  };

  const onManualClose = async (): Promise<{ ok: boolean; message: string }> => {
    try {
      const res = await clienteAxios.post("/api/eventos/biostar/cerrar-manual");
      const ok = !!res.data?.estado;
      return { ok, message: res.data?.mensaje || (ok ? "Acceso cerrado." : "No se pudo cerrar.") };
    } catch (error) {
      handlingError(error);
      return { ok: false, message: "Error al cerrar acceso en BioStar." };
    }
  };


  const dataSource: GridDataSource = useMemo(
    () => ({
      getRows: async (params) => {
        let rows: GridValidRowModel[] = [];
        let rowCount: number = 0;
        try {
          const urlParams = new URLSearchParams({
            filter: JSON.stringify(params.filterModel.quickFilterValues),
            pagination: JSON.stringify(params.paginationModel),
            sort: JSON.stringify(params.sortModel),
            estado: estadoFiltro,
          });
          const res = await clienteAxios.get(
            "/api/visitantes?" + urlParams.toString()
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
    [estadoFiltro]
  );

  const initialState: GridInitialState = useMemo(
    () => ({
      pagination: {
        paginationModel: {
          pageSize: 10,
        },
        rowCount: 0,
      },
    }),
    []
  );

  const nuevoRegistro = () => {
    navigate("nuevo-visitante");
  };

  const editarRegistro = (ID: string) => {
    navigate(`editar-visitante/${ID}`);
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle-visitante/${ID}`);
  };

  const verificarRegistro = (ID: string) => {
    navigate(`verificar-visitante/${ID}`);
  };

  const verificarSeleccionado = () => {
    if (!selectedRowId) {
      enqueueSnackbar("Selecciona un visitante para verificar.", {
        variant: "warning",
      });
      return;
    }
    const row = apiRef.current?.getRow(selectedRowId) as any;
    if (!row) {
      enqueueSnackbar("No se encontró el visitante seleccionado.", {
        variant: "warning",
      });
      return;
    }
    if (!areDocumentosChecksComplete(row?.documentos_checks)) {
      confirm({
        title: "Documentos incompletos",
        description:
          "Para poder verificar al visitante se deben de tener todos los documentos marcados.",
        allowClose: true,
        confirmationText: "Cerrar",
        hideCancelButton: true,
      }).catch(() => {});
      return;
    }
    if (row.verificado) {
      enqueueSnackbar("Este visitante ya está verificado.", {
        variant: "info",
      });
      return;
    }
    verificarRegistro(row._id);
  };

  const cambiarEstado = async (ID: string, activo: boolean) => {
    if (!activo) {
      confirm({
        title: "Restaurar visitante",
        content: (
          <VisitanteConfirmContent
            tone="success"
            message={"\u00bfSeguro que deseas restaurar a este visitante?"}
            support={"El visitante volver\u00e1 a estar activo y podr\u00e1 utilizarse nuevamente."}
          />
        ),
        allowClose: true,
        confirmationText: "Restaurar",
        confirmationButtonProps: {
          color: "success",
          variant: "contained",
        },
        cancellationButtonProps: {
          color: "secondary",
          variant: "contained",
        },
      })
        .then(async (result) => {
          if (!result.confirmed) return;
          const res = await clienteAxios.patch(`/api/visitantes/${ID}`, {
            activo,
          });
          if (res.data.estado) {
            apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);
            refrescarDespuesCambioEstado(ID);
            if (autoBlockedByTrashRef.current[ID]) {
              setRowLoading(ID, true);
              try {
                const unlockRes = await clienteAxios.patch(`/api/visitantes/desbloquear/${ID}`);
                if (unlockRes.data.estado) {
                  const v = unlockRes.data.data;
                  apiRef.current?.updateRows([
                    { _id: ID, bloqueado: v.bloqueado, desbloqueado_hasta: v.desbloqueado_hasta ?? null },
                  ]);
                }
              } finally {
                setRowLoading(ID, false);
                delete autoBlockedByTrashRef.current[ID];
              }
            }
          } else {
            enqueueSnackbar(res.data.mensaje, { variant: "error" });
          }
        })
        .catch((error) => {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
        });
      return;
    }

    confirm({
      title: "Desactivar visitante",
      content: (
        <VisitanteConfirmContent
          tone="warning"
          message={"\u00bfSeguro que deseas desactivar a este visitante?"}
          support={"El visitante ya no podr\u00e1 ser editado ni utilizado para nuevos accesos."}
        />
      ),
      allowClose: true,
      confirmationText: "Desactivar",
      confirmationButtonProps: {
        color: "warning",
        variant: "contained",
      },
      cancellationButtonProps: {
        color: "secondary",
        variant: "contained",
      },
    })
      .then(async (result) => {
        if (!result.confirmed) return;

        try {
          const res = await clienteAxios.patch(`/api/visitantes/${ID}`, {
            activo,
          });
          if (res.data.estado) {
            const rowBefore = apiRef.current?.getRow(ID) as any;
            apiRef.current?.updateRows([{ _id: ID, activo: !activo }]);
            refrescarDespuesCambioEstado(ID);

            // Si aún no está bloqueado, aplicar bloqueo automático al desactivar.
            if (rowBefore && !isBlockedNow(rowBefore)) {
              setRowLoading(ID, true);
              try {
                const lockRes = await clienteAxios.patch(`/api/visitantes/bloquear/${ID}`);
                if (lockRes.data.estado) {
                  const v = lockRes.data.data;
                  apiRef.current?.updateRows([
                    { _id: ID, bloqueado: v.bloqueado, desbloqueado_hasta: v.desbloqueado_hasta ?? null },
                  ]);
                  autoBlockedByTrashRef.current[ID] = true;
                }
              } finally {
                setRowLoading(ID, false);
              }
            }
          } else {
            enqueueSnackbar(res.data.mensaje, { variant: "warning" });
          }
        } catch (error) {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
        }
      })
      .catch((error) => {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      });
  };

  // const cargaMasiva = () => {
  //   navigate("carga-masiva");
  // };

  const descargarQr = async (ID: string, nombre: string) => {
    try {
      setIsDownloadingQr({ id_usuario: ID, descargando: true });
      const res = await clienteAxios.get(`/api/visitantes/qr/${ID}`);
      if (res.data.estado) {
        base64ToFile(res.data.datos, "image/jpg", `${nombre}.jpg`);
      } else {
        enqueueSnackbar(res.data.mensaje, { variant: "warning" });
      }
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsDownloadingQr({ id_usuario: ID, descargando: false });
    }
  };

  const eliminarPermanente = (ID: string) => {
    confirm({
      title: "Eliminar visitante",
      content: (
        <VisitanteConfirmContent
          tone="danger"
          message={"\u00bfSeguro que deseas eliminar permanentemente a este visitante?"}
          support={"Esta acci\u00f3n no se podr\u00e1 deshacer."}
        />
      ),
      allowClose: true,
      confirmationText: "Eliminar definitivamente",
      confirmationButtonProps: {
        color: "error",
        variant: "contained",
      },
      cancellationButtonProps: {
        color: "secondary",
        variant: "contained",
      },
    })
      .then(async (result) => {
        if (!result.confirmed) return;
        setRowLoading(ID, true);
        const res = await clienteAxios.patch(`/api/visitantes/eliminar-permanente/${ID}`);
        if (res.data.estado) {
          apiRef.current?.dataSource?.fetchRows?.();
          enqueueSnackbar("Visitante eliminado permanentemente.", { variant: "success" });
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      })
      .catch((error) => {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      })
      .finally(() => setRowLoading(ID, false));
  };

  const resincronizarPaneles = async (ID: string) => {
    setRowLoading(ID, true);
    try {
      const res = await clienteAxios.patch(`/api/visitantes/resync/${ID}`);
      if (!res.data?.estado) {
        enqueueSnackbar(res.data?.mensaje || "No se pudo sincronizar.", { variant: "warning" });
        return;
      }
      const sync = res.data?.datos?.sync || {};
      const subidos = Array.isArray(sync.subidos) ? sync.subidos : [];
      const fallidos = Array.isArray(sync.fallidos) ? sync.fallidos : [];
      if (fallidos.length > 0) {
        const okTxt = subidos.length > 0 ? `Subido en: ${subidos.join(", ")}.` : "No se subio en paneles.";
        const failTxt = `Pendiente en: ${fallidos.map((f: any) => f?.ip).filter(Boolean).join(", ")}.`;
        enqueueSnackbar(`${okTxt} ${failTxt}`, { variant: "warning" });
      } else {
        enqueueSnackbar(
          subidos.length > 0
            ? `Sincronizado en panel(es): ${subidos.join(", ")}`
            : "Sincronizacion completada.",
          { variant: "success" }
        );
      }
      (apiRef.current as any)?.dataSource?.fetchRows?.();
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setRowLoading(ID, false);
    }
  };

  const rowSelectionModel: GridRowSelectionModel = {
    type: "include",
    ids: new Set(selectedRowId ? [selectedRowId] : []),
  };

const accionDesbloquear = (ID: string) => {
  const row = apiRef.current?.getRow(ID) as any;
  if (row && !row.verificado) {
    confirm({
      title: "Acceso no permitido",
      description: "Se deben verificar los documentos del visitante para habilitar el acceso.",
      allowClose: true,
      confirmationText: "Cerrar",
      hideCancelButton: true,
    }).catch(() => {});
    return;
  }
  if (row && row.activo === false) {
    enqueueSnackbar("Debes restaurar al visitante para habilitar el acceso.", { variant: "warning" });
    return;
  }
  accessForm.reset({ img_ine_manual: "" });
  setAccessModal({ open: true, row, modo: "salida", motivo: "" });
  return;
  confirm({
    title: "¿Seguro que desea desbloquear a este visitante?",
    description: "Esta acción restaura los intentos y habilita el acceso SOLO por hoy.",
    allowClose: true,
    confirmationText: "Continuar",
  })
    .then(async (result) => {
      if (!result.confirmed) return;

      setRowLoading(ID, true);

      try {
        const res = await clienteAxios.patch(`/api/visitantes/desbloquear/${ID}`);

        if (res.data.estado) {
          const v = res.data.data;
          apiRef.current?.updateRows([
            { _id: ID, bloqueado: v.bloqueado, desbloqueado_hasta: v.desbloqueado_hasta ?? null },
          ]);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: any) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      } finally {
        setRowLoading(ID, false);
      }
    })
    .catch(() => {});
};

const cerrarModalAcceso = () => {
  setAccessModal({ open: false, row: null, modo: "salida", motivo: "" });
  accessForm.reset({ img_ine_manual: "" });
};

const ejecutarAccesoManual = async () => {
  const row = accessModal.row;
  if (!row?._id) return;
  setRowLoading(row._id, true);
  try {
    let res;
    if (accessModal.modo === "entrada" || accessModal.modo === "ambos") {
      if (!manualIne) {
        enqueueSnackbar("Captura la INE para activar entrada.", { variant: "warning" });
        return;
      }
      const qr = String(row.card_code || "").trim();
      if (!qr) {
        enqueueSnackbar("El visitante no tiene QR disponible.", { variant: "warning" });
        return;
      }
      res = await clienteAxios.post("/api/visitantes/autorizar-qr", {
        qr,
        img_ine: manualIne,
        modo: accessModal.modo,
        motivo: accessModal.motivo,
        guardar_ine: true,
        actualizar_datos: true,
      });
    } else {
      res = await clienteAxios.patch(`/api/visitantes/desbloquear/${row._id}`, {
        modo: "salida",
        motivo: accessModal.motivo,
      });
    }

    if (res.data.estado) {
      const v = res.data.data || res.data.datos || {};
      apiRef.current?.updateRows([
        {
          _id: row._id,
          bloqueado: false,
          desbloqueado_hasta: v.desbloqueado_hasta ?? v.expira ?? null,
          acceso_qr_estado: v.acceso_qr_estado,
          acceso_qr_modo: v.acceso_qr_modo ?? accessModal.modo,
          acceso_qr_expira: v.acceso_qr_expira ?? v.expira ?? null,
        },
      ]);
      enqueueSnackbar(res.data.mensaje || "Acceso actualizado.", { variant: "success" });
      cerrarModalAcceso();
    } else {
      enqueueSnackbar(res.data.mensaje || "No se pudo actualizar acceso.", { variant: "warning" });
    }
  } catch (error: any) {
    const { restartSession } = handlingError(error);
    if (restartSession) navigate("/logout", { replace: true });
  } finally {
    setRowLoading(row._id, false);
  }
};

const accionBloquear = (ID: string) => {
  const row = apiRef.current?.getRow(ID) as any;
  if (row && !row.verificado) {
    confirm({
      title: "Acceso no permitido",
      description: "El visitante debe estar verificado para cambiar el acceso.",
      allowClose: true,
      confirmationText: "Cerrar",
      hideCancelButton: true,
    }).catch(() => {});
    return;
  }
  if (row && row.activo === false) {
    enqueueSnackbar("Debes restaurar al visitante para cambiar el acceso.", { variant: "warning" });
    return;
  }
  confirm({
    title: "¿Seguro que desea bloquear a este visitante?",
    description: "Esta acción bloquea el acceso al sistema para el visitante.",
    allowClose: true,
    confirmationText: "Continuar",
  })
    .then(async (result) => {
      if (!result.confirmed) return;

      setRowLoading(ID, true);

      try {
        const res = await clienteAxios.patch(`/api/visitantes/bloquear/${ID}`);

        if (res.data.estado) {
          const v = res.data.data;
          apiRef.current?.updateRows([
            { _id: ID, bloqueado: v.bloqueado, desbloqueado_hasta: v.desbloqueado_hasta ?? null },
          ]);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: any) {
        const { restartSession } = handlingError(error);
        if (restartSession) navigate("/logout", { replace: true });
      } finally {
        setRowLoading(ID, false);
      }
    })
    .catch(() => {});
};


  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        getRowHeight={() => "auto"}
        columns={[
          {
            headerName: "Foto",
            field: "img_usuario",
            disableExport: true,
            headerAlign: "center",
            align: "center",
            flex: 0,
            width: 70,
            minWidth: 70,
            display: "flex",
            renderCell: ({ row, value }) => (
              <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
                <Avatar
                  alt={row.nombre}
                  sx={(theme) => ({
                    backgroundColor: value
                      ? theme.palette.success.main
                      : theme.palette.error.main,
                    fontSize: 15,
                    width: 25,
                    height: 25,
                  })}
                />
              </div>
            ),
          },
          {
            headerName: "Nombre",
            field: "nombre",
            flex: 1,
            display: "flex",
            minWidth: 180,
            renderCell: ({ value }) => (
              <span style={{ fontSize: 14, fontWeight: 400 }}>{value}</span>
            ),
          },
          {
            headerName: "Empresa",
            field: "empresa",
            flex: 1,
            display: "flex",
            minWidth: 180,
            renderCell: ({ value }) => value || "--",
          },
          {
            headerName: "QR",
            field: "id_usuario",
            headerAlign: "center",
            align: "center",
            flex: 0,
            width: 70,
            minWidth: 70,
            display: "flex",
            renderCell: ({ row }) => {
              const isVerified = Boolean(row?.verificado);
              return (
                <Fragment>
                  {isDownloadingQr.descargando &&
                  row._id === isDownloadingQr.id_usuario ? (
                    <Spinner size="small" />
                  ) : isVerified ? (
                    <IconButton
                      onClick={() => descargarQr(row._id, row.nombre)}
                    >
                      <GetApp fontSize="small" color="success" />
                    </IconButton>
                  ) : (
                    <Tooltip title="Visitante no verificado">
                      <span>
                        <IconButton disabled>
                          <GetApp fontSize="small" color="disabled" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Fragment>
              );
            },
          },
          {
            headerName: "Estatus",
            field: "verificado",
            headerAlign: "center",
            align: "center",
            flex: 1,
            minWidth: 140,
            sortable: false,
            renderCell: ({ row }) => {
              const verified = Boolean(row?.verificado);
              return (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "6px 0",
                    boxSizing: "border-box",
                  }}
                >
                  <Chip
                    label={verified ? "Verificado" : "No verificado"}
                    color={verified ? "success" : "error"}
                    size="small"
                    sx={{
                      minWidth: 110,
                      justifyContent: "center",
                      color: "common.white",
                      fontWeight: 700,
                    }}
                  />
                </div>
              );
            },
          },
          {
            headerName: "Acciones",
            field: "activo",
            type: "actions",
            align: "center",
            flex: 1,
            display: "flex",
            minWidth: 120,
            sortable: false,
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
              if (!esRecep) {
                if (row.activo) {
                  gridActions.push(
                    <GridActionsCellItem
                      icon={<Edit color="primary" />}
                      onClick={() => editarRegistro(row._id)}
                      label="Editar"
                      title="Editar"
                    />
                  );
                }
                if (row.id_general !== 1) {
                  gridActions.push(
                    row.activo ? (
                      <GridActionsCellItem
                        icon={<Delete sx={{ color: "#ed6c02" }} />}
                        onClick={() => cambiarEstado(row._id, row.activo)}
                        label="Desactivar visitante"
                        title="Desactivar visitante"
                      />
                    ) : (
                      <Fragment>
                        <GridActionsCellItem
                          icon={<Restore color="success" />}
                          onClick={() => cambiarEstado(row._id, row.activo)}
                          label="Restaurar visitante"
                          title="Restaurar visitante"
                        />
                        <GridActionsCellItem
                          icon={<Delete color="error" />}
                          onClick={() => eliminarPermanente(row._id)}
                          label="Eliminar definitivamente"
                          title="Eliminar definitivamente"
                        />
                      </Fragment>
                    )
                  );
                }
                if (row.sync_hikvision_pendiente) {
                  gridActions.push(
                    <GridActionsCellItem
                      icon={<Upload sx={{ color: "#ed6c02" }} />}
                      onClick={() => resincronizarPaneles(row._id)}
                      label="Re-subir paneles"
                      title="Re-subir paneles"
                    />
                  );
                }
              }
              return gridActions;
            },
          },
          {
                        headerName: "Acceso",
            field: "desbloqueo",
            type: "actions",
            align: "center",
            flex: 1,
            display: "flex",
            minWidth: 100,

            // Esto ayuda a que DataGrid recalcule el cell cuando cambie el row
            valueGetter: (_value, row) => `${row?.bloqueado ?? false}-${row?.desbloqueado_hasta ?? ""}`,

            getActions: ({ row }) => {
              if (esRecep) {
                const bloqueadoEfectivo = isBlockedNow(row);
                return [
                  bloqueadoEfectivo ? (
                    <GridActionsCellItem
                      icon={<Lock color="error" />}
                      label="Bloqueado"
                      title="Bloqueado"
                      disabled
                      onClick={() => {}}
                    />
                  ) : (
                    <GridActionsCellItem
                      icon={<LockOpen color="success" />}
                      label="Acceso"
                      title="Acceso"
                      disabled
                      onClick={() => {}}
                    />
                  ),
                ];
              }
              const isLoading = !!loadingRows[row._id];

              if (isLoading) {
                return [
                  <GridActionsCellItem
                    icon={<CircularProgress size={18} />}
                    label="Procesando"
                    disabled
                    onClick={() => {}}
                  />,
                ];
              }

              const bloqueadoEfectivo = isBlockedNow(row);

              return [
                bloqueadoEfectivo ? (
                  <GridActionsCellItem
                    icon={<Lock color="error" />}
                    onClick={() => accionDesbloquear(row._id)}
                    label="Bloqueado"
                    title="Desbloquear"
                  />
                ) : (
                  <GridActionsCellItem
                    icon={<LockOpen color="success" />}
                    onClick={() => accionBloquear(row._id)}
                    label="Acceso"
                    title="Bloquear"
                  />
                ),
              ];
            }
          }
        ]}
        disableRowSelectionOnClick={false}
        disableColumnFilter
        filterDebounceMs={1000}
        dataSource={dataSource}
        dataSourceCache={null}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={(model) => {
          const ids = "ids" in model ? Array.from(model.ids) : model;
          const next = Array.isArray(ids) ? ids[0] : undefined;
          setSelectedRowId(next ? String(next) : null);
        }}
        onCellClick={(params) => {
          setSelectedRowId(String(params.id));
        }}
        getRowClassName={(params) =>
          params.id === selectedRowId ? "row-selected" : ""
        }
        sx={{
          "& .row-selected": {
            outline: "2px solid #7A3DF0",
            outlineOffset: -2,
          },
          "& .MuiDataGrid-row.Mui-selected": {
            backgroundColor: "rgba(122, 61, 240, 0.08)",
          },
          "& .MuiDataGrid-cell.MuiDataGrid-cell--focus": {
            outline: "none",
          },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
            outline: "none",
          },
        }}
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
          footerRowSelected: () => "",
        }}
        slots={{
          toolbar: () => (
            <DataGridToolbar
              tableTitle="Gestión de Visitantes"
              customActionButtons={
                <Fragment>
                  <Tooltip title="Escanear QR">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleOpenScanner}
                      startIcon={<QrCodeScanner fontSize="small" />}
                      sx={{ textTransform: "none" }}
                    >
                      Escanear QR
                    </Button>
                  </Tooltip>
                  <FormControl size="small" sx={{ minWidth: 180, mx: 1 }}>
                    <InputLabel id="estado-visitantes-label">Estado</InputLabel>
                    <Select
                      labelId="estado-visitantes-label"
                      value={estadoFiltro}
                      label="Estado"
                      onChange={(e) => setEstadoFiltro(e.target.value as typeof estadoFiltro)}
                    >
                      <MenuItem value="todos">Todos</MenuItem>
                      <MenuItem value="activos">Activos</MenuItem>
                      <MenuItem value="inactivos">Inactivos</MenuItem>
                    </Select>
                  </FormControl>
                  {!esRecep && (
                    <Fragment>
                      <Tooltip title="Agregar">
                        <IconButton onClick={nuevoRegistro}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Verificar">
                        <IconButton onClick={verificarSeleccionado}>
                          <Verified fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {/* Carga masiva oculta temporalmente; mantener para uso futuro */}
                      {/* <Tooltip title="Carga masiva">
                        <IconButton onClick={cargaMasiva}>
                          <Upload fontSize="small" />
                        </IconButton>
                      </Tooltip> */}
                    </Fragment>
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
      {showQRScanner && (
        <FormProvider {...formContext}>
          <LectorQrVisitantes
            name="qr"
            setShow={setShowQRScanner}
            onQrValidate={onQrValidate}
            onAuthorizeIdentity={onAuthorizeIdentity}
            onManualClose={onManualClose}
            // testQr="VST0000016B86B273FF"
          />
        </FormProvider>
      )}
      <Dialog
        open={accessModal.open}
        onClose={cerrarModalAcceso}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreenAccessModal}
        PaperProps={{
          sx: fullScreenAccessModal
            ? { height: "100dvh", m: 0, borderRadius: 0 }
            : { borderRadius: 2 },
        }}
      >
        <DialogTitle>Habilitar acceso</DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            overflow: "hidden",
            pb: 1,
          }}
        >
          <RadioGroup
            row
            value={accessModal.modo}
            onChange={(event) =>
              setAccessModal((prev) => ({
                ...prev,
                modo: event.target.value as "entrada" | "salida" | "ambos",
              }))
            }
          >
            <FormControlLabel value="entrada" control={<Radio />} label="Entrada" />
            <FormControlLabel value="salida" control={<Radio />} label="Salida" />
            <FormControlLabel value="ambos" control={<Radio />} label="Ambos" />
          </RadioGroup>
          <TextField
            fullWidth
            margin="dense"
            label="Motivo"
            value={accessModal.motivo}
            onChange={(event) => setAccessModal((prev) => ({ ...prev, motivo: event.target.value }))}
          />
          {(accessModal.modo === "entrada" || accessModal.modo === "ambos") && (
            <FormProvider {...accessForm}>
              <Box sx={{ flex: "0 0 auto", minHeight: 0 }}>
                <Camera
                  name="img_ine_manual"
                  showButton
                  defaultMode={1}
                  containerHeight={fullScreenAccessModal ? "min(54dvh, 440px)" : 380}
                />
              </Box>
              {manualIne && (
                <Avatar
                  src={manualIne}
                  variant="rounded"
                  sx={{
                    width: "100%",
                    height: fullScreenAccessModal ? 120 : 160,
                    mt: 1.5,
                  }}
                />
              )}
            </FormProvider>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="secondary" onClick={cerrarModalAcceso}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={ejecutarAccesoManual}>
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>
      <Outlet context={apiRef.current?.dataSource} />
    </div>
  );
}





