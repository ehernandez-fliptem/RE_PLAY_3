import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Delete, Edit, Refresh } from "@mui/icons-material";
import { InfoOutlined } from "@mui/icons-material";
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Stack, Switch, TextField, Tooltip } from "@mui/material";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { clienteAxios, handlingError } from "../../../app/config/axios";

type Row = { id_externo: string; nombre: string; descripcion: string; use_daily_iteration: boolean };

type Form = {
  nombre: string;
  descripcion: string;
  dias: { activo: boolean; inicio: string; fin: string }[];
  use_daily_iteration: boolean;
};

const DIAS_LABEL = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
const makeDias = () => Array.from({ length: 7 }, (_, i) => ({ activo: i === 1, inicio: "08:00", fin: "18:00" }));
const defaultForm: Form = { nombre: "", descripcion: "", dias: makeDias(), use_daily_iteration: false };

const toMinutes = (t: string) => {
  const [h, m] = String(t || "00:00").split(":").map(Number);
  return (h * 60) + m;
};
const toTime = (mins: number) => {
  const m = Math.max(0, Number(mins) || 0);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

export default function BiostararHorarios() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [openNuevo, setOpenNuevo] = useState(false);
  const [openEditar, setOpenEditar] = useState(false);
  const [formNuevo, setFormNuevo] = useState<Form>(defaultForm);
  const [formEditar, setFormEditar] = useState<Form>(defaultForm);
  const [plantillaNuevo, setPlantillaNuevo] = useState("personalizado");
  const [plantillaEditar, setPlantillaEditar] = useState("personalizado");
  const [editandoId, setEditandoId] = useState("");
  const [editDailySchedules, setEditDailySchedules] = useState<any[]>([]);

  const manejarErrorConexion = async (mensaje: string) => {
    const message = String(mensaje || "").toLowerCase();
    const isBiostarUnavailable = message.includes("no se pudo iniciar sesion en biostar") || message.includes("primero configura la conexion global de biostar");
    if (isBiostarUnavailable) {
      const action = await Swal.fire({ icon: "error", title: "No se pudo consultar", text: "No se pudo iniciar sesion en BioStar.", confirmButtonText: "Ir a configuracion" });
      if (action.isConfirmed) navigate("/biostarar/conexion");
      return;
    }
    await Swal.fire({ icon: "error", title: "No se pudo consultar", text: mensaje || "Operacion fallida." });
  };

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await clienteAxios.get("/api/biostar-catalogos/horarios");
      if (!res.data.estado) {
        await manejarErrorConexion(res.data.mensaje || "No se pudieron cargar horarios.");
        return;
      }
      const filtrados = (res.data.datos || []).filter(
        (r: Row) => String(r?.nombre || "").trim().toLowerCase() !== "always"
      );
      setRows(filtrados);
    } catch (error) {
      handlingError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void cargar(); }, []);

  const crear = async () => {
    if (!formNuevo.nombre.trim()) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "El nombre es obligatorio." });
      return;
    }
    const daily = formNuevo.dias.map((d, i) => ({
      day_index: i,
      time_segments: d.activo ? [{ start_time: toMinutes(d.inicio), end_time: toMinutes(d.fin) }] : [],
    }));
    const tieneSegmentos = daily.some((d) => d.time_segments.length > 0);
    if (!tieneSegmentos) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "Activa al menos un día con horario." });
      return;
    }
    const payload = {
      Schedule: {
        name: formNuevo.nombre.trim(),
        description: formNuevo.descripcion,
        daily_schedules: daily,
        holiday_schedules: [],
        days_of_iteration: 7,
        start_date: new Date().toISOString().slice(0, 10) + "T00:00:00.00Z",
        use_daily_iteration: formNuevo.use_daily_iteration,
      },
    };
    const res = await clienteAxios.post("/api/biostar-catalogos/horarios", payload);
    if (!res.data?.estado) {
      await Swal.fire({ icon: "error", title: "No se pudo crear", text: res.data?.mensaje || "Operacion fallida." });
      return;
    }
    setOpenNuevo(false);
    await cargar();
  };

  const abrirEditar = async (row: Row) => {
    const res = await clienteAxios.get(`/api/biostar-catalogos/horarios/${row.id_externo}`);
    if (!res.data.estado) {
      await Swal.fire({ icon: "error", title: "No se pudo consultar", text: res.data.mensaje || "Operacion fallida." });
      return;
    }
    const s = res.data.datos || {};
    const ds = Array.isArray(s.daily_schedules) ? s.daily_schedules : [];
    const dias = makeDias().map((diaDefault, idx) => {
      const d = ds.find((x: any) => Number(x?.day_index) === idx);
      const seg = Array.isArray(d?.time_segments) ? d.time_segments[0] : null;
      if (!seg) return { ...diaDefault, activo: false };
      return {
        activo: true,
        inicio: toTime(Number(seg.start_time || 0)),
        fin: toTime(Number(seg.end_time || 0)),
      };
    });
    setEditandoId(String(s.id || row.id_externo));
    setEditDailySchedules(ds);
    setFormEditar({
      nombre: String(s.name || row.nombre || ""),
      descripcion: String(s.description || row.descripcion || ""),
      dias,
      use_daily_iteration: String(s.use_daily_iteration ?? row.use_daily_iteration) === "true" || s.use_daily_iteration === true,
    });
    setPlantillaEditar("personalizado");
    setOpenEditar(true);
  };

  const guardarEditar = async () => {
    if (!editandoId || !formEditar.nombre.trim()) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "El nombre es obligatorio." });
      return;
    }
    const base = editDailySchedules.length ? editDailySchedules : Array.from({ length: 7 }, (_, i) => ({ day_index: i, time_segments: [] as any[] }));
    const ds = base.map((d: any, idx: number) => {
      const dia = formEditar.dias[idx];
      return {
        ...d,
        day_index: idx,
        time_segments: dia?.activo ? [{ start_time: toMinutes(dia.inicio), end_time: toMinutes(dia.fin) }] : [],
      };
    });
    const tieneSegmentos = ds.some((d: any) => Array.isArray(d.time_segments) && d.time_segments.length > 0);
    if (!tieneSegmentos) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "Activa al menos un día con horario." });
      return;
    }
    const payload = {
      Schedule: {
        id: editandoId,
        name: formEditar.nombre.trim(),
        description: formEditar.descripcion,
        daily_schedules: ds,
        days_of_iteration: 7,
        start_date: new Date().toISOString().slice(0, 19) + ".00Z",
        use_daily_iteration: formEditar.use_daily_iteration,
      },
    };
    const res = await clienteAxios.put(`/api/biostar-catalogos/horarios/${editandoId}`, payload);
    if (!res.data.estado) {
      await Swal.fire({ icon: "error", title: "No se pudo editar", text: res.data.mensaje || "Operacion fallida." });
      return;
    }
    setOpenEditar(false);
    await cargar();
  };

  const eliminar = async (row: Row) => {
    const c = await Swal.fire({ icon: "warning", title: "Eliminar horario", text: `Seguro que quieres eliminar '${row.nombre}'?`, showCancelButton: true, confirmButtonText: "Si, eliminar", cancelButtonText: "Cancelar" });
    if (!c.isConfirmed) return;
    const res = await clienteAxios.delete(`/api/biostar-catalogos/horarios/${row.id_externo}`);
    if (!res.data.estado) {
      await Swal.fire({ icon: "error", title: "No se pudo eliminar", text: res.data.mensaje || "Operacion fallida." });
      return;
    }
    await cargar();
  };

  const columns = useMemo<GridColDef<Row>[]>(() => [
    { field: "nombre", headerName: "Horario", flex: 1, minWidth: 220 },
    { field: "descripcion", headerName: "Descripcion", flex: 1, minWidth: 220 },
    { field: "use_daily_iteration", headerName: "Iteracion diaria", minWidth: 140, valueFormatter: (v) => (v ? "Si" : "No") },
    { field: "acciones", headerName: "Acciones", type: "actions", minWidth: 120, getActions: ({ row }) => [
      <GridActionsCellItem icon={<Edit color="primary" />} label="Editar" onClick={() => { void abrirEditar(row); }} />,
      <GridActionsCellItem icon={<Delete color="error" />} label="Eliminar" onClick={() => { void eliminar(row); }} />,
    ] },
  ], []);

  const aplicarMismoHorario = (setForm: (v: Form | ((p: Form) => Form)) => void, inicio: string, fin: string) => {
    setForm((p) => ({
      ...p,
      dias: p.dias.map((d) => (d.activo ? { ...d, inicio, fin } : d)),
    }));
  };

  const aplicarPreset = (setForm: (v: Form | ((p: Form) => Form)) => void, preset: string, inicio: string, fin: string) => {
    setForm((p) => {
      const dias = p.dias.map((d, idx) => {
        if (preset === "completo") return { ...d, activo: true, inicio, fin };
        if (preset === "entresemana") {
          const activo = idx >= 1 && idx <= 5;
          return { ...d, activo, inicio: activo ? inicio : d.inicio, fin: activo ? fin : d.fin };
        }
        if (preset === "findesemana") {
          const activo = idx === 0 || idx === 6;
          return { ...d, activo, inicio: activo ? inicio : d.inicio, fin: activo ? fin : d.fin };
        }
        return d;
      });
      return { ...p, dias };
    });
  };

  const formUI = (
    form: Form,
    setForm: (v: Form | ((p: Form) => Form)) => void,
    plantilla: string,
    setPlantilla: (v: string) => void,
    prefix: string
  ) => (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField label="Nombre" value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} fullWidth />
      <TextField label="Descripcion" value={form.descripcion} onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))} fullWidth />
      <Stack spacing={1}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "stretch", md: "center" }}>
          <TextField
            select
            size="small"
            label="Plantilla"
            value={plantilla}
            onChange={(e) => {
              const v = String(e.target.value);
              setPlantilla(v);
              if (v === "personalizado") return;
              aplicarPreset(setForm, v, "08:00", "18:00");
            }}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="personalizado">Personalizado</MenuItem>
            <MenuItem value="entresemana">Entre semana</MenuItem>
            <MenuItem value="findesemana">Fin de semana</MenuItem>
          </TextField>
          <TextField
            size="small"
            type="time"
            label="Aplicar inicio"
            defaultValue="08:00"
            sx={{ minWidth: 150 }}
            InputLabelProps={{ shrink: true }}
            id={`${prefix}-aplicar-inicio`}
          />
          <TextField
            size="small"
            type="time"
            label="Aplicar fin"
            defaultValue="18:00"
            sx={{ minWidth: 150 }}
            InputLabelProps={{ shrink: true }}
            id={`${prefix}-aplicar-fin`}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={() => {
              const inicio = (document.getElementById(`${prefix}-aplicar-inicio`) as HTMLInputElement)?.value || "08:00";
              const fin = (document.getElementById(`${prefix}-aplicar-fin`) as HTMLInputElement)?.value || "18:00";
              aplicarMismoHorario(setForm, inicio, fin);
            }}
          >
            Aplicar a dias activos
          </Button>
        </Stack>
        {form.dias.map((d, idx) => (
          <Stack key={`dia-${idx}`} direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ xs: "flex-start", md: "center" }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={d.activo}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      dias: p.dias.map((x, i) => (i === idx ? { ...x, activo: e.target.checked } : x)),
                    }))
                  }
                  onClick={() => {
                    if (plantilla !== "personalizado") setPlantilla("personalizado");
                  }}
                />
              }
              label={DIAS_LABEL[idx]}
              sx={{ width: 140, m: 0 }}
            />
            <TextField
              type="time"
              label="Inicio"
              value={d.inicio}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  dias: p.dias.map((x, i) => (i === idx ? { ...x, inicio: e.target.value } : x)),
                }))
              }
              onBlur={() => {
                if (plantilla !== "personalizado") setPlantilla("personalizado");
              }}
              disabled={!d.activo}
              size="small"
              sx={{ width: 160 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              type="time"
              label="Fin"
              value={d.fin}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  dias: p.dias.map((x, i) => (i === idx ? { ...x, fin: e.target.value } : x)),
                }))
              }
              onBlur={() => {
                if (plantilla !== "personalizado") setPlantilla("personalizado");
              }}
              disabled={!d.activo}
              size="small"
              sx={{ width: 160 }}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        ))}
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Switch checked={form.use_daily_iteration} onChange={(e) => setForm((p) => ({ ...p, use_daily_iteration: e.target.checked }))} />
        <span>Repetir cada semana</span>
        <Tooltip title="Si está activado, este horario se repite automáticamente cada semana.">
          <InfoOutlined fontSize="small" color="action" />
        </Tooltip>
      </Stack>
    </Stack>
  );

  return (
    <div style={{ minHeight: 420 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id_externo}
        loading={loading}
        disableColumnFilter
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        localeText={{ ...esES.components.MuiDataGrid.defaultProps.localeText, toolbarColumns: "", toolbarFilters: "", toolbarDensity: "", toolbarExport: "", noRowsLabel: "Sin registros" }}
        showToolbar
        slots={{ toolbar: () => (
          <DataGridToolbar
            tableTitle="Horarios BioStar"
            customActionButtons={<>
              <Tooltip title="Recargar"><IconButton size="small" onClick={() => { void cargar(); }}><Refresh /></IconButton></Tooltip>
              <Tooltip title="Agregar"><IconButton size="small" onClick={() => { setFormNuevo(defaultForm); setOpenNuevo(true); }}><Add /></IconButton></Tooltip>
            </>}
          />
        ) }}
      />

      <Dialog open={openNuevo} onClose={() => setOpenNuevo(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nuevo Horario BioStar</DialogTitle>
        <DialogContent>{formUI(formNuevo, setFormNuevo, plantillaNuevo, setPlantillaNuevo, "nuevo")}</DialogContent>
        <DialogActions><Button onClick={() => setOpenNuevo(false)}>Cancelar</Button><Button variant="contained" onClick={() => { void crear(); }}>Guardar</Button></DialogActions>
      </Dialog>

      <Dialog open={openEditar} onClose={() => setOpenEditar(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Horario BioStar</DialogTitle>
        <DialogContent>{formUI(formEditar, setFormEditar, plantillaEditar, setPlantillaEditar, "editar")}</DialogContent>
        <DialogActions><Button onClick={() => setOpenEditar(false)}>Cancelar</Button><Button variant="contained" onClick={() => { void guardarEditar(); }}>Guardar</Button></DialogActions>
      </Dialog>
    </div>
  );
}
