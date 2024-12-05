import "./App.css";
import { useState, useRef, useEffect } from "react";
import { ElevenLabsClient, stream } from "elevenlabs";
import VoiceDropdown from "./Components/VoiceDropdown";

function App() {
    const [audioCtx, setAudioCtx] = useState(null); // Store audio context
    const client = new ElevenLabsClient({
        apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
    });
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [recording, setRecording] = useState(false);
    const [audioURL, setAudioURL] = useState("");
    const [audioStream, setAudioStream] = useState(null);
    const mediaRecorder = useRef(null);
    const chunks = useRef([]);
    const visualIndicator = useRef(null);
    let vibrationInterval;
    let audioInterval;

    useEffect(() => {
        // setClient(client)
        setAudioCtx(
            new (window.AudioContext || window.webkitAudioContext)({
                latencyHint: "interactive", // Optimize for real-time performance
            })
        );

        return () => {
            audioCtx?.close(); // Clean up audio context on unmount
        };
    }, []);

    // Vibration indicator that we're sort of talking
    useEffect(() => {
        if (recording && visualIndicator.current) {
            startVisualVibration();
        } else {
            stopVisualVibration();
        }
    }, [recording]);

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
            visualIndicator.current.style.transform = "scale(1)";
        }
    };

    const handleVoiceSelect = (voice) => {
        setSelectedVoice(voice);
    };

    async function streamToBlob(
        readableStream,
        mimeType = "application/octet-stream"
    ) {
        const chunks = [];
        const reader = readableStream.reader;

        let done = false;
        while (!done) {
            const { value, done: streamDone } = await reader.read();
            if (value) {
                chunks.push(value);
            }
            done = streamDone;
        }

        return new Blob(chunks, { type: mimeType });
    }

    const sendAudio11Labs = async (chunks, voice_id) => {
        const blob = new Blob(chunks.current, {
            type: "audio/ogg; codecs=opus",
        });
        chunks.current = [];

        try {
            const outputStream = await client.speechToSpeech.convert(voice_id, {
                // Replace with your Voice ID
                audio: blob, // Blob is enough
                enable_logging: 1,
                optimize_streaming_latency: 0,
                output_format: "mp3_22050_32",
            });

            setAudioStream(outputStream);

            const outputBlob = await streamToBlob(outputStream);

            const url = URL.createObjectURL(outputBlob);
            setAudioURL(url);
            // Create a media stream source from the microphone
            // const mic = audioCtx.createMediaStreamSource(stream);
            // // Connect the microphone to the audio context destination (headphones/speakers)
            // mic.connect(audioCtx.destination);
        } catch (error) {
            console.error("ElevenLabs Error:", error);
        }
    };

    function recordInterval(stream) {
        console.log(
            "recording"
        )
        mediaRecorder.current = new MediaRecorder(stream);

        mediaRecorder.current.ondataavailable = (e) => {
            chunks.current.push(e.data);
        };
        mediaRecorder.current.onstop = (e) => {
            sendAudio11Labs(chunks, selectedVoice.voice_id)
        }

        mediaRecorder.current.start();
        setTimeout(() => mediaRecorder.current.stop(), 3000);
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { latency: 0 },
            });
            audioInterval = setInterval(recordInterval(stream), 3000);
            setRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    };

    const stopRecording = () => {
        clearInterval(audioInterval);
        setRecording(false);
    };

    return (
        <div className="App">
            <header className="App-header">
                <img src="Octocat.png" className="App-logo" alt="logo" />
                <p>Select Voices</p>
                <VoiceDropdown
                    client={client}
                    onVoiceSelect={handleVoiceSelect}
                ></VoiceDropdown>
                {/* Display selected voice details (optional) */}
                {selectedVoice && (
                    <div>
                        <p>Selected Voice: {selectedVoice.name}</p>
                    </div>
                )}
                <p>Record and Playback Audio</p>
                <button onClick={recording ? stopRecording : startRecording}>
                    {recording ? "Stop Recording" : "Start Recording"}
                </button>
                {audioURL && <audio controls autoPlay src={audioURL} />}
                <div
                    ref={visualIndicator}
                    style={{
                        width: "50px",
                        height: "50px",
                        backgroundColor: "red",
                        borderRadius: "50%",
                        display: recording ? "block" : "none",
                    }}
                />
            </header>
        </div>
    );
}

export default App;
