import { useEffect, useState, useRef } from "react";
import Temp from "../assets/sounds/temporizador.wav";

// Variable estática para controlar el estado del timer
let isTimerActive = false;

type TimerOptions = {
  rango: number;
  nextFunction?: () => Promise<void>;
  onTick?: (counter: number) => void;
  onFinish?: () => void;
  onCancel?: () => void;
};

type TimerResult = {
  isFinished: boolean;
  isCancelled: boolean;
  counter: number;
  nextFunctionResult?: unknown;
};

type TimerControls = {
  cancel: () => void;
  getCounter: () => number;
};

// Hook principal
export function useTimer() {
  const [counter, setCounter] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Función para iniciar el timer
  const startTimer = ({
    rango,
    nextFunction,
    onTick,
    onFinish,
    onCancel,
  }: TimerOptions): Promise<TimerResult> => {
    return new Promise((resolve) => {
      if (isTimerActive) {
        resolve({
          isFinished: false,
          isCancelled: true,
          counter: 0,
        });
        return;
      }

      isTimerActive = true;
      setIsActive(true);
      setCounter(rango);

      let currentCounter = rango;
      let cancelled = false;

      const cleanup = () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        isTimerActive = false;
        setIsActive(false);
        setCounter(null);
      };

      const tick = () => {
        if (cancelled) return;

        currentCounter--;
        setCounter(currentCounter);
        onTick?.(currentCounter);

        if (currentCounter > 0) {
          // Reproducir sonido
          new Audio(Temp).play().catch(console.error);
          timerRef.current = setTimeout(tick, 1000);
        } else {
          // Timer finalizado
          if (nextFunction) {
            nextFunction()
              .then((val) => {
                onFinish?.();
                resolve({
                  isFinished: true,
                  isCancelled: false,
                  counter: 0,
                  nextFunctionResult: val,
                });
              })
              .catch((err) => {
                console.error(err);
                onCancel?.();
                resolve({
                  isFinished: false,
                  isCancelled: true,
                  counter: currentCounter,
                });
              })
              .finally(cleanup);
          } else {
            onFinish?.();
            resolve({
              isFinished: true,
              isCancelled: false,
              counter: 0,
            });
            cleanup();
          }
        }
      };

      // Iniciar el timer
      timerRef.current = setTimeout(tick, 1000);

      // Devolver controles
      const controls: TimerControls = {
        cancel: () => {
          cancelled = true;
          cleanup();
          onCancel?.();
          resolve({
            isFinished: false,
            isCancelled: true,
            counter: currentCounter,
          });
        },
        getCounter: () => currentCounter,
      };

      return controls;
    });
  };

  // Cancelar timer manualmente
  const cancelTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    isTimerActive = false;
    setIsActive(false);
    setCounter(null);
  };

  // Efecto para limpiar al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Elemento de audio
  const AudioElement = () => (
    <audio typeof="audio/wav" src={Temp} preload="auto" />
  );

  return {
    startTimer,
    cancelTimer,
    counter,
    isActive,
    AudioElement,
  };
}
