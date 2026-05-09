import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Delete, Edit, Refresh } from "@mui/icons-material";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { clienteAxios, handlingError } from "../../../app/config/axios";

type Row = {
  id_externo: string;
  nombre: string;
  descripcion: string;
  total_niveles: number;
  total_grupos_usuarios: number;
  total_usuarios: number;
};
type OptionItem = { id_externo: string; nombre: string };

export default function BiostararPermisosAcceso() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [niveles, setNiveles] = useState<OptionItem[]>([]);
  const [gruposUsuarios, setGruposUsuarios] = useState<OptionItem[]>([]);
  const [usuarios, setUsuarios] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [openNuevo, setOpenNuevo] = useState(false);
  const [openEditar, setOpenEditar] = useState(false);
  const [editandoId, setEditandoId] = useState("");

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [nivelesSel, setNivelesSel] = useState<string[]>([]);
  const [gruposSel, setGruposSel] = useState<string[]>([]);
  const [usuariosSel, setUsuariosSel] = useState<string[]>([]);

  const manejarErrorConexion = async (mensaje: string) => {
    const message = String(mensaje || "").toLowerCase();
    if (message.includes("no se pudo iniciar sesion en biostar") || message.includes("primero configura la conexion global de biostar")) {
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
      const res = await clienteAxios.get("/api/biostar-catalogos/access-groups/catalogos");
      if (!res.data.estado) {
        await manejarErrorConexion(res.data.mensaje || "No se pudieron cargar catalogos.");
        return;
      }
      setNiveles(res.data.datos?.niveles || []);
      setGruposUsuarios(res.data.datos?.grupos_usuarios || []);
      setUsuarios(res.data.datos?.usuarios || []);
    } catch (error) {
      handlingError(error);
    }
  };

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await clienteAxios.get("/api/biostar-catalogos/access-groups");
      if (!res.data.estado) {
        await manejarErrorConexion(res.data.mensaje || "No se pudieron cargar permisos.");
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

  const limpiarForm = () => {
    setNombre("");
    setDescripcion("");
    setNivelesSel([]);
    setGruposSel([]);
    setUsuariosSel([]);
    setEditandoId("");
  };

  const abrirNuevo = () => {
    limpiarForm();
    setOpenNuevo(true);
  };

  const abrirEditar = async (row: Row) => {
    try {
      const res = await clienteAxios.get(`/api/biostar-catalogos/access-groups/${row.id_externo}`);
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo consultar", text: res.data.mensaje || "Operacion fallida." });
        return;
      }
      const d = res.data.datos || {};
      setEditandoId(String(d.id_externo || row.id_externo));
      setNombre(String(d.nombre || row.nombre || ""));
      setDescripcion(String(d.descripcion || row.descripcion || ""));
      setNivelesSel((d.niveles || []).map((x: OptionItem) => String(x.id_externo)));
      setGruposSel((d.grupos_usuarios || []).map((x: OptionItem) => String(x.id_externo)));
      setUsuariosSel((d.usuarios || []).map((x: OptionItem) => String(x.id_externo)));
      setOpenEditar(true);
    } catch (error) {
      handlingError(error);
    }
  };

  const toPayload = () => ({
    nombre: nombre.trim(),
    descripcion: descripcion.trim(),
    niveles: niveles.filter((x) => nivelesSel.includes(String(x.id_externo))),
    grupos_usuarios: gruposUsuarios.filter((x) => gruposSel.includes(String(x.id_externo))),
    usuarios: usuarios.filter((x) => usuariosSel.includes(String(x.id_externo))),
  });

  const guardarNuevo = async () => {
    if (!nombre.trim()) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "El nombre es obligatorio." });
      return;
    }
    const res = await clienteAxios.post("/api/biostar-catalogos/access-groups", toPayload());
    if (!res.data.estado) {
      await Swal.fire({ icon: "error", title: "No se pudo crear", text: res.data.mensaje || "Operacion fallida." });
      return;
    }
    setOpenNuevo(false);
    await Swal.fire({ icon: "success", title: "Permiso creado", text: res.data.mensaje || "Operacion correcta." });
    await cargar();
  };

  const guardarEditar = async () => {
    if (!editandoId || !nombre.trim()) {
      await Swal.fire({ icon: "warning", title: "Faltan datos", text: "Id y nombre son obligatorios." });
      return;
    }
    const res = await clienteAxios.put(`/api/biostar-catalogos/access-groups/${editandoId}`, toPayload());
    if (!res.data.estado) {
      await Swal.fire({ icon: "error", title: "No se pudo editar", text: res.data.mensaje || "Operacion fallida." });
      return;
    }
    setOpenEditar(false);
    await Swal.fire({ icon: "success", title: "Permiso editado", text: res.data.mensaje || "Operacion correcta." });
    await cargar();
  };

  const eliminar = async (row: Row) => {
    const c = await Swal.fire({
      icon: "warning",
      title: "Eliminar permiso",
      text: `Seguro que quieres eliminar '${row.nombre}'?`,
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!c.isConfirmed) return;
    const res = await clienteAxios.delete(`/api/biostar-catalogos/access-groups/${row.id_externo}`);
    if (!res.data.estado) {
      await Swal.fire({ icon: "error", title: "No se pudo eliminar", text: res.data.mensaje || "Operacion fallida." });
      return;
    }
    await Swal.fire({ icon: "success", title: "Permiso eliminado", text: res.data.mensaje || "Operacion correcta." });
    await cargar();
  };

  const columns = useMemo<GridColDef<Row>[]>(() => [
    { field: "nombre", headerName: "Nombre", flex: 1, minWidth: 220 },
    { field: "descripcion", headerName: "Descripcion", flex: 1, minWidth: 200 },
    { field: "total_niveles", headerName: "Niveles", minWidth: 110, align: "center", headerAlign: "center" },
    { field: "total_grupos_usuarios", headerName: "Grupos", minWidth: 110, align: "center", headerAlign: "center" },
    { field: "total_usuarios", headerName: "Usuarios", minWidth: 110, align: "center", headerAlign: "center" },
    {
      field: "acciones",
      headerName: "Acciones",
      type: "actions",
      minWidth: 120,
      getActions: ({ row }) => [
        <GridActionsCellItem icon={<Edit color="primary" />} label="Editar" onClick={() => { void abrirEditar(row); }} />,
        <GridActionsCellItem icon={<Delete color="error" />} label="Eliminar" onClick={() => { void eliminar(row); }} />,
      ],
    },
  ], []);

  const renderMulti = (
    label: string,
    options: OptionItem[],
    value: string[],
    setValue: (v: string[]) => void,
    formatLabel?: (o: OptionItem) => string
  ) => (
    <Autocomplete
      multiple
      options={options}
      getOptionLabel={(o) => (formatLabel ? formatLabel(o) : o.nombre)}
      filterSelectedOptions
      disableCloseOnSelect
      value={options.filter((o) => value.includes(String(o.id_externo)))}
      onChange={(_, selected) => setValue(selected.map((x) => String(x.id_externo)))}
      isOptionEqualToValue={(o, v) => String(o.id_externo) === String(v.id_externo)}
      ListboxProps={{ style: { maxHeight: 240, overflowY: "auto" } }}
      slotProps={{
        popper: {
          placement: "bottom-start",
          modifiers: [
            { name: "flip", enabled: false },
            { name: "offset", options: { offset: [0, 6] } },
            { name: "preventOverflow", options: { padding: 8, altAxis: true, tether: true } },
          ],
        },
      }}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );

  const form = (
    <Stack spacing={2} sx={{ mt: 1 }}>
      <TextField label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} fullWidth />
      <TextField label="Descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} fullWidth />
      {renderMulti("Niveles de acceso", niveles, nivelesSel, setNivelesSel)}
      {renderMulti("Grupos de usuarios", gruposUsuarios, gruposSel, setGruposSel, (o) => `Grupo ${o.nombre}`)}
      {renderMulti("Usuarios", usuarios, usuariosSel, setUsuariosSel)}
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
              tableTitle="Permisos de Acceso BioStar"
              customActionButtons={
                <>
                  <Tooltip title="Recargar"><IconButton size="small" onClick={async () => { await cargarCatalogos(); await cargar(); }}><Refresh /></IconButton></Tooltip>
                  <Tooltip title="Agregar"><IconButton size="small" onClick={abrirNuevo}><Add /></IconButton></Tooltip>
                </>
              }
            />
          ),
        }}
      />

      <Dialog open={openNuevo} onClose={() => setOpenNuevo(false)} maxWidth="md" fullWidth>
        <DialogTitle>Nuevo Permiso de Acceso</DialogTitle>
        <DialogContent>{form}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNuevo(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => { void guardarNuevo(); }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditar} onClose={() => setOpenEditar(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Permiso de Acceso</DialogTitle>
        <DialogContent>{form}</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditar(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => { void guardarEditar(); }}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
