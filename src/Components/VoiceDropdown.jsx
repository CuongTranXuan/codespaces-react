import React, { useState, useEffect } from 'react';

const VoiceDropdown = ({ client, onVoiceSelect }) => {
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        if (client) { // Make sure client is initialized
          const allVoices = await client.voices.getAll();
          setVoices(allVoices.voices);

          // Optionally set a default voice (e.g., the first one)
          if (allVoices.length > 0) {
            setSelectedVoice(allVoices.voices[0]);
          }
        } else {
          console.error("Client not initialized. Can't fetch voices.");
        }

      } catch (error) {
        console.error("Error fetching voices:", error);
      }
    };

    fetchVoices();
  }, []); // Run effect whenever the client changes


  const handleChange = (event) => {
      const selectedVoiceId = event.target.value;
      const selectedVoiceObject = voices.find(voice => voice.name === selectedVoiceId);
      setSelectedVoice(selectedVoiceObject)
      onVoiceSelect(selectedVoiceObject);
  };

  return (
    <div>
      <select value={selectedVoice ? selectedVoice.name : ""} onChange={handleChange}>
        <option value="" disabled>Select a voice</option>
        {voices.map((voice) => (
          <option key={voice.voice_id} value={voice.name}>
            {voice.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default VoiceDropdown;