import React, { Fragment, useState } from "react";
import {
  Avatar,
  Box,
  IconButton,
  Modal,
  Card,
  CardContent,
  FormHelperText,
  Typography,
  SvgIcon,
  alpha,
  Dialog,
  DialogContent,
  Divider,
  DialogActions,
  Button,
  Stack,
} from "@mui/material";
import {
  CameraAlt,
  ChevronLeft,
  Delete,
  Edit,
  Person,
  Upload,
  Visibility,
} from "@mui/icons-material";
import { Controller, useFormContext } from "react-hook-form";
import { useConfirm } from "material-ui-confirm";
import Camera from "./Camera";
import { readFileData, resizeImage } from "./functions/extras";

type AllowedFiles = "png" | "jpg" | "jpeg" | "pdf";
type ProfilePictureProps = {
  name: string;
  maxWidth?: number;
  allowFiles?: Array<AllowedFiles>;
  variant?: "circular" | "rounded" | "square";
  compact?: boolean;
  disableEdit?: boolean;
  showViewButton?: boolean;
  label?: string;
  backgroundIcon?: React.ReactNode;
  adjustImageToBox?: boolean;
  required?: boolean;
};

export default function ProfilePicture({
  name,
  maxWidth,
  allowFiles = ["png", "jpg", "jpeg"],
  variant = "circular",
  compact = false,
  disableEdit = false,
  showViewButton,
  label,
  backgroundIcon,
  adjustImageToBox,
  required = false,
}: ProfilePictureProps) {
  const { control, setValue, trigger, setError, watch } = useFormContext();
  const confirm = useConfirm();
  const [showCamera, setShowCamera] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [currDoc, setCurrDoc] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const { name: fileName } = file;
      const fileType = fileName.split(".").pop()?.toLowerCase() || "";

      if (!allowFiles.includes(fileType as AllowedFiles)) {
        setError(name, {
          type: "manual",
          message: `El archivo no es válido. Extensiones permitidas: ${allowFiles.join(
            ", "
          )}.`,
        });
        return;
      }

      try {
        const processedFile =
          fileType === "pdf"
            ? await readFileData(file)
            : await resizeImage(file, maxWidth);

        if (!processedFile) {
          setError(name, {
            type: "manual",
            message: "No se pudo leer el archivo.",
          });
          return;
        }

        e.target.value = "";
        setValue(name, processedFile);
        trigger(name);
      } catch (error: any) {
        setError(name, {
          type: "manual",
          message: error?.message || "No se pudo procesar el archivo.",
        });
      }
    }
  };

  const handleDelete = () => {
    confirm({
      title: "¿Estás seguro que deseas borrar la imagen?",
      confirmationText: "Borrar",
    })
      .then((result) => {
        if (result.confirmed) {
          setValue(name, ""); // Eliminar el valor del formulario
          trigger(name); // Limpiar errores
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
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        return (
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
            {compact ? (
              <Box sx={{ width: "100%", maxWidth: 460 }}>
                <Typography variant="body2" color={field.value ? "success.main" : "text.secondary"} sx={{ mb: 1 }}>
                  {field.value ? "Archivo cargado" : "Sin archivo seleccionado"}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {!disableEdit && (
                    <Button
                      component="label"
                      variant="outlined"
                      startIcon={<Upload />}
                      sx={{
                        flex: "1 1 170px",
                        minHeight: 40,
                        minWidth: 170,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Subir archivo
                      <input
                        type="file"
                        hidden
                        onChange={handleFileChange}
                        accept={allowFiles.map((ext) => `.${ext}`).join(",")}
                      />
                    </Button>
                  )}
                  {!disableEdit && (
                    <Button
                      variant="outlined"
                      startIcon={<CameraAlt />}
                      onClick={() => setShowCamera(true)}
                      sx={{
                        flex: "1 1 170px",
                        minHeight: 40,
                        minWidth: 170,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Camara
                    </Button>
                  )}
                  {showViewButton && !!field.value && (
                    <Button
                      variant="outlined"
                      onClick={handleClickOpen}
                      sx={{
                        minHeight: 40,
                        minWidth: 40,
                        width: 40,
                        p: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Visibility fontSize="small" />
                    </Button>
                  )}
                  {!disableEdit && !!field.value && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleDelete}
                      sx={{
                        minHeight: 40,
                        minWidth: 40,
                        width: 40,
                        p: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Delete fontSize="small" />
                    </Button>
                  )}
                </Stack>
              </Box>
            ) : (
            <Box
              sx={{
                position: "relative",
                width: 150,
                height: 150,
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
              <Avatar
                variant={variant}
                src={field.value}
                sx={(theme) => ({
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  zIndex: 1,
                  bgcolor: fieldState.error
                    ? alpha(theme.palette.error.light, 0.2)
                    : ``,
                  border: fieldState.error
                    ? `1px solid ${theme.palette.error.main}`
                    : 0,
                })}
                slotProps={{
                  img: {
                    style: {
                      objectFit: adjustImageToBox ? "contain" : "cover",
                    },
                  },
                }}
              >
                <Fragment>
                  {field.value ? (
                    field.value
                  ) : backgroundIcon ? (
                    <SvgIcon sx={{ width: "70%", height: "70%" }}>
                      {backgroundIcon}
                    </SvgIcon>
                  ) : (
                    <Person sx={{ width: "70%", height: "70%" }} />
                  )}
                </Fragment>
              </Avatar>
              <Box
                bgcolor="primary.light"
                component="div"
                id="PictureActionButton"
                sx={(theme) => ({
                  borderRadius: 20,
                  zIndex: -1,
                  boxShadow: theme.shadows[8],
                  display: "flex",
                })}
              >
                {field.value ? (
                  <>
                    {showViewButton && (
                      <IconButton component="label" onClick={handleClickOpen}>
                        <Visibility sx={{ color: "#FFFFFF" }} />
                      </IconButton>
                    )}
                    {!disableEdit && (
                      <IconButton component="label">
                        <Edit sx={{ color: "#FFFFFF" }} />
                        <input
                          type="file"
                          hidden
                          onChange={handleFileChange}
                          accept={allowFiles.map((ext) => `.${ext}`).join(",")}
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
                          accept={allowFiles.map((ext) => `.${ext}`).join(",")}
                        />
                      </IconButton>
                    )}
                  </>
                )}
                {!disableEdit && (
                  <>
                    <IconButton onClick={() => setShowCamera(true)}>
                      <CameraAlt sx={{ color: "#FFFFFF" }} />
                    </IconButton>
                    {field.value && (
                      <IconButton onClick={handleDelete}>
                        <Delete sx={{ color: "#FFFFFF" }} />
                      </IconButton>
                    )}
                  </>
                )}
              </Box>
            </Box>
            )}
            {fieldState.error && (
              <FormHelperText error>{fieldState.error.message}</FormHelperText>
            )}
            {showCamera && (
              <Modal disableEscapeKeyDown open={showCamera}>
                <Card
                  elevation={5}
                  sx={{
                    position: "absolute",
                    width: { xs: "90%", md: "50%", lg: "40%", xl: "30%" },
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <CardContent>
                    <Camera name={name} setShow={setShowCamera} />
                  </CardContent>
                </Card>
              </Modal>
            )}
            <Dialog
              open={openDialog}
              onClose={handleClose}
              aria-labelledby="responsive-dialog-title"
              fullWidth
              maxWidth="lg"
            >
              <DialogContent
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  p: 1.5,
                  minHeight: 320,
                }}
              >
                {String(currDoc || "").startsWith("data:application/pdf") ? (
                  <Box
                    component="iframe"
                    src={currDoc}
                    sx={{ width: "100%", height: "78vh", border: 0 }}
                  />
                ) : (
                  <Box
                    component="img"
                    src={currDoc}
                    alt="Vista previa"
                    sx={{
                      width: "100%",
                      maxWidth: "min(100%, 980px)",
                      maxHeight: "78vh",
                      objectFit: "contain",
                    }}
                  />
                )}
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
        );
      }}
    />
  );
}
