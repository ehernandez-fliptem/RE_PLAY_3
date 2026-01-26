import {
  Checkbox,
  FormControlLabel,
  Grid,
  TextField,
  type CheckboxProps,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Controller,
  useFormContext,
  type TextFieldElementProps,
} from "react-hook-form-mui";
import {
  clienteAxios,
  handlingError,
} from "../../../../../../app/config/axios";
import Spinner from "../../../../../utils/Spinner";
import useDebounce from "../../../../../../hooks/useDebounce";

type Props = {
  extraQueries?: string;
  searchValueName: string;
  textFieldProps: TextFieldElementProps;
  checkBoxProps?: CheckboxProps;
};
export default function AutocompleteInput({
  extraQueries,
  searchValueName,
  textFieldProps,
  checkBoxProps,
}: Props) {
  const { control, reset, setError } = useFormContext();
  const [autoCompletar, setAutoCompletar] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [inputValue, setInputValue] = useState("");
  const debouncedValue = useDebounce(inputValue, 650);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const fetchData = useCallback(
    async (value: string) => {
      try {
        setLoading(true);
        const res = await clienteAxios.get(
          `/api/registros/ultimo-registro?${
            extraQueries ? `${extraQueries}&` : ""
          }${searchValueName}=${value}`
        );
        switch (res.data.estado) {
          case 1:
            reset({ [textFieldProps.name]: value, ...res.data.datos });
            break;
          case 2:
            setMensaje(res.data.mensaje);
            break;
          case 3:
            setError(textFieldProps.name, {
              message: res.data.mensaje,
              type: "value",
            });
            break;
          default:
            break;
        }
        inputRef.current?.focus();
      } catch (error) {
        handlingError(error);
      } finally {
        setLoading(false);
      }
    },
    [extraQueries, reset, searchValueName, setError, textFieldProps.name]
  );

  useEffect(() => {
    setMensaje("");
    if (autoCompletar && debouncedValue) fetchData(debouncedValue);
  }, [debouncedValue, autoCompletar, fetchData]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAutoCompletar(event.target.checked);
  };

  //   const handleChangeInpiut =(e: React.ChangeEvent<HTMLInputElement | TextFiel>)
  return (
    <Grid container columnSpacing={2}>
      <Grid size={{ xs: 12, sm: 9 }}>
        <Controller
          name={textFieldProps.name}
          control={control}
          render={({ field }) => (
            <TextField
              {...textFieldProps}
              {...field}
              helperText={mensaje}
              onChange={(e) => {
                field.onChange(e);
                setInputValue(e.target.value);
              }}
            />
          )}
        />
      </Grid>
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
            label="Autocompletar"
            control={
              <Checkbox
                name="autoCompletar"
                checked={autoCompletar}
                onChange={handleChange}
                disabled={loading}
                {...checkBoxProps}
              />
            }
          />
        )}
      </Grid>
    </Grid>
  );
}
