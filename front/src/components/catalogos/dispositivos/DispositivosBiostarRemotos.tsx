import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Delete, Edit, Autorenew, Sync } from "@mui/icons-material";
import {
  Box,
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
import DataGridToolbar from "../../utils/DataGridToolbar";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { useNavigate } from "react-router-dom";

interface RemoteDevice {
  id_externo: string;
  nombre: string;
  direccion_ip: string;
  puerto: number;
  tipo?: string;
  modelo?: string;
  grupo_id?: string;
  grupo_nombre?: string;
  estatus?: string;
}

interface RemoteGroup {
  grupo_id: string;
  grupo_nombre: string;
}

export default function DispositivosBiostarRemotos() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RemoteDevice[]>([]);
  const [grupos, setGrupos] = useState<RemoteGroup[]>([]);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<string>("todos");
  const [loading, setLoading] = useState(false);
  const [openNuevo, setOpenNuevo] = useState(false);
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [openEditar, setOpenEditar] = useState(false);
  const [guardandoEditar, setGuardandoEditar] = useState(false);
  const [editandoId, setEditandoId] = useState<string>("");
  const [nuevoForm, setNuevoForm] = useState({
    nombre: "",
    direccion_ip: "",
    puerto: 51211,
    grupo_id: "1",
  });

  const gruposOrdenados = useMemo(() => {
    const list = [...(grupos || [])];
    const defaultIdx = list.findIndex((g) => String(g.grupo_id) === "1");
    if (defaultIdx > -1) {
      const [defaultGroup] = list.splice(defaultIdx, 1);
      return [defaultGroup, ...list];
    }
    return list;
  }, [grupos]);
  const [editarForm, setEditarForm] = useState({
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
        const message = String(res.data.mensaje || "").toLowerCase();
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
          if (action.isConfirmed) {
            navigate("/biostarar/conexion");
          }
        } else {
          await Swal.fire({
            icon: "error",
            title: "No se pudo consultar",
            text: res.data.mensaje || "Error al consultar dispositivos.",
          });
        }
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
    const grupoInicial =
      grupoSeleccionado && grupoSeleccionado !== "todos"
        ? grupoSeleccionado
        : allGroup?.grupo_id || "1";
    setNuevoForm({
      nombre: "",
      direccion_ip: "",
      puerto: 51211,
      grupo_id: grupoInicial,
    });
    setOpenNuevo(true);
  };

  const guardarNuevoDispositivo = async () => {
    if (!nuevoForm.nombre.trim() || !nuevoForm.direccion_ip.trim()) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "Nombre e IP son obligatorios." });
      return;
    }
    const snapshot = { ...nuevoForm };
    setOpenNuevo(false);
    setGuardandoNuevo(true);
    try {
      const payload = {
        nombre: nuevoForm.nombre.trim(),
        direccion_ip: nuevoForm.direccion_ip.trim(),
        puerto: Number(nuevoForm.puerto),
        device_group: Number(nuevoForm.grupo_id) || 1,
        device_group_id: { id: Number(nuevoForm.grupo_id) || 1 },
      };
      const res = await clienteAxios.post("/api/dispositivos-biostar/remotos", payload);
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo crear", text: res.data.mensaje || "No se pudo crear el dispositivo." });
        setNuevoForm(snapshot);
        setOpenNuevo(true);
        return;
      }
      await Swal.fire({ icon: "success", title: "Dispositivo agregado", text: res.data.mensaje || "Registro completado." });
      await cargarTodos();
    } catch (error) {
      handlingError(error);
      setNuevoForm(snapshot);
      setOpenNuevo(true);
    } finally {
      setGuardandoNuevo(false);
    }
  };

  const editarDispositivo = async (row: RemoteDevice) => {
    setEditandoId(row.id_externo || "");
    setEditarForm({
      nombre: row.nombre || "",
      direccion_ip: row.direccion_ip || "",
      puerto: Number(row.puerto || 51211),
      grupo_id: String(row.grupo_id || "1"),
    });
    setOpenEditar(true);
  };

  const guardarEdicionDispositivo = async () => {
    if (!editandoId) return;
    if (!editarForm.nombre.trim() || !editarForm.direccion_ip.trim()) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "Nombre e IP son obligatorios." });
      return;
    }
    const snapshot = { ...editarForm };
    setOpenEditar(false);
    setGuardandoEditar(true);
    try {
      const payload = {
        nombre: editarForm.nombre.trim(),
        direccion_ip: editarForm.direccion_ip.trim(),
        puerto: Number(editarForm.puerto),
        device_group: Number(editarForm.grupo_id) || 1,
        device_group_id: { id: Number(editarForm.grupo_id) || 1 },
      };
      const res = await clienteAxios.put(`/api/dispositivos-biostar/remotos/${editandoId}`, payload);
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo editar", text: res.data.mensaje || "No se pudo editar el dispositivo." });
        setEditarForm(snapshot);
        setOpenEditar(true);
        return;
      }
      await Swal.fire({ icon: "success", title: "Dispositivo editado", text: res.data.mensaje || "Actualizacion completada." });
      await cargarTodos();
    } catch (error) {
      handlingError(error);
      setEditarForm(snapshot);
      setOpenEditar(true);
    } finally {
      setGuardandoEditar(false);
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

  const reconectarDispositivo = async (row: RemoteDevice) => {
    try {
      const res = await clienteAxios.post(`/api/dispositivos-biostar/remotos/${row.id_externo}/reconnect`, {});
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo reconectar", text: res.data.mensaje || "No se pudo reconectar el dispositivo." });
        return;
      }
      await Swal.fire({ icon: "success", title: "Reconexión enviada", text: res.data.mensaje || "Operación completada." });
      await cargarTodos();
    } catch (error) {
      handlingError(error);
    }
  };

  useEffect(() => {
    cargarGrupos();
    cargarTodos();
  }, []);

  useEffect(() => {
    return () => {
      Swal.close();
    };
  }, []);

  const rowsFiltrados = useMemo(() => {
    if (grupoSeleccionado === "todos") return rows;
    return rows.filter((row) => {
      const rowGroup = String(row.grupo_id || "").trim() || "1";
      return rowGroup === grupoSeleccionado;
    });
  }, [rows, grupoSeleccionado]);

  const conteoPorGrupo = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of rows || []) {
      const key = String(row.grupo_id || "").trim() || "1";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [rows]);

  const nombreGrupoPorId = useMemo(() => {
    const map = new Map<string, string>();
    for (const grupo of grupos || []) {
      map.set(String(grupo.grupo_id), grupo.grupo_nombre);
    }
    return map;
  }, [grupos]);

  const columns = useMemo<GridColDef<RemoteDevice>[]>(() => {
    const base: GridColDef<RemoteDevice>[] = [
      { field: "nombre", headerName: "Nombre del dispositivo", flex: 1, minWidth: 220 },
      { field: "direccion_ip", headerName: "IP", flex: 1, minWidth: 150 },
      {
        field: "estatus",
        headerName: "Estatus",
        flex: 0.7,
        minWidth: 130,
        valueGetter: (_value, row) => {
          const raw = String(row?.estatus || "").trim().toLowerCase();
          if (!raw) return "Desconectado";
          if (["1", "true", "connected", "connect", "online", "normal"].includes(raw)) return "Conectado";
          if (["0", "-1", "false", "disconnected", "disconnect", "offline"].includes(raw)) return "Desconectado";
          return raw.charAt(0).toUpperCase() + raw.slice(1);
        },
      },
    ];

    if (grupoSeleccionado === "todos") {
      base.push({
        field: "grupo_nombre",
        headerName: "Grupo",
        flex: 1,
        minWidth: 200,
        renderCell: (params) => {
          const id = String(params.row?.grupo_id || "").trim() || "1";
          return nombreGrupoPorId.get(id) || params.value || "Predeterminado BioStar";
        },
      });
    }

    base.push({
      field: "acciones",
      headerName: "Acciones",
      type: "actions",
      flex: 0.8,
      minWidth: 140,
      getActions: ({ row }) => [
        <GridActionsCellItem icon={<Edit color="primary" />} label="Editar" onClick={() => editarDispositivo(row)} />,
        <GridActionsCellItem icon={<Autorenew color="info" />} label="Reconectar dispositivo" onClick={() => reconectarDispositivo(row)} showInMenu={false} />,
        <GridActionsCellItem icon={<Delete color="error" />} label="Eliminar" onClick={() => eliminarDispositivo(row)} />,
      ],
    });

    return base;
  }, [grupoSeleccionado, nombreGrupoPorId]);

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
                      <MenuItem value="todos">
                        <Box sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                          <Box sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            Todos
                          </Box>
                          <Box sx={{ flexShrink: 0 }}>({rows.length})</Box>
                        </Box>
                      </MenuItem>
                      {(gruposOrdenados || []).map((grupo) => (
                        <MenuItem key={grupo.grupo_id} value={grupo.grupo_id}>
                          <Box sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                            <Box sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {grupo.grupo_nombre}
                            </Box>
                            <Box sx={{ flexShrink: 0 }}>({conteoPorGrupo.get(String(grupo.grupo_id)) || 0})</Box>
                          </Box>
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
                {(gruposOrdenados || []).map((grupo) => (
                  <MenuItem key={grupo.grupo_id} value={grupo.grupo_id}>
                    {grupo.grupo_nombre}
                  </MenuItem>
                ))}
                {(grupos || []).length === 0 && <MenuItem value="1">All Devices</MenuItem>}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenNuevo(false)} disabled={guardandoNuevo}>
            Cancelar
          </Button>
          <Button onClick={guardarNuevoDispositivo} disabled={guardandoNuevo} variant="contained">
            {guardandoNuevo ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openEditar} onClose={() => !guardandoEditar && setOpenEditar(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Dispositivo BioStar</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Nombre"
              value={editarForm.nombre}
              onChange={(event) => setEditarForm((prev) => ({ ...prev, nombre: event.target.value }))}
              fullWidth
            />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Direccion IP"
                value={editarForm.direccion_ip}
                onChange={(event) => setEditarForm((prev) => ({ ...prev, direccion_ip: event.target.value }))}
                fullWidth
              />
              <TextField
                label="Puerto"
                type="number"
                value={editarForm.puerto}
                onChange={(event) => setEditarForm((prev) => ({ ...prev, puerto: Number(event.target.value || 0) }))}
                sx={{ minWidth: 160 }}
              />
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="editar-device-group-label">Grupo</InputLabel>
              <Select
                labelId="editar-device-group-label"
                value={editarForm.grupo_id}
                label="Grupo"
                onChange={(event) => setEditarForm((prev) => ({ ...prev, grupo_id: String(event.target.value) }))}
              >
                {(gruposOrdenados || []).map((grupo) => (
                  <MenuItem key={grupo.grupo_id} value={grupo.grupo_id}>
                    {grupo.grupo_nombre}
                  </MenuItem>
                ))}
                {(grupos || []).length === 0 && <MenuItem value="1">All Devices</MenuItem>}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenEditar(false)} disabled={guardandoEditar}>
            Cancelar
          </Button>
          <Button onClick={guardarEdicionDispositivo} disabled={guardandoEditar} variant="contained">
            {guardandoEditar ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
