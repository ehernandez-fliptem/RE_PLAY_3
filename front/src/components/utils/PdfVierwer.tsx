import { Viewer, Worker } from "@react-pdf-viewer/core";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import { useErrorBoundary } from "react-error-boundary";
import {
  toolbarPlugin,
  type ToolbarSlot,
  type TransformToolbarSlot,
} from "@react-pdf-viewer/toolbar";

type Props = {
  doc: string;
};

export default function PdfVierwer({ doc }: Props) {
  const { showBoundary } = useErrorBoundary();
  if (!isPDF(doc))
    showBoundary(new Error("El documento que se intenta abrir no es PDF."));

  const toolbarPluginInstance = toolbarPlugin();
  const { renderDefaultToolbar, Toolbar } = toolbarPluginInstance;

  const transform: TransformToolbarSlot = (slot: ToolbarSlot) => ({
    ...slot,
    Open: () => <></>,
    SwitchTheme: () => <></>,
    SwitchThemeMenuItem: () => <></>,
  });

  return (
    <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
      <div
        style={{
          width: "100%",
          alignItems: "center",
          backgroundColor: "#eeeeee",
          borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
          display: "flex",
          padding: "0.25rem",
        }}
      >
        <Toolbar>{renderDefaultToolbar(transform)}</Toolbar>
      </div>
      <Viewer
        theme="dark"
        enableSmoothScroll
        fileUrl={doc}
        plugins={[toolbarPluginInstance]}
      />
    </Worker>
  );
}

function isPDF(base64: string) {
  if (!base64 || typeof base64 !== "string") return false;
  const pdfPattern = /^data:application\/pdf;base64,/;
  return pdfPattern.test(base64);
}
