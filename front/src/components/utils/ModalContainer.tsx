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
          "&.app-modal-background-active, &:has(.app-spinner-background)": {
            pointerEvents: "none",
          },
          "&.app-modal-background-active .MuiBackdrop-root, &:has(.app-spinner-background) .MuiBackdrop-root": {
            opacity: "0 !important",
            visibility: "hidden",
            pointerEvents: "none",
          },
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
            "&:has(.app-spinner-compact)": {
              width: "min(340px, calc(100dvw - 32px))",
              maxWidth: "min(340px, calc(100dvw - 32px))",
            },
            "&:has(.app-spinner-background)": {
              position: "fixed",
              right: 16,
              bottom: 16,
              width: "fit-content",
              minWidth: 132,
              maxWidth: "min(220px, calc(100dvw - 32px))",
              maxHeight: "none",
              pointerEvents: "none",
            },
            "&:has(.app-spinner-background) .MuiCard-root": {
              bgcolor: "background.paper",
              borderRadius: 2,
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.16)",
            },
            "&:has(.app-spinner-background) .MuiCardContent-root": {
              py: 1,
              px: 1.5,
              "&:last-child": {
                pb: 1,
              },
            },
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
