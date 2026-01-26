import { Fragment } from "react";
import SelectTime from "../../../utils/SelectTime";
import { Typography } from "@mui/material";
import { Assignment } from "@mui/icons-material";

export default function Bitacora() {
  return (
    <Fragment>
      <Typography
        variant="overline"
        component="h2"
        sx={{ mb: 2 }}
        display="flex"
        alignItems="center"
      >
        <Assignment color="primary" sx={{ mr: 1 }} /> <strong>Bitácora</strong>
      </Typography>
      <SelectTime
        label="Tiempo de cancelación / finalización de registros y citas"
        name="tiempoCancelacionRegistros"
        required
      />
      <SelectTime
        label="Tiempo de tolerancia de entrada de citas"
        name="tiempoToleranciaEntrada"
        required
      />
      <Typography variant="body2" component="div" fontSize={12}>
        <strong>IMPORTANTE: </strong> Para la cancelación y finalización
        automática de un registro y/o cita se toman en cuenta ambos umbrales de
        tiempo. <br />
        Por ejemplo:
        <ul>
          <li>
            <strong>Entrada</strong>: 7:00 a.m
          </li>
          <li>
            <strong>Tolerancia de Entrada</strong>: 30 minutos
          </li>
          <li>
            <strong>Tiempo de cancelación/finalización</strong>: 30 minutos
          </li>
        </ul>
        La cancelación/finalización automática se realizará a las 8:00 a.m.
      </Typography>
    </Fragment>
  );
}
