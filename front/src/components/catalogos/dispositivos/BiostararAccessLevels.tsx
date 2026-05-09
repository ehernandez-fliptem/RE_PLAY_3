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
type HorarioContexto = { modo: "nuevo" | "editar"; idx: number } | null;

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
  const [openHorarioModal, setOpenHorarioModal] = useState(false);
  const [creandoHorario, setCreandoHorario] = useState(false);
  const [horarioContexto, setHorarioContexto] = useState<HorarioContexto>(null);
  const [modalPadre, setModalPadre] = useState<"nuevo" | "editar" | null>(null);
  const [horarioNombre, setHorarioNombre] = useState("");
  const [horarioDia, setHorarioDia] = useState("1");
  const [horarioInicio, setHorarioInicio] = useState("08:00");
  const [horarioFin, setHorarioFin] = useState("18:00");

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
      const horariosConTraduccion = (res.data.datos?.horarios || []).map((h: OptionItem) => ({
        ...h,
        nombre: String(h?.nombre || "").trim().toLowerCase() === "always" ? "Siempre" : h.nombre,
      }));
      setHorarios(horariosConTraduccion);
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

  const abrirCrearHorario = (contexto: HorarioContexto = null) => {
    if (contexto?.modo === "nuevo") {
      setOpenNuevo(false);
      setModalPadre("nuevo");
    }
    if (contexto?.modo === "editar") {
      setOpenEditar(false);
      setModalPadre("editar");
    }
    setHorarioContexto(contexto);
    setHorarioNombre("");
    setHorarioDia("1");
    setHorarioInicio("08:00");
    setHorarioFin("18:00");
    setOpenHorarioModal(true);
  };

  const cerrarCrearHorario = () => {
    setOpenHorarioModal(false);
    if (modalPadre === "nuevo") setOpenNuevo(true);
    if (modalPadre === "editar") setOpenEditar(true);
    setModalPadre(null);
    setHorarioContexto(null);
  };

  const crearHorarioRapido = async (): Promise<string | null> => {
    const nombre = horarioNombre.trim();
    if (!nombre) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "El nombre es obligatorio." });
      return null;
    }
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return (h * 60) + m;
    };
    const payload = {
      nombre,
      dia: Number(horarioDia || "1"),
      inicio: toMin(horarioInicio || "08:00"),
      fin: toMin(horarioFin || "18:00"),
    };

    setCreandoHorario(true);
    const res = await clienteAxios.post("/api/biostar-catalogos/access-levels/horarios", payload);
    setCreandoHorario(false);
    if (!res.data.estado) {
      await Swal.fire({ icon: "error", title: "No se pudo crear", text: res.data.mensaje || "Operacion fallida." });
      return null;
    }
    setOpenHorarioModal(false);
    await cargarCatalogos();
    const nuevoId = String(res.data?.datos?.id_externo || res.data?.datos?.id || "");
    if (horarioContexto && nuevoId) {
      if (horarioContexto.modo === "nuevo") {
        setReglasNuevo((prev) => prev.map((it, i) => (i === horarioContexto.idx ? { ...it, schedule_id: nuevoId } : it)));
      } else {
        setReglasEditar((prev) => prev.map((it, i) => (i === horarioContexto.idx ? { ...it, schedule_id: nuevoId } : it)));
      }
    }
    if (modalPadre === "nuevo") setOpenNuevo(true);
    if (modalPadre === "editar") setOpenEditar(true);
    setModalPadre(null);
    setHorarioContexto(null);
    await Swal.fire({ icon: "success", title: "Horario creado", text: res.data.mensaje || "Operacion correcta." });
    return nuevoId;
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
        schedule_nombre: horarios.find((h) => h.id_externo === r.schedule_id)?.nombre || r.schedule_nombre || "",
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

  const renderReglas = (reglas: Regla[], setReglas: Dispatch<SetStateAction<Regla[]>>, modo: "nuevo" | "editar") => (
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
          <Stack direction="row" spacing={1} sx={{ width: "100%" }} alignItems="center">
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
                {r.schedule_id && !horarios.some((h) => h.id_externo === r.schedule_id) ? (
                  <MenuItem value={r.schedule_id} sx={{ display: "none" }}>
                    {r.schedule_nombre || "Always"}
                  </MenuItem>
                ) : null}
                {horarios.map((h) => (<MenuItem key={h.id_externo} value={h.id_externo}>{h.nombre}</MenuItem>))}
              </Select>
            </FormControl>
            <Tooltip title="Crear horario">
              <Button
                variant="outlined"
                onClick={async () => {
                  abrirCrearHorario({ modo, idx });
                }}
                sx={{ minWidth: 44, width: 44, height: 44, p: 0, borderRadius: 1.5, fontSize: 24, lineHeight: 1 }}
              >
                <Add fontSize="small" />
              </Button>
            </Tooltip>
          </Stack>
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
              tableTitle="Niveles de Acceso BioStar"
              customActionButtons={
                <>
                  <Tooltip title="Recargar"><IconButton size="small" onClick={async () => { await cargarCatalogos(); await cargar(); }}><Refresh /></IconButton></Tooltip>
                  <Tooltip title="Administrar horarios"><IconButton size="small" onClick={() => navigate("/biostarar/horarios")}><Refresh /></IconButton></Tooltip>
                  <Tooltip title="Agregar"><IconButton size="small" onClick={abrirNuevo}><Add /></IconButton></Tooltip>
                </>
              }
            />
          ),
        }}
      />

      <Dialog open={openNuevo} onClose={() => setOpenNuevo(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nuevo Nivel de Acceso</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nombre" value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)} fullWidth />
            {renderReglas(reglasNuevo, setReglasNuevo, "nuevo")}
            <Button variant="outlined" onClick={agregarReglaNuevo}>Agregar regla</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNuevo(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => { void guardarNuevo(); }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditar} onClose={() => setOpenEditar(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Nivel de Acceso</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nombre" value={nombreEditar} onChange={(e) => setNombreEditar(e.target.value)} fullWidth />
            {renderReglas(reglasEditar, setReglasEditar, "editar")}
            <Button variant="outlined" onClick={agregarReglaEditar}>Agregar regla</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditar(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => { void guardarEditar(); }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openHorarioModal} onClose={() => !creandoHorario && cerrarCrearHorario()} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo Horario</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nombre" value={horarioNombre} onChange={(e) => setHorarioNombre(e.target.value)} fullWidth />
            <TextField select label="Dia" value={horarioDia} onChange={(e) => setHorarioDia(String(e.target.value))} fullWidth>
              <MenuItem value="1">Lunes</MenuItem>
              <MenuItem value="2">Martes</MenuItem>
              <MenuItem value="3">Miercoles</MenuItem>
              <MenuItem value="4">Jueves</MenuItem>
              <MenuItem value="5">Viernes</MenuItem>
              <MenuItem value="6">Sabado</MenuItem>
              <MenuItem value="0">Domingo</MenuItem>
            </TextField>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField label="Inicio" type="time" value={horarioInicio} onChange={(e) => setHorarioInicio(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
              <TextField label="Fin" type="time" value={horarioFin} onChange={(e) => setHorarioFin(e.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrarCrearHorario} disabled={creandoHorario}>Cancelar</Button>
          <Button variant="contained" onClick={() => { void crearHorarioRapido(); }} disabled={creandoHorario}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
