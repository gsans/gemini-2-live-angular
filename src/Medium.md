# Building Advanced AI Voice Assistants Using Google Gemini 3.1 Live and Angular

by Gerard Sans
May 23, 2026


Explore the Gemini Live API — a real-time, multimodal API for creating advanced, voice-first user experiences using the latest Gemini 3.1 Live models and the official Google GenAI SDK.

![captionless image](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*YWbHffsZf4WBNxwrwukD6Q.png)

This article presents a quick-start project demonstrating Gemini 3.1 Live's real-time, multimodal AI capabilities within an Angular web application.

What’s Gemini Live?
-------------------

Gemini Live API is part of the **Google Gemini** model family, enabling a new generation of dynamic, multimodal, real-time AI experiences, as showcased in Pixel phones and the Gemini mobile app.

Gemini Live powers innovative applications across devices and platforms:

*   **Hands-free AI Assistance**: Users interact naturally through voice while cooking, driving, or multitasking.
*   **Real-time Visual Understanding**: Get instant AI responses as you show objects, documents, or scenes through your camera.
*   **Smart Home Automation**: Control your environment with natural voice commands — from adjusting lights to managing thermostats.
*   **Seamless Shopping**: Browse products, compare options, and complete purchases through conversation.
*   **Live Problem Solving**: Share your screen to get real-time guidance, troubleshooting, or explanations.
*   **Integration with Google services**: Leverage existing Google services like Search or Maps to enhance its capabilities.

### Try Gemini Live in the Gemini app (for iOS and Android)

Gemini is [now available on iPhone and Android](https://blog.google/products-and-platforms/products/gemini/), so you can enjoy free, natural conversations with Gemini Live and get the most out of Google’s personal AI assistant.

![captionless image](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*bzztNrvH8TzSmby27lwrrw@2x.jpeg)

### Try Gemini Live in Google AI Studio

Before diving into the code, explore Gemini Live’s capabilities — voice interactions, webcam, and screen sharing — by using [Google AI Studio Live](https://www.google.com/url?sa=E&q=https%3A%2F%2Faistudio.google.com%2Flive). This interactive playground will help you understand the available features and integration options before adding them to your projects.

![captionless image](https://files.catbox.moe/ynll36.png)

First step: Obtaining your API key from Google AI Studio
--------------------------------------------------------

Navigate to [aistudio.google.com](https://aistudio.google.com/app/apikey) and generate an **API key**. You can check the global availability of the API [here](https://ai.google.dev/gemini-api/docs/available-regions).

Cloning the Angular Application
-------------------------------

Run the following command in a folder of your choice to create a local copy of the project:

```
$ git clone https://github.com/gsans/gemini-3-live-angular.git
> Cloning into `Spoon-Knife`...
> remote: Counting objects: 10, done.
> remote: Compressing objects: 100% (8/8), done.
> remove: Total 10 (delta 1), reused 10 (delta 1)
> Unpacking objects: 100% (10/10), done.
$ cd gemini-3-live-angular
$ npm install
```

These commands will download the complete repository and install its dependencies.

### System Requirements

*   Node.js and npm (latest stable version)
*   Angular CLI (globally installed via `npm install -g @angular/cli`)

### Setting up the project

Add a new environment by running the following command:

```
ng g environments
```

This creates the necessary files for `development` and `production` environments:

```
src/environments/environment.development.ts
src/environments/environment.ts
```

Modify the `development` file, replacing `<YOUR-API-KEY>` with your actual **API Key**:

```
// src/environments/environment.development.ts
export const environment = {
  API_KEY: "<YOUR-API-KEY>",
};
```

To execute the code, run the following command in the terminal and navigate to `localhost:4200` in your browser:

```
ng serve
```

Usage Guide: Getting Started
----------------------------

1.  Launch the application and click the `Connect` button under `Connection Status`.
2.  This project requires a **WebSocket connection**, which will be used to send and receive real-time voice, images, and video from the Gemini Live API.
3.  Monitor the browser’s **Developer Tools Console** for connection issues.
4.  You can also use the **Control Tray**, located in the top right corner, to: toggle the microphone, share your screen or webcam, and use the play/pause button to start a conversation.

![captionless image](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*CaMoyGP4XaSkkqrxGzgujA.png)

A few examples using Gemini’s Tools
-----------------------------------

You can try any of the prompts you already use with Gemini. The following examples explore Gemini’s Tools that access real-time data via Google Search, execute Python code, or execute actions through external APIs.

### Gemini real-time access via Google Search

Gemini can use Google Search to provide real-time information beyond the training data cut-off date and grounding to minimize hallucinations.

```
Tell me the scores for the last 3 games of FC Barcelona.
```

### Gemini using a Python sandbox via Code Execution

Gemini can access a Python sandbox to generate and execute code as part of its response. This sandbox has access to libraries such as `altair`, `chess`, `cv2`, `matplotlib`, `mpmath`, `numpy`, `pandas`, `pdfminer`, `reportlab`, `seaborn`, `sklearn`, `statsmodels`, `striprtf`, `sympy`, and `tabulate`. `matplotlib` can generate 2D/3D diagrams as images.

> _You can try this option in_ [_Google AI Studio_](https://aistudio.google.com/)_. Enable_ `_Code execution_` _in the_ `_Tools_` _section of the_ `_Run settings_` _panel._

```
What’s the 50th prime number?
```

```
What’s the square root of 342.12?
```

### Gemini running an external weather API (mock) via Function Calling

The function calling feature in **Gemini** allows you to provide users with access to tools: external APIs that provide real-time data or perform actions (e.g., making restaurant reservations or ordering food). These tools remain available throughout the conversation.

This example demonstrates this capability using a mock weather API. The model doesn’t directly call the function; instead, it generates structured output specifying the function name and suggested arguments. You’ll need to add code to handle the user request (as identified by Gemini) by calling the external API. Finally, provide the API’s output to Gemini, which formats the final answer for the user.

```
What’s the weather in London?
```

Configuration Options
---------------------

The main configuration is handled in `src/gemini/gemini-client.service.ts` within the `MultimodalLiveService` class. You can customize the `LiveConnectConfig` settings, including response modalities (e.g. text vs. audio), proactivity features, and tools.

The application utilizes a dynamic model selection mechanism in `getCustomConfig()` based on the features enabled in the user interface Control Tray:

```typescript
// src/gemini/gemini-client.service.ts
if (user.affectiveAudio || user.proactiveAudio) {
  // Both Affective Dialog and Proactive Audio features are unsupported in gemini-3.1-flash-live-preview.
  model = "gemini-2.5-flash-native-audio-latest";
} else {
  model = "gemini-3.1-flash-live-preview";
}
```

This ensures that advanced voice features like emotional tone sensing (Affective Dialog) and smart turn-taking (Proactive Audio) connect seamlessly using the specialized native-audio model, while normal sessions default to the fast, low-latency `gemini-3.1-flash-live-preview` model.

> **_Usage Limits_**_. Daily and session-based limits apply. Token count restrictions are in place to prevent abuse. If limits are exceeded, wait until the next day to resume._

With the upgrade to Gemini 3.1 and the GenAI SDK, the application now natively supports bidirectional audio transcription directly via the `inputAudioTranscription` and `outputAudioTranscription` session configuration parameters. The service buffers and logs the live transcripts, displaying them in the side panel without requiring any third-party speech-to-text APIs.

Technical Overview: Data Flow, Events and UI
--------------------------------------------

Compared to a standard Gemini’s client, this project introduces significant complexity due to its real-time streaming capabilities for audio (microphone and Gemini’s voice) and video (screen and webcam). This requires two clients: one for Gemini and another for the WebSocket. The following diagram illustrates the methods, observables, and events involved in the data flow.

![captionless image](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*4M5psp3uYxD78OC81yQyRg.png)

### Managing the real-time connection (over WebSocket)

Contrary to a REST API that follows a request-response protocol, WebSockets follow a bidirectional flow, meaning that both sides of the WebSocket channel can initiate or interrupt the communication. This creates three stages: setup handshake (open connection), bidirectional message exchange (connection remains open), and termination (one side closes the connection).

![Comparison of HTTP/REST and WebSocket communication protocols. WebSockets maintain an open connection for bidirectional communication.](https://miro.medium.com/v2/resize:fit:1014/format:webp/1*iD4b3cpktXvBVa1mMJC1Uw.png)

### Processing Audio (Web Audio API)

This section of the project manages both user microphone input (outgoing audio) and Gemini’s voice response (incoming audio) using the `AudioRecorder` and `AudioStreamer` classes, respectively.

> Audio processing within the **Web Audio API** occurs in a separate thread from the main UI thread, ensuring smooth performance, even under heavy load.

![captionless image](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*7ttyiSjrr__GHKIJZnPUXw.png)

*   The `AudioRecorder` captures audio from the user’s microphone and sends it to the Gemini’s client via the `sendRealtimeInput()` method. This is accomplished using two [audio worklets](https://developer.chrome.com/blog/audio-worklet): `worklet.audio-processing.ts` and `worklet.audio-meter.ts`. The first worklet, `worklet.audio-processing.ts`, handles the core audio capture from `navigator.mediaDevices.getUserMedia({ audio: true })`, performing buffering and converting the audio data to a suitable format for transmission. The second worklet, `worklet.audio-meter.ts`, provides volume level data, used by the `audio-pulse` control to visually represent the audio levels from both the `AudioRecorder` (microphone) and the `AudioStreamer` (Gemini’s voice).
*   The `AudioStreamer` receives Gemini’s voice data through the `ws.audio` event handler (indicating audio data received from the WebSocket). It manages buffering and scheduling of audio chunks to ensure smooth, gap-free playback, even with network fluctuations. The Gemini’s client calls the `AudioStreamer`'s `addPCM16()` method to pass the received audio data for playback.

### Processing Video (WebRTC)

This part of the project uses WebRTC to stream the screen or webcam to a video element. Using a separate process, we render a frame via a canvas element and send it over to the Gemini Live API using `sendRealtimeInput()`.

> Current FPS is set to 0.5, or a frame every 2 seconds.

![captionless image](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*ioRQqQuz7jZ_sN40tv19ow.png)

### User Interface: connection, chat window, and control tray

The user interface is split into three main blocks: the connection, the chat window, and the control tray. The chat window is followed by the video and canvas elements used by the control tray component. Below is a diagram showing the main methods behind each button, component inputs, and events.

![Overview of the user interface components and their interactions. The app-control-tray component manages user input for microphone, webcam, and screen sharing.](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*mRHcEvhU_0ur_fyuIcw5zg.png)

### Gemini Live API Setup and Tools

The Gemini Live API configuration is dynamically assembled in `getCustomConfig()` within `src/gemini/gemini-client.service.ts` based on active feature toggles (Affective Dialog, Proactive Audio) from the UI Control Tray component, falling back to the standard configurations on `MultimodalLiveService`. I recommend starting with a simpler project where you can learn each Gemini Tool separately. You can get started with this article below.

Conclusion
----------

Congratulations! You have successfully accessed the **Gemini Live API**. Use the [completed GitHub project](https://github.com/gsans/gemini-3-live-angular) as a reference to create your own features.

This tutorial covered the following:

*   Introduction to the **Gemini Live API**.
*   **Project setup** and getting started.
*   A few examples to showcase **Gemini’s Tools** (Code Execution, Google Search, and Function Calling).

This project shows how to create a Gemini Live Client using WebSockets to stream images, documents, audio (microphone and Gemini Live voices), and video (screen sharing and webcam) from an Angular project.

Building your own Voice-First Assistant Applications
----------------------------------------------------

Use this project to start familiarizing yourself with real-time voice user interactions and build your own. These are some ideas to get you started:

*   An [AI booking assistant](https://gist.github.com/gsans/b730adb0239825eebc67dff7cccdcbf3) with access to your schedule, capable of handling dentist bookings and cancellations (via voice or chatbot interface).
*   An [automated robot cafe](https://gist.github.com/gsans/41b2632650e4e27eeb562c45cceada9a) that takes orders and relays them to a robot barista (using voice, text, or visual interactive controls).

Thanks for reading!
-------------------

Do you have any questions? Feel free to leave your comments below or contact me on Twitter at @[gerardsans](https://twitter.com/gerardsans).

Resources
---------

*   [Google AI TypeScript SDK](https://github.com/googleapis/js-genai)
*   [Multimodal (Gemini) Live API](https://ai.google.dev/gemini-api/docs/live-api)