# Gemini 3.1 Flash Live Preview Demo

https://github.com/user-attachments/assets/c4a0ebaa-fc1a-486f-89da-26b5c26c6dd6

## Overview
This project showcases Gemini 3.1 real-time multimodal AI capabilities in a web application using Angular. Currently the Live API is set to use `Gemini 3.1 Flash Live Preview`.

![diagram](https://i.imgur.com/74hv0ay.png)

This project demonstrates integration with Google's Gemini AI models through the `@google/genai` library now in (Technical) [Preview](https://github.com/googleapis/js-genai/commit/da38b6df88705c8ff1ea9a2e1c5ffa596054b382).

> This project started as a migration to Angular of the [Live API - Web console](https://github.com/google-gemini/multimodal-live-api-web-console) as is only available in React at the moment.

## What's new? 

[19th May 2026]
- New model: `gemini-3.1-flash-live-preview` replaces `gemini-2.5-flash-native-audio-latest`.
- Features Real-Time Multimodal Interaction with full barge-in and conversational rhythm adaptation.
- Explicit Voice Activity Detection (VAD) toggle added to the UI (`explicitVadSignal`).
- Deep conversational session context natively supported.
- Check `gemini31-flash-live.md` for a full breakdown of the new features configuration and status!

[5th March 2026]
- Upgraded `@google/genai` SDK from `1.8.0` to `1.44.0`.
- Updated model to `gemini-2.5-flash-native-audio-latest` (latest stable native audio model).
- Enabled **native Gemini transcription** for both user and model audio via `inputAudioTranscription` and `outputAudioTranscription` in the Live API config. No third-party service (Deepgram) required.
- Transcription output is now **buffered by turn** — fragments accumulate until turn-complete, interruption, or a 2-second inactivity timeout, then emit as a single log entry.
- Fixed MCP tool response handling: parse `content[0].text` from MCP `callTool` responses, with graceful fallback for non-JSON error strings.
- Fixed `functionResponses` payload to use an array as required by the updated SDK.

[30th September]
- New model: `Gemini 2.5 Flash Native Audio Preview` replaces `Gemini 2.0 Flash Live`.
- Updated to latest model `gemini-2.5-flash-native-audio-preview-09-2025`.
- Updated all dependencies.
- Known issue: MCP Server specs are not compatible with GenAI SDK (1.9.0 or later). See details [here](https://github.com/googleapis/js-genai/issues/990) 
- Known issue: MCP Weather Server definition for `getCurrentTemperature` is not working with MCP SDK (1.8.2) downgrading to MCP SDK (1.5.0) until resolved.

[8th July]
- Added MCP support. Integrated Model Context Protocol SDK with access to two servers: weather and multiplication. 
- Function calling is not available for native audio. Make sure the `affective` and `proactive` flags are disabled. To use you can try prompts like `What's the temperature in Barcelona?` or `Multiply 2 by 2`. You can inspect the `tool call` and `tool responses` by expanding the left side panel.

[7th July]
- New model: `Gemini 2.5 Flash Live` replaces `Gemini 2.0 Flash Live`.
- Native audio: 30 voices, 24 languages, accents and voice effects (whispering, laughing). Tool usage is limited to function calling and search.
- Live configuration options:
  - Native audio: [affective dialog](https://ai.google.dev/gemini-api/docs/live-guide#affective-dialog) and [proactive audio](https://ai.google.dev/gemini-api/docs/live-guide#proactive-audio) options.
  - Cascade audio: new [language support](https://ai.google.dev/gemini-api/docs/live-guide#supported-languages).
- Previous models are referred as half-cascade or cascade audio: `gemini-live-2.5-flash-preview` and `gemini-2.0-flash-live-001`. As opposed to new native audio models, these models go through a two step process: native audio input and text-to-speech output. All tool usage options are available. More details about how to choose your audio architecture [here](https://ai.google.dev/gemini-api/docs/live#audio-generation).

[10th April]
- New model: `Gemini 2.0 Flash Live` replaces `Gemini 2.0 Flash Experimental`.
- 3 more voices: Leda, Orus, and Zephyr.
- Live configuration options:
  - Setup automatic context window compression via `config.contextWindowCompression`.
  - Adjust Gemini's voice quality output: 16kHz (low) and 24kHz (medium) via `config.generationConfig.mediaResolution`.

[26th March]
- Enable transcripts for both user and Gemini via a third party API (DeepGram).

## Core Features
- Starter kit based on [Live API - Web console](https://github.com/google-gemini/multimodal-live-api-web-console)
- TypeScript GenAI SDK for Gemini 2.5 API
- MCP support: Typescript MCP SDK
- Real-time streaming voice from and to Gemini 2.5 Live API
- Real-time streaming video from webcam or screen to Gemini 2.5 Live API
- Support for both native and cascade audio models
- Natural language text generation
- Interactive chat functionality
- Google Search integration for current information
- Secure Python code execution in sandbox
- Automated function calling for API integration
- Live transcription for streamed audio (user and model) via native Gemini transcription (built-in)
- Legacy Deepgram transcription support (optional, disabled by default)

### Potential Future Extensions (Gemini 3.1)
- **Stream Translation**: Configure stream-level audio translations to target specific languages on the fly using `streamTranslationConfig`.
- **Session Resumption**: Persist and seamlessly resume dropped or paused multimodal sessions natively via `sessionResumption`.
- **Avatar Configuration**: Integrate with real-time visual avatars driven directly by the model's responses and emotions via `avatarConfig`.

## What's Gemini 2.5 Live?

Gemini Live API enables a new generation of dynamic, multimodal AI real-time experiences.

### The Gemini App (available for Android and iOS)
Gemini Live powers innovative applications across devices and platforms:

- **Hands-free AI Assistance**: Users interact naturally through voice while cooking, driving, or multitasking
- **Real-time Visual Understanding**: Get instant AI responses as you show objects, documents, or scenes through your camera
- **Smart Home Automation**: Control your environment with natural voice commands - from adjusting lights to managing thermostats
- **Seamless Shopping**: Browse products, compare options, and complete purchases through conversation
- **Live Problem Solving**: Share your screen to get real-time guidance, troubleshooting, or explanations
- **Integration with Google services**: leverage existing Google services like Search or Maps to enhance its capabilities

[![Gemini App on Pixel 9](https://img.youtube.com/vi/mNTGbi5ReMc/0.jpg)](https://www.youtube.com/watch?v=mNTGbi5ReMc)

### Project Astra

Project Astra is a research initiative aimed at developing a universal AI assistant with advanced capabilities. It's designed to process multimodal information, including text, speech, images, and video, allowing for a more comprehensive understanding of user needs and context.

![Project Astra](https://i.imgur.com/VEPikJN.png)

[More details](https://deepmind.google/technologies/project-astra/)

## Setup Instructions

### System Requirements
- Node.js and npm (latest stable version)
- Angular CLI (globally installed via `npm install -g @angular/cli`)
- Google AI API key from [Google AI Studio](https://makersuite.google.com/)
- Deepgram API key from [Deepgram](https://deepgram.com/) (optional)

> As of the March 2026 update, native Gemini transcription is enabled by default via `inputAudioTranscription` and `outputAudioTranscription` in the Live API config. Deepgram is no longer required. Legacy Deepgram support remains in the codebase but is disabled by default.

### Installation Steps

1. **Set Up Environment Variables**
   ```bash
   ng g environments
   ```
   Create `environment.development.ts` in `src/environments/` with:
   ```typescript
   export const environment = {
     API_KEY: 'YOUR_GOOGLE_AI_API_KEY',
     DEEPGRAM_API_KEY: 'YOUR_DEEPGRAM_API_KEY', // optional
   };
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

## Usage Guide

### Getting Started
1. Launch the application and click the `Connect` button under `Connection Status`
2. The demo uses Gemini 2.5 Live API which requires a WebSocket connection
3. Monitor the browser's Developer Tools Console for connection issues
4. Before diving into development, explore Gemini 2.5's Live capabilities (voice interactions, webcam, and screen sharing) using [Google AI Studio Live](https://aistudio.google.com/live). This interactive playground will help you understand the available features and integration options before implementing them in your project.

### Feature Testing Examples
Test the various capabilities using these example prompts:

1. **Google Search Integration**
   - "Tell me the scores for the last 3 games of FC Barcelona."

2. **Code Execution**
   - "What's the 50th prime number?"
   - "What's the square root of 342.12?"

3. **Function Calling**
   - "What's the weather in London?" (Note: Currently returns mock data of 25 degrees)

### Configuration Options

The main configuration is handled in `src/app.component`. You can toggle between audio and text modalities:

```typescript
let config: LiveConnectConfig = {
   // For text responses in chat window
   responseModalities: [Modality.TEXT], // note "audio" doesn't send a text response over
   
   // For audio responses (uncomment to enable)
   // responseModalities: [Modality.AUDIO],
   // speechConfig: {
   //   voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
   // },
}
```

### Usage Limits
- Daily and session-based limits apply
- Token count restrictions to prevent abuse
- If limits are exceeded, wait until the next day to resume

## Development Guide

### Local Development
Start the development server:
```bash
ng serve
```
Access the application at `http://localhost:4200/`

### Available Commands

1. **Generate New Components**
   ```bash
   ng generate component component-name
   ```

2. **Build Project**
   ```bash
   ng build
   ```
   Build artifacts will be stored in the `dist/` directory

3. **Run Tests**
   - Unit Tests:
     ```bash
     ng test
     ```
   - E2E Tests:
     ```bash
     ng e2e
     ```
     Note: Select and install your preferred E2E testing framework

## Project Information
- Built with Angular CLI version 20.3.3
- Logging state management including Dev Tools with NgRx version 20.0.0
- TypeScript GenAI SDK version 1.44.0
- Typescript SDK for Model Context Protocol version 1.15.0
- Native Gemini transcription (no third-party dependency required)
- Features automatic reload during development
- Includes production build optimizations

## Additional Resources
- [Angular CLI Documentation](https://angular.dev/tools/cli)
- [Google AI Studio](https://makersuite.google.com/)
- Browser Developer Tools for debugging
