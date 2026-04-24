import { useEffect, useRef, useState } from "react";

export function useVoiceInput(onResult) {
  const callbackRef = useRef(onResult);
  const recognitionRef = useRef(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    callbackRef.current = onResult;
  }, [onResult]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop?.();
    },
    []
  );

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = (language = "en-IN") => {
    if (!supported) {
      return false;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        callbackRef.current?.(transcript);
      }
      setListening(false);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    return true;
  };

  const stop = () => {
    recognitionRef.current?.stop?.();
    setListening(false);
  };

  return {
    listening,
    supported,
    start,
    stop,
  };
}

export default useVoiceInput;
