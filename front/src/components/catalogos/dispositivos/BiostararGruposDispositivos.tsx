import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { Chip, IconButton, Tooltip } from "@mui/material";
import { Add, Delete, Edit, Refresh } from "@mui/icons-material";
import Swal from "sweetalert2";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { useNavigate } from "react-router-dom";

type GrupoDispositivo = {
  id_externo: string;
  nombre: string;
  depth: number;
  parent_id: string;
  es_all_devices?: boolean;
};

function normalizarNombreGrupo(value: string): string {
  const limpio = String(value || "").trim();
  if (!limpio) return "";
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

export default function BiostararGruposDispositivos() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<GrupoDispositivo[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await clienteAxios.get("/api/biostar-catalogos/grupos-dispositivos");
      if (res.data.estado) setRows(res.data.datos || []);
      else {
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
          if (action.isConfirmed) navigate("/biostarar/conexion");
        } else {
          await Swal.fire({ icon: "error", title: "No se pudo consultar", text: res.data.mensaje || "No se pudieron cargar los grupos." });
        }
      }
    } catch (error) {
      handlingError(error);
    } finally {
      setLoading(false);
    }
  };

  const crearGrupo = async () => {
    const result = await Swal.fire({
      title: "Nuevo Grupo de Dispositivos",
      input: "text",
      inputLabel: "Nombre del grupo",
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
      const res = await clienteAxios.post("/api/biostar-catalogos/grupos-dispositivos", {
        nombre: normalizarNombreGrupo(String(result.value)),
      });
      Swal.close();
      if (res.data.estado) {
        await Swal.fire({ icon: "success", title: "Grupo creado", text: res.data.mensaje || "Operacion correcta." });
        await cargar();
      } else {
        await Swal.fire({ icon: "error", title: "No se pudo crear", text: res.data.mensaje || "Operacion fallida." });
      }
    } catch (error) {
      Swal.close();
      handlingError(error);
    }
  };

  const editarGrupo = async (row: GrupoDispositivo) => {
    if (row.es_all_devices) return;
    const result = await Swal.fire({
      title: "Editar Grupo de Dispositivos",
      input: "text",
      inputLabel: "Nombre del grupo",
      inputValue: row.nombre,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => (!String(value || "").trim() ? "El nombre es obligatorio." : undefined),
    });
    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: "Guardando cambios...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });
      const res = await clienteAxios.put(`/api/biostar-catalogos/grupos-dispositivos/${row.id_externo}`, {
        nombre: normalizarNombreGrupo(String(result.value)),
      });
      Swal.close();
      if (res.data.estado) {
        await Swal.fire({ icon: "success", title: "Grupo editado", text: res.data.mensaje || "Operacion correcta." });
        await cargar();
      } else {
        await Swal.fire({ icon: "error", title: "No se pudo editar", text: res.data.mensaje || "Operacion fallida." });
      }
    } catch (error) {
      Swal.close();
      handlingError(error);
    }
  };

  const eliminarGrupo = async (row: GrupoDispositivo) => {
    if (row.es_all_devices) return;
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Eliminar grupo",
      text: `Seguro que quieres eliminar '${row.nombre}'?`,
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;

    try {
      Swal.fire({
        title: "Eliminando grupo...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });
      const res = await clienteAxios.delete(`/api/biostar-catalogos/grupos-dispositivos/${row.id_externo}`);
      Swal.close();
      if (res.data.estado) {
        await Swal.fire({ icon: "success", title: "Grupo eliminado", text: res.data.mensaje || "Operacion correcta." });
        await cargar();
      } else {
        await Swal.fire({ icon: "error", title: "No se pudo eliminar", text: res.data.mensaje || "Operacion fallida." });
      }
    } catch (error) {
      Swal.close();
      handlingError(error);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    return () => {
      Swal.close();
    };
  }, []);

  const columns = useMemo<GridColDef<GrupoDispositivo>[]>(
    () => [
      { field: "nombre", headerName: "Grupo de dispositivo", flex: 1, minWidth: 240 },
      { field: "id_externo", headerName: "ID", flex: 0.5, minWidth: 120 },
      { field: "depth", headerName: "Nivel", flex: 0.4, minWidth: 100 },
      {
        field: "tipo",
        headerName: "Tipo",
        flex: 0.6,
        minWidth: 160,
        renderCell: ({ row }) =>
          row.es_all_devices ? <Chip label="All Devices" color="info" size="small" /> : <Chip label="Grupo" size="small" />,
      },
      {
        field: "acciones",
        headerName: "Acciones",
        type: "actions",
        flex: 0.5,
        minWidth: 120,
        getActions: ({ row }) =>
          row.es_all_devices
            ? []
            : [
                <GridActionsCellItem icon={<Edit color="primary" />} label="Editar" onClick={() => editarGrupo(row)} />,
                <GridActionsCellItem icon={<Delete color="error" />} label="Eliminar" onClick={() => eliminarGrupo(row)} />,
              ],
      },
    ],
    []
  );

  return (
    <div style={{ minHeight: 420 }}>
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id_externo || row.nombre}
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
              tableTitle="Grupos de Dispositivos BioStar"
              customActionButtons={
                <>
                  <Tooltip title="Recargar">
                    <IconButton size="small" onClick={cargar}>
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Agregar">
                    <IconButton size="small" onClick={crearGrupo}>
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
