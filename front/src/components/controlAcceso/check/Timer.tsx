import React, { useEffect, useState } from "react";
import Temp from "../../../assets/sounds/temporizador.wav";

type Props = {
  rango: number;
  setMostrarTimer: React.Dispatch<React.SetStateAction<boolean>>;
  tomarFoto: () => void;
};

export default function Timer({ rango, setMostrarTimer, tomarFoto }: Props) {
  const [counter, setCounter] = useState(rango);

  useEffect(() => {
    if (counter > 0) {
      new Audio(Temp).play();
      setTimeout(() => {
        setCounter(counter - 1);
      }, 1000);
    } else {
      tomarFoto();
      setMostrarTimer(false);
    }
  }, [counter]);

  return (
    <>
      <audio typeof="audio/wav" src={Temp} />
      {counter}
    </>
  );
}
