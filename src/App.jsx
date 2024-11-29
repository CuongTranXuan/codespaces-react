import './App.css';
import { useState, useRef, useEffect } from 'react';
import { ElevenLabsClient } from "elevenlabs";

function App() {
  const audioRef = useRef(null);
  const [audioCtx, setAudioCtx] = useState(null); // Store audio context
  const [client, setClient] = useState(null)
  const [recording, setRecording] = useState(false);
  const [audioURL, setAudioURL] = useState('');
  const [generatedAudioStream, setGeneratedAudioStream] = useState(null);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const visualIndicator = useRef(null);
  let vibrationInterval;

  useEffect(() => {
    // Initialize ElevenLabs Client (replace with your actual API key)
    const client = new ElevenLabsClient({ apiKey: "sk_492560d0e8fe33a5f48faed524a418bdd4cdabd8b82de926" });
    setClient(client)
    setAudioCtx(new (window.AudioContext || window.webkitAudioContext)());

    return () => {
        audioCtx?.close(); // Clean up audio context on unmount
    }
}, []);

  useEffect(() => {
    if (recording && visualIndicator.current) {
      startVisualVibration();
    } else {
      stopVisualVibration();
    }
  }, [recording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);

      mediaRecorder.current.ondataavailable = (e) => {
        chunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const blob = new Blob(chunks.current, { type: 'audio/ogg; codecs=opus' });
        chunks.current = [];
        const url = URL.createObjectURL(blob);
        setAudioURL(url);

        try {
          const audioArrayBuffer = await blob.arrayBuffer();

          const stream = await client.speechToSpeech.convertAsStream("9BWtsMINqrJLrRacOk9x", { // Replace with your Voice ID
            audio: audioArrayBuffer,
            enable_logging: 1,
            optimize_streaming_latency: 0,
            output_format: "mp3_22050_32"
          });
          setGeneratedAudioStream(stream)

        } catch (error) {
          console.error("ElevenLabs Error:", error);
        }
      };
      mediaRecorder.current.start();
      setRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };


  useEffect(() => {
    if (!generatedAudioStream || !audioCtx) return;
    const decodeAndPlay = (chunk) => {
      if (!chunk) return;
      audioCtx.decodeAudioData(chunk, (decodedData) => {
        const source = audioCtx.createBufferSource();
        source.buffer = decodedData;
        source.connect(audioCtx.destination);
        source.start(0);
      }, err => console.error("Decoding error:", err));
    };

    generatedAudioStream.on('data', decodeAndPlay);
    generatedAudioStream.on('end', () => {});
    generatedAudioStream.on('error', err => console.error("Error reading stream: ", err));

    return () => {
        if (generatedAudioStream) {
            generatedAudioStream.off('data', decodeAndPlay);
            generatedAudioStream.off('end');
            generatedAudioStream.off('error');
        }
    };
  }, [generatedAudioStream, audioCtx]);


  const stopRecording = () => {
    if (mediaRecorder.current) {
      mediaRecorder.current.stop();
      setRecording(false);
    }
  };

  const startVisualVibration = () => {
    let scale = 1;
    let direction = 1;

    vibrationInterval = setInterval(() => {
      scale += direction * 0.05;
      if (scale > 1.1) {
        direction = -1;
      } else if (scale < 0.9) {
        direction = 1;
      }

      visualIndicator.current.style.transform = `scale(${scale})`;
    }, 30);
  };

  const stopVisualVibration = () => {
    clearInterval(vibrationInterval);
    if (visualIndicator.current) {
      visualIndicator.current.style.transform = 'scale(1)';
    }
  };


  return (
    <div className="App">
      <header className="App-header">
        <img src="Octocat.png" className="App-logo" alt="logo" />
        <p>Record and Playback Audio</p>
        <button onClick={recording ? stopRecording : startRecording}>
          {recording ? 'Stop Recording' : 'Start Recording'}
        </button>
        {audioURL && (
          <audio controls src={audioURL} />
        )}
        <div ref={visualIndicator} style={{ width: '50px', height: '50px', backgroundColor: 'red', borderRadius: '50%', display: recording ? 'block' : 'none'}} />
      </header>
    </div>
  );
}

export default App;
