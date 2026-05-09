import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { DataGrid, GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Edit, Refresh } from "@mui/icons-material";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { clienteAxios, handlingError } from "../../../app/config/axios";

type AccessLevelRow = { id_externo: string; nombre: string; total_reglas: number };
type OptionItem = { id_externo: string; nombre: string };
type Regla = {
  id_externo?: string;
  door_id: string;
  door_nombre: string;
  schedule_id: string;
  schedule_nombre: string;
};

export default function BiostararAccessLevels() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AccessLevelRow[]>([]);
  const [puertas, setPuertas] = useState<OptionItem[]>([]);
  const [horarios, setHorarios] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [openNuevo, setOpenNuevo] = useState(false);
  const [openEditar, setOpenEditar] = useState(false);
  const [editandoId, setEditandoId] = useState("");

  const [nombreNuevo, setNombreNuevo] = useState("");
  const [nombreEditar, setNombreEditar] = useState("");
  const [reglasNuevo, setReglasNuevo] = useState<Regla[]>([{ door_id: "", door_nombre: "", schedule_id: "", schedule_nombre: "" }]);
  const [reglasEditar, setReglasEditar] = useState<Regla[]>([{ door_id: "", door_nombre: "", schedule_id: "", schedule_nombre: "" }]);

  const manejarErrorConexion = async (mensaje: string) => {
    const message = String(mensaje || "").toLowerCase();
    const isBiostarUnavailable =
      message.includes("no se pudo iniciar sesion en biostar") ||
      message.includes("primero configura la conexion global de biostar");
    if (isBiostarUnavailable) {
      const action = await Swal.fire({
        icon: "error",
        title: "No se pudo consultar",
        text: "No se pudo iniciar sesion en BioStar.",
        confirmButtonText: "Ir a configuracion",
      });
      if (action.isConfirmed) navigate("/biostarar/conexion");
      return;
    }
    await Swal.fire({ icon: "error", title: "No se pudo consultar", text: mensaje || "Operacion fallida." });
  };

  const cargarCatalogos = async () => {
    try {
      const res = await clienteAxios.get("/api/biostar-catalogos/access-levels/catalogos");
      if (!res.data.estado) {
        await manejarErrorConexion(res.data.mensaje || "No se pudieron cargar catalogos.");
        return;
      }
      setPuertas(res.data.datos?.puertas || []);
      setHorarios(res.data.datos?.horarios || []);
    } catch (error) {
      handlingError(error);
    }
  };

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await clienteAxios.get("/api/biostar-catalogos/access-levels");
      if (!res.data.estado) {
        await manejarErrorConexion(res.data.mensaje || "No se pudieron cargar niveles de acceso.");
        return;
      }
      setRows(res.data.datos || []);
    } catch (error) {
      handlingError(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void (async () => {
      await cargarCatalogos();
      await cargar();
    })();
  }, []);

  const crearHorarioRapido = async () => {
    const result = await Swal.fire({
      title: "Nuevo Horario",
      html: `
        <input id="h-nombre" class="swal2-input" placeholder="Nombre">
        <select id="h-dia" class="swal2-input">
          <option value="1">Lunes</option>
          <option value="2">Martes</option>
          <option value="3">Miercoles</option>
          <option value="4">Jueves</option>
          <option value="5">Viernes</option>
          <option value="6">Sabado</option>
          <option value="0">Domingo</option>
        </select>
        <input id="h-inicio" class="swal2-input" type="time" value="08:00">
        <input id="h-fin" class="swal2-input" type="time" value="18:00">
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const nombre = (document.getElementById("h-nombre") as HTMLInputElement)?.value?.trim();
        const dia = Number((document.getElementById("h-dia") as HTMLSelectElement)?.value || "1");
        const inicioS = (document.getElementById("h-inicio") as HTMLInputElement)?.value || "08:00";
        const finS = (document.getElementById("h-fin") as HTMLInputElement)?.value || "18:00";
        if (!nombre) {
          Swal.showValidationMessage("El nombre es obligatorio.");
          return null;
        }
        const toMin = (t: string) => {
          const [h, m] = t.split(":").map(Number);
          return (h * 60) + m;
        };
        return { nombre, dia, inicio: toMin(inicioS), fin: toMin(finS) };
      },
    });
    if (!result.isConfirmed || !result.value) return;

    const res = await clienteAxios.post("/api/biostar-catalogos/access-levels/horarios", result.value);
    if (!res.data.estado) {
      await Swal.fire({ icon: "error", title: "No se pudo crear", text: res.data.mensaje || "Operacion fallida." });
      return;
    }
    await Swal.fire({ icon: "success", title: "Horario creado", text: res.data.mensaje || "Operacion correcta." });
    await cargarCatalogos();
  };

  const abrirNuevo = () => {
    setNombreNuevo("");
    setReglasNuevo([{ door_id: "", door_nombre: "", schedule_id: "", schedule_nombre: "" }]);
    setOpenNuevo(true);
  };

  const agregarReglaNuevo = () => setReglasNuevo((p) => [...p, { door_id: "", door_nombre: "", schedule_id: "", schedule_nombre: "" }]);
  const agregarReglaEditar = () => setReglasEditar((p) => [...p, { door_id: "", door_nombre: "", schedule_id: "", schedule_nombre: "" }]);

  const guardarNuevo = async () => {
    const reglas = reglasNuevo.filter((r) => r.door_id && r.schedule_id);
    if (!nombreNuevo.trim() || !reglas.length) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "Nombre y al menos una regla son obligatorios." });
      return;
    }
    const payload = {
      nombre: nombreNuevo.trim(),
      reglas: reglas.map((r) => ({
        door_id: r.door_id,
        door_nombre: puertas.find((p) => p.id_externo === r.door_id)?.nombre || "",
        schedule_id: r.schedule_id,
        schedule_nombre: horarios.find((h) => h.id_externo === r.schedule_id)?.nombre || "",
      })),
    };
    const res = await clienteAxios.post("/api/biostar-catalogos/access-levels", payload);
    if (!res.data.estado) {
      await Swal.fire({ icon: "error", title: "No se pudo crear", text: res.data.mensaje || "Operacion fallida." });
      return;
    }
    setOpenNuevo(false);
    await Swal.fire({ icon: "success", title: "Nivel creado", text: res.data.mensaje || "Operacion correcta." });
    await cargar();
  };

  const abrirEditar = async (row: AccessLevelRow) => {
    const detail = await clienteAxios.get(`/api/biostar-catalogos/access-levels/${row.id_externo}`);
    if (!detail.data?.estado) {
      await Swal.fire({ icon: "error", title: "No se pudo consultar", text: detail.data?.mensaje || "Operacion fallida." });
      return;
    }
    const d = detail.data.datos;
    setEditandoId(d.id_externo);
    setNombreEditar(d.nombre || "");
    setReglasEditar((d.reglas && d.reglas.length ? d.reglas : [{ door_id: "", door_nombre: "", schedule_id: "", schedule_nombre: "" }]).map((r: Regla) => ({
      id_externo: r.id_externo,
      door_id: r.door_id || "",
      door_nombre: r.door_nombre || "",
      schedule_id: r.schedule_id || "",
      schedule_nombre: r.schedule_nombre || "",
    })));
    setOpenEditar(true);
  };

  const guardarEditar = async () => {
    const reglas = reglasEditar.filter((r) => r.door_id && r.schedule_id);
    if (!editandoId || !nombreEditar.trim() || !reglas.length) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "Nombre y al menos una regla son obligatorios." });
      return;
    }
    const payload = {
      nombre: nombreEditar.trim(),
      reglas: reglas.map((r) => ({
        id_externo: r.id_externo,
        door_id: r.door_id,
        door_nombre: puertas.find((p) => p.id_externo === r.door_id)?.nombre || "",
        schedule_id: r.schedule_id,
        schedule_nombre: horarios.find((h) => h.id_externo === r.schedule_id)?.nombre || "",
      })),
    };
    const res = await clienteAxios.put(`/api/biostar-catalogos/access-levels/${editandoId}`, payload);
    if (!res.data.estado) {
      await Swal.fire({ icon: "error", title: "No se pudo editar", text: res.data.mensaje || "Operacion fallida." });
      return;
    }
    setOpenEditar(false);
    await Swal.fire({ icon: "success", title: "Nivel editado", text: res.data.mensaje || "Operacion correcta." });
    await cargar();
  };

  const columns = useMemo<GridColDef<AccessLevelRow>[]>(() => [
    { field: "nombre", headerName: "Nombre", flex: 1, minWidth: 220 },
    { field: "total_reglas", headerName: "Reglas", minWidth: 120, align: "center", headerAlign: "center" },
    {
      field: "acciones",
      headerName: "Acciones",
      type: "actions",
      minWidth: 110,
      getActions: ({ row }) => [
        <GridActionsCellItem icon={<Edit color="primary" />} label="Editar" onClick={() => { void abrirEditar(row); }} />,
      ],
    },
  ], []);

  const renderReglas = (reglas: Regla[], setReglas: Dispatch<SetStateAction<Regla[]>>) => (
    <Stack spacing={1.5}>
      {reglas.map((r, idx) => (
        <Stack key={`r-${idx}`} direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <FormControl fullWidth>
            <InputLabel id={`door-${idx}`}>Puerta</InputLabel>
            <Select
              labelId={`door-${idx}`}
              label="Puerta"
              value={r.door_id}
              onChange={(e) => {
                const v = String(e.target.value);
                setReglas((prev) => prev.map((it, i) => (i === idx ? { ...it, door_id: v } : it)));
              }}
            >
              <MenuItem value="">Ninguno</MenuItem>
              {puertas.map((p) => (<MenuItem key={p.id_externo} value={p.id_externo}>{p.nombre}</MenuItem>))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id={`sch-${idx}`}>Horario</InputLabel>
            <Select
              labelId={`sch-${idx}`}
              label="Horario"
              value={r.schedule_id}
              onChange={(e) => {
                const v = String(e.target.value);
                setReglas((prev) => prev.map((it, i) => (i === idx ? { ...it, schedule_id: v } : it)));
              }}
            >
              <MenuItem value="">Ninguno</MenuItem>
              {horarios.map((h) => (<MenuItem key={h.id_externo} value={h.id_externo}>{h.nombre}</MenuItem>))}
            </Select>
          </FormControl>
        </Stack>
      ))}
    </Stack>
  );

  return (
    <div style={{ minHeight: 420 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id_externo}
        loading={loading}
        disableColumnFilter
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        localeText={{ ...esES.components.MuiDataGrid.defaultProps.localeText, toolbarColumns: "", toolbarFilters: "", toolbarDensity: "", toolbarExport: "", noRowsLabel: "Sin registros" }}
        showToolbar
        slots={{
          toolbar: () => (
            <DataGridToolbar
              tableTitle="Access Level BioStar"
              customActionButtons={
                <>
                  <Tooltip title="Recargar"><IconButton size="small" onClick={async () => { await cargarCatalogos(); await cargar(); }}><Refresh /></IconButton></Tooltip>
                  <Tooltip title="Nuevo horario"><IconButton size="small" onClick={() => { void crearHorarioRapido(); }}><Add /></IconButton></Tooltip>
                  <Tooltip title="Administrar horarios"><IconButton size="small" onClick={() => navigate("/biostarar/horarios")}><Refresh /></IconButton></Tooltip>
                  <Tooltip title="Agregar"><IconButton size="small" onClick={abrirNuevo}><Add /></IconButton></Tooltip>
                </>
              }
            />
          ),
        }}
      />

      <Dialog open={openNuevo} onClose={() => setOpenNuevo(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nuevo Access Level</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nombre" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} fullWidth />
            {renderReglas(reglasNuevo, setReglasNuevo)}
            <Button variant="outlined" onClick={agregarReglaNuevo}>Agregar regla</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNuevo(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => { void guardarNuevo(); }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditar} onClose={() => setOpenEditar(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Access Level</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nombre" value={nombreEditar} onChange={(e) => setNombreEditar(e.target.value)} fullWidth />
            {renderReglas(reglasEditar, setReglasEditar)}
            <Button variant="outlined" onClick={agregarReglaEditar}>Agregar regla</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditar(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => { void guardarEditar(); }}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
