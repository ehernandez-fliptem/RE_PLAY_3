import { useState } from "react";
import { Box, Card, CardContent, Modal, Typography } from "@mui/material";
import Camera from "../../../utils/Camera";
import type { OnResultFunction } from "react-qr-reader";
import Spinner from "../../../utils/Spinner";
import { useFormContext } from "react-hook-form";

type Props = {
  name: string;
  setShow: React.Dispatch<React.SetStateAction<boolean>>;
  onQrChange: (value: string) => Promise<boolean>;
};

export default function LectorQr({ name, setShow, onQrChange }: Props) {
  const formContext = useFormContext();
  const [isLoading, setIsLoading] = useState(false);

  const handleScan: OnResultFunction = async (result) => {
    if (result) {
      if (result.getText()) {
        setIsLoading(true);
        formContext.setValue(name, result.getText());
        if (onQrChange) {
          await onQrChange(result.getText())
            .then(() => setIsLoading(false))
            .catch(() => setIsLoading(false));
        }
      }
    }
  };

  return (
    <Modal disableEscapeKeyDown open>
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
          <Box
            component="section"
            sx={{
              backgroundColor: "info.main",
              color: "info.contrastText",
            }}
          >
            <Typography
              variant="overline"
              component="h5"
              textAlign="center"
              sx={{ mb: 2 }}
            >
              LECTOR QR
            </Typography>
          </Box>
          {isLoading ? (
            <Spinner />
          ) : (
            <Box component="section">
              <Camera
                showButton={false}
                isScan
                handleScan={handleScan}
                name={name}
                setShow={setShow}
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Modal>
  );
}
