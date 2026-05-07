import { useEffect, useMemo, useState } from "react";
import { DataGrid, GridActionsCellItem, type GridColDef } from "@mui/x-data-grid";
import { esES } from "@mui/x-data-grid/locales";
import { IconButton, Tooltip } from "@mui/material";
import { Add, Delete, Edit, Refresh } from "@mui/icons-material";
import Swal from "sweetalert2";
import DataGridToolbar from "../../utils/DataGridToolbar";
import { clienteAxios, handlingError } from "../../../app/config/axios";
import { useNavigate } from "react-router-dom";

type PuertaBiostar = {
  id_externo: string;
  nombre: string;
  dispositivo: string;
  dispositivo_id?: string;
};

export default function BiostararPuertas() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PuertaBiostar[]>([]);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      const res = await clienteAxios.get("/api/biostar-catalogos/puertas");
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
          await Swal.fire({ icon: "error", title: "No se pudo consultar", text: res.data.mensaje || "No se pudieron cargar las puertas." });
        }
      }
    } catch (error) {
      handlingError(error);
    } finally {
      setLoading(false);
    }
  };

  const crearPuerta = async () => {
    const result = await Swal.fire({
      title: "Nuevo Grupo de Puertas",
      html: `
        <input id="puerta-nombre" class="swal2-input" placeholder="Nombre">
        <input id="puerta-dispositivo-id" class="swal2-input" placeholder="ID de dispositivo">
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const nombre = (document.getElementById("puerta-nombre") as HTMLInputElement)?.value?.trim();
        const dispositivo_id = (document.getElementById("puerta-dispositivo-id") as HTMLInputElement)?.value?.trim();
        if (!nombre || !dispositivo_id) {
          Swal.showValidationMessage("Nombre e ID de dispositivo son obligatorios.");
          return null;
        }
        return { nombre, dispositivo_id };
      },
    });

    if (!result.isConfirmed || !result.value) return;
    try {
      Swal.fire({
        title: "Creando puerta...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });
      const res = await clienteAxios.post("/api/biostar-catalogos/puertas", result.value);
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

  const editarPuerta = async (row: PuertaBiostar) => {
    const result = await Swal.fire({
      title: "Editar Grupo de Puertas",
      html: `
        <input id="puerta-nombre" class="swal2-input" placeholder="Nombre" value="${row.nombre || ""}">
        <input id="puerta-dispositivo-id" class="swal2-input" placeholder="ID de dispositivo" value="${row.dispositivo_id || ""}">
      `,
      showCancelButton: true,
      confirmButtonText: "Guardar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const nombre = (document.getElementById("puerta-nombre") as HTMLInputElement)?.value?.trim();
        const dispositivo_id = (document.getElementById("puerta-dispositivo-id") as HTMLInputElement)?.value?.trim();
        if (!nombre || !dispositivo_id) {
          Swal.showValidationMessage("Nombre e ID de dispositivo son obligatorios.");
          return null;
        }
        return { nombre, dispositivo_id };
      },
    });
    if (!result.isConfirmed || !result.value) return;

    try {
      Swal.fire({
        title: "Guardando cambios...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });
      const res = await clienteAxios.put(`/api/biostar-catalogos/puertas/${row.id_externo}`, result.value);
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

  const eliminarPuerta = async (row: PuertaBiostar) => {
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
        title: "Eliminando puerta...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });
      const res = await clienteAxios.delete(`/api/biostar-catalogos/puertas/${row.id_externo}`);
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

  const columns = useMemo<GridColDef<PuertaBiostar>[]>(
    () => [
      { field: "nombre", headerName: "Grupo", flex: 1, minWidth: 220 },
      { field: "dispositivo", headerName: "Dispositivo", flex: 1, minWidth: 220 },
      { field: "dispositivo_id", headerName: "ID Dispositivo", flex: 0.7, minWidth: 140 },
      { field: "id_externo", headerName: "ID", flex: 0.5, minWidth: 120 },
      {
        field: "acciones",
        headerName: "Acciones",
        type: "actions",
        flex: 0.5,
        minWidth: 120,
        getActions: ({ row }) => [
          <GridActionsCellItem icon={<Edit color="primary" />} label="Editar" onClick={() => editarPuerta(row)} />,
          <GridActionsCellItem icon={<Delete color="error" />} label="Eliminar" onClick={() => eliminarPuerta(row)} />,
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
              tableTitle="Grupos de Puertas BioStar"
              customActionButtons={
                <>
                  <Tooltip title="Recargar">
                    <IconButton size="small" onClick={cargar}>
                      <Refresh />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Agregar">
                    <IconButton size="small" onClick={crearPuerta}>
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
