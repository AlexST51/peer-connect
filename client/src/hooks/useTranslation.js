import { useState, useRef, useCallback, useEffect } from 'react';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_REALTIME_URL = 'wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime-preview-2024-12-17';

export function useTranslation(audioStream, targetLanguage = 'en') {
  const [subtitles, setSubtitles] = useState([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);

  const startTranslation = useCallback(async () => {
    if (!OPENAI_API_KEY) {
      setError('OpenAI API key not configured');
      return;
    }

    if (!audioStream) {
      setError('No audio stream available');
      return;
    }

    try {
      setIsTranslating(true);
      setError(null);

      // Connect to OpenAI Realtime API
      const ws = new WebSocket(OPENAI_REALTIME_URL, [
        'realtime',
        `openai-insecure-api-key.${OPENAI_API_KEY}`,
        'openai-beta.realtime-v1'
      ]);

      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to OpenAI Realtime API');
        
        // Configure session
        ws.send(JSON.stringify({
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are a real-time translation assistant. Transcribe and translate the incoming audio to ${targetLanguage}. Provide only the translated text without any additional commentary.`,
            voice: 'alloy',
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
            input_audio_transcription: {
              model: 'whisper-1'
            },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500
            },
            temperature: 0.1,
            max_response_output_tokens: 150
          }
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle transcription
          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            const transcript = data.transcript;
            if (transcript) {
              setSubtitles(prev => [
                ...prev.slice(-4), // Keep last 5 subtitles
                {
                  id: Date.now(),
                  text: transcript,
                  timestamp: new Date(),
                  type: 'original'
                }
              ]);
            }
          }

          // Handle translation response
          if (data.type === 'response.text.delta') {
            const translatedText = data.delta;
            if (translatedText) {
              setSubtitles(prev => {
                const lastSubtitle = prev[prev.length - 1];
                if (lastSubtitle && lastSubtitle.type === 'translation' && 
                    Date.now() - lastSubtitle.timestamp < 1000) {
                  // Append to existing translation
                  return [
                    ...prev.slice(0, -1),
                    {
                      ...lastSubtitle,
                      text: lastSubtitle.text + translatedText
                    }
                  ];
                } else {
                  // Create new translation subtitle
                  return [
                    ...prev.slice(-4),
                    {
                      id: Date.now(),
                      text: translatedText,
                      timestamp: Date.now(),
                      type: 'translation'
                    }
                  ];
                }
              });
            }
          }

          // Handle errors
          if (data.type === 'error') {
            console.error('OpenAI API error:', data.error);
            setError(data.error.message);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error with translation service');
      };

      ws.onclose = () => {
        console.log('Disconnected from OpenAI Realtime API');
        setIsTranslating(false);
      };

      // Set up audio processing
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const source = audioContextRef.current.createMediaStreamSource(audioStream);
      
      // Create audio processor
      await audioContextRef.current.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob([`
            class AudioProcessor extends AudioWorkletProcessor {
              process(inputs, outputs, parameters) {
                const input = inputs[0];
                if (input.length > 0) {
                  const channelData = input[0];
                  // Convert Float32Array to Int16Array (PCM16)
                  const pcm16 = new Int16Array(channelData.length);
                  for (let i = 0; i < channelData.length; i++) {
                    const s = Math.max(-1, Math.min(1, channelData[i]));
                    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                  }
                  this.port.postMessage(pcm16.buffer);
                }
                return true;
              }
            }
            registerProcessor('audio-processor', AudioProcessor);
          `], { type: 'application/javascript' })
        )
      );

      const processor = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
      processorRef.current = processor;

      processor.port.onmessage = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          // Send audio data to OpenAI
          const base64Audio = btoa(
            String.fromCharCode(...new Uint8Array(event.data))
          );
          ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64Audio
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

    } catch (err) {
      console.error('Error starting translation:', err);
      setError(err.message);
      setIsTranslating(false);
    }
  }, [audioStream, targetLanguage]);

  const stopTranslation = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsTranslating(false);
  }, []);

  const clearSubtitles = useCallback(() => {
    setSubtitles([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTranslation();
    };
  }, [stopTranslation]);

  return {
    subtitles,
    isTranslating,
    error,
    startTranslation,
    stopTranslation,
    clearSubtitles
  };
}
