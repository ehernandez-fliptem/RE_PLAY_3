import { Fragment, useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
} from "@mui/material";
import Mouth from "./partes/Mouth";
import Head from "./partes/Head";
import Eyes from "./partes/Eyes";
import Message from "./Message";
import { VoiceChat } from "@mui/icons-material";

type Props = {
  message?: string;
  discretMenuVoices?: boolean;
  disabledVoicesMenu?: boolean;
};

export default function AnimatedBot({
  message,
  discretMenuVoices,
  disabledVoicesMenu,
}: Props) {
  const defaultVoice = localStorage.getItem("VOICE_BOT");
  const [showModal, setShowModal] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(defaultVoice || "");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const load = () => {
      const v = window.speechSynthesis.getVoices() || [];
      if (v.length) setVoices(v);
    };
    load();
    const handler = () => load();
    window.speechSynthesis.addEventListener?.("voiceschanged", handler);
    // polling fallback corto
    let attempts = 0;
    let timer: number | null = null;
    const poll = () => {
      attempts++;
      load();
      if (voices.length === 0 && attempts < 20)
        timer = window.setTimeout(poll, 200);
    };
    if (voices.length === 0) poll();
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", handler);
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClickOpen = () => {
    setShowModal(true);
  };

  const handleClose = () => {
    setShowModal(false);
  };

  const hanldeVoiceChange = (newDeviceId: string) => {
    localStorage.setItem("VOICE_BOT", newDeviceId);
    setSelectedVoice(newDeviceId);
  };

  return (
    <Fragment>
      <Box
        sx={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Head>
          {discretMenuVoices && !disabledVoicesMenu && (
            <Box sx={{ position: "absolute", top: -35, left: -35, zIndex: 90 }}>
              <Button
                variant="contained"
                color="primary"
                sx={{ p: 1, borderRadius: 25, minWidth: "100%" }}
                onClick={handleClickOpen}
              >
                <VoiceChat />
              </Button>
            </Box>
          )}
          <Eyes />
          <Mouth isTalking={!message} />
        </Head>
        {message && (
          <Box sx={{ position: "relative", mt: 4 }}>
            <Message message={message} isUser />
          </Box>
        )}
      </Box>
      <Dialog open={showModal} onClose={handleClose}>
        <DialogTitle textAlign="center">Dispositivos disponibles</DialogTitle>
        <DialogContent>
          <Select
            size="small"
            sx={{ width: "100%" }}
            name="scanner"
            onChange={(e) => {
              hanldeVoiceChange(e.target.value);
              handleClose();
            }}
            value={selectedVoice}
          >
            {voices.map((item) => (
              <MenuItem value={item.name}>{item.name}</MenuItem>
            ))}
          </Select>
        </DialogContent>
      </Dialog>
    </Fragment>
  );
}
