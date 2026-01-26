import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Box,
  IconButton,
  InputAdornment,
  TextField,
  type BoxProps,
} from "@mui/material";
import { type TextFieldElementProps } from "react-hook-form-mui";
import useDebounce from "../../../../hooks/useDebounce";
import { Cancel, Search } from "@mui/icons-material";

type Props = {
  boxProps?: BoxProps;
  textFieldProps: TextFieldElementProps;
  setValue: Dispatch<SetStateAction<string>>;
};

export default function SearchInput({
  boxProps,
  textFieldProps,
  setValue,
}: Props) {
  const [mensaje, setMensaje] = useState("");
  const [inputValue, setInputValue] = useState("");
  const debouncedValue = useDebounce(inputValue, 650);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMensaje("");
    if (debouncedValue) {
      setValue(debouncedValue);
      inputRef.current?.focus();
    } else {
      setValue("");
    }
  }, [debouncedValue, setValue]);

  return (
    <Box component="div" {...boxProps}>
      <TextField
        {...textFieldProps}
        helperText={mensaje}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: inputValue ? (
              <InputAdornment position="end">
                <IconButton
                  edge="end"
                  size="small"
                  aria-label="Clear search"
                  sx={{ marginRight: -0.75 }}
                  onClick={() => {
                    setValue("");
                    setInputValue("");
                  }}
                >
                  <Cancel fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          },
        }}
      />
    </Box>
  );
}
