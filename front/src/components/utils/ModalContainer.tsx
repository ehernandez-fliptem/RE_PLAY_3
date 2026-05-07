import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Modal,
  type ModalProps,
  type ContainerProps,
} from "@mui/material";

type Props = {
  modalProps?: Partial<ModalProps>;
  containerProps?: ContainerProps;
  children?: React.ReactNode;
};

export default function ModalContainer({
  modalProps,
  containerProps,
  children,
}: Props) {
  const { sx: modalSx, ...restModalProps } = modalProps || {};
  const { sx: containerSx, ...restContainerProps } = containerProps || {};
  const navigate = useNavigate();
  const handleClose: ModalProps["onClose"] = (event, reason) => {
    if (reason !== "escapeKeyDown") return;
    if (modalProps?.onClose) {
      modalProps.onClose(event, reason);
      return;
    }
    navigate(-1);
  };

  return (
    <Modal
      open
      onClose={handleClose}
      sx={[
        {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          outline: "none",
          "&:focus, &:focus-visible": { outline: "none" },
        },
        ...(Array.isArray(modalSx) ? modalSx : modalSx ? [modalSx] : []),
      ]}
      {...restModalProps}
    >
      <Container
        component="div"
        sx={[
          {
            overflow: "auto",
            maxHeight: "calc(100dvh - 32px)",
            width: "100%",
            paddingX: 0,
            outline: "none",
            "&:focus, &:focus-visible": { outline: "none" },
          },
          ...(Array.isArray(containerSx) ? containerSx : containerSx ? [containerSx] : []),
        ]}
        disableGutters
        {...restContainerProps}
      >
        {children}
      </Container>
    </Modal>
  );
}
