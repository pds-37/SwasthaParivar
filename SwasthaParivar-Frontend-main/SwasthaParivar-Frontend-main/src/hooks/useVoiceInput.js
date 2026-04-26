import { useEffect, useRef, useState } from "react";

const DEFAULT_LANGUAGE = "en-IN";
const MAX_RECORDING_MS = 15000;

const stripCodecSuffix = (mimeType = "") => String(mimeType || "").split(";", 1)[0].trim().toLowerCase();

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = String(reader.result || "");
      const [, data = ""] = result.split(",", 2);

      if (!data) {
        reject(new Error("Could not read the recorded audio"));
        return;
      }

      resolve(data);
    };

    reader.onerror = () => reject(new Error("Could not read the recorded audio"));
    reader.readAsDataURL(blob);
  });

const mergeAudioChunks = (chunks = []) => {
  const totalLength = chunks.reduce((count, chunk) => count + chunk.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    merged.set(chunk, offset);
    offset += chunk.length;
  });

  return merged;
};

const encodeWav = (samples, sampleRate) => {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
};

const getSpeechErrorMessage = (errorCode = "") => {
  switch (errorCode) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access is blocked. Allow microphone access and try again.";
    case "audio-capture":
      return "No working microphone was found on this device.";
    case "network":
      return "Voice input is unavailable right now. Please try again.";
    case "no-speech":
      return "I could not hear anything. Please try again.";
    default:
      return "Voice input failed. Please try again.";
  }
};

export function useVoiceInput({ onResult, onError, transcribeAudio } = {}) {
  const callbackRef = useRef(onResult);
  const errorRef = useRef(onError);
  const transcribeRef = useRef(transcribeAudio);
  const recognitionRef = useRef(null);
  const modeRef = useRef(null);
  const resultReceivedRef = useRef(false);
  const fallbackTriedRef = useRef(false);
  const recordingLanguageRef = useRef(DEFAULT_LANGUAGE);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const processorRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const sampleRateRef = useRef(44100);
  const stopTimerRef = useRef(null);
  const finalizePromiseRef = useRef(null);
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    callbackRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    errorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    transcribeRef.current = transcribeAudio;
  }, [transcribeAudio]);

  const reportError = (message, details = {}) => {
    errorRef.current?.(message, details);
  };

  const clearStopTimer = () => {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  const cleanupRecognition = () => {
    if (!recognitionRef.current) {
      return;
    }

    recognitionRef.current.onresult = null;
    recognitionRef.current.onerror = null;
    recognitionRef.current.onend = null;
    recognitionRef.current = null;
  };

  const cleanupRecording = async () => {
    clearStopTimer();

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        await audioContextRef.current.close();
      } catch {
        // Ignore audio-context shutdown failures.
      }
      audioContextRef.current = null;
    }
  };

  const hasSpeechRecognition =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const hasAudioCapture =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    Boolean(window.AudioContext || window.webkitAudioContext);

  const supported = hasSpeechRecognition || hasAudioCapture;

  const finalizeRecording = async () => {
    if (finalizePromiseRef.current) {
      return finalizePromiseRef.current;
    }

    finalizePromiseRef.current = (async () => {
      const mergedAudio = mergeAudioChunks(recordedChunksRef.current);
      const sampleRate = sampleRateRef.current || 44100;

      await cleanupRecording();
      modeRef.current = null;
      setListening(false);

      if (!mergedAudio.length) {
        reportError("I could not hear anything. Please try again.", {
          source: "audio-recording",
          reason: "empty-capture",
        });
        return false;
      }

      if (!transcribeRef.current) {
        reportError("Voice transcription is not available right now.", {
          source: "audio-recording",
          reason: "missing-transcriber",
        });
        return false;
      }

      setProcessing(true);

      try {
        const wavBlob = encodeWav(mergedAudio, sampleRate);
        const transcript = await transcribeRef.current({
          audioData: await blobToBase64(wavBlob),
          mimeType: stripCodecSuffix(wavBlob.type) || "audio/wav",
          language: recordingLanguageRef.current || DEFAULT_LANGUAGE,
        });
        const normalizedTranscript = String(transcript || "").trim();

        if (!normalizedTranscript) {
          reportError("I could not transcribe that. Please try again.", {
            source: "audio-recording",
            reason: "empty-transcript",
          });
          return false;
        }

        callbackRef.current?.(normalizedTranscript);
        return true;
      } catch (error) {
        reportError(error?.message || "Voice input failed. Please try again.", {
          source: "audio-recording",
          reason: "transcription-failed",
        });
        return false;
      } finally {
        setProcessing(false);
        recordedChunksRef.current = [];
        finalizePromiseRef.current = null;
      }
    })();

    return finalizePromiseRef.current;
  };

  const startFallbackRecording = async (language = DEFAULT_LANGUAGE) => {
    if (!hasAudioCapture) {
      return false;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContextClass();

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const sourceNode = audioContext.createMediaStreamSource(stream);
    const processorNode = audioContext.createScriptProcessor(4096, 1, 1);

    recordingLanguageRef.current = language;
    recordedChunksRef.current = [];
    sampleRateRef.current = audioContext.sampleRate || 44100;
    mediaStreamRef.current = stream;
    audioContextRef.current = audioContext;
    sourceNodeRef.current = sourceNode;
    processorRef.current = processorNode;
    modeRef.current = "recording";

    processorNode.onaudioprocess = (event) => {
      const channelData = event.inputBuffer.getChannelData(0);
      recordedChunksRef.current.push(new Float32Array(channelData));
    };

    sourceNode.connect(processorNode);
    processorNode.connect(audioContext.destination);

    clearStopTimer();
    stopTimerRef.current = window.setTimeout(() => {
      void finalizeRecording();
    }, MAX_RECORDING_MS);

    setListening(true);
    return true;
  };

  const start = async (language = DEFAULT_LANGUAGE) => {
    if (!supported) {
      return false;
    }

    resultReceivedRef.current = false;
    fallbackTriedRef.current = false;
    recordingLanguageRef.current = language;

    if (!hasSpeechRecognition) {
      try {
        return await startFallbackRecording(language);
      } catch (error) {
        reportError(error?.message || "Microphone access failed. Please try again.", {
          source: "audio-recording",
          reason: "permission-denied",
        });
        return false;
      }
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      resultReceivedRef.current = Boolean(transcript);

      if (transcript) {
        callbackRef.current?.(transcript);
      }

      cleanupRecognition();
      modeRef.current = null;
      setListening(false);
    };

    recognition.onerror = async (event) => {
      cleanupRecognition();
      modeRef.current = null;
      setListening(false);

      const shouldFallback =
        hasAudioCapture &&
        !fallbackTriedRef.current &&
        !["aborted", "no-speech"].includes(event?.error);

      if (shouldFallback) {
        fallbackTriedRef.current = true;

        try {
          const started = await startFallbackRecording(language);
          if (started) {
            return;
          }
        } catch {
          // Fall through to the user-facing error.
        }
      }

      reportError(getSpeechErrorMessage(event?.error), {
        source: "speech-recognition",
        reason: event?.error || "unknown",
      });
    };

    recognition.onend = () => {
      cleanupRecognition();
      modeRef.current = null;

      if (!resultReceivedRef.current) {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;
    modeRef.current = "speech-recognition";

    try {
      recognition.start();
      setListening(true);
      return true;
    } catch (error) {
      cleanupRecognition();
      modeRef.current = null;

      if (hasAudioCapture) {
        try {
          return await startFallbackRecording(language);
        } catch {
          // Fall through to the user-facing error below.
        }
      }

      reportError(error?.message || "Voice input failed. Please try again.", {
        source: "speech-recognition",
        reason: "start-failed",
      });
      return false;
    }
  };

  const stop = async () => {
    if (modeRef.current === "recording") {
      return finalizeRecording();
    }

    recognitionRef.current?.stop?.();
    cleanupRecognition();
    modeRef.current = null;
    setListening(false);
    return true;
  };

  useEffect(
    () => () => {
      recognitionRef.current?.stop?.();
      cleanupRecognition();
      void cleanupRecording();
    },
    []
  );

  return {
    listening,
    processing,
    supported,
    start,
    stop,
  };
}

export default useVoiceInput;
