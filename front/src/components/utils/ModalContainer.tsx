import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Modal,
  type ModalProps,
  type ContainerProps,
} from "@mui/material";

type Props = {
  modalProps?: ModalProps;
  containerProps?: ContainerProps;
  children?: React.ReactNode;
};

export default function ModalContainer({
  modalProps,
  containerProps,
  children,
}: Props) {
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
    <Modal open onClose={handleClose} {...modalProps}>
      <Container
        component="div"
        sx={{ overflow: "auto", height: "100%", paddingX: 0 }}
        disableGutters
        {...containerProps}
      >
        {children}
      </Container>
    </Modal>
  );
}
