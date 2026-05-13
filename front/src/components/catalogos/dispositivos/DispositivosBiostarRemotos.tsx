import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Delete, Edit, Autorenew, Sync, DeleteSweep } from "@mui/icons-material";
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
  modo_acceso?: "entrada" | "salida" | "ambos";
  id_acceso?: string;
  apertura_destino_habilitada?: boolean;
  apertura_puerta_id?: string;
  apertura_puerta_nombre?: string;
}

interface RemoteGroup {
  grupo_id: string;
  grupo_nombre: string;
}

function normalizarNombreGrupoEnInput(value: string): string {
  const texto = String(value || "");
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
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
  const [syncLimpioOpen, setSyncLimpioOpen] = useState(false);
  const [syncLimpioLoading, setSyncLimpioLoading] = useState(false);
  const [syncLimpioRow, setSyncLimpioRow] = useState<RemoteDevice | null>(null);
  const [editandoId, setEditandoId] = useState<string>("");
  const [accesos, setAccesos] = useState<Array<{ _id: string; nombre: string; identificador?: string }>>([]);
  const [puertas, setPuertas] = useState<Array<{ id_externo: string; nombre: string }>>([]);
  const [nuevoForm, setNuevoForm] = useState({
    nombre: "",
    direccion_ip: "",
    puerto: 51211,
    grupo_id: "1",
    modo_acceso: "ambos" as "entrada" | "salida" | "ambos",
    id_acceso: "",
    apertura_destino_habilitada: "no" as "si" | "no",
    apertura_puerta_id: "",
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
    modo_acceso: "ambos" as "entrada" | "salida" | "ambos",
    id_acceso: "",
    apertura_destino_habilitada: "no" as "si" | "no",
    apertura_puerta_id: "",
  });

  const cargarCatalogosFormulario = async () => {
    try {
      const res = await clienteAxios.get("/api/dispositivos-biostar/catalogos-formulario");
      if (!res.data?.estado) return;
      setAccesos(res.data?.datos?.accesos || []);
      setPuertas(res.data?.datos?.puertas || []);
    } catch (error) {
      handlingError(error);
    }
  };

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
      modo_acceso: "ambos",
      id_acceso: "",
      apertura_destino_habilitada: "no",
      apertura_puerta_id: "",
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
        modo_acceso: nuevoForm.modo_acceso,
        id_acceso: nuevoForm.id_acceso || null,
        apertura_destino_habilitada: nuevoForm.apertura_destino_habilitada === "si",
        apertura_puerta_id: nuevoForm.apertura_puerta_id || "",
        apertura_puerta_nombre: puertas.find((p) => p.id_externo === nuevoForm.apertura_puerta_id)?.nombre || "",
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
      modo_acceso: (row.modo_acceso || "ambos") as "entrada" | "salida" | "ambos",
      id_acceso: String(row.id_acceso || ""),
      apertura_destino_habilitada: row.apertura_destino_habilitada ? "si" : "no",
      apertura_puerta_id: String(row.apertura_puerta_id || ""),
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
        modo_acceso: editarForm.modo_acceso,
        id_acceso: editarForm.id_acceso || null,
        apertura_destino_habilitada: editarForm.apertura_destino_habilitada === "si",
        apertura_puerta_id: editarForm.apertura_puerta_id || "",
        apertura_puerta_nombre: puertas.find((p) => p.id_externo === editarForm.apertura_puerta_id)?.nombre || "",
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

  const crearGrupoRapido = async (onCreated: (grupoId: string) => void) => {
    const result = await Swal.fire({
      title: "Nuevo Grupo de Dispositivos",
      input: "text",
      inputLabel: "Nombre del grupo",
      inputValue: "",
      inputPlaceholder: "Ejemplo: Accesos Norte",
      inputAttributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        spellcheck: "false",
        name: `biostar-device-group-${Date.now()}`,
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
      const res = await clienteAxios.post("/api/biostar-catalogos/grupos-dispositivos", { nombre });
      Swal.close();
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo crear", text: res.data.mensaje || "No se pudo crear el grupo." });
        return;
      }
      await Swal.fire({ icon: "success", title: "Grupo creado", text: res.data.mensaje || "Operacion correcta." });
      const gruposRes = await clienteAxios.get("/api/dispositivos-biostar/remotos/grupos");
      const lista = gruposRes.data?.estado ? (gruposRes.data.datos || []) : [];
      setGrupos(lista);
      const creado = (lista as RemoteGroup[]).find((g) => g.grupo_nombre.toLowerCase() === nombre.toLowerCase());
      onCreated(creado?.grupo_id || "");
    } catch (error) {
      Swal.close();
      handlingError(error);
    }
  };

  const abrirAltaRapidaGrupoDesdeNuevo = async () => {
    setOpenNuevo(false);
    await crearGrupoRapido((grupoId) => {
      if (grupoId) setNuevoForm((prev) => ({ ...prev, grupo_id: grupoId }));
    });
    setOpenNuevo(true);
  };

  const abrirAltaRapidaGrupoDesdeEditar = async () => {
    setOpenEditar(false);
    await crearGrupoRapido((grupoId) => {
      if (grupoId) setEditarForm((prev) => ({ ...prev, grupo_id: grupoId }));
    });
    setOpenEditar(true);
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

  const abrirModalSyncLimpio = (row: RemoteDevice) => {
    setSyncLimpioRow(row);
    setSyncLimpioOpen(true);
  };

  const ejecutarSyncLimpio = async () => {
    if (!syncLimpioRow?.id_externo) return;
    setSyncLimpioLoading(true);
    try {
      const res = await clienteAxios.post(
        `/api/dispositivos-biostar/remotos/${syncLimpioRow.id_externo}/sync`,
        { clean: true }
      );
      if (!res.data.estado) {
        await Swal.fire({
          icon: "error",
          title: "No se pudo iniciar",
          text: res.data.mensaje || "No se pudo ejecutar borrar y subir de nuevo.",
        });
        return;
      }
      setSyncLimpioOpen(false);
      setSyncLimpioRow(null);
      setSyncLimpioLoading(false);
      await Swal.fire({
        icon: "success",
        title: "Proceso iniciado",
        text:
          res.data.mensaje ||
          "Se inicio borrar y subir de nuevo. Puede tardar unos minutos.",
      });
      void cargarTodos();
      return;
    } catch (error) {
      handlingError(error);
    } finally {
      setSyncLimpioLoading(false);
    }
  };

  useEffect(() => {
    cargarCatalogosFormulario();
    cargarGrupos();
    cargarTodos();
  }, []);

  useEffect(() => {
    return () => {
      Swal.close();
    };
  }, []);

  const rowsFiltrados = useMemo(() => {
    const knownIds = new Set((grupos || []).map((g) => String(g.grupo_id)));
    const normalizedGroup = (row: RemoteDevice) => {
      const raw = String(row.grupo_id || "").trim() || "1";
      return knownIds.has(raw) ? raw : "1";
    };
    if (grupoSeleccionado === "todos") return rows;
    return rows.filter((row) => {
      const rowGroup = normalizedGroup(row);
      return rowGroup === grupoSeleccionado;
    });
  }, [rows, grupoSeleccionado, grupos]);

  const conteoPorGrupo = useMemo(() => {
    const knownIds = new Set((grupos || []).map((g) => String(g.grupo_id)));
    const map = new Map<string, number>();
    for (const row of rows || []) {
      const raw = String(row.grupo_id || "").trim() || "1";
      const key = knownIds.has(raw) ? raw : "1";
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [rows, grupos]);

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
        field: "modo_acceso",
        headerName: "Acceso",
        flex: 0.7,
        minWidth: 130,
        valueGetter: (_value, row) => {
          const mode = String(row?.modo_acceso || "ambos");
          if (mode === "entrada") return "Entrada";
          if (mode === "salida") return "Salida";
          return "Ambos";
        },
      },
      {
        field: "apertura_destino_habilitada",
        headerName: "Abrir",
        flex: 0.5,
        minWidth: 90,
        valueGetter: (_value, row) => (row?.apertura_destino_habilitada ? "Si" : "No"),
      },
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
          if (!nombreGrupoPorId.has(id)) return "Predeterminado BioStar";
          return nombreGrupoPorId.get(id) || "Predeterminado BioStar";
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
        <GridActionsCellItem
          icon={<DeleteSweep color="warning" />}
          label="Borrar y subir"
          onClick={() => abrirModalSyncLimpio(row)}
          showInMenu={false}
        />,
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
      <Dialog
        open={openNuevo}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") return;
          if (!guardandoNuevo) setOpenNuevo(false);
        }}
        maxWidth="md"
        fullWidth
      >
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
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
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
              <Button
                variant="outlined"
                startIcon={<Add />}
                sx={{ height: 56, minWidth: 110, whiteSpace: "nowrap" }}
                onClick={abrirAltaRapidaGrupoDesdeNuevo}
              >
                Grupo
              </Button>
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="nuevo-modo-acceso-label">Tipo de acceso</InputLabel>
              <Select
                labelId="nuevo-modo-acceso-label"
                value={nuevoForm.modo_acceso}
                label="Tipo de acceso"
                onChange={(event) => setNuevoForm((prev) => ({ ...prev, modo_acceso: event.target.value as "entrada" | "salida" | "ambos" }))}
              >
                <MenuItem value="entrada">Entrada</MenuItem>
                <MenuItem value="salida">Salida</MenuItem>
                <MenuItem value="ambos">Ambos</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="nuevo-id-acceso-label">Acceso</InputLabel>
              <Select
                labelId="nuevo-id-acceso-label"
                value={nuevoForm.id_acceso}
                label="Acceso"
                onChange={(event) => setNuevoForm((prev) => ({ ...prev, id_acceso: String(event.target.value) }))}
              >
                <MenuItem value="">Sin acceso</MenuItem>
                {(accesos || []).map((a) => (
                  <MenuItem key={a._id} value={a._id}>
                    {a.identificador ? `${a.identificador} - ${a.nombre}` : a.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="nuevo-apertura-hab-label">Abrir puerta BioStar por este acceso</InputLabel>
              <Select
                labelId="nuevo-apertura-hab-label"
                value={nuevoForm.apertura_destino_habilitada}
                label="Abrir puerta BioStar por este acceso"
                onChange={(event) => setNuevoForm((prev) => ({ ...prev, apertura_destino_habilitada: event.target.value as "si" | "no" }))}
              >
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="si">Si</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="nuevo-puerta-destino-label">Puerta destino</InputLabel>
              <Select
                labelId="nuevo-puerta-destino-label"
                value={nuevoForm.apertura_puerta_id}
                label="Puerta destino"
                onChange={(event) => setNuevoForm((prev) => ({ ...prev, apertura_puerta_id: String(event.target.value) }))}
              >
                <MenuItem value="">Sin puerta</MenuItem>
                {(puertas || []).map((p) => (
                  <MenuItem key={p.id_externo} value={p.id_externo}>
                    {`${p.id_externo} - ${p.nombre}`}
                  </MenuItem>
                ))}
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
      <Dialog
        open={openEditar}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") return;
          if (!guardandoEditar) setOpenEditar(false);
        }}
        maxWidth="md"
        fullWidth
      >
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
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
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
              <Button
                variant="outlined"
                startIcon={<Add />}
                sx={{ height: 56, minWidth: 110, whiteSpace: "nowrap" }}
                onClick={abrirAltaRapidaGrupoDesdeEditar}
              >
                Grupo
              </Button>
            </Stack>
            <FormControl fullWidth>
              <InputLabel id="editar-modo-acceso-label">Tipo de acceso</InputLabel>
              <Select
                labelId="editar-modo-acceso-label"
                value={editarForm.modo_acceso}
                label="Tipo de acceso"
                onChange={(event) => setEditarForm((prev) => ({ ...prev, modo_acceso: event.target.value as "entrada" | "salida" | "ambos" }))}
              >
                <MenuItem value="entrada">Entrada</MenuItem>
                <MenuItem value="salida">Salida</MenuItem>
                <MenuItem value="ambos">Ambos</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="editar-id-acceso-label">Acceso</InputLabel>
              <Select
                labelId="editar-id-acceso-label"
                value={editarForm.id_acceso}
                label="Acceso"
                onChange={(event) => setEditarForm((prev) => ({ ...prev, id_acceso: String(event.target.value) }))}
              >
                <MenuItem value="">Sin acceso</MenuItem>
                {(accesos || []).map((a) => (
                  <MenuItem key={a._id} value={a._id}>
                    {a.identificador ? `${a.identificador} - ${a.nombre}` : a.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="editar-apertura-hab-label">Abrir puerta BioStar por este acceso</InputLabel>
              <Select
                labelId="editar-apertura-hab-label"
                value={editarForm.apertura_destino_habilitada}
                label="Abrir puerta BioStar por este acceso"
                onChange={(event) => setEditarForm((prev) => ({ ...prev, apertura_destino_habilitada: event.target.value as "si" | "no" }))}
              >
                <MenuItem value="no">No</MenuItem>
                <MenuItem value="si">Si</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel id="editar-puerta-destino-label">Puerta destino</InputLabel>
              <Select
                labelId="editar-puerta-destino-label"
                value={editarForm.apertura_puerta_id}
                label="Puerta destino"
                onChange={(event) => setEditarForm((prev) => ({ ...prev, apertura_puerta_id: String(event.target.value) }))}
              >
                <MenuItem value="">Sin puerta</MenuItem>
                {(puertas || []).map((p) => (
                  <MenuItem key={p.id_externo} value={p.id_externo}>
                    {`${p.id_externo} - ${p.nombre}`}
                  </MenuItem>
                ))}
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
      <Dialog
        open={syncLimpioOpen}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") return;
          if (syncLimpioLoading) return;
          setSyncLimpioOpen(false);
          setSyncLimpioRow(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Borrar y subir de nuevo</DialogTitle>
        <DialogContent>
          Seguro que deseas borrar y subir nuevamente la configuracion de{" "}
          <strong>{syncLimpioRow?.nombre || syncLimpioRow?.direccion_ip || "este dispositivo"}</strong>?
          Este proceso puede tardar unos minutos.
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSyncLimpioOpen(false);
              setSyncLimpioRow(null);
            }}
            disabled={syncLimpioLoading}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<DeleteSweep />}
            onClick={ejecutarSyncLimpio}
            disabled={syncLimpioLoading}
          >
            {syncLimpioLoading ? "Procesando..." : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
