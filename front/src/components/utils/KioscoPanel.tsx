import { DoorFront, MeetingRoom } from "@mui/icons-material";
import { Box, MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { clienteAxios } from "../../app/config/axios";
import type { IRootState } from "../../app/store";

type IPanel = {
  _id: string;
  nombre: string;
};

const STORAGE_KEY = "SELECTED_KIOSCO_PANEL";

export default function KioscoPanel() {
  const { habilitarRegistroCampo } = useSelector(
    (state: IRootState) => state.config.data
  );
  const [panel, setPanel] = useState(
    habilitarRegistroCampo ? "campo" : "all"
  );
  const [open, setOpen] = useState(false);
  const [paneles, setPaneles] = useState<IPanel[]>([]);

  const obtenerPaneles = useCallback(async () => {
    try {
      const res = await clienteAxios.get("/api/eventos/kiosco/paneles");
      if (res.data?.estado) {
        setPaneles(res.data.datos || []);
      }
    } catch {
      setPaneles([]);
    }
  }, []);

  useEffect(() => {
    obtenerPaneles();
  }, [obtenerPaneles]);

  useEffect(() => {
    const nextValue = habilitarRegistroCampo ? "campo" : "all";
    localStorage.setItem(STORAGE_KEY, nextValue);
    setPanel(nextValue);
  }, [habilitarRegistroCampo]);

  const handleChangePanel = (event: SelectChangeEvent) => {
    const oldValue = localStorage.getItem(STORAGE_KEY);
    const value = String(event.target.value || "all");
    localStorage.setItem(STORAGE_KEY, value);
    setPanel(value);
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: STORAGE_KEY,
        oldValue,
        newValue: value,
      })
    );
  };

  return (
    <Box
      component="div"
      bgcolor={(theme) =>
        theme.palette.mode === "dark" ? "primary.dark" : "white"
      }
      color="secondary.contrastText"
      sx={(theme) => ({
        p: 0.5,
        borderRadius: 1,
        boxShadow: theme.shadows[8],
        width: { xs: "100%", sm: 320 },
      })}
    >
      <Select
        variant="outlined"
        value={panel}
        onChange={handleChangePanel}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        open={open}
        size="small"
        IconComponent={open ? MeetingRoom : DoorFront}
        sx={{
          width: "100%",
          "& .MuiSelect-select": {
            paddingLeft: "50px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          },
          ".MuiSelect-icon": {
            position: "absolute",
            left: 5,
            color: "primary.main",
          },
          ".MuiSelect-iconOpen": {
            position: "absolute",
            left: 5,
            transform: "scaleX(-1);",
          },
        }}
      >
        <MenuItem value="all">Todos los paneles</MenuItem>
        {habilitarRegistroCampo && (
          <MenuItem value="campo">Registro de Campo</MenuItem>
        )}
        {paneles.map((item) => (
          <MenuItem key={item._id} value={item._id}>
            {item.nombre}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
