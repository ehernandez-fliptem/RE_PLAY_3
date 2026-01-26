import { Fragment, useState } from "react";
import { Box, Fab, Grow, useTheme } from "@mui/material";
import { SmartToy } from "@mui/icons-material";
import Bot from "./partes/ChatContainer";

export default function Chatbot() {
  const theme = useTheme();
  const [showChatbot, setShowChatbot] = useState(false);
  const transitionDuration = {
    enter: theme.transitions.duration.enteringScreen,
    exit: theme.transitions.duration.leavingScreen,
  };

  const handleOpen = () => {
    setShowChatbot((prevValue) => !prevValue);
  };

  return (
    <Fragment>
      <Fab
        size="small"
        color="primary"
        aria-label="add"
        sx={{ position: "absolute", bottom: 16, right: 16 }}
        onClick={handleOpen}
      >
        <SmartToy fontSize="small" />
      </Fab>
      <Grow in={showChatbot} timeout={transitionDuration}>
        <Box
          component="div"
          sx={{
            width: 300,
            height: 450,
            position: "absolute",
            bottom: 60,
            right: 50,
          }}
        >
          <Bot />
        </Box>
      </Grow>
    </Fragment>
  );
}
