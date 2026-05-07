import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Add, Delete, Edit, Search, Sync } from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";
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
}

export default function DispositivosBiostarRemotos() {
  const [rows, setRows] = useState<RemoteDevice[]>([]);
  const [loading, setLoading] = useState(false);

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

  const buscarPorIpPuerto = async () => {
    const result = await Swal.fire({
      title: "Buscar dispositivo",
      html: `
        <input id="bio-search-ip" class="swal2-input" placeholder="Direccion IP" autocomplete="off">
        <input id="bio-search-port" class="swal2-input" placeholder="Puerto" value="51211" autocomplete="off">
      `,
      showCancelButton: true,
      confirmButtonText: "Buscar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const direccion_ip = (document.getElementById("bio-search-ip") as HTMLInputElement)?.value?.trim();
        const puerto = Number((document.getElementById("bio-search-port") as HTMLInputElement)?.value || 51211);
        if (!direccion_ip) {
          Swal.showValidationMessage("Ingresa una direccion IP.");
          return null;
        }
        return { direccion_ip, puerto };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    setLoading(true);
    try {
      const res = await clienteAxios.post("/api/dispositivos-biostar/remotos/buscar", result.value);
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "Sin resultados", text: res.data.mensaje || "No se encontraron dispositivos." });
        return;
      }
      setRows(res.data.datos || []);
      if ((res.data.datos || []).length === 0) {
        await Swal.fire({ icon: "info", title: "Sin resultados", text: "No se encontro ningun dispositivo para esa IP/puerto." });
      }
    } catch (error) {
      handlingError(error);
    } finally {
      setLoading(false);
    }
  };

  const crearDispositivo = async () => {
    const result = await Swal.fire({
      title: "Agregar dispositivo",
      html: `
        <input id="bio-new-name" class="swal2-input" placeholder="Nombre" autocomplete="off">
        <input id="bio-new-ip" class="swal2-input" placeholder="Direccion IP" autocomplete="off">
        <input id="bio-new-port" class="swal2-input" placeholder="Puerto" value="51211" autocomplete="off">
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const nombre = (document.getElementById("bio-new-name") as HTMLInputElement)?.value?.trim();
        const direccion_ip = (document.getElementById("bio-new-ip") as HTMLInputElement)?.value?.trim();
        const puerto = Number((document.getElementById("bio-new-port") as HTMLInputElement)?.value || 51211);
        if (!direccion_ip) {
          Swal.showValidationMessage("La direccion IP es obligatoria.");
          return null;
        }
        return { nombre, direccion_ip, puerto };
      },
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      const res = await clienteAxios.post("/api/dispositivos-biostar/remotos", result.value);
      if (!res.data.estado) {
        await Swal.fire({ icon: "error", title: "No se pudo crear", text: res.data.mensaje || "No se pudo crear el dispositivo." });
        return;
      }
      await Swal.fire({ icon: "success", title: "Dispositivo agregado", text: res.data.mensaje || "Registro completado." });
      await cargarTodos();
    } catch (error) {
      handlingError(error);
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
    cargarTodos();
  }, []);

  const columns = useMemo<GridColDef<RemoteDevice>[]>(
    () => [
      { field: "nombre", headerName: "Nombre", flex: 1, minWidth: 180 },
      { field: "direccion_ip", headerName: "IP", flex: 1, minWidth: 150 },
      { field: "puerto", headerName: "Puerto", flex: 0.5, minWidth: 95 },
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
        rows={rows}
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
                <>
                  <Tooltip title="Recargar (all)">
                    <IconButton size="small" onClick={cargarTodos}>
                      <Sync />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Buscar por IP/Puerto">
                    <IconButton size="small" onClick={buscarPorIpPuerto}>
                      <Search />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Agregar">
                    <IconButton size="small" onClick={crearDispositivo}>
                      <Add />
                    </IconButton>
                  </Tooltip>
                </>
              }
            />
          ),
        }}
      />
    </div>
  );
}
