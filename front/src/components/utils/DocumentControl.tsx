import React, { useState } from "react";
import {
  Box,
  IconButton,
  FormHelperText,
  Typography,
  alpha,
  lighten,
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import { ChevronLeft, Delete, Upload, Visibility } from "@mui/icons-material";
import { Controller, useFormContext } from "react-hook-form";
import { useConfirm } from "material-ui-confirm";
import { pdfToImage } from "./functions/extras";
import NOTFILE from "../../assets/img/app/NotFile.png";
import Spinner from "./Spinner";
import PdfVierwer from "./PdfVierwer";

type Props = {
  name: string;
  nameImg: string;
  disableEdit?: boolean;
  label?: string;
  backgroundIcon?: React.ReactNode;
  required?: boolean;
};

export default function DocumentControl({
  name,
  nameImg,
  disableEdit = false,
  label,
  required = false,
}: Props) {
  const { control, setValue, trigger, setError, watch } = useFormContext();
  const confirm = useConfirm();
  const [isLoading, setIsLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [currDoc, setCurrDoc] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsLoading(true);
    setCurrDoc("");
    const file = e.target.files?.[0];
    const sizeByte = file?.size || 0;
    const siezekiloByte = sizeByte / 1024;
    if (file) {
      const { name: fileName } = file;
      const fileType = fileName.split(".").pop()?.toLowerCase() || "";

      if (!["pdf"].includes(fileType)) {
        setError(name, {
          type: "manual",
          message: "El archivo debe ser PDF",
        });
        return;
      }

      if (siezekiloByte > 500) {
        setError(name, {
          type: "manual",
          message: "El tamaño del archivo no debe superar los 500 KB",
        });
        return;
      }

      pdfToImage(file, 1)
        .then((doc) => {
          e.target.value = "";
          setValue(nameImg, doc.images);
          setValue(name, doc.pdf);
          trigger(name);
        })
        .catch((error) => {
          setTimeout(() => {
            setError(name, {
              type: "manual",
              message: error.message,
            });
          }, 5000);
        })
        .finally(() => setIsLoading(false));
    }
  };

  const handleDelete = () => {
    confirm({
      title: "¿Estás seguro que deseas borrar la imagen?",
      confirmationText: "Borrar",
    })
      .then((result) => {
        if (result.confirmed) {
          setCurrDoc("");
          setValue(name, "");
          setValue(nameImg, []);
          trigger(name);
        }
      })
      .catch(() => {});
  };

  const handleClickOpen = () => {
    const img = watch(name);
    setCurrDoc(img);
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
  };

  return (
    <Controller
      name={nameImg}
      control={control}
      render={({ field, fieldState }) => {
        return (
          <Controller
            name={name}
            control={control}
            render={({ fieldState: fieldStateName }) => (
              <Box
                sx={{
                  my: 2,
                  display: "flex",
                  justifyContent: "center",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {label && (
                  <Typography
                    variant="overline"
                    component="h2"
                    textAlign="center"
                    color={fieldState.error ? "error" : "textPrimary"}
                  >
                    {label} {required ? "*" : ""}
                  </Typography>
                )}
                <Box
                  sx={{
                    position: "relative",
                    width: 150,
                    height: 200,
                    mb: 2,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    "&:hover": {
                      "& .MuiAvatarChild-root, #PictureActionButton": {
                        zIndex: 15,
                      },
                    },
                  }}
                >
                  {isLoading ? (
                    <Box
                      component="div"
                      sx={(theme) => ({
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        zIndex: 20,
                        bgcolor:
                          fieldState.error || fieldStateName.error
                            ? alpha(theme.palette.error.light, 0.2)
                            : ``,
                        border:
                          fieldState.error || fieldStateName.error
                            ? `1px solid ${theme.palette.error.main}`
                            : `1px solid ${lighten(
                                alpha(theme.palette.divider, 0.3),
                                0.88
                              )}`,
                      })}
                    >
                      <Spinner />
                    </Box>
                  ) : (
                    <Box
                      component="img"
                      src={field.value[0] || NOTFILE}
                      sx={(theme) => ({
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        zIndex: 1,
                        bgcolor:
                          fieldState.error || fieldStateName.error
                            ? alpha(theme.palette.error.light, 0.2)
                            : ``,
                        border:
                          fieldState.error || fieldStateName.error
                            ? `1px solid ${theme.palette.error.main}`
                            : 0,
                        objectFit: "fill",
                      })}
                    />
                  )}
                  <Box
                    bgcolor="primary.light"
                    component="div"
                    id="PictureActionButton"
                    sx={(theme) => ({
                      display: isLoading ? "none" : "block",
                      borderRadius: 20,
                      zIndex: -1,
                      boxShadow: theme.shadows[8],
                    })}
                  >
                    {field.value[0] ? (
                      <>
                        <IconButton component="label" onClick={handleClickOpen}>
                          <Visibility sx={{ color: "#FFFFFF" }} />
                        </IconButton>
                        {!disableEdit && (
                          <IconButton component="label">
                            <Upload sx={{ color: "#FFFFFF" }} />
                            <input
                              type="file"
                              hidden
                              onChange={handleFileChange}
                              accept={["pdf"].map((ext) => `.${ext}`).join(",")}
                            />
                          </IconButton>
                        )}
                      </>
                    ) : (
                      <>
                        {!disableEdit && (
                          <IconButton component="label">
                            <Upload sx={{ color: "#FFFFFF" }} />
                            <input
                              type="file"
                              hidden
                              onChange={handleFileChange}
                              accept={["pdf"].map((ext) => `.${ext}`).join(",")}
                            />
                          </IconButton>
                        )}
                      </>
                    )}
                    {field.value && (
                      <>
                        {!disableEdit && (
                          <IconButton onClick={handleDelete}>
                            <Delete sx={{ color: "#FFFFFF" }} />
                          </IconButton>
                        )}
                      </>
                    )}
                  </Box>
                </Box>
                {fieldState.error && (
                  <FormHelperText error>
                    {fieldState.error.message}
                  </FormHelperText>
                )}
                {fieldStateName.error && (
                  <FormHelperText error>
                    {fieldStateName.error.message}
                  </FormHelperText>
                )}
                <Dialog
                  fullScreen
                  open={openDialog}
                  onClose={handleClose}
                  aria-labelledby="responsive-dialog-title"
                >
                  <DialogContent>
                    <PdfVierwer doc={currDoc} />
                  </DialogContent>
                  <Divider sx={{ my: 1 }} />
                  <DialogActions>
                    <Button
                      variant="contained"
                      color="secondary"
                      autoFocus
                      onClick={handleClose}
                      startIcon={<ChevronLeft />}
                    >
                      Regresar
                    </Button>
                  </DialogActions>
                </Dialog>
              </Box>
            )}
          />
        );
      }}
    />
  );
}
