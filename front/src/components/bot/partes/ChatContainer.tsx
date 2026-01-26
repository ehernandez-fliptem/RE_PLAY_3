import { useEffect, useRef, useState } from "react";
import { Box, TextField, Paper, Typography, IconButton } from "@mui/material";
import { alpha, lighten, styled, useTheme } from "@mui/material/styles";
import { Send } from "@mui/icons-material";
import { clienteAxios } from "../../../app/config/axios";
import { AxiosError } from "axios";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

const DotLoader = styled("div")(({ theme }) => ({
  width: 20,
  aspectRatio: "2",
  "--dot-color": theme.palette.primary.contrastText,
  "--dot-gradient": `no-repeat radial-gradient(circle closest-side, var(--dot-color) 90%, transparent)`,
  background: `
          var(--dot-gradient) 0% 50%,
          var(--dot-gradient) 50% 50%,
          var(--dot-gradient) 100% 50%
        `,
  backgroundSize: "calc(100% / 3) 50%",
  animation: "dots-loader 1s infinite linear",
  "@keyframes dots-loader": {
    "20%": { backgroundPosition: "0% 0%, 50% 50%, 100% 50%" },
    "40%": { backgroundPosition: "0% 100%, 50% 0%, 100% 50%" },
    "60%": { backgroundPosition: "0% 50%, 50% 100%, 100% 0%" },
    "80%": { backgroundPosition: "0% 50%, 50% 50%, 100% 100%" },
  },
}));

const ChatContainer = styled(Paper)(({ theme }) => ({
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  overflow: "hidden",
  boxShadow: theme.shadows[4],
}));

const MessagesContainer = styled(Box)({
  flex: 1,
  padding: 10,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
});

interface MessageBubbleProps {
  isUser?: boolean;
  isError?: boolean;
}

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isUser",
})<MessageBubbleProps>(({ isUser, isError, theme }) => ({
  maxWidth: "75%",
  padding: "0.5rem 0.75rem",
  borderRadius: 5,
  alignSelf: isUser ? "flex-end" : "flex-start",
  backgroundColor: isError
    ? theme.palette.error.main
    : isUser
    ? theme.palette.primary.main
    : theme.palette.secondary.light,
  color: isError
    ? theme.palette.error.contrastText
    : isUser
    ? theme.palette.primary.contrastText
    : theme.palette.secondary.contrastText,
}));

const InputContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  padding: 5,
  borderTop: `1px solid ${lighten(alpha(theme.palette.divider, 0.3), 0.88)}`,
}));

type TMessages = {
  text: string;
  isUser?: boolean;
  isError?: boolean;
  date: Date | Dayjs | string | number;
};

export default function Bot() {
  const theme = useTheme();
  const [messages, setMessages] = useState<TMessages[]>([
    {
      text: "Hola, estoy aquí para ayudarte con relacionado con los registros de la bitácora, ¿en qué puedo ayudarte?",
      date: dayjs(),
    },
  ]);
  const [input, setInput] = useState("");
  const endOfMessagesRef = useRef<HTMLDivElement | null>(null);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    try {
      if (!input.trim()) return;
      setMessages([...messages, { text: input, isUser: true, date: dayjs() }]);
      setInput("");
      setIsLoadingAnswer(true);
      const res = await clienteAxios.post("api/chatbot", { input });
      if (res.data.estado) {
        setMessages((prev) => [
          ...prev,
          { text: res.data.datos, date: dayjs() },
        ]);
      }
    } catch (error: AxiosError | Error | unknown) {
      //   handlingError(error);
      const errorMessage =
        error instanceof AxiosError
          ? error.response?.data.mensaje
          : error instanceof Error
          ? error.message
          : typeof error === "string"
          ? error
          : "Ocurrió un error inesperado";
      setMessages((prev) => [
        ...prev,
        { text: errorMessage, isError: true, date: dayjs() },
      ]);
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  return (
    <ChatContainer>
      <Paper
        sx={{
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          padding: "0.5rem 0.75rem",
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
        }}
      >
        <Typography component="h6" variant="subtitle2">
          Flipbot
        </Typography>
      </Paper>
      <MessagesContainer>
        {messages.map((msg, idx) => (
          <MessageBubble key={idx} isUser={msg.isUser} isError={msg.isError}>
            <Typography variant="body2">{msg.text}</Typography>
            <Typography
              variant="caption"
              sx={{ m: 0, p: 0, float: "inline-end" }}
            >
              <small>{dayjs(msg.date).format("HH:mm")}</small>
            </Typography>
          </MessageBubble>
        ))}
        {isLoadingAnswer && (
          <MessageBubble isUser={false} isError={false}>
            <Typography variant="body2">
              <DotLoader />
            </Typography>
          </MessageBubble>
        )}
        <div ref={endOfMessagesRef} />
      </MessagesContainer>
      <InputContainer>
        <TextField
          fullWidth
          margin="none"
          variant="outlined"
          size="small"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Escribe un mensaje..."
        />
        <IconButton
          color="primary"
          size="small"
          onClick={handleSend}
          sx={{ marginLeft: 1 }}
        >
          <Send fontSize="small" />
        </IconButton>
      </InputContainer>
    </ChatContainer>
  );
}
