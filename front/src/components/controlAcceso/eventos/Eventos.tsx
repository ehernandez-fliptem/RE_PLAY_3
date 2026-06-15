import { useState, useMemo, Fragment, useEffect } from "react";
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
import ErrorOverlay from "../../error/DataGridError";
import { AxiosError } from "axios";
import { Controller, FormProvider, useForm, type SubmitHandler } from "react-hook-form";
import type { Dayjs } from "dayjs";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import dayjs from "dayjs";
import {
  alpha,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  lighten,
  Stack,
  Typography,
} from "@mui/material";
import Spinner from "../../utils/Spinner";
import {
  AutocompleteElement,
  FormContainer,
  SelectElement,
} from "react-hook-form-mui";
import {
  ClearAll,
  Close,
  FileDownload,
  LocationOn,
  QrCodeScanner,
  Search,
  Visibility,
} from "@mui/icons-material";
import { enqueueSnackbar } from "notistack";
import { DateTimePicker } from "@mui/x-date-pickers";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import InfiniteAutocomplete from "../../utils/InfiniteAutocomplete";
import LectorQrVisitantes from "../../recepcion/visitantes/LectorQrVisitantes";
import { notifyFormErrors } from "../../helpers/formHelper";
import { generatePdfReport, openPdfBlob } from "../../../utils/pdfReport";


const pageSizeOptions = [10, 25, 50];

type Empresas = {
  _id?: string;
  nombre?: string;
};

type Panel = {
  _id?: string;
  nombre?: string;
};

type FormValues = {
  fecha_inicio: Dayjs;
  fecha_final: Dayjs;
  usuarios?: string[];
  dispositivos?: string[];
  empresas?: string[];
  tipo_acceso?: number | string | null;
  panel?: string;
};

type EventoReportePersona = Record<string, unknown> & {
  persona: string;
  entradas: number;
  salidas: number;
  totalEventos: number;
  primeraEntrada: string;
  ultimaSalida: string;
  ultimoMovimiento: string;
  ultimasVisitas: string;
};

const resolver = yup.object().shape({
  fecha_inicio: yup
    .mixed()
    .test(
      "isDayjs",
      "La hora de entrada debe ser menor a la hora de salida.",
      (value) => {
        return dayjs.isDayjs(value) && value.isValid();
      }
    )
    .required("Este campo es obligatorio."),
  fecha_final: yup
    .mixed()
    .test(
      "isDayjs",
      "La hora de entrada debe ser menor a la hora de salida.",
      (value) => {
        return dayjs.isDayjs(value) && value.isValid();
      }
    )
    .required("Este campo es obligatorio."),
  usuarios: yup.array().of(yup.string()),
  dispositivos: yup.array().of(yup.string()),
  empresas: yup.array().of(yup.string()),
  tipo_acceso: yup.mixed().nullable().optional(),
  panel: yup.string().optional(),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  fecha_inicio: dayjs().startOf("day"),
  fecha_final: dayjs().endOf("day"),
  usuarios: [],
  dispositivos: [],
  empresas: [],
  tipo_acceso: "all",
  panel: "all",
};

export default function Eventos() {
  const { tipos_eventos, tipos_dispositivos, habilitarRegistroCampo } = useSelector(
    (state: IRootState) => state.config.data
  );
  const { nombre: nombreUsuario } = useSelector(
    (state: IRootState) => state.auth.data
  );

  const TIPOS_EVENTOS = Object.entries(tipos_eventos)
    .filter((item) => [5, 6].includes(Number(item[0])))
    .map((item) => {
      return {
        id: item[0],
        label: item[1].nombre,
      };
    });

  const TIPOS_DISPOSITIVOS = Object.entries(tipos_dispositivos).map((item) => {
    return {
      id: item[0],
      label: item[1].nombre,
    };
  });

  const formContext = useForm({
    defaultValues: initialValue,
    resolver: yupResolver(resolver),
    shouldFocusError: true,
    criteriaMode: "all",
    reValidateMode: "onChange",
    mode: "all",
  });
  const qrFormContext = useForm({ defaultValues: { qr: "" } });

  const apiRef = useGridApiRef();
  const [error, setError] = useState<string>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [empresas, setEmpresas] = useState<Empresas[]>([]);
  const [paneles, setPaneles] = useState<Panel[]>([]);
  const [canSearch, setCanSearch] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [openDetalleCampo, setOpenDetalleCampo] = useState(false);
  const [openMapa, setOpenMapa] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [openReporte, setOpenReporte] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] =
    useState<GridValidRowModel | null>(null);
  const [eventoMapa, setEventoMapa] = useState<GridValidRowModel | null>(null);

  useEffect(() => {
    const obtenerRegistro = async () => {
      try {
        const res = await clienteAxios.get("/api/eventos/form-reportes");
        if (res.data.estado) {
          setEmpresas(res.data.datos.empresas);
          const resPaneles = await clienteAxios.get("/api/eventos/kiosco/paneles");
          if (resPaneles.data.estado) {
            setPaneles(resPaneles.data.datos || []);
          } else {
            setPaneles([]);
          }
          setIsLoading(false);
        } else {
          enqueueSnackbar(res.data.mensaje, { variant: "warning" });
        }
      } catch (error: unknown) {
        handlingError(error);
      }
    };
    obtenerRegistro();
  }, [formContext]);

  const dataSource: GridDataSource = useMemo(
    () => ({
      getRows: async (params) => {
        let rows: GridValidRowModel[] = [];
        let rowCount: number = 0;
        try {
          if (canSearch) {
            const urlParams = new URLSearchParams({
              filter: JSON.stringify(params.filterModel.quickFilterValues),
              pagination: JSON.stringify(params.paginationModel),
              sort: JSON.stringify(params.sortModel),
              panel: String(formContext.getValues().panel || "all"),
            });
            const { tipo_acceso, ...restValues } = formContext.getValues();
            const tipoAccesoValue =
              tipo_acceso === "all" || tipo_acceso === null
                ? null
                : Number(tipo_acceso);
            const res = await clienteAxios.post(
              "/api/eventos/reportes?" + urlParams.toString(),
              {
                datos: {
                  ...restValues,
                  estatus: tipoAccesoValue ? [tipoAccesoValue] : [5, 6],
                },
              }
            );
            if (res.data.estado) {
              setError("");
              rows = res.data.datos.paginatedResults || [];
              rowCount = res.data.datos.totalCount[0]?.count || 0;
            }
          }
        } catch (error) {
          const { restartSession } = handlingError(error);
          if (restartSession) navigate("/logout", { replace: true });
          throw error;
        } finally {
          setIsLoadingData(false);
        }

        return {
          rows,
          rowCount,
        };
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canSearch]
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

  const onSubmit: SubmitHandler<FormValues> = async () => {
    setIsLoadingData(true);
    if (canSearch) {
      apiRef.current?.dataSource.fetchRows();
      return;
    }
    setCanSearch(true);
  };

  useEffect(() => {
    const debounceRef = { current: 0 as unknown as ReturnType<typeof setTimeout> };
    const subscription = formContext.watch(() => {
      if (!formContext.formState.isValid) return;
      setIsLoadingData(true);
      setCanSearch(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        apiRef.current?.dataSource.fetchRows();
      }, 400);
    });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      subscription.unsubscribe();
    };
  }, [formContext, apiRef]);

  useEffect(() => {
    if (canSearch) {
      apiRef.current?.dataSource.fetchRows();
    }
  }, [canSearch, apiRef]);

  useEffect(() => {
    setIsLoadingData(true);
    setCanSearch(true);
  }, []);

  const clearForm = () => {
    formContext.reset();
  };

  const verRegistro = (ID: string) => {
    navigate(`detalle-evento/${ID}`);
  };

  const esEventoCampo = (row: GridValidRowModel) =>
    Number(row?.tipo_dispositivo) === 4 ||
    String(row?.panel || "").toLowerCase().includes("campo");

  const obtenerCoords = (ubicacion: unknown) => {
    const raw = String(ubicacion || "");
    const [latRaw, lngRaw] = raw.split(",").map((item) => item?.trim());
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  };

  const abrirMapa = (row: GridValidRowModel) => {
    const coords = obtenerCoords(row?.ubicacion);
    if (!coords) {
      enqueueSnackbar("El evento no tiene ubicación válida.", {
        variant: "warning",
      });
      return;
    }
    setEventoMapa(row);
    setOpenMapa(true);
  };

  const verEvento = (row: GridValidRowModel) => {
    if (esEventoCampo(row)) {
      setEventoSeleccionado(row);
      setOpenDetalleCampo(true);
      return;
    }
    verRegistro(String(row._id));
  };

  const urlMapaEmbed = (() => {
    const coords = obtenerCoords(eventoMapa?.ubicacion);
    if (!coords) return "";
    const delta = 0.005;
    const left = coords.lng - delta;
    const right = coords.lng + delta;
    const top = coords.lat + delta;
    const bottom = coords.lat - delta;
    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${coords.lat}%2C${coords.lng}`;
  })();

  const formatReportDate = (value: unknown) => {
    const date = dayjs(value as string | number | Date);
    return date.isValid() ? date.format("DD/MM/YYYY HH:mm") : "--";
  };

  const getTipoEventoLabel = (estatus: unknown) => {
    const key = Number(estatus);
    return tipos_eventos[key]?.nombre || "Sin tipo";
  };

  const getPanelLabel = (panel?: string) => {
    if (!panel || panel === "all") return "Todos los paneles";
    if (panel === "todos") return "Todos";
    if (panel === "campo") return "Campo";
    return paneles.find((item) => item._id === panel)?.nombre || panel;
  };

  const getSelectedLabels = (
    selected: string[] | undefined,
    options: Array<{ id: string; label: string }>,
    emptyLabel: string
  ) => {
    if (!selected?.length) return emptyLabel;
    return selected
      .map((id) => options.find((item) => String(item.id) === String(id))?.label || id)
      .join(", ");
  };

  const getFiltrosReporteEventos = () => {
    const values = formContext.getValues();
    const tipoAccesoValue =
      values.tipo_acceso === "all" || values.tipo_acceso === null
        ? null
        : String(values.tipo_acceso);
    return [
      {
        label: "Fecha desde",
        value: values.fecha_inicio
          ? dayjs(values.fecha_inicio).format("DD/MM/YYYY HH:mm")
          : "--",
      },
      {
        label: "Fecha hasta",
        value: values.fecha_final
          ? dayjs(values.fecha_final).format("DD/MM/YYYY HH:mm")
          : "--",
      },
      {
        label: "Tipo de acceso",
        value: tipoAccesoValue
          ? TIPOS_EVENTOS.find((item) => String(item.id) === tipoAccesoValue)?.label ||
            tipoAccesoValue
          : "Entradas y salidas",
      },
      {
        label: "Panel",
        value: getPanelLabel(values.panel),
      },
      {
        label: "Dispositivos",
        value: getSelectedLabels(values.dispositivos, TIPOS_DISPOSITIVOS, "Todos"),
      },
      {
        label: "Empresas",
        value: getSelectedLabels(
          values.empresas,
          empresas.map((item) => ({ id: String(item._id), label: item.nombre || "--" })),
          "Todas"
        ),
      },
      {
        label: "Usuarios",
        value: values.usuarios?.length
          ? `${values.usuarios.length} usuario(s) seleccionado(s)`
          : "Todos",
      },
    ];
  };

  const getPeriodoReporteEventos = () => {
    const values = formContext.getValues();
    const inicio = values.fecha_inicio
      ? dayjs(values.fecha_inicio).format("DD/MM/YYYY HH:mm")
      : "--";
    const fin = values.fecha_final
      ? dayjs(values.fecha_final).format("DD/MM/YYYY HH:mm")
      : "--";
    return `Periodo: ${inicio} a ${fin}`;
  };

  const fetchEventosReporte = async () => {
    const values = formContext.getValues();
    const { tipo_acceso, ...restValues } = values;
    const tipoAccesoValue =
      tipo_acceso === "all" || tipo_acceso === null ? null : Number(tipo_acceso);

    const requestPage = async (pageSize: number) => {
      const urlParams = new URLSearchParams({
        filter: JSON.stringify([]),
        pagination: JSON.stringify({ page: 0, pageSize }),
        sort: JSON.stringify([{ field: "fecha_creacion", sort: "asc" }]),
        panel: String(values.panel || "all"),
      });
      const res = await clienteAxios.post(
        "/api/eventos/reportes?" + urlParams.toString(),
        {
          datos: {
            ...restValues,
            estatus: tipoAccesoValue ? [tipoAccesoValue] : [5, 6],
          },
        }
      );
      if (!res.data?.estado) {
        throw new Error(res.data?.mensaje || "No se pudo generar el reporte.");
      }
      return {
        rows: (res.data?.datos?.paginatedResults || []) as GridValidRowModel[],
        total: Number(res.data?.datos?.totalCount?.[0]?.count || 0),
      };
    };

    const firstPage = await requestPage(10000);
    if (firstPage.total > firstPage.rows.length) {
      const fullPage = await requestPage(firstPage.total);
      return fullPage.rows;
    }
    return firstPage.rows;
  };

  const agruparEventosPorPersona = (eventos: GridValidRowModel[]) => {
    const grupos = new Map<string, GridValidRowModel[]>();
    eventos.forEach((evento) => {
      const persona = String(evento.usuario || "Sin identificar").trim() || "Sin identificar";
      const key = persona.toLocaleLowerCase("es-MX");
      const current = grupos.get(key) || [];
      current.push(evento);
      grupos.set(key, current);
    });

    return Array.from(grupos.values())
      .map((items): EventoReportePersona => {
        const ordenados = [...items].sort((a, b) =>
          dayjs(a.fecha_creacion as string | number | Date).valueOf() -
          dayjs(b.fecha_creacion as string | number | Date).valueOf()
        );
        const persona = String(ordenados[0]?.usuario || "Sin identificar");
        const entradas = ordenados.filter((item) => Number(item.estatus) === 5);
        const salidas = ordenados.filter((item) => Number(item.estatus) === 6);
        const ultimo = ordenados[ordenados.length - 1];
        const ultimasVisitas = ordenados
          .slice(-4)
          .reverse()
          .map((item) => {
            const tipo = getTipoEventoLabel(item.estatus);
            const fecha = formatReportDate(item.fecha_creacion);
            const panel = String(item.panel || tipos_dispositivos[Number(item.tipo_dispositivo)]?.nombre || "Sin panel");
            return `${tipo} ${fecha} (${panel})`;
          })
          .join(" | ");
        return {
          persona,
          entradas: entradas.length,
          salidas: salidas.length,
          totalEventos: ordenados.length,
          primeraEntrada: entradas[0]?.fecha_creacion
            ? formatReportDate(entradas[0].fecha_creacion)
            : "--",
          ultimaSalida: salidas[salidas.length - 1]?.fecha_creacion
            ? formatReportDate(salidas[salidas.length - 1].fecha_creacion)
            : "--",
          ultimoMovimiento: ultimo
            ? `${getTipoEventoLabel(ultimo.estatus)} - ${formatReportDate(ultimo.fecha_creacion)}`
            : "--",
          ultimasVisitas: ultimasVisitas || "--",
        };
      })
      .sort((a, b) => a.persona.localeCompare(b.persona, "es-MX"));
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const escapeHtml = (value: unknown) =>
    String(value ?? "--")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const generarExcelEventos = (
    rows: EventoReportePersona[],
    filtros: Array<{ label: string; value: string | number | boolean }>,
    fileName: string
  ) => {
    const filtrosHtml = filtros
      .map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.value)}</td></tr>`)
      .join("");
    const rowsHtml = rows
      .map(
        (row) => `
          <tr>
            <td>${escapeHtml(row.persona)}</td>
            <td>${row.entradas}</td>
            <td>${row.salidas}</td>
            <td>${row.totalEventos}</td>
            <td>${escapeHtml(row.primeraEntrada)}</td>
            <td>${escapeHtml(row.ultimaSalida)}</td>
            <td>${escapeHtml(row.ultimoMovimiento)}</td>
            <td>${escapeHtml(row.ultimasVisitas)}</td>
          </tr>`
      )
      .join("");
    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #24242a; }
            h1 { color: #5f00d6; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
            th { background: #372355; color: #ffffff; text-align: left; }
            th, td { border: 1px solid #d9d9e3; padding: 8px; vertical-align: top; }
            tr:nth-child(even) td { background: #f7f5fb; }
          </style>
        </head>
        <body>
          <h1>Reporte de eventos</h1>
          <p>Reporte agrupado por persona. Cada persona aparece una sola vez.</p>
          <h2>Filtros aplicados</h2>
          <table>
            <tbody>${filtrosHtml}</tbody>
          </table>
          <h2>Resumen por persona</h2>
          <table>
            <thead>
              <tr>
                <th>Persona</th>
                <th>Entradas</th>
                <th>Salidas</th>
                <th>Total eventos</th>
                <th>Primera entrada</th>
                <th>Última salida</th>
                <th>Último movimiento</th>
                <th>Movimientos recientes</th>
              </tr>
            </thead>
            <tbody>${rowsHtml || '<tr><td colspan="8">No se encontraron eventos con los filtros seleccionados.</td></tr>'}</tbody>
          </table>
        </body>
      </html>`;
    downloadBlob(
      new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" }),
      fileName
    );
  };

  const generarReporteEventos = async (format: "pdf" | "excel") => {
    const isValid = await formContext.trigger();
    if (!isValid) {
      notifyFormErrors(formContext.formState.errors);
      return;
    }
    setIsGeneratingReport(true);
    try {
      const eventos = await fetchEventosReporte();
      const rows = agruparEventosPorPersona(eventos);
      const filtros = getFiltrosReporteEventos();
      const totalEntradas = rows.reduce((total, row) => total + row.entradas, 0);
      const totalSalidas = rows.reduce((total, row) => total + row.salidas, 0);
      const today = dayjs().format("YYYY-MM-DD");

      if (format === "excel") {
        generarExcelEventos(rows, filtros, `reporte-eventos-${today}.xls`);
        enqueueSnackbar("Reporte Excel generado.", { variant: "success" });
        setOpenReporte(false);
        return;
      }

      const pdfBlob = generatePdfReport<EventoReportePersona>({
        title: "Reporte de eventos",
        subtitle: "Control de accesos",
        fileName: `reporte-eventos-${today}.pdf`,
        generatedBy: nombreUsuario || undefined,
        headerMeta: getPeriodoReporteEventos(),
        orientation: "landscape",
        tableTitle: "Resumen por persona",
        showFilters: false,
        footerText:
          "Reporte agrupado por persona. Cada registro resume entradas, salidas y movimientos recientes para facilitar la revision del periodo.",
        summaryCards: [
          { label: "Personas", value: rows.length, tone: "primary" },
          { label: "Entradas", value: totalEntradas, tone: "success" },
          { label: "Salidas", value: totalSalidas, tone: "warning" },
          { label: "Eventos", value: eventos.length, tone: "neutral" },
        ],
        columns: [
          { header: "Persona", key: "persona", width: 130 },
          { header: "Entradas", key: "entradas", width: 58, align: "center" },
          { header: "Salidas", key: "salidas", width: 58, align: "center" },
          { header: "Total", key: "totalEventos", width: 50, align: "center" },
          { header: "Primera entrada", key: "primeraEntrada", width: 88 },
          { header: "Ultima salida", key: "ultimaSalida", width: 88 },
          { header: "Ultimo movimiento", key: "ultimoMovimiento", width: 115 },
          { header: "Movimientos recientes", key: "ultimasVisitas", width: 210 },
        ],
        rows,
        emptyMessage: "No se encontraron eventos con los filtros seleccionados.",
      });
      openPdfBlob(pdfBlob);
      enqueueSnackbar("Reporte PDF generado.", { variant: "success" });
      setOpenReporte(false);
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const onQrValidate = async (qr: string): Promise<{ ok: boolean; message: string; img_ine?: string; nombre?: string; tipo_check?: number; biostar_modo_manual?: boolean }> => {
    const regexEmpleado = /^[0-9]+$/;
    const regexCardCode = /^VST[A-Z0-9]{16}$/;
    if (!regexCardCode.test(qr) && !regexEmpleado.test(qr)) {
      const message = "QR invalido o no corresponde a un empleado/visitante.";
      enqueueSnackbar(message, { variant: "error" });
      return { ok: false, message };
    }
    try {
      const res = await clienteAxios.post("/api/eventos/validar-qr", { qr, lector: 0 });
      if (!res.data.estado) {
        const message = res.data.mensaje || "No se pudo validar el QR.";
        enqueueSnackbar(message, { variant: "error" });
        return { ok: false, message };
      }
      const puedeAcceder = res.data.datos?.puedeAcceder;
      const nombre = res.data.datos?.nombre;
      const tipoCheck = res.data.datos?.tipo_check;
      if (puedeAcceder === false) {
        const message = nombre
          ? `Acceso pendiente para ${nombre}. Requiere validacion.`
          : "Acceso pendiente de autorizacion. Requiere validacion.";
        enqueueSnackbar(message, { variant: "warning" });
        return { ok: false, message };
      }
      const esEntrada = tipoCheck === 6 ? false : true;
      const esVisitanteQr = regexCardCode.test(qr);
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
        img_ine: esVisitanteQr ? ineRaw || "" : undefined,
        nombre,
        tipo_check: tipoCheck,
        biostar_modo_manual: !!res.data?.datos?.biostar_modo_manual,
      };
    } catch (error) {
      handlingError(error);
      return { ok: false, message: "Error al validar el QR. Intenta de nuevo." };
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

  return (
    <Fragment>
      <Box component="section" sx={{ mb: 4 }}>
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
            {isLoading ? (
              <Spinner />
            ) : (
              <FormContainer formContext={formContext} onSuccess={onSubmit} onError={notifyFormErrors}>
                <Typography variant="h4" component="h2" textAlign="center">
                  Eventos
                </Typography>
                <Grid container rowSpacing={0} columnSpacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="fecha_inicio"
                      render={({ field, fieldState }) => (
                        <DateTimePicker
                          {...field}
                          label="Fecha de Inicio"
                          name={field.name}
                          value={field.value || dayjs()}
                          onChange={(value) => field.onChange(value)}
                          slotProps={{
                            textField: {
                              required: true,
                              margin: "normal",
                              fullWidth: true,
                              size: "small",
                              error: !!fieldState.error?.message,
                              helperText: fieldState.error?.message,
                            },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="fecha_final"
                      render={({ field, fieldState }) => (
                        <DateTimePicker
                          {...field}
                          label="Fecha de Fin"
                          name={field.name}
                          value={field.value || dayjs()}
                          onChange={(value) => field.onChange(value)}
                          slotProps={{
                            textField: {
                              required: true,
                              margin: "normal",
                              fullWidth: true,
                              size: "small",
                              error: !!fieldState.error?.message,
                              helperText: fieldState.error?.message,
                            },
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Controller
                      name="usuarios"
                      control={formContext.control}
                      render={({ field }) => (
                        <InfiniteAutocomplete
                          urlApiSearch="/api/usuarios/activos?"
                          autocompleteProps={{
                            onChange: (_event, newValue) => {
                              field.onChange(newValue.map((item) => item.id));
                            },
                            multiple: true,
                            limitTags: 2,
                          }}
                          textFieldProps={{
                            label: "Usuarios",
                            margin: "normal",
                          }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <AutocompleteElement
                      name="dispositivos"
                      label="Dispositivos"
                      multiple
                      matchId
                      options={TIPOS_DISPOSITIVOS}
                      textFieldProps={{
                        margin: "normal",
                      }}
                      autocompleteProps={{
                        noOptionsText: "No hay opciones.",
                        limitTags: 2,
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <SelectElement
                      name="tipo_acceso"
                      label="Tipo de acceso"
                      fullWidth
                      margin="normal"
                      options={[
                        { id: "all", label: "Todos" },
                        ...TIPOS_EVENTOS,
                      ]}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <AutocompleteElement
                      name="panel"
                      label="Panel"
                      matchId
                      options={
                        habilitarRegistroCampo
                          ? [
                              { id: "all", label: "Paneles" },
                              { id: "todos", label: "Todos" },
                              { id: "campo", label: "Campo" },
                              ...paneles.map((item) => ({
                                id: item._id,
                                label: item.nombre,
                              })),
                            ]
                          : [
                              { id: "all", label: "Todos los paneles" },
                              ...paneles.map((item) => ({
                                id: item._id,
                                label: item.nombre,
                              })),
                            ]
                      }
                      textFieldProps={{
                        margin: "normal",
                      }}
                      autocompleteProps={{
                        noOptionsText: "No hay opciones.",
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <AutocompleteElement
                      name="empresas"
                      label="Empresas"
                      multiple
                      matchId
                      options={empresas.map((item) => {
                        return {
                          id: item._id,
                          label: item.nombre,
                        };
                      })}
                      textFieldProps={{
                        margin: "normal",
                      }}
                      autocompleteProps={{
                        noOptionsText: "No hay opciones.",
                        limitTags: 2,
                      }}
                    />
                  </Grid>
                </Grid>
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
                  {isLoadingData ? (
                    <Spinner />
                  ) : (
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
                        onClick={clearForm}
                        startIcon={<ClearAll />}
                      >
                        Limpiar
                      </Button>
                      <Button
                        type="submit"
                        size="medium"
                        variant="contained"
                        startIcon={<Search />}
                      >
                        Buscar
                      </Button>
                    </Stack>
                  )}
                </Box>
              </FormContainer>
            )}
          </CardContent>
        </Card>
      </Box>
      <div style={{ position: "relative" }}>
        <DataGrid
          apiRef={apiRef}
          initialState={initialState}
          getRowId={(row) => row._id}
          columns={[
            {
              headerName: "Fecha de evento",
              field: "fecha_creacion",
              type: "date",
              flex: 1,
              display: "flex",
              minWidth: 180,
              valueGetter: (value) => {
                return new Date(value);
              },
              valueFormatter: (value) => {
                return dayjs(value).format("DD/MM/YYYY, HH:mm:ss a");
              },
            },
            {
              headerName: "Creado por",
              field: "creado_por",
              flex: 1,
              display: "flex",
              minWidth: 180,
              valueFormatter: (value) => {
                return value || "Sistema";
              },
            },
            {
              headerName: "Tipo",
              field: "estatus",
              flex: 1,
              display: "flex",
              align: "center",
              minWidth: 150,
              renderCell: ({ value }) => (
                <Chip
                  label={tipos_eventos[value]?.nombre || "Sin tipo"}
                  size="small"
                  sx={(theme) => {
                    const colorBase =
                      tipos_eventos[value]?.color || theme.palette.secondary.main;
                    return {
                      width: "100%",
                      bgcolor: colorBase,
                      color: theme.palette.getContrastText(colorBase),
                    };
                  }}
                />
              ),
              valueFormatter: (value) => {
                return tipos_eventos[value]?.nombre || "Sin tipo";
              },
            },
            {
              headerName: "Usuario / Visitante",
              field: "usuario",
              flex: 1,
              display: "flex",
              minWidth: 180,
            },
            {
              headerName: "Dispositivo",
              field: "tipo_dispositivo",
              flex: 1,
              display: "flex",
              align: "center",
              minWidth: 120,
              renderCell: ({ row, value }) => {
                const panelLabel = row.panel;
                const dispositivoLabel = tipos_dispositivos[value]?.nombre || "";
                const label = panelLabel || dispositivoLabel;
                return (
                  <Chip
                    label={label}
                    size="small"
                    sx={(theme) => {
                      const colorBase =
                        tipos_dispositivos[value]?.color ||
                        theme.palette.secondary.main;
                      return {
                        width: "100%",
                        bgcolor: colorBase,
                        color: theme.palette.getContrastText(colorBase),
                      };
                    }}
                  />
                );
              },
              valueFormatter: (value) => {
                return tipos_dispositivos[value]?.nombre || "Campo";
              },
            },
            {
              headerName: "Ubicación",
              field: "ubicacion",
              type: "actions",
              align: "center",
              flex: 1,
              display: "flex",
              minWidth: 100,
              getActions: ({ row }) => {
                const gridActions = [];
                if (row.ubicacion) {
                  gridActions.push(
                    <GridActionsCellItem
                      icon={<LocationOn color="primary" />}
                      onClick={() =>
                        abrirMapa(row)
                      }
                      label="Ver"
                      title="Ver"
                    />
                  );
                }
                return gridActions;
              },
            },
            {
              headerName: "Acciones",
              field: "activo",
              type: "actions",
              align: "center",
              flex: 1,
              display: "flex",
              minWidth: 100,
              getActions: ({ row }) => {
                const gridActions = [];
                gridActions.push(
                  <GridActionsCellItem
                    icon={<Visibility color="primary" />}
                    onClick={() => verEvento(row)}
                    label="Ver"
                    title="Ver"
                  />
                );
                return gridActions;
              },
            },
          ]}
          disableRowSelectionOnClick
          disableColumnFilter
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
          slots={{
            toolbar: () => (
              <DataGridToolbar
                showSearchButton={false}
                tableTitle="Resúmen"
                onExport={() => setOpenReporte(true)}
                exportLoading={isGeneratingReport}
                exportTooltip="Generar reporte de eventos"
                customActionButtons={(
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setShowQRScanner(true)}
                    startIcon={<QrCodeScanner fontSize="small" />}
                    sx={{ textTransform: "none" }}
                  >
                    Escanear QR
                  </Button>
                )}
              />
            ),
          }}
        />
        {error && (
          <ErrorOverlay
            error={error}
            gridDataRef={apiRef.current?.dataSource}
          />
        )}
        <Outlet />
      {showQRScanner && (
        <FormProvider {...qrFormContext}>
          <LectorQrVisitantes
            name="qr"
            setShow={setShowQRScanner}
            onQrValidate={onQrValidate}
            onManualClose={onManualClose}
          />
        </FormProvider>
      )}
      </div>

      <Dialog
        open={openReporte}
        fullWidth
        maxWidth="sm"
        onClose={() => setOpenReporte(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle sx={{ pr: 6, pb: 1.5 }}>
          Generar reporte de eventos
          <IconButton
            size="small"
            onClick={() => setOpenReporte(false)}
            sx={{ position: "absolute", right: 12, top: 12, color: "error.main" }}
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ py: 2.5 }}>
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              El reporte se generara con los filtros actuales de la parte superior.
              Se agrupara por persona para evitar registros repetidos.
            </Typography>
            <Box
              sx={(theme) => ({
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                overflow: "hidden",
                bgcolor: "background.paper",
              })}
            >
              {getFiltrosReporteEventos().map((item, index) => (
                <Box
                  key={item.label}
                  sx={(theme) => ({
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "150px 1fr" },
                    gap: { xs: 0.25, sm: 1.5 },
                    px: 2,
                    py: 1.15,
                    borderTop:
                      index === 0 ? 0 : `1px solid ${theme.palette.divider}`,
                  })}
                >
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="text.secondary"
                  >
                    {item.label}
                  </Typography>
                  <Typography variant="body2">{String(item.value || "--")}</Typography>
                </Box>
              ))}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: "wrap" }}>
          <Button
            color="inherit"
            onClick={() => setOpenReporte(false)}
            disabled={isGeneratingReport}
          >
            Cerrar
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownload />}
            onClick={() => generarReporteEventos("excel")}
            disabled={isGeneratingReport}
          >
            Generar Excel
          </Button>
          <Button
            variant="contained"
            onClick={() => generarReporteEventos("pdf")}
            disabled={isGeneratingReport}
          >
            Generar PDF
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDetalleCampo}
        fullWidth
        maxWidth="md"
        onClose={() => setOpenDetalleCampo(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
            width: { xs: "95vw", sm: "82vw", md: "70vw" },
            maxWidth: 860,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, position: "relative" }}>
          <IconButton
            size="small"
            onClick={() => setOpenDetalleCampo(false)}
            sx={{ position: "absolute", right: 10, top: 10, color: "error.main" }}
          >
            <Close fontSize="small" />
          </IconButton>
          <Box
            sx={(theme) => ({
              mt: 1,
              border: `1px solid ${theme.palette.primary.main}`,
              borderRadius: 2,
              px: 1.5,
              py: 0.4,
              textAlign: "center",
              color: "primary.main",
              fontWeight: 700,
              fontSize: 16,
            })}
          >
            Evento de Campo
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5, pb: 1 }}>
          <Stack spacing={1.5} sx={{ mt: 0.75 }}>
            <Typography variant="body1" sx={{ fontSize: "1.05rem" }}>
              <strong>Fecha:</strong>{" "}
              {eventoSeleccionado?.fecha_creacion
                ? dayjs(eventoSeleccionado.fecha_creacion).format(
                    "DD/MM/YYYY, HH:mm:ss a"
                  )
                : "-"}
            </Typography>
            <Typography variant="body1" sx={{ fontSize: "1.05rem" }}>
              <strong>Usuario:</strong> {String(eventoSeleccionado?.usuario || "-")}
            </Typography>
            <Typography variant="body1" sx={{ fontSize: "1.05rem" }}>
              <strong>Tipo:</strong>{" "}
              {tipos_eventos[Number(eventoSeleccionado?.estatus)]?.nombre || "-"}
            </Typography>
            <Typography variant="body1" sx={{ fontSize: "1.05rem" }}>
              <strong>Dispositivo:</strong>{" "}
              {String(eventoSeleccionado?.panel || "Registro de Campo")}
            </Typography>
            <Typography variant="body1" sx={{ fontSize: "1.05rem" }}>
              <strong>Creado por:</strong>{" "}
              {String(eventoSeleccionado?.creado_por || "Sistema")}
            </Typography>
            <Typography variant="body1" sx={{ fontSize: "1.05rem" }}>
              <strong>Ubicación:</strong>{" "}
              {String(eventoSeleccionado?.ubicacion || "No disponible")}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => {
              if (!eventoSeleccionado) return;
              abrirMapa(eventoSeleccionado);
            }}
          >
            Ver ubicación
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openMapa}
        fullWidth
        maxWidth="lg"
        onClose={() => setOpenMapa(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, position: "relative" }}>
          <IconButton
            size="small"
            onClick={() => setOpenMapa(false)}
            sx={{ position: "absolute", right: 10, top: 10, color: "error.main" }}
          >
            <Close fontSize="small" />
          </IconButton>
          <Box
            sx={(theme) => ({
              mt: 1,
              border: `1px solid ${theme.palette.primary.main}`,
              borderRadius: 2,
              px: 1.5,
              py: 0.4,
              textAlign: "center",
              color: "primary.main",
              fontWeight: 700,
              fontSize: 16,
            })}
          >
            Ubicación del Evento
          </Box>
          <Typography variant="subtitle1" textAlign="center" sx={{ mt: 0.5 }}>
            Mapa
          </Typography>
        </DialogTitle>
        <DialogContent>
          {eventoMapa && urlMapaEmbed ? (
            <Stack spacing={1}>
              <Typography variant="body1" sx={{ fontSize: "1.05rem" }}>
                {String(eventoMapa?.usuario || "-")} -{" "}
                {eventoMapa?.fecha_creacion
                  ? dayjs(eventoMapa.fecha_creacion).format("DD/MM/YYYY, HH:mm:ss a")
                  : "-"}
              </Typography>
              <Box
                component="iframe"
                src={urlMapaEmbed}
                sx={{ width: "100%", height: 560, border: 0, borderRadius: 2 }}
              />
            </Stack>
          ) : (
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: "1.05rem" }}>
              El evento no tiene una ubicación válida para mostrar en mapa.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          {eventoMapa && obtenerCoords(eventoMapa?.ubicacion) && (
            <Button
              component="a"
              href={`https://www.google.com/maps?q=${
                obtenerCoords(eventoMapa?.ubicacion)?.lat
              },${obtenerCoords(eventoMapa?.ubicacion)?.lng}`}
              target="_blank"
              rel="noreferrer"
              variant="contained"
            >
              Abrir en Google Maps
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Fragment>
  );
}
