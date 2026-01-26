import { Fragment, Suspense, useState } from "react";
import { Typography } from "@mui/material";
import { AutocompleteElement, TextFieldElement } from "react-hook-form-mui";
import ProfilePicture from "../../../utils/ProfilePicture";
import ProfilePicturePreview from "../../../utils/fallbackRender/ProfilePicturePreview";
import { Image, Settings } from "@mui/icons-material";

const timezones = Intl.supportedValuesOf("timeZone");

export default function General() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<string[]>(timezones);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpen = () => {
    setOpen(true);
    if (options.length === 0) {
      (async () => {
        setIsLoading(true);
        const timezones = await getTimeZonesList();
        setIsLoading(false);
        setOptions(timezones);
      })();
    }
  };

  const handleClose = () => {
    setOpen(false);
  };

  const getTimeZonesList = async (): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      try {
        const timezones = Intl.supportedValuesOf("timeZone");
        resolve(timezones);
      } catch (error) {
        reject(error);
      }
    });
  };

  return (
    <Fragment>
      <Typography
        variant="overline"
        component="h2"
        sx={{ mb: 2 }}
        display="flex"
        alignItems="center"
      >
        <Settings color="primary" sx={{ mr: 1 }} /> <strong>General</strong>
      </Typography>
      <TextFieldElement
        label="Nombre de la aplicación"
        name="appNombre"
        fullWidth
        required
        margin="normal"
      />
      <AutocompleteElement
        label="Zona horaria"
        required
        loading={isLoading}
        name="zonaHoraria"
        options={options}
        autocompleteProps={{
          open,
          onOpen: handleOpen,
          onClose: handleClose,
        }}
        textFieldProps={{
          margin: "normal",
        }}
      />
      <Suspense fallback={<ProfilePicturePreview />}>
        <ProfilePicture
          label="Logo general para la aplicación"
          variant="square"
          name="imgCorreo"
          backgroundIcon={<Image />}
          allowFiles={["png", "jpeg", "jpg"]}
          adjustImageToBox
          required
        />
      </Suspense>

      <TextFieldElement
        label="Saludo"
        name="saludaCorreo"
        fullWidth
        required
        margin="normal"
        minRows={4}
        multiline
      />
      <TextFieldElement
        label="Despedida"
        name="despedidaCorreo"
        fullWidth
        required
        margin="normal"
        minRows={4}
        multiline
      />
    </Fragment>
  );
}
