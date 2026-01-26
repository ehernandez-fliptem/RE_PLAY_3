import { Box, MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import { useState } from "react";
import { clienteAxios } from "../../app/config/axios";
import type { IRootState } from "../../app/store";
import { useSelector } from "react-redux";
import { DoorFront, MeetingRoom } from "@mui/icons-material";

export default function Access() {
  const ACCESO = localStorage.getItem("SELECTED_ACCESS");
  const { accesos } = useSelector((state: IRootState) => state.auth.data);
  const [acceso, setAcceso] = useState(ACCESO || "");
  const [open, setOpen] = useState(false);

  const handleChangeAcceso = (event: SelectChangeEvent) => {
    clienteAxios.defaults.headers.common["x-access-default-entrance"] =
      event.target.value;
    localStorage.setItem("SELECTED_ACCESS", event.target.value);
    setAcceso(event.target.value);
    const newEvent = new StorageEvent("storage", {
      key: "SELECTED_ACCESS",
      oldValue: ACCESO,
      newValue: event.target.value,
    });

    window.dispatchEvent(newEvent);
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
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
      })}
    >
      <Select
        variant="outlined"
        value={acceso}
        onChange={handleChangeAcceso}
        onOpen={handleOpen}
        onClose={handleClose}
        open={open}
        readOnly={accesos.length === 1}
        size="small"
        IconComponent={open ? MeetingRoom : DoorFront}
        sx={{
          "& .MuiSelect-select": {
            paddingLeft: "50px", // Add padding to make space for the icon
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
        {accesos.map((item) => (
          <MenuItem value={item._id}>
            {item.identificador} - {item.nombre}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}
