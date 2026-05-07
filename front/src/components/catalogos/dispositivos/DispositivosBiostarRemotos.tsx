import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Delete, Edit, Sync } from "@mui/icons-material";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import Swal from "sweetalert2";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { clienteAxios, handlingError } from "../../../app/config/axios";

interface RemoteDevice {
  id_externo: string;
  nombre: string;
  direccion_ip: string;
  puerto: number;
  tipo?: string;
  modelo?: string;
  grupo_id?: string;
  grupo_nombre?: string;
}

interface RemoteGroup {
  grupo_id: string;
  grupo_nombre: string;
}

export default function DispositivosBiostarRemotos() {
  const [rows, setRows] = useState<RemoteDevice[]>([]);
  const [grupos, setGrupos] = useState<RemoteGroup[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>("todos");
  const [loading, setLoading] = useState(false);
  const [openNuevo, setOpenNuevo] = useState(false);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [buscandoNuevo, setBuscandoNuevo] = useState(false);
  const [encontrados, setEncontrados] = useState<RemoteDevice[]>([]);
  const [seleccionEncontrado, setSeleccionEncontrado] = useState<string>("");
  const [nuevoForm, setNuevoForm] = useState({
    nombre: "",
    direccion_ip: "",
    puerto: 51211,
    grupo_id: "1",
  });

  const cargarGrupos = async () => {
    try {
      const res = await clienteAxios.get("/api/dispositivos-biostar/remotos/grupos");
      if (!res.data.estado) {
        setGrupos([]);
        return;
      }
      setGrupos(res.data.datos || []);
    } catch (error) {
      handlingError(error);
      setGrupos([]);
    }
  };

  const cargarTodos = async () => {
    setLoading(true);
    try {
      const res = await clienteAxios.get("/api/dispositivos-biostar/remotos?tipo=all");
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo consultar", text: res.data.mensaje || "Error al consultar dispositivos." });
        return;
      }
      setRows(res.data.datos || []);
    } catch (error) {
      handlingError(error);
    } finally {
      setLoading(false);
    }
  };

  const crearDispositivo = async () => {
    const allGroup = grupos.find((g) => (g.grupo_nombre || "").toLowerCase().includes("all devices"));
    setNuevoForm({
      nombre: "",
      direccion_ip: "",
      puerto: 51211,
      grupo_id: allGroup?.grupo_id || "1",
    });
    setEncontrados([]);
    setSeleccionEncontrado("");
    setOpenNuevo(true);
  };

  const buscarDispositivosNuevo = async () => {
    setBuscandoNuevo(true);
    try {
      const discoveryRes = await clienteAxios.post(
        "/api/dispositivos-biostar/remotos/descubrir",
        { segundos: 3, solo_nuevos: false },
        { timeout: 15000 }
      );
      const discovered = (discoveryRes.data?.datos || []) as RemoteDevice[];
      const existing = new Set((rows || []).map((item) => `${String(item.direccion_ip || "").trim()}::${Number(item.puerto || 0)}`));
      const filtered = discovered.filter((item) => {
        const key = `${String(item.direccion_ip || "").trim()}::${Number(item.puerto || 0)}`;
        return !existing.has(key);
      });
      setEncontrados(filtered);
      if (filtered.length > 0) {
        setSeleccionEncontrado("0");
        setNuevoForm((prev) => ({
          ...prev,
          direccion_ip: filtered[0].direccion_ip || prev.direccion_ip,
          puerto: Number(filtered[0].puerto || prev.puerto),
          nombre: prev.nombre || filtered[0].nombre || "",
        }));
      }
    } catch (error) {
      handlingError(error);
      setEncontrados([]);
      setSeleccionEncontrado("");
    } finally {
      setBuscandoNuevo(false);
    }
  };

  const guardarNuevoDispositivo = async () => {
    if (!nuevoForm.nombre.trim() || !nuevoForm.direccion_ip.trim()) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "Nombre e IP son obligatorios." });
      return;
    }
    setGuardandoNuevo(true);
    try {
      const selected = seleccionEncontrado !== "" ? encontrados[Number(seleccionEncontrado)] : null;
      const payload = {
        nombre: nuevoForm.nombre.trim(),
        direccion_ip: (selected?.direccion_ip || nuevoForm.direccion_ip).trim(),
        puerto: Number(selected?.puerto || nuevoForm.puerto),
        raw: selected ? (selected as any).raw : undefined,
        device_group: Number(nuevoForm.grupo_id) || 1,
        device_group_id: { id: Number(nuevoForm.grupo_id) || 1 },
      };
      const res = await clienteAxios.post("/api/dispositivos-biostar/remotos", payload);
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo crear", text: res.data.mensaje || "No se pudo crear el dispositivo." });
        return;
      }
      await Swal.fire({ icon: "success", title: "Dispositivo agregado", text: res.data.mensaje || "Registro completado." });
      setOpenNuevo(false);
      await cargarTodos();
    } catch (error) {
      handlingError(error);
    } finally {
      setGuardandoNuevo(false);
    }
  };

  const editarDispositivo = async (row: RemoteDevice) => {
    const result = await Swal.fire({
      title: "Editar dispositivo",
      html: `
        <input id="bio-edit-name" class="swal2-input" placeholder="Nombre" value="${row.nombre || ""}" autocomplete="off">
        <input id="bio-edit-ip" class="swal2-input" placeholder="Direccion IP" value="${row.direccion_ip || ""}" autocomplete="off">
        <input id="bio-edit-port" class="swal2-input" placeholder="Puerto" value="${row.puerto || 51211}" autocomplete="off">
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const nombre = (document.getElementById("bio-edit-name") as HTMLInputElement)?.value?.trim();
        const direccion_ip = (document.getElementById("bio-edit-ip") as HTMLInputElement)?.value?.trim();
        const puerto = Number((document.getElementById("bio-edit-port") as HTMLInputElement)?.value || 51211);
        if (!direccion_ip) {
          Swal.showValidationMessage("La direccion IP es obligatoria.");
          return null;
        }
        return { nombre, direccion_ip, puerto };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      const res = await clienteAxios.put(`/api/dispositivos-biostar/remotos/${row.id_externo}`, result.value);
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo editar", text: res.data.mensaje || "No se pudo editar el dispositivo." });
        return;
      }
      await Swal.fire({ icon: "success", title: "Dispositivo editado", text: res.data.mensaje || "Actualizacion completada." });
      await cargarTodos();
    } catch (error) {
      handlingError(error);
    }
  };

  const eliminarDispositivo = async (row: RemoteDevice) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Eliminar dispositivo",
      text: `Seguro que quieres borrar ${row.nombre || row.direccion_ip}?`,
      showCancelButton: true,
      confirmButtonText: "Si, borrar",
      cancelButtonText: "Cancelar",
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await clienteAxios.delete(`/api/dispositivos-biostar/remotos/${row.id_externo}`);
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo eliminar", text: res.data.mensaje || "No se pudo eliminar el dispositivo." });
        return;
      }
      await Swal.fire({ icon: "success", title: "Eliminado", text: res.data.mensaje || "Dispositivo eliminado." });
      await cargarTodos();
    } catch (error) {
      handlingError(error);
    }
  };

  useEffect(() => {
    cargarGrupos();
    cargarTodos();
  }, []);

  const rowsFiltrados = useMemo(() => {
    if (grupoSeleccionado === "todos") return rows;
    return rows.filter((row) => {
      const rowGroup = String(row.grupo_id || "").trim() || "biostar-all-devices";
      return rowGroup === grupoSeleccionado;
    });
  }, [rows, grupoSeleccionado]);

  useEffect(() => {
    if (seleccionEncontrado === "") return;
    const selected = encontrados[Number(seleccionEncontrado)];
    if (!selected) return;
    setNuevoForm((prev) => ({
      ...prev,
      direccion_ip: selected.direccion_ip || prev.direccion_ip,
      puerto: Number(selected.puerto || prev.puerto),
      nombre: prev.nombre || selected.nombre || "",
    }));
  }, [seleccionEncontrado, encontrados]);

  const columns = useMemo<GridColDef<RemoteDevice>[]>(
    () => [
      { field: "nombre", headerName: "Nombre", flex: 1, minWidth: 180 },
      { field: "direccion_ip", headerName: "IP", flex: 1, minWidth: 150 },
      { field: "puerto", headerName: "Puerto", flex: 0.5, minWidth: 95 },
      { field: "grupo_nombre", headerName: "Grupo", flex: 1, minWidth: 180 },
      { field: "tipo", headerName: "Tipo", flex: 0.7, minWidth: 120 },
      { field: "modelo", headerName: "Modelo", flex: 1, minWidth: 150 },
      {
        field: "acciones",
        headerName: "Acciones",
        type: "actions",
        flex: 0.8,
        minWidth: 140,
        getActions: ({ row }) => [
          <GridActionsCellItem icon={<Edit color="primary" />} label="Editar" onClick={() => editarDispositivo(row)} />,
          <GridActionsCellItem icon={<Delete color="error" />} label="Eliminar" onClick={() => eliminarDispositivo(row)} />,
        ],
      },
    ],
    []
  );

  return (
    <div style={{ minHeight: 450 }}>
      <DataGrid
        rows={rowsFiltrados}
        getRowId={(row) => row.id_externo || `${row.direccion_ip}-${row.puerto}`}
        columns={columns}
        disableColumnFilter
        disableRowSelectionOnClick
        loading={loading}
        pageSizeOptions={[10, 25, 50]}
        pagination
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
              tableTitle="Gestion de Dispositivos BioStar"
              customActionButtons={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <FormControl size="small" sx={{ minWidth: 240 }}>
                    <InputLabel id="bio-device-group-label">Grupo de dispositivos</InputLabel>
                    <Select
                      labelId="bio-device-group-label"
                      value={grupoSeleccionado}
                      label="Grupo de dispositivos"
                      onChange={(event) => setGrupoSeleccionado(String(event.target.value))}
                    >
                      <MenuItem value="todos">Todos</MenuItem>
                      {(grupos || []).map((grupo) => (
                        <MenuItem key={grupo.grupo_id} value={grupo.grupo_id}>
                          {grupo.grupo_nombre}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Tooltip title="Recargar (all)">
                    <IconButton size="small" onClick={async () => { await cargarGrupos(); await cargarTodos(); }}>
                      <Sync />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Agregar">
                    <IconButton size="small" onClick={crearDispositivo}>
                      <Add />
                    </IconButton>
                  </Tooltip>
                </Box>
              }
            />
          ),
        }}
      />
      <Dialog open={openNuevo} onClose={() => !guardandoNuevo && setOpenNuevo(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nuevo Dispositivo BioStar</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={nuevoForm.nombre}
              onChange={(event) => setNuevoForm((prev) => ({ ...prev, nombre: event.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Direccion IP"
                value={nuevoForm.direccion_ip}
                onChange={(event) => setNuevoForm((prev) => ({ ...prev, direccion_ip: event.target.value }))}
                fullWidth
              />
              <TextField
                label="Puerto"
                type="number"
                value={nuevoForm.puerto}
                onChange={(event) => setNuevoForm((prev) => ({ ...prev, puerto: Number(event.target.value || 0) }))}
                sx={{ minWidth: 160 }}
              />
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="nuevo-device-group-label">Grupo</InputLabel>
              <Select
                labelId="nuevo-device-group-label"
                value={nuevoForm.grupo_id}
                label="Grupo"
                onChange={(event) => setNuevoForm((prev) => ({ ...prev, grupo_id: String(event.target.value) }))}
              >
                {(grupos || []).map((grupo) => (
                  <MenuItem key={grupo.grupo_id} value={grupo.grupo_id}>
                    {grupo.grupo_nombre}
                  </MenuItem>
                ))}
                {(grupos || []).length === 0 && <MenuItem value="1">All Devices</MenuItem>}
              </Select>
            </FormControl>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Dispositivos encontrados
              </Typography>
              {encontrados.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Sin resultados por ahora.
                </Typography>
              ) : (
                <RadioGroup value={seleccionEncontrado} onChange={(event) => setSeleccionEncontrado(event.target.value)}>
                  {encontrados.map((item, index) => (
                    <FormControlLabel
                      key={`${item.id_externo}-${item.direccion_ip}-${index}`}
                      value={String(index)}
                      control={<Radio />}
                      label={`${item.nombre || "Sin nombre"} - ${item.direccion_ip}:${item.puerto}`}
                    />
                  ))}
                </RadioGroup>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenNuevo(false)} disabled={guardandoNuevo || buscandoNuevo}>
            Cancelar
          </Button>
          <Button onClick={guardarNuevoDispositivo} disabled={guardandoNuevo || buscandoNuevo} variant="contained">
            {guardandoNuevo ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
