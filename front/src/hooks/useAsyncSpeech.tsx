import { useCallback, useEffect, useRef, useState } from "react";

export function useAsyncSpeech() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]); // Ref para acceso en tiempo real
  const speakingRef = useRef(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cargar voces robustamente
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        voicesRef.current = availableVoices; // Actualizar la ref
      }
    };

    // Cargar inmediatamente si hay voces disponibles
    loadVoices();

    // Configurar event listeners
    const handleVoicesChanged = () => {
      loadVoices();
    };

    window.speechSynthesis.addEventListener(
      "voiceschanged",
      handleVoicesChanged
    );

    // Fallback: intentar cargar cada segundo por 10 segundos
    let attempts = 0;
    const maxAttempts = 10;
    const pollInterval = setInterval(() => {
      attempts++;
      loadVoices();
      if (voicesRef.current.length > 0 || attempts >= maxAttempts) {
        clearInterval(pollInterval);
      }
    }, 1000);

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        handleVoicesChanged
      );
      clearInterval(pollInterval);
    };
  }, []);

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    speakingRef.current = false;
    if (utterRef.current) {
      utterRef.current.onend = null;
      utterRef.current.onerror = null;
      utterRef.current = null;
    }
  }, []);

  const speak = useCallback((text: string, opts?: { timeoutMs?: number }) => {
    return new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        reject(new Error("SpeechSynthesis no disponible"));
        return;
      }

      // Cancelar cualquier reproducción anterior
      if (speakingRef.current) {
        window.speechSynthesis.cancel();
      }

      const utter = new SpeechSynthesisUtterance(String(text));
      utterRef.current = utter;

      // Usar voicesRef.current en lugar de voices para obtener las voces más recientes
      const currentVoices = voicesRef.current;

      // Buscar la voz preferida
      const defaultName =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("VOICE_BOT") ?? undefined
          : undefined;

      if (defaultName && currentVoices.length > 0) {
        const found = currentVoices.find(
          (v) => v.name === defaultName || v.lang === defaultName
        );
        utter.voice = found || null;
      } else if (currentVoices.length === 0) {
        console.warn("No hay voces disponibles");
      }

      // Configurar timeout de seguridad
      const timeout = opts?.timeoutMs ?? 120_000;
      const timeoutId = window.setTimeout(() => {
        if (speakingRef.current) {
          window.speechSynthesis.cancel();
          speakingRef.current = false;
          utterRef.current = null;
          reject(new Error("Speech timeout"));
        }
      }, timeout);

      // Función de cleanup
      const cleanup = () => {
        clearTimeout(timeoutId);
        speakingRef.current = false;
        utterRef.current = null;
      };

      // Event handlers
      utter.onstart = () => {
        speakingRef.current = true;
      };

      utter.onend = () => {
        cleanup();
        resolve();
      };

      utter.onerror = (event) => {
        cleanup();
        reject(new Error(`Error con la API de Speech synthesis: ${event.error}`));
      };

      // Intentar reproducir
      try {
        window.speechSynthesis.speak(utter);
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  }, []);

  return {
    speak,
    cancel,
    speaking: () => speakingRef.current,
    voices,
  };
}
