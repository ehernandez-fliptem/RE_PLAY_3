import ReactDOM from "react-dom/client";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { Box, DialogContentText, Stack } from "@mui/material";
import Spinner from "../Spinner";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { CheckboxElement, TextFieldElement } from "react-hook-form-mui";
import { ThemeProvider } from "@mui/material/styles";
import { useMemo, useState } from "react";
import { globalTheme } from "../../../themes/theme";

type FormValues = {
  text: string;
  check: boolean;
};

const resolver = yup.object().shape({
  text: yup
    .string()
    .max(250, "El máximo es de 250 caracteres.")
    .required("Este campo es obligatorio."),
  check: yup.boolean(),
}) as yup.ObjectSchema<FormValues>;

const initialValue: FormValues = {
  text: "",
  check: false,
};

// Variable estática para controlar el estado del diálogo
let isDialogActive = false;

type Props = {
  label?: string;
  title?: string;
  text?: string;
  rows?: number;
  showCheckBox?: boolean;
};
export function showDialogComment({
  label = "Comentarios",
  title,
  text,
  rows = 4,
  showCheckBox = false,
}: Props): Promise<{
  isCancelled: boolean;
  isSubmitted: boolean;
  result: FormValues | null;
}> {
  return new Promise((resolve) => {
    if (isDialogActive) {
      return;
    }

    isDialogActive = true; // Marcar el diálogo como activo

    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = ReactDOM.createRoot(div);

    const handleClose = (
      mode: "submit" | "cancel",
      result: FormValues | null
    ) => {
      root.unmount();
      document.body.removeChild(div);
      isDialogActive = false; // Marcar el diálogo como inactivo
      resolve({
        isCancelled: mode === "cancel",
        isSubmitted: mode === "submit",
        result,
      });
    };

    const DialogComment = () => {
      const formContext = useForm({
        defaultValues: initialValue,
        resolver: yupResolver(resolver),
        shouldFocusError: true,
        criteriaMode: "all",
        reValidateMode: "onChange",
        mode: "all",
      });

      const handleSubmit = async () => {
        const isValid = await formContext.trigger(); // Validar el formulario
        if (isValid) {
          const values = formContext.getValues(); // Obtener los valores del formulario
          handleClose("submit", values); // Cerrar el diálogo y resolver la promesa
        }
      };

      const themeStorage = localStorage.getItem("theme") as "dark" | "light";
      const [mode] = useState<"light" | "dark">(
        themeStorage ? themeStorage : "light"
      );
      const theme = useMemo(() => globalTheme(mode), [mode]);

      return (
        <ThemeProvider theme={theme}>
          <Dialog disableEscapeKeyDown fullWidth open>
            {title && <DialogTitle align="center">{title}</DialogTitle>}
            <FormProvider {...formContext}>
              <DialogContent>
                {text && <DialogContentText>{text}</DialogContentText>}
                <Box component="section">
                  <TextFieldElement
                    required
                    multiline
                    rows={rows}
                    margin="normal"
                    fullWidth
                    label={label}
                    name="text"
                  />
                  {showCheckBox && (
                    <CheckboxElement name="check" label="Enviar correo" />
                  )}
                </Box>
              </DialogContent>
              {formContext.formState.isSubmitting ? (
                <Spinner />
              ) : (
                <DialogActions sx={{ px: 3, pb: 3 }}>
                  <Stack
                    spacing={2}
                    direction={{ xs: "column-reverse", sm: "row" }}
                    justifyContent="end"
                    sx={{ width: "100%" }}
                  >
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => handleClose("cancel", null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSubmit}
                    >
                      Continuar
                    </Button>
                  </Stack>
                </DialogActions>
              )}
            </FormProvider>
          </Dialog>
        </ThemeProvider>
      );
    };

    root.render(<DialogComment />);
  });
}
