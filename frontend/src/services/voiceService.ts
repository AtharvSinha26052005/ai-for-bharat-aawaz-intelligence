// Voice Service using Web Speech API
export class VoiceService {
  private recognition: any;
  private synthesis: SpeechSynthesis;
  private isListening: boolean = false;

  constructor() {
    // Initialize Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
    }

    // Initialize Speech Synthesis
    this.synthesis = window.speechSynthesis;
  }

  // Check if browser supports speech recognition
  isSupported(): boolean {
    return !!this.recognition && !!this.synthesis;
  }

  // Start listening for voice input
  startListening(
    language: string = 'en-US',
    onResult: (transcript: string) => void,
    onError?: (error: string) => void
  ): void {
    if (!this.recognition) {
      onError?.('Speech recognition not supported');
      return;
    }

    // Don't start if already listening
    if (this.isListening) {
      console.warn('Already listening');
      return;
    }

    this.recognition.lang = this.getLanguageCode(language);
    this.isListening = true;

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      onResult(transcript);
      this.isListening = false;
    };

    this.recognition.onerror = (event: any) => {
      onError?.(event.error);
      this.isListening = false;
    };

    this.recognition.onend = () => {
      this.isListening = false;
    };

    try {
      this.recognition.start();
    } catch (err: any) {
      // Handle case where recognition is already started
      if (err.message?.includes('already started')) {
        this.isListening = false;
        onError?.('Please wait a moment and try again');
      } else {
        onError?.(err.message || 'Failed to start recognition');
      }
    }
  }

  // Stop listening
  stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (err) {
        // Ignore errors when stopping
        console.warn('Error stopping recognition:', err);
      }
      this.isListening = false;
    }
  }

  // Speak text
  speak(text: string, language: string = 'en-US', onEnd?: () => void): void {
    if (!this.synthesis) {
      console.error('Speech synthesis not supported');
      return;
    }

    // Cancel any ongoing speech
    this.synthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.getLanguageCode(language);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;

    if (onEnd) {
      utterance.onend = onEnd;
    }

    this.synthesis.speak(utterance);
  }

  // Stop speaking
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  // Get language code for Web Speech API
  private getLanguageCode(lang: string): string {
    const languageMap: Record<string, string> = {
      en: 'en-US',
      hi: 'hi-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      bn: 'bn-IN',
      mr: 'mr-IN',
    };
    return languageMap[lang] || 'en-US';
  }

  // Check if currently listening
  getIsListening(): boolean {
    return this.isListening;
  }
}

export const voiceService = new VoiceService();
