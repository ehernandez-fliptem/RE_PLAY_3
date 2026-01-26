import React from "react";
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
  return (
    <Modal open disableEscapeKeyDown {...modalProps}>
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
