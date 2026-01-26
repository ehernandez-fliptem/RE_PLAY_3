import {
  Checkbox,
  FormControlLabel,
  Grid,
  type CheckboxProps,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  TextFieldElement,
  useFormContext,
  type TextFieldElementProps,
} from "react-hook-form-mui";
import {
  clienteAxios,
  handlingError,
} from "../../../../../../app/config/axios";
import Spinner from "../../../../../utils/Spinner";

type Props = {
  parentImgName: string;
  textFieldProps: TextFieldElementProps;
  checkBoxProps?: CheckboxProps;
  disabledCheckBox?: boolean;
};

export default function AutocompleteOcrInput({
  parentImgName,
  textFieldProps,
  checkBoxProps,
  disabledCheckBox,
}: Props) {
  const { watch, setValue, setError, clearErrors } = useFormContext();
  const parentValue = watch(parentImgName);
  const [ocr, setOcr] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ocr || !parentValue) return;
    const obtenerOcr = async () => {
      setLoading(true);
      try {
        const res = await clienteAxios.post("/api/ocr", {
          img: parentValue,
        });
        if (res.data.estado) {
          setValue(textFieldProps.name, res.data.datos);
          clearErrors(textFieldProps.name);
        } else {
          setError(textFieldProps.name, {
            message: res.data.mensaje,
            type: "value",
          });
        }
      } catch (error) {
        handlingError(error);
      } finally {
        setLoading(false);
      }
    };
    obtenerOcr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocr, parentValue]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOcr(event.target.checked);
  };
  return (
    <Grid container columnSpacing={2}>
      <Grid size={disabledCheckBox ? 12 : { xs: 12, sm: 9 }}>
        <TextFieldElement disabled={loading} {...textFieldProps} />
      </Grid>
      {!disabledCheckBox && (
        <Grid
          size={{ xs: 12, sm: 3 }}
          display="flex"
          alignItems="center"
          justifyContent={{ xs: "end", sm: "center" }}
        >
          {loading ? (
            <Spinner size="small" />
          ) : (
            <FormControlLabel
              sx={{ m: 0 }}
              label="OCR"
              control={
                <Checkbox
                  name="ocr"
                  checked={ocr}
                  onChange={handleChange}
                  disabled={loading}
                  {...checkBoxProps}
                />
              }
            />
          )}
        </Grid>
      )}
    </Grid>
  );
}
