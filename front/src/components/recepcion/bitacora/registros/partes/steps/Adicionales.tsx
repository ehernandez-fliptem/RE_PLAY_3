import { Abc, Accessible, DirectionsCar } from "@mui/icons-material";
import { InputAdornment } from "@mui/material";
import { Fragment } from "react";
import { TextFieldElement } from "react-hook-form-mui";

type Props = {
  type: number;
};

export default function Adicionales({ type }: Props) {
  return (
    <Fragment>
      <TextFieldElement
        name="comentarios"
        label="Comentarios"
        fullWidth
        margin="normal"
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Accessible />
              </InputAdornment>
            ),
          },
        }}
      />
      {[1, 2].includes(type) && (
        <Fragment>
          <TextFieldElement
            name="placas"
            label="Placas del Vehículo"
            fullWidth
            margin="normal"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <Abc />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextFieldElement
            name="desc_vehiculo"
            label="Descripción del Vehículo"
            fullWidth
            margin="normal"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <DirectionsCar />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Fragment>
      )}
    </Fragment>
  );
}
