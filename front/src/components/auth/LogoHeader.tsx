import { Fragment, useEffect, useState } from "react";
import { Avatar, Box, Typography } from "@mui/material";
import { LockOutlined } from "@mui/icons-material";
import { clienteAxios, handlingError } from "../../app/config/axios";
import { useDispatch } from "react-redux";
import { updateColorPalette } from "../../app/features/config/configSlice";

export default function LogoHeader() {
  const [logo, setLogo] = useState("");
  const [appNombre, setAppNombre] = useState("");
  const dispatch = useDispatch();

  useEffect(() => {
    const obtenerImagenEmpresa = async () => {
      try {
        const res = await clienteAxios.get("/api/validacion/generales");
        if (res.data.estado) {
          const { img_empresa, appNombre, palette } = res.data.datos;
          dispatch(updateColorPalette(palette));
          setLogo(img_empresa);
          setAppNombre(appNombre);
          document.title = appNombre;
        }
      } catch (error) {
        handlingError(error);
      }
    };
    obtenerImagenEmpresa();
  }, []);

  return (
    <Fragment>
      {logo ? (
        <Box component="img" src={logo} sx={{ m: 2, maxWidth: 100 }} />
      ) : (
        <Avatar
          sx={{
            m: 2,
            bgcolor: "primary.main",
            color: "primary.contrastText",
          }}
        >
          <LockOutlined />
        </Avatar>
      )}
      <Typography component="h1" variant="h5" textAlign="center">
        {appNombre}
      </Typography>
    </Fragment>
  );
}
