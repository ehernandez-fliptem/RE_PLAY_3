import speech_recognition as sr
import pyttsx3
import warnings
import time
import queue
import requests

warnings.filterwarnings("ignore", category=UserWarning)

class VoiceChatbot:
    def __init__(self):
        # Configuración de parámetros ajustables
        self.silence_threshold = (
            0.5  # Tiempo de silencio para fin de frase (0.8 segundos)
        )
        self.voice_timeout = 10  # Tiempo máximo de habla continua (8 segundos)
        self.ambient_noise_duration = 0.2  # Duración para ajuste de ruido ambiente

        # Configuración Ollama
        self.ollama_url = (
            "http://192.168.0.30:11434/api/generate"  # Ajusta si es necesario
        )
        self.model_name = (
            "gemma3:12b"  # Puedes usar "mistral", "llama2-uncensored", etc.
        )

        # Inicialización de componentes
        self._initialize_voice_components()

        # Estado del sistema
        self.exit_flag = False
        self.audio_queue = queue.Queue()

    def _initialize_voice_components(self):
        # Configuración de reconocimiento de voz
        self.recognizer = sr.Recognizer()
        self.recognizer.dynamic_energy_threshold = True
        self.mic = self._configure_microphone()

    def _configure_microphone(self):
        try:
            mics = sr.Microphone.list_microphone_names()
            # print("\n🔍 Micrófonos disponibles:")
            # for i, name in enumerate(mics):
            #     print(f"  [{i}] {name}")

            # Búsqueda inteligente de micrófono
            for i, name in enumerate(mics):
                if any(
                    keyword in name.lower() for keyword in ["hyperx", "mic", "input"]
                ):
                    print(f"✅ Seleccionado: [{i}] {name}")
                    return sr.Microphone(device_index=i, sample_rate=16000)

            print("\nℹ️ Usando micrófono predeterminado")
            return sr.Microphone(sample_rate=16000)
        except Exception as e:
            print(f"❌ Error al configurar micrófono: {e}")
            return None

    def _process_audio_buffer(self, audio_buffer):
        if not audio_buffer:
            return ""

        try:
            # Combinación optimizada de fragmentos de audio
            combined_audio = sr.AudioData(
                b"".join([a.get_raw_data() for a in audio_buffer]),
                audio_buffer[0].sample_rate,
                audio_buffer[0].sample_width,
            )

            print("\n🔊 Procesando voz...", end=" ", flush=True)
            text = self.recognizer.recognize_google(
                combined_audio, language="es-ES", show_all=False
            )
            print(f"{text}")
            return text
        except sr.UnknownValueError:
            print("No se detectó voz clara")
        except sr.RequestError as e:
            print(f"Error en el servicio: {e}")
        except Exception as e:
            print(f"Error inesperado: {e}")
        return ""

    def listen_continuous(self):
        if not self.mic:
            return ""

        print("\n🎙️ Escucha activa (habla naturalmente)...")
        with self.mic as source:
            self.recognizer.adjust_for_ambient_noise(
                source, duration=self.ambient_noise_duration
            )
            audio_buffer = []
            last_voice_time = time.time()

            while not self.exit_flag:
                try:
                    audio = self.recognizer.listen(
                        source, timeout=1, phrase_time_limit=self.voice_timeout
                    )
                    audio_buffer.append(audio)
                    last_voice_time = time.time()
                except sr.WaitTimeoutError:
                    if (
                        time.time() - last_voice_time > self.silence_threshold
                        and audio_buffer
                    ):
                        break
                    continue
                except Exception as e:
                    print(f"Error de escucha: {e}")
                    continue

            return self._process_audio_buffer(audio_buffer)

    def generate_response(self, prompt):
        try:
            messages = {
                "model": self.model_name,
                "prompt": prompt,
                "system": (
                    # "Eres una asistente virtual, solo debes responder preguntas relacionadas con atención al cliente."
                    "Responde únicamente en español."
                    "Tus respuesta deben estar simplificadas y no deben ser mayores a 150 caracteres."
                    "Tus respuestas deben ser breves, claras y directas, usando una sola línea sin saltos."
                    "Evita explicaciones largas y frases repetitivas."
                    "No uses listas o enumeración."
                    "No uses frases como 'como asistente' ni disculpas innecesarias. "
                    "Contesta como si fueras una persona amable."
                ),
                "options": {"temperature": 0.7, "max_tokens": 150, "stop": ["\n"]},
                "stream": False,
                "keepAlive": True,
            }

            response = requests.post(
                self.ollama_url,
                json=messages,
                headers={"Content-Type": "application/json"},
                timeout=30,  # 30 segundos de timeout
            )

            if response.status_code == 200:
                return response.json()["response"].strip()
            else:
                print(f"Error Ollama: {response.text}")
                return "Hubo un problema al generar la respuesta."

        except Exception as e:
            print(f"Error en generación: {e}")
            return "No pude procesar tu pregunta."

    def speak(self, text):
        if not text:
            return
        try:
            print(f"\n🤖 {text}")
            # Configuración rápida
            engine = pyttsx3.init()
            engine.setProperty("rate", 155)
            engine.setProperty("volume", 1.0)

            # Usa la primer voz de las preferencias
            voices = engine.getProperty("voices")
            for voice in voices:
                if "spanish" in voice.name.lower():
                    engine.setProperty("voice", voice.id)
                    break
                else:
                    engine.setProperty("voice", voices[0].id)
                
            voices = engine.getProperty("voices")
            if voices:
                engine.setProperty("voice", voices[0].id)

            engine.say(str(text))
            engine.runAndWait()

        except RuntimeError as e:
            print(f"Error de voz: {e}")
        finally:
            if "engine" in locals():
                engine.stop()

    def start(self):
        self.speak("Hola, soy tu asistente.")

        while not self.exit_flag:
            user_input = self.listen_continuous()

            if not user_input:
                continue

            if any(
                keyword in user_input.lower()
                for keyword in [
                    "salir",
                    "terminar",
                    "adiós",
                    "hasta luego",
                    "hasta pronto",
                ]
            ):
                self.start()

            response = self.generate_response(user_input)
            self.speak(response)


if __name__ == "__main__":
    try:
        bot = VoiceChatbot()
        bot.start()
    except KeyboardInterrupt:
        print("\n⏹️ Aplicación interrumpida")
    except Exception as e:
        print(f"\n❌ Error crítico: {e}")
    finally:
        print("\n✅ Sesión finalizada\n")
