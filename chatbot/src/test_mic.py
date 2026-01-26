import speech_recognition as sr

def probar_microfono():
    # Listar dispositivos de audio disponibles
    print("🎤 Micrófonos disponibles:")
    for i, mic in enumerate(sr.Microphone.list_microphone_names()):
        print(f"[{i}] {mic}")
    
    # Configurar el reconocedor
    r = sr.Recognizer()
    
    # Seleccionar micrófono (cambia el índice si es necesario)
    mic_index = int(input("\nIngresa el número de micrófono a probar: "))
    
    with sr.Microphone(device_index=mic_index) as source:
        print("\n🔊 Ajustando ruido ambiente...")
        r.adjust_for_ambient_noise(source, duration=2)
        
        print("🎙️ Habla ahora (5 segundos)...")
        audio = r.listen(source, timeout=5, phrase_time_limit=5)
        
        try:
            texto = r.recognize_google(audio, language="es-ES")
            print(f"\n✅ Texto reconocido: {texto}")
        except sr.UnknownValueError:
            print("\n❌ No se pudo entender el audio")
        except sr.RequestError as e:
            print(f"\n❌ Error en el servicio: {e}")
        except Exception as e:
            print(f"\n❌ Error inesperado: {e}")

if __name__ == "__main__":
    print("🔊 Prueba de reconocimiento de voz\n")
    probar_microfono()