import { useMemo, useState } from "react";
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import { useFormContext } from "react-hook-form";
import { MODULOS_PERMISOS, type ModuloPermisoId } from "../../../../app/constants/permisosModulos";
import { getRoleLabel } from "../../../../app/utils/roleLabels";
import Swal from "sweetalert2";
import { DeleteOutline, Replay } from "@mui/icons-material";
import { clienteAxios } from "../../../../app/config/axios";
import { enqueueSnackbar } from "notistack";

export default function PermisosRoles() {
  const { watch, setValue } = useFormContext();
  const roles = (watch("roles") || []) as Array<{ _id?: string; rol?: number; nombre: string }>;
  const permisos = (watch("permisos_roles") || []) as Array<{
    rol: number;
    modulo_inicio: string;
    modulos: Record<string, boolean>;
  }>;
  const [openNuevoRol, setOpenNuevoRol] = useState(false);
  const [nuevoRolNombre, setNuevoRolNombre] = useState("");
  const [nuevoRolBase, setNuevoRolBase] = useState<number | "">("");

  const flags = {
    hv: !!watch("habilitarIntegracionHv"),
    biostar: !!watch("habilitarIntegracionBiostar"),
    camaras: !!watch("habilitarCamaras"),
    contratistas: !!watch("habilitarContratistas"),
    campo: !!watch("habilitarRegistroCampo"),
  };

  const rolesPermitidos = useMemo(() => {
    const base = new Set<number>([1, 2, 4, 5, 13]);
    const legacyOcultos = new Set<number>([6, 7, 10]);
    if (flags.contratistas) base.add(11);
    if (flags.campo) base.add(12);
    roles.forEach((r) => {
      const rolNum = Number(r.rol || 0);
      if (!rolNum || legacyOcultos.has(rolNum)) return;
      if (rolNum === 11 && !flags.contratistas) return;
      if (rolNum === 12 && !flags.campo) return;
      base.add(rolNum);
    });
    return Array.from(base);
  }, [flags.contratistas, flags.campo, roles]);

  const defaultsByRole = useMemo<Record<number, ModuloPermisoId[]>>(
    () => ({
      1: MODULOS_PERMISOS.map((m) => m.id),
      2: ["eventos", "kiosco", "empleados", "visitantes", "contratistas", "directorio", "catalogos", "biostar"],
      4: ["visitantes"],
      5: ["eventos", "kiosco", "visitantes"],
      11: ["portal_contratistas"],
      12: ["campo"],
      13: ["kiosco", "visitantes", "eventos", "escaner_qr"],
    }),
    []
  );

  const rolesVisibles = useMemo(() => {
    const byRol = new Map<number, { rol?: number; nombre: string }>();
    roles.forEach((r) => {
      const rolNum = Number(r.rol || 0);
      if (rolNum) byRol.set(rolNum, r);
    });
    return rolesPermitidos.map((rolNum) => {
      const found = byRol.get(rolNum);
      return {
        rol: rolNum,
        nombre: getRoleLabel(rolNum, found?.nombre || ""),
      };
    });
  }, [roles, rolesPermitidos]);

  const modulosVisibles = useMemo(
    () =>
      MODULOS_PERMISOS.filter((m) => {
        if (!m.integracion) return true;
        if (m.integracion === "hv") return flags.hv;
        if (m.integracion === "biostar") return flags.biostar;
        if (m.integracion === "camaras") return flags.camaras;
        if (m.integracion === "contratistas") return flags.contratistas;
        if (m.integracion === "campo") return flags.campo;
        return true;
      }),
    [flags]
  );

  const idxByRol = useMemo(() => {
    const map = new Map<number, number>();
    permisos.forEach((p, i) => map.set(Number(p.rol), i));
    return map;
  }, [permisos]);

  const ensurePermisoRol = (rolNum: number) => {
    const idx = idxByRol.get(rolNum);
    if (idx !== undefined) return idx;
    const nuevo = {
      rol: rolNum,
      modulo_inicio: "",
      modulos: {},
    };
    setValue("permisos_roles", [...permisos, nuevo], { shouldDirty: true, shouldValidate: false });
    return permisos.length;
  };

  const toggleModulo = (rolNum: number, modulo: ModuloPermisoId, checked: boolean) => {
    const idx = ensurePermisoRol(rolNum);
    const next = [...(watch("permisos_roles") || [])] as typeof permisos;
    const row = { ...(next[idx] || { rol: rolNum, modulo_inicio: "", modulos: {} }) };
    const modulos = { ...(row.modulos || {}) };
    modulos[modulo] = checked;
    if (!checked && row.modulo_inicio === modulo) row.modulo_inicio = "";
    if (rolNum === 1 && modulo === "permisos") modulos.permisos = true;
    row.modulos = modulos;
    next[idx] = row;
    setValue("permisos_roles", next, { shouldDirty: true, shouldValidate: false });
  };

  const setInicio = (rolNum: number, modulo: string) => {
    const idx = ensurePermisoRol(rolNum);
    const next = [...(watch("permisos_roles") || [])] as typeof permisos;
    const row = { ...(next[idx] || { rol: rolNum, modulo_inicio: "", modulos: {} }) };
    row.modulo_inicio = modulo;
    next[idx] = row;
    setValue("permisos_roles", next, { shouldDirty: true, shouldValidate: false });
  };

  const resetPermisosPredeterminados = async () => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Reiniciar permisos",
      text: "¿Seguro que deseas regresar todos los roles a su configuración predeterminada?",
      showCancelButton: true,
      confirmButtonText: "Sí, reiniciar",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;

    const nuevosPermisos = rolesVisibles.map((r) => {
      const rolNum = Number(r.rol || 0);
      const defaults = defaultsByRole[rolNum] || [];
      const modulos: Record<string, boolean> = {};
      MODULOS_PERMISOS.forEach((m) => {
        modulos[m.id] = defaults.includes(m.id);
      });
      const modulo_inicio = defaults[0] || "";
      return { rol: rolNum, modulos, modulo_inicio };
    });
    setValue("permisos_roles", nuevosPermisos, { shouldDirty: true, shouldValidate: false });
  };

  const resetRolPredeterminado = async (rolNum: number, nombreRol: string) => {
    const defaults = defaultsByRole[rolNum] || [];
    const idx = idxByRol.get(rolNum);
    const actual = idx !== undefined
      ? permisos[idx]
      : { rol: rolNum, modulo_inicio: "", modulos: {} as Record<string, boolean> };

    const actualInicio = String(actual.modulo_inicio || "");
    const defaultInicio = defaults[0] || "";
    const sameInicio = actualInicio === defaultInicio;
    const sameModulos = MODULOS_PERMISOS.every((m) => {
      const currentValue = Boolean(actual.modulos?.[m.id]);
      const defaultValue = defaults.includes(m.id);
      return currentValue === defaultValue;
    });
    if (sameInicio && sameModulos) return;

    const confirm = await Swal.fire({
      icon: "warning",
      title: "Reiniciar rol",
      text: `¿Seguro que deseas reiniciar el rol "${nombreRol}" a predeterminado?`,
      showCancelButton: true,
      confirmButtonText: "Sí, reiniciar",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;

    const modulos: Record<string, boolean> = {};
    MODULOS_PERMISOS.forEach((m) => {
      modulos[m.id] = defaults.includes(m.id);
    });
    const next = [...(watch("permisos_roles") || [])] as typeof permisos;
    const modulo_inicio = defaults[0] || "";
    if (idx !== undefined) {
      next[idx] = { rol: rolNum, modulos, modulo_inicio };
    } else {
      next.push({ rol: rolNum, modulos, modulo_inicio });
    }
    setValue("permisos_roles", next, { shouldDirty: true, shouldValidate: false });
  };

  const crearRol = async () => {
    const nombre = nuevoRolNombre.trim();
    if (!nombre) return;
    try {
      const res = await clienteAxios.post("/api/configuracion/roles/personalizado", { nombre });
      if (!res.data?.estado) {
        enqueueSnackbar(res.data?.mensaje || "No se pudo crear el rol.", { variant: "warning" });
        return;
      }

      const nuevoRol = {
        _id: String(res.data?.datos?._id || ""),
        rol: Number(res.data?.datos?.rol || 0),
        nombre: String(res.data?.datos?.nombre || nombre),
      };
      const currentRoles = (watch("roles") || []) as Array<{ _id?: string; rol?: number; nombre: string }>;
      const nextRoles = [...currentRoles, nuevoRol];
      setValue("roles", nextRoles, { shouldDirty: true, shouldValidate: false });

      const base = nuevoRolBase === "" ? null : permisos.find((p) => Number(p.rol) === Number(nuevoRolBase));
      const modulos = base?.modulos ? { ...base.modulos } : {};
      const modulo_inicio = base?.modulo_inicio || "";
      const nextPermisos = [...permisos, { rol: nuevoRol.rol!, modulos, modulo_inicio }];
      setValue("permisos_roles", nextPermisos, { shouldDirty: true, shouldValidate: false });

      setNuevoRolNombre("");
      setNuevoRolBase("");
      setOpenNuevoRol(false);
      enqueueSnackbar("Rol creado correctamente.", { variant: "success" });
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.mensaje || "No se pudo crear el rol.", { variant: "error" });
    }
  };

  const formatRoleName = (value: string) =>
    value
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/(^|\s)\S/g, (l) => l.toUpperCase());

  const eliminarRolCustom = async (rolNum: number, nombreRol: string) => {
    const confirm = await Swal.fire({
      icon: "warning",
      title: "Eliminar rol",
      text: `¿Seguro que deseas eliminar el rol "${nombreRol}"?`,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;

    try {
      const res = await clienteAxios.delete(`/api/configuracion/roles/personalizado/${rolNum}`);
      if (!res.data?.estado) {
        enqueueSnackbar(res.data?.mensaje || "No se pudo eliminar el rol.", { variant: "warning" });
        return;
      }
      const nextRoles = ((watch("roles") || []) as Array<{ _id?: string; rol?: number; nombre: string }>)
        .filter((r) => Number(r.rol || 0) !== rolNum);
      setValue("roles", nextRoles, { shouldDirty: true, shouldValidate: false });

      const nextPermisos = ((watch("permisos_roles") || []) as typeof permisos)
        .filter((p) => Number(p.rol) !== rolNum);
      setValue("permisos_roles", nextPermisos, { shouldDirty: true, shouldValidate: false });
      enqueueSnackbar("Rol eliminado correctamente.", { variant: "success" });
    } catch (error: any) {
      enqueueSnackbar(error?.response?.data?.mensaje || "No se pudo eliminar el rol.", { variant: "error" });
    }
  };

  return (
    <Box sx={{ mt: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1, gap: 1, flexWrap: "wrap" }}>
        <Typography variant="overline"><strong>Permisos Generales por Rol</strong></Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" variant="outlined" onClick={() => setOpenNuevoRol(true)}>
            Nuevo rol
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={resetPermisosPredeterminados}
            startIcon={<Replay sx={{ fontSize: 16 }} />}
            sx={{
              color: "#d32f2f",
              borderColor: "#d32f2f",
              textTransform: "uppercase",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.4px",
              minHeight: 32,
              px: 1.25,
              "&:hover": {
                borderColor: "#b71c1c",
                backgroundColor: "rgba(211, 47, 47, 0.08)",
              },
            }}
          >
            Reiniciar todo
          </Button>
        </Box>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Rol</TableCell>
            <TableCell>Inicio</TableCell>
            {modulosVisibles.map((m) => (
              <TableCell key={m.id} align="center">{m.nombre}</TableCell>
            ))}
            <TableCell align="center">Acciones</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rolesVisibles.map((r) => {
            const rolNum = Number(r.rol || 0);
            const idx = idxByRol.get(rolNum);
            const row = idx !== undefined ? permisos[idx] : { rol: rolNum, modulo_inicio: "", modulos: {} as Record<string, boolean> };
            const opcionesInicio = modulosVisibles.filter((m) => Boolean(row.modulos?.[m.id]));
            return (
              <TableRow key={rolNum || r.nombre}>
                <TableCell>
                  <Typography variant="body2">{r.nombre}</Typography>
                </TableCell>
                <TableCell sx={{ minWidth: 180 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Modulo</InputLabel>
                    <Select
                      label="Modulo"
                      value={row.modulo_inicio || ""}
                      onChange={(e) => setInicio(rolNum, String(e.target.value || ""))}
                    >
                      <MenuItem value=""><em>Sin inicio</em></MenuItem>
                      {opcionesInicio.map((m) => (
                        <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                {modulosVisibles.map((m) => {
                  const checked =
                    Boolean(row.modulos?.[m.id]) ||
                    (rolNum === 1 && (m.id === "permisos" || m.id === "configuracion"));
                  return (
                    <TableCell key={m.id} align="center">
                      <Checkbox
                        checked={checked}
                        disabled={rolNum === 1 && (m.id === "permisos" || m.id === "configuracion")}
                        onChange={(e) => toggleModulo(rolNum, m.id, e.target.checked)}
                      />
                    </TableCell>
                  );
                })}
                <TableCell align="center">
                  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                    <Tooltip title={`Reiniciar rol ${r.nombre}`}>
                      <IconButton size="small" onClick={() => resetRolPredeterminado(rolNum, r.nombre)}>
                        <Replay fontSize="inherit" />
                      </IconButton>
                    </Tooltip>
                    {rolNum >= 100 && (
                      <Tooltip title={`Eliminar rol ${r.nombre}`}>
                        <IconButton size="small" color="error" onClick={() => eliminarRolCustom(rolNum, r.nombre)}>
                          <DeleteOutline fontSize="inherit" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Dialog open={openNuevoRol} onClose={() => setOpenNuevoRol(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nuevo rol</DialogTitle>
        <DialogContent>
          <TextField
            label="Nombre del rol"
            value={nuevoRolNombre}
            onChange={(e) => setNuevoRolNombre(formatRoleName(e.target.value))}
            fullWidth
            margin="dense"
          />
          <FormControl fullWidth size="small" margin="dense">
            <InputLabel>Base de rol</InputLabel>
            <Select
              label="Base de rol"
              value={nuevoRolBase}
              onChange={(e) => {
                const selected = String(e.target.value ?? "");
                setNuevoRolBase(selected === "" ? "" : Number(selected));
              }}
            >
              <MenuItem value=""><em>Sin predeterminado</em></MenuItem>
              {rolesVisibles.map((r) => (
                <MenuItem key={String(r.rol)} value={Number(r.rol || 0)}>
                  {r.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNuevoRol(false)}>Cerrar</Button>
          <Button onClick={crearRol} variant="contained" disabled={!nuevoRolNombre.trim()}>
            Crear rol
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
