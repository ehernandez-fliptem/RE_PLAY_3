import { useMemo, useState } from "react";
import {
  DataGrid,
  GridGetRowsError,
  type GridDataSource,
  type GridInitialState,
  type GridValidRowModel,
  useGridApiRef,
} from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { AxiosError } from "axios";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionIcon from "@mui/icons-material/Description";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import GridOnIcon from "@mui/icons-material/GridOn";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import { enqueueSnackbar } from "notistack";
import { Outlet, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { IRootState } from "../../../app/store";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { downloadExcelWorkbook } from "../../../utils/excelReport";
import { generatePdfReport, openPdfBlob, type PdfReportColumn } from "../../../utils/pdfReport";
import ErrorOverlay from "../../error/DataGridError";
import DataGridToolbar from "../../utils/DataGridToolbar";

const pageSizeOptions = [10, 25, 50];
const REPORT_TITLE = "Directorio de Empleados Activos";

type DirectorioRow = {
  _id: string;
  nombre?: string;
  puesto?: string;
  correo?: string;
  telefono?: string;
  movil?: string;
};

const reportColumns: PdfReportColumn<DirectorioRow>[] = [
  { header: "Nombre", key: "nombre", width: 170 },
  { header: "Puesto", key: "puesto", width: 130 },
  { header: "Correo", key: "correo", width: 210 },
  { header: "Telefono", key: "telefono", width: 95 },
  { header: "Movil", key: "movil", width: 95 },
];

function safeCell(value: unknown) {
  return String(value ?? "").trim() || "--";
}

function exportDirectoryExcel(rows: DirectorioRow[]) {
  const generatedAt = new Date().toLocaleString("es-MX");
  downloadExcelWorkbook("directorio-empleados-activos.xlsx", [
    {
      name: "Directorio",
      rows: [
        [REPORT_TITLE],
        [`Generado el ${generatedAt}`],
        [`Total de empleados activos: ${rows.length}`],
        [],
        ["Nombre", "Puesto", "Correo", "Telefono", "Movil"],
        ...rows.map((row) => [
          safeCell(row.nombre),
          safeCell(row.puesto),
          safeCell(row.correo),
          safeCell(row.telefono),
          safeCell(row.movil),
        ]),
      ],
      columnWidths: [34, 24, 36, 18, 18],
    },
  ]);
}

export default function Directorio() {
  const apiRef = useGridApiRef();
  const [error, setError] = useState<string>();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState<"pdf" | "excel" | null>(null);
  const navigate = useNavigate();
  const auth = useSelector((state: IRootState) => state.auth.data);

  const dataSource: GridDataSource = useMemo(
    () => ({
      getRows: async (params) => {
        let rows: GridValidRowModel[] = [];
        let rowCount = 0;
        try {
          const urlParams = new URLSearchParams({
            filter: JSON.stringify(params.filterModel.quickFilterValues),
            pagination: JSON.stringify(params.paginationModel),
            sort: JSON.stringify(params.sortModel),
          });
          const res = await clienteAxios.get("/api/usuarios/directorio?" + urlParams.toString());
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

  const fetchDirectoryRows = async () => {
    const urlParams = new URLSearchParams({
      filter: JSON.stringify([]),
      pagination: JSON.stringify({ page: 0, pageSize: 100000 }),
      sort: JSON.stringify([{ field: "nombre", sort: "asc" }]),
    });
    const res = await clienteAxios.get("/api/usuarios/directorio?" + urlParams.toString());
    if (!res.data.estado) throw new Error(res.data.mensaje || "No se pudo obtener el directorio.");
    return (res.data.datos.paginatedResults || []) as DirectorioRow[];
  };

  const handleExport = async (format: "pdf" | "excel") => {
    try {
      setExportLoading(format);
      const rows = await fetchDirectoryRows();
      if (format === "pdf") {
        const pdf = generatePdfReport<DirectorioRow>({
          title: REPORT_TITLE,
          subtitle: "Directorio",
          fileName: "directorio-empleados-activos.pdf",
          tableTitle: "Listado de empleados activos",
          columns: reportColumns,
          rows,
          orientation: "landscape",
          showFilters: false,
          generatedBy: auth.nombre,
          summaryCards: [
            { label: "Empleados activos", value: rows.length, tone: "primary" },
            { label: "Con correo", value: rows.filter((row) => String(row.correo || "").trim()).length, tone: "success" },
            { label: "Con telefono", value: rows.filter((row) => String(row.telefono || "").trim()).length, tone: "neutral" },
            { label: "Con movil", value: rows.filter((row) => String(row.movil || "").trim()).length, tone: "neutral" },
          ],
          emptyMessage: "No se encontraron empleados activos.",
          footerText: "Directorio de empleados activos generado por el sistema.",
        });
        openPdfBlob(pdf);
      } else {
        exportDirectoryExcel(rows);
      }
      setExportDialogOpen(false);
      enqueueSnackbar(`Reporte ${format === "pdf" ? "PDF" : "Excel"} generado correctamente.`, { variant: "success" });
    } catch (error) {
      const { restartSession } = handlingError(error);
      if (restartSession) navigate("/logout", { replace: true });
      enqueueSnackbar("No se pudo generar el reporte del directorio.", { variant: "error" });
    } finally {
      setExportLoading(null);
    }
  };

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

  return (
    <div style={{ minHeight: 400, position: "relative" }}>
      <DataGrid
        apiRef={apiRef}
        initialState={initialState}
        getRowId={(row) => row._id}
        columns={[
          {
            headerName: "Nombre",
            field: "nombre",
            flex: 1,
            display: "flex",
            minWidth: 180,
          },
          {
            headerName: "Puesto",
            field: "puesto",
            flex: 1,
            display: "flex",
            minWidth: 150,
          },
          {
            headerName: "Correo",
            field: "correo",
            flex: 1,
            display: "flex",
            minWidth: 250,
          },
          {
            headerName: "Telefono",
            field: "telefono",
            flex: 1,
            display: "flex",
            minWidth: 150,
          },
          {
            headerName: "Movil",
            field: "movil",
            flex: 1,
            display: "flex",
            minWidth: 150,
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
              tableTitle={REPORT_TITLE}
              showExportButton={false}
              customActionButtons={
                <Tooltip title="Exportar directorio">
                  <IconButton size="small" onClick={() => setExportDialogOpen(true)}>
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              }
            />
          ),
        }}
      />
      {error && <ErrorOverlay error={error} gridDataRef={apiRef.current?.dataSource} />}
      <Outlet context={apiRef.current?.dataSource} />
      <Dialog open={exportDialogOpen} onClose={() => !exportLoading && setExportDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <DescriptionIcon color="primary" />
            <Typography variant="h6" fontWeight={800}>
              Exportar directorio
            </Typography>
          </Stack>
          <IconButton size="small" onClick={() => setExportDialogOpen(false)} disabled={Boolean(exportLoading)} aria-label="Cerrar">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1}>
            <Typography fontWeight={700}>{REPORT_TITLE}</Typography>
            <Typography variant="body2" color="text.secondary">
              Se generara un reporte con todos los empleados activos del directorio. Este reporte no usa filtros.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setExportDialogOpen(false)} disabled={Boolean(exportLoading)} color="secondary">
            Cancelar
          </Button>
          <Button variant="outlined" startIcon={<GridOnIcon />} disabled={Boolean(exportLoading)} onClick={() => handleExport("excel")}>
            {exportLoading === "excel" ? "Generando..." : "Excel"}
          </Button>
          <Button variant="contained" startIcon={<PictureAsPdfIcon />} disabled={Boolean(exportLoading)} onClick={() => handleExport("pdf")}>
            {exportLoading === "pdf" ? "Generando..." : "PDF"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
