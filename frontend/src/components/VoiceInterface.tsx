import React, { useState, useEffect } from 'react';
import { Box, IconButton, Typography, Paper, CircularProgress } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import { voiceService } from '../services/voiceService';
import { apiService } from '../services/apiService';
import { API_ENDPOINTS } from '../config/api';

interface VoiceInterfaceProps {
  language: string;
  onResponse: (response: string) => void;
}

export const VoiceInterface: React.FC<VoiceInterfaceProps> = ({ language, onResponse }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!voiceService.isSupported()) {
      setError('Voice features not supported in this browser');
    }
  }, []);

  const handleStartListening = () => {
    setError('');
    setTranscript('');
    setIsListening(true);

    voiceService.startListening(
      language,
      async (text) => {
        setTranscript(text);
        setIsListening(false);
        await processVoiceInput(text);
      },
      (err) => {
        setError(`Error: ${err}`);
        setIsListening(false);
      }
    );
  };

  const handleStopListening = () => {
    voiceService.stopListening();
    setIsListening(false);
  };

  const processVoiceInput = async (text: string) => {
    setIsProcessing(true);
    try {
      const response: any = await apiService.post(API_ENDPOINTS.TEXT_INTERACT, {
        message: text,
        language,
      });

      if (response.success && response.data) {
        const responseText = response.data.response;
        onResponse(responseText);
        
        // Speak the response
        setIsSpeaking(true);
        voiceService.speak(responseText, language, () => {
          setIsSpeaking(false);
        });
      }
    } catch (err: any) {
      setError(err.error?.message || 'Failed to process voice input');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopSpeaking = () => {
    voiceService.stopSpeaking();
    setIsSpeaking(false);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, textAlign: 'center', borderRadius: 3 }}>
      <Typography variant="h6" gutterBottom>
        Voice Assistant
      </Typography>

      <Box sx={{ my: 3 }}>
        {isProcessing ? (
          <CircularProgress size={80} />
        ) : (
          <IconButton
            onClick={isListening ? handleStopListening : handleStartListening}
            disabled={isSpeaking}
            sx={{
              width: 120,
              height: 120,
              bgcolor: isListening ? 'error.main' : 'primary.main',
              color: 'white',
              '&:hover': {
                bgcolor: isListening ? 'error.dark' : 'primary.dark',
              },
              animation: isListening ? 'pulse 1.5s infinite' : 'none',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' },
                '100%': { transform: 'scale(1)' },
              },
            }}
          >
            {isListening ? <MicOffIcon sx={{ fontSize: 60 }} /> : <MicIcon sx={{ fontSize: 60 }} />}
          </IconButton>
        )}
      </Box>

      {isSpeaking && (
        <Box sx={{ mb: 2 }}>
          <IconButton onClick={handleStopSpeaking} color="secondary">
            <VolumeUpIcon />
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            Speaking...
          </Typography>
        </Box>
      )}

      {transcript && (
        <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'grey.100' }}>
          <Typography variant="body2" color="text.secondary">
            You said:
          </Typography>
          <Typography variant="body1">{transcript}</Typography>
        </Paper>
      )}

      {error && (
        <Typography variant="body2" color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        {isListening ? 'Listening...' : 'Tap microphone to speak'}
      </Typography>
    </Paper>
  );
};
