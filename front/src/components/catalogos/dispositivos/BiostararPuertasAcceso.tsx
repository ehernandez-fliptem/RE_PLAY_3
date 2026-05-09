import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Delete, Edit, Refresh } from "@mui/icons-material";
import {
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
  Button,
} from "@mui/material";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { clienteAxios, handlingError } from "../../../app/config/axios";

type CatalogoItem = {
  id_externo: string;
  nombre: string;
};

type PuertaAcceso = {
  id_externo: string;
  nombre: string;
  grupo_puerta_id: string;
  grupo_puerta_nombre: string;
  dispositivo_id: string;
  dispositivo_nombre: string;
  rele_puerta: string;
  boton_salida: string;
  sensor_puerta: string;
};

type OpcionPuerto = {
  valor: string;
  etiqueta: string;
};

const defaultForm = {
  nombre: "",
  grupo_puerta_id: "1",
  dispositivo_id: "",
  rele_puerta: "",
  boton_salida: "",
  sensor_puerta: "",
};

function normalizarNombreGrupoEnInput(value: string): string {
  const texto = String(value || "");
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function BiostararPuertasAcceso() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PuertaAcceso[]>([]);
  const [gruposPuerta, setGruposPuerta] = useState<CatalogoItem[]>([]);
  const [dispositivos, setDispositivos] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [openNuevo, setOpenNuevo] = useState(false);
  const [openEditar, setOpenEditar] = useState(false);
  const [editandoId, setEditandoId] = useState("");
  const [nuevoForm, setNuevoForm] = useState(defaultForm);
  const [editarForm, setEditarForm] = useState(defaultForm);
  const [opcionesPuertosNuevo, setOpcionesPuertosNuevo] = useState<OpcionPuerto[]>([]);
  const [opcionesPuertosEditar, setOpcionesPuertosEditar] = useState<OpcionPuerto[]>([]);

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
      const res = await clienteAxios.get("/api/biostar-catalogos/puertas-acceso/catalogos");
      if (!res.data.estado) {
        await manejarErrorConexion(res.data.mensaje || "No se pudieron cargar catalogos.");
        return;
      }
      const grupos = res.data.datos?.grupos || [];
      const devices = res.data.datos?.dispositivos || [];
      setGruposPuerta(grupos);
      setDispositivos(devices);
    } catch (error) {
      handlingError(error);
    }
  };

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await clienteAxios.get("/api/biostar-catalogos/puertas-acceso");
      if (!res.data.estado) {
        await manejarErrorConexion(res.data.mensaje || "No se pudieron cargar las puertas.");
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
    cargarCatalogos();
    cargar();
  }, []);

  useEffect(() => {
    return () => {
      Swal.close();
    };
  }, []);

  const abrirNuevo = () => {
    const defaultGrupo = gruposPuerta.find((g) => g.id_externo === "1")?.id_externo || gruposPuerta[0]?.id_externo || "1";
    const dispositivoDefault = dispositivos[0]?.id_externo || "";
    setNuevoForm({ ...defaultForm, grupo_puerta_id: defaultGrupo, dispositivo_id: dispositivoDefault });
    if (dispositivoDefault) {
      void cargarOpcionesDispositivo(dispositivoDefault, "nuevo");
    } else {
      setOpcionesPuertosNuevo([]);
    }
    setOpenNuevo(true);
  };

  const cargarOpcionesDispositivo = async (deviceId: string, modo: "nuevo" | "editar") => {
    if (!deviceId) {
      if (modo === "nuevo") setOpcionesPuertosNuevo([]);
      else setOpcionesPuertosEditar([]);
      return;
    }
    try {
      const res = await clienteAxios.get(`/api/biostar-catalogos/puertas-acceso/opciones-dispositivo?device_id=${encodeURIComponent(deviceId)}`);
      if (!res.data.estado) {
        if (modo === "nuevo") setOpcionesPuertosNuevo([]);
        else setOpcionesPuertosEditar([]);
        return;
      }
      const opciones = (res.data.datos?.rele_puerta || []) as OpcionPuerto[];
      if (modo === "nuevo") {
        setOpcionesPuertosNuevo(opciones);
        const fallback = opciones[0]?.valor || "";
        setNuevoForm((prev) => ({
          ...prev,
          rele_puerta: prev.rele_puerta || fallback,
          boton_salida: prev.boton_salida || fallback,
          sensor_puerta: prev.sensor_puerta || fallback,
        }));
      } else {
        setOpcionesPuertosEditar(opciones);
        const fallback = opciones[0]?.valor || "";
        setEditarForm((prev) => ({
          ...prev,
          rele_puerta: prev.rele_puerta || fallback,
          boton_salida: prev.boton_salida || fallback,
          sensor_puerta: prev.sensor_puerta || fallback,
        }));
      }
    } catch (error) {
      if (modo === "nuevo") setOpcionesPuertosNuevo([]);
      else setOpcionesPuertosEditar([]);
    }
  };

  const crearGrupoRapido = async (onCreated: (grupoId: string) => void) => {
    const result = await Swal.fire({
      title: "Nuevo Grupo de Puertas",
      input: "text",
      inputLabel: "Nombre del grupo",
      inputValue: "",
      inputPlaceholder: "Ejemplo: Accesos Norte",
      inputAttributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        spellcheck: "false",
        name: `biostar-door-group-${Date.now()}`,
      },
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => (!String(value || "").trim() ? "El nombre es obligatorio." : undefined),
      didOpen: () => {
        const input = Swal.getInput();
        if (input) {
          input.value = "";
          input.addEventListener("input", () => {
            const normalizado = normalizarNombreGrupoEnInput(input.value);
            if (input.value !== normalizado) input.value = normalizado;
          });
        }
      },
    });
    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: "Creando grupo...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });
      const nombre = String(result.value || "").trim();
      const res = await clienteAxios.post("/api/biostar-catalogos/puertas", { nombre });
      Swal.close();
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo crear", text: res.data.mensaje || "No se pudo crear el grupo." });
        return;
      }
      await Swal.fire({ icon: "success", title: "Grupo creado", text: res.data.mensaje || "Operacion correcta." });
      const gruposRes = await clienteAxios.get("/api/biostar-catalogos/puertas-acceso/catalogos");
      const lista = gruposRes.data?.estado ? (gruposRes.data?.datos?.grupos || []) : [];
      setGruposPuerta(lista);
      const creado = (lista as CatalogoItem[]).find((g) => g.nombre.toLowerCase() === nombre.toLowerCase());
      onCreated(creado?.id_externo || "");
    } catch (error) {
      Swal.close();
      handlingError(error);
    }
  };

  const abrirAltaRapidaGrupoDesdeNuevo = async () => {
    setOpenNuevo(false);
    await crearGrupoRapido((grupoId) => {
      if (grupoId) setNuevoForm((prev) => ({ ...prev, grupo_puerta_id: grupoId }));
    });
    setOpenNuevo(true);
  };

  const abrirAltaRapidaGrupoDesdeEditar = async () => {
    setOpenEditar(false);
    await crearGrupoRapido((grupoId) => {
      if (grupoId) setEditarForm((prev) => ({ ...prev, grupo_puerta_id: grupoId }));
    });
    setOpenEditar(true);
  };

  const guardarNuevo = async () => {
    if (!nuevoForm.nombre.trim() || !nuevoForm.grupo_puerta_id || !nuevoForm.dispositivo_id) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "Nombre, grupo y dispositivo son obligatorios." });
      return;
    }
    setOpenNuevo(false);
    try {
      Swal.fire({ title: "Guardando...", allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
      const res = await clienteAxios.post("/api/biostar-catalogos/puertas-acceso", nuevoForm);
      Swal.close();
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo crear", text: res.data.mensaje || "Operacion fallida." });
        setOpenNuevo(true);
        return;
      }
      await Swal.fire({ icon: "success", title: "Puerta creada", text: res.data.mensaje || "Operacion correcta." });
      await cargar();
    } catch (error) {
      Swal.close();
      handlingError(error);
      setOpenNuevo(true);
    }
  };

  const abrirEditar = (row: PuertaAcceso) => {
    setEditandoId(row.id_externo);
    setEditarForm({
      nombre: row.nombre || "",
      grupo_puerta_id: row.grupo_puerta_id || "1",
      dispositivo_id: row.dispositivo_id || "",
      rele_puerta: row.rele_puerta || "",
      boton_salida: row.boton_salida || "",
      sensor_puerta: row.sensor_puerta || "",
    });
    if (row.dispositivo_id) {
      void cargarOpcionesDispositivo(row.dispositivo_id, "editar");
    } else {
      setOpcionesPuertosEditar([]);
    }
    setOpenEditar(true);
  };

  const guardarEditar = async () => {
    if (!editandoId) return;
    if (!editarForm.nombre.trim() || !editarForm.grupo_puerta_id || !editarForm.dispositivo_id) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "Nombre, grupo y dispositivo son obligatorios." });
      return;
    }
    setOpenEditar(false);
    try {
      Swal.fire({ title: "Guardando...", allowOutsideClick: false, showConfirmButton: false, didOpen: () => Swal.showLoading() });
      const res = await clienteAxios.put(`/api/biostar-catalogos/puertas-acceso/${editandoId}`, editarForm);
      Swal.close();
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo editar", text: res.data.mensaje || "Operacion fallida." });
        setOpenEditar(true);
        return;
      }
      await Swal.fire({ icon: "success", title: "Puerta editada", text: res.data.mensaje || "Operacion correcta." });
      await cargar();
    } catch (error) {
      Swal.close();
      handlingError(error);
      setOpenEditar(true);
    }
  };

  const eliminar = async (row: PuertaAcceso) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Eliminar puerta",
      text: `Seguro que quieres eliminar '${row.nombre}'?`,
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await clienteAxios.delete(`/api/biostar-catalogos/puertas-acceso/${row.id_externo}`);
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo eliminar", text: res.data.mensaje || "Operacion fallida." });
        return;
      }
      await Swal.fire({ icon: "success", title: "Puerta eliminada", text: res.data.mensaje || "Operacion correcta." });
      await cargar();
    } catch (error) {
      handlingError(error);
    }
  };

  const columns = useMemo<GridColDef<PuertaAcceso>[]>(
    () => [
      { field: "nombre", headerName: "Nombre", flex: 1, minWidth: 180 },
      { field: "grupo_puerta_nombre", headerName: "Grupo", flex: 0.8, minWidth: 170 },
      { field: "dispositivo_nombre", headerName: "Dispositivo", flex: 1, minWidth: 180 },
      { field: "rele_puerta", headerName: "Relé de puerta", flex: 0.5, minWidth: 120, align: "center", headerAlign: "center" },
      { field: "boton_salida", headerName: "Boton de salida", flex: 0.5, minWidth: 120, align: "center", headerAlign: "center" },
      { field: "sensor_puerta", headerName: "Sensor de puerta", flex: 0.5, minWidth: 120, align: "center", headerAlign: "center" },
      {
        field: "acciones",
        headerName: "Acciones",
        type: "actions",
        minWidth: 110,
        getActions: ({ row }) => [
          <GridActionsCellItem icon={<Edit color="primary" />} label="Editar" onClick={() => abrirEditar(row)} />,
          <GridActionsCellItem icon={<Delete color="error" />} label="Eliminar" onClick={() => eliminar(row)} />,
        ],
      },
    ],
    [gruposPuerta, dispositivos]
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
        localeText={{
          ...esES.components.MuiDataGrid.defaultProps.localeText,
          toolbarColumns: "",
          toolbarFilters: "",
          toolbarDensity: "",
          toolbarExport: "",
          noRowsLabel: "Sin registros",
        }}
        showToolbar
        slots={{
          toolbar: () => (
            <DataGridToolbar
              tableTitle="Puertas BioStar"
              customActionButtons={
                <>
                  <Tooltip title="Recargar">
                    <IconButton size="small" onClick={async () => { await cargarCatalogos(); await cargar(); }}>
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Agregar">
                    <IconButton size="small" onClick={abrirNuevo}>
                      <Add />
                    </IconButton>
                  </Tooltip>
                </>
              }
            />
          ),
        }}
      />

      <Dialog open={openNuevo} onClose={() => setOpenNuevo(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nueva Puerta BioStar</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={nuevoForm.nombre}
              onChange={(e) => setNuevoForm((prev) => ({ ...prev, nombre: e.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="flex-end">
              <FormControl fullWidth>
                <InputLabel id="nuevo-puerta-group-label">Grupo de puertas</InputLabel>
                <Select
                  labelId="nuevo-puerta-group-label"
                  label="Grupo de puertas"
                  value={nuevoForm.grupo_puerta_id}
                  onChange={(e) => setNuevoForm((prev) => ({ ...prev, grupo_puerta_id: String(e.target.value) }))}
                >
                  {gruposPuerta.map((g) => (
                    <MenuItem key={g.id_externo} value={g.id_externo}>{g.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<Add fontSize="small" />}
                onClick={abrirAltaRapidaGrupoDesdeNuevo}
                sx={{ minWidth: 120, height: 56, whiteSpace: "nowrap", textTransform: "uppercase", mb: { xs: 0, md: "1px" } }}
              >
                Grupo
              </Button>
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="nuevo-puerta-device-label">Dispositivo asignado</InputLabel>
              <Select
                labelId="nuevo-puerta-device-label"
                label="Dispositivo asignado"
                value={nuevoForm.dispositivo_id}
                onChange={async (e) => {
                  const id = String(e.target.value);
                  setNuevoForm((prev) => ({ ...prev, dispositivo_id: id, rele_puerta: "", boton_salida: "", sensor_puerta: "" }));
                  await cargarOpcionesDispositivo(id, "nuevo");
                }}
              >
                {dispositivos.map((d) => (
                  <MenuItem key={d.id_externo} value={d.id_externo}>{d.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="nuevo-rele-puerta-label">Relé de puerta</InputLabel>
                <Select
                  labelId="nuevo-rele-puerta-label"
                  label="Relé de puerta"
                  value={nuevoForm.rele_puerta}
                  onChange={(e) => setNuevoForm((prev) => ({ ...prev, rele_puerta: String(e.target.value) }))}
                >
                  {opcionesPuertosNuevo.map((o) => (
                    <MenuItem key={`np-r-${o.valor}`} value={o.valor}>{o.etiqueta}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="nuevo-boton-salida-label">Boton de salida</InputLabel>
                <Select
                  labelId="nuevo-boton-salida-label"
                  label="Boton de salida"
                  value={nuevoForm.boton_salida}
                  onChange={(e) => setNuevoForm((prev) => ({ ...prev, boton_salida: String(e.target.value) }))}
                >
                  {opcionesPuertosNuevo.map((o) => (
                    <MenuItem key={`np-b-${o.valor}`} value={o.valor}>{o.etiqueta}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="nuevo-sensor-puerta-label">Sensor de puerta</InputLabel>
                <Select
                  labelId="nuevo-sensor-puerta-label"
                  label="Sensor de puerta"
                  value={nuevoForm.sensor_puerta}
                  onChange={(e) => setNuevoForm((prev) => ({ ...prev, sensor_puerta: String(e.target.value) }))}
                >
                  {opcionesPuertosNuevo.map((o) => (
                    <MenuItem key={`np-s-${o.valor}`} value={o.valor}>{o.etiqueta}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNuevo(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarNuevo}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditar} onClose={() => setOpenEditar(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Puerta BioStar</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={editarForm.nombre}
              onChange={(e) => setEditarForm((prev) => ({ ...prev, nombre: e.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems="flex-end">
              <FormControl fullWidth>
                <InputLabel id="editar-puerta-group-label">Grupo de puertas</InputLabel>
                <Select
                  labelId="editar-puerta-group-label"
                  label="Grupo de puertas"
                  value={editarForm.grupo_puerta_id}
                  onChange={(e) => setEditarForm((prev) => ({ ...prev, grupo_puerta_id: String(e.target.value) }))}
                >
                  {gruposPuerta.map((g) => (
                    <MenuItem key={g.id_externo} value={g.id_externo}>{g.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<Add fontSize="small" />}
                onClick={abrirAltaRapidaGrupoDesdeEditar}
                sx={{ minWidth: 120, height: 56, whiteSpace: "nowrap", textTransform: "uppercase", mb: { xs: 0, md: "1px" } }}
              >
                Grupo
              </Button>
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="editar-puerta-device-label">Dispositivo asignado</InputLabel>
              <Select
                labelId="editar-puerta-device-label"
                label="Dispositivo asignado"
                value={editarForm.dispositivo_id}
                onChange={async (e) => {
                  const id = String(e.target.value);
                  setEditarForm((prev) => ({ ...prev, dispositivo_id: id, rele_puerta: "", boton_salida: "", sensor_puerta: "" }));
                  await cargarOpcionesDispositivo(id, "editar");
                }}
              >
                {dispositivos.map((d) => (
                  <MenuItem key={d.id_externo} value={d.id_externo}>{d.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="editar-rele-puerta-label">Relé de puerta</InputLabel>
                <Select
                  labelId="editar-rele-puerta-label"
                  label="Relé de puerta"
                  value={editarForm.rele_puerta}
                  onChange={(e) => setEditarForm((prev) => ({ ...prev, rele_puerta: String(e.target.value) }))}
                >
                  {opcionesPuertosEditar.map((o) => (
                    <MenuItem key={`ep-r-${o.valor}`} value={o.valor}>{o.etiqueta}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="editar-boton-salida-label">Boton de salida</InputLabel>
                <Select
                  labelId="editar-boton-salida-label"
                  label="Boton de salida"
                  value={editarForm.boton_salida}
                  onChange={(e) => setEditarForm((prev) => ({ ...prev, boton_salida: String(e.target.value) }))}
                >
                  {opcionesPuertosEditar.map((o) => (
                    <MenuItem key={`ep-b-${o.valor}`} value={o.valor}>{o.etiqueta}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="editar-sensor-puerta-label">Sensor de puerta</InputLabel>
                <Select
                  labelId="editar-sensor-puerta-label"
                  label="Sensor de puerta"
                  value={editarForm.sensor_puerta}
                  onChange={(e) => setEditarForm((prev) => ({ ...prev, sensor_puerta: String(e.target.value) }))}
                >
                  {opcionesPuertosEditar.map((o) => (
                    <MenuItem key={`ep-s-${o.valor}`} value={o.valor}>{o.etiqueta}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditar(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardarEditar}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
