import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import {
  GoogleGenAI,
  Type,
  Part,
  Blob,
  Content,
  LiveConnectConfig,
  Session,
  LiveSendToolResponseParameters,
  LiveSendClientContentParameters,
  LiveServerMessage,
  createPartFromText,
  createUserContent,
  PartListUnion,
  MediaResolution,
} from '@google/genai';

import { EventEmitter } from "eventemitter3";
import { difference } from "lodash";

import {
  ClientContentMessage, isInterrupted,
  isModelTurn,
  isServerContentMessage,
  isSetupCompleteMessage,
  isToolCallCancellationMessage,
  isToolCallMessage,
  isTurnComplete,
  LiveIncomingMessage,
  ModelTurn, MultimodalLiveClientEventTypes, RealtimeInputMessage,
  ServerContent, ServerContentNullable, SetupMessage,
  StreamingLog, ToolCallNullable, ToolResponseMessage,
  TranscriptionFragment
} from './types';
import { environment } from '../../src/environments/environment.development';

import { AudioStreamer } from './audio-streamer';
import VolMeterWorket from './worklet.vol-meter';
import { audioContext, blobToJSON, base64ToArrayBuffer } from './utils';
import { Modality } from '@google/genai';
import { TranscribeService } from './transcribe.service';
import { LoggerService } from '../app/logging/logger.service';

/**
 * A event-emitting class that manages the connection to the websocket and emits
 * events to the rest of the application.
 * If you dont want to use react you can still use this.
 */
@Injectable({
  providedIn: 'root',
})
export class MultimodalLiveService extends EventEmitter<MultimodalLiveClientEventTypes> implements OnDestroy {
  private _ai: GoogleGenAI;
  private _session: Session | null = null;

  private connectedSubject = new BehaviorSubject<boolean>(false);
  connected$ = this.connectedSubject.asObservable();
  private contentSubject = new BehaviorSubject<ServerContentNullable>(null);
  content$ = this.contentSubject.asObservable();
  private toolSubject = new BehaviorSubject<ToolCallNullable>(null);
  tool$ = this.toolSubject.asObservable();

  private audioStreamer: AudioStreamer | null = null;
  private volumeSubject = new BehaviorSubject<number>(0);
  volume$ = this.volumeSubject.asObservable();
  private destroy$ = new Subject<void>(); // For unsubscribing
  public microphoneTranscribeService: TranscribeService | undefined = undefined;
  public geminiTranscribeService: TranscribeService | undefined = undefined;
  private microphoneTranscriptionSubscription: Subscription | undefined;
  private geminiTranscriptionSubscription: Subscription | undefined;
  private isDeepgramAvailable = () => false; //!!environment.DEEPGRAM_API_KEY;

  // function calling setup
  // Define the function to be called.
  // Following the specificication at https://spec.openapis.org/oas/v3.0.3
  private getCurrentWeatherFunction = {
    name: "getCurrentWeather",
    description: "Get the current weather in a given location",
    parameters: {
      type: Type.OBJECT,
      properties: {
        location: {
          type: Type.STRING,
          description: "The city and state, e.g. San Francisco, CA",
        },
        unit: {
          type: Type.STRING,
          enum: ["celsius", "fahrenheit"],
          description: "The temperature unit to use. Infer this from the users location.",
        },
      },
      required: ["location", "unit"],
    },
  };

  public config: LiveConnectConfig = {
    // responseModalities: [Modality.TEXT],
    responseModalities: [Modality.AUDIO], // note "audio" doesn't send a text response over
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }, // Puck, Charon, Kore, Fenrir, Aoede. *New* 3 voices: Leda, Orus, and Zephyr.
    },
    generationConfig: {
      //maxOutputTokens: 100,
      //mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM, // API only supports "low" and "medium" for now
    },
    contextWindowCompression: {
      triggerTokens: '1000',
      slidingWindow: {
        targetTokens: '10',
      },
    },
    systemInstruction: {
      parts: [
        createPartFromText('You are a helpful assistant.'),
      ],
    },
    tools: [
      { googleSearch: {} },
      { codeExecution: {} },
      {
        functionDeclarations: [
          this.getCurrentWeatherFunction,
        ],
      },
    ],
  };

  constructor(
    private loggerService: LoggerService
  ) {
    super();
    this._ai = new GoogleGenAI({
      apiKey: environment.API_KEY,
    });
    if (this.isDeepgramAvailable()) {
      this.microphoneTranscribeService = new TranscribeService(16000, 'user');
      this.geminiTranscribeService = new TranscribeService(24000, 'model');
      this.initializeTranscriptionLogs();
    }
    this.initializeAudioStreamer();
    this.setupEventListeners();
  }

  initializeTranscriptionLogs() {
    this.microphoneTranscriptionSubscription = this.microphoneTranscribeService?.stream$.subscribe(
      (fragment: TranscriptionFragment | null) => {
        if (!fragment) return;
        this.log('user-transcript', fragment.transcript);
      },
    );

    this.geminiTranscriptionSubscription = this.geminiTranscribeService?.stream$.subscribe(
      (fragment: TranscriptionFragment | null) => {
        if (!fragment) return;
        this.log('model-transcript', fragment.transcript);
      },
    );
  }

  log(type: string, message: StreamingLog["message"]) {
    const log: StreamingLog = {
      date: new Date(),
      type,
      message,
    };
    this.emit("log", log);
    this.loggerService.log(log);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect(); // Ensure disconnection on service destruction
  }

  private async initializeAudioStreamer(): Promise<void> {
    try {
      const audioCtx = await audioContext({ id: 'audio-out' });
      this.audioStreamer = new AudioStreamer(audioCtx);
      await this.audioStreamer.addWorklet<any>(
        'vumeter-out',
        VolMeterWorket,
        (ev: any) => {
          this.volumeSubject.next(ev.data.volume);
        },
      );
    } catch (error) {
      console.error('Error initializing audio streamer:', error);
      // Handle error appropriately (e.g., disable audio features)
    }
  }

  private setupEventListeners(): void {
    this.on('open', () => {
      console.log('Gemini API: connection opened');
      this.setConnected(true);
      if (this.isDeepgramAvailable()) {
        this.geminiTranscribeService?.start();
      }
    })

      .on('content', (data: ServerContent) => {
        this.contentSubject.next(data);
        console.log(data);
      })
      .on('toolcall', (data: ToolCallNullable) => {
        this.toolSubject.next(data);
        console.log(data);
      })

      .on('close', (e: CloseEvent) => {
        console.log('Gemini API: connection closed', e);
        this.setConnected(false);
        this.disconnect();
        this.log("client.close", "disconnected");
      })
      // audio event listeners
      .on('interrupted', () => {
        this.stopAudioStreamer()
      })
      .on('audio', (data: ArrayBuffer) => {
        this.addAudioData(data);
      });
  }

  async connect(): Promise<boolean> {
    this._session?.close(); // Close any existing session
    this._session = null;
    if (this.isDeepgramAvailable()) {
      this.geminiTranscribeService?.stop();
    }

    return new Promise(async (resolve, reject) => {
      this._session = await this._ai.live.connect({
        model: "gemini-2.0-flash-live-001", 
        // Note: "gemini-2.0-flash-live-latest" and "gemini-2.0-flash-live" don't work at the moment
        callbacks: {
          onopen: () => {
            this.log("client.connect", "connected");
            this.emit("open");
            resolve(true);
          },
          onmessage: async (e: LiveServerMessage) => {
            this.receive(e);
          },
          onerror: (e: ErrorEvent) => {
            this.disconnect();
            const message = `Could not connect to server: ${e.message}`;
            this.log(`server.${e.type}`, message);
            reject(new Error(message));
          },
          onclose: (ev: CloseEvent) => {
            this.disconnect();
            this.log(`server.${ev.type}`, ev.reason ? `disconnected with reason: ${ev.reason}` : "disconnected");
            this.emit("close", ev);
          },
        },
        config: {
          ...this.config
        }
      });
    });
  }

  disconnect() {
    this._session?.close();
    this._session = null;
    this.stopAudioStreamer(); // Stop audio on disconnect
    if (this.isDeepgramAvailable()) {
      this.microphoneTranscribeService?.stop();
      this.geminiTranscribeService?.stop();
    }
    this.setConnected(false);
  }

  protected async receive(response: LiveServerMessage) {
    if (isToolCallMessage(response)) {
      this.log("server.toolCall", response);
      this.emit("toolcall", response.toolCall);
      return;
    }
    if (isToolCallCancellationMessage(response)) {
      this.log("receive.toolCallCancellation", response);
      this.emit("toolcallcancellation", response.toolCallCancellation);
      return;
    }

    if (isSetupCompleteMessage(response)) {
      this.log("server.send", "setupComplete");
      this.emit("setupcomplete");
      return;
    }

    // this json also might be `contentUpdate { interrupted: true }`
    // or contentUpdate { end_of_turn: true }
    if (isServerContentMessage(response)) {
      const { serverContent } = response;
      if (isInterrupted(serverContent)) {
        this.log("receive.serverContent", "interrupted");
        this.emit("interrupted");
        return;
      }
      if (isTurnComplete(serverContent)) {
        this.log("server.send", "turnComplete");
        this.emit("turncomplete");
        //plausible theres more to the message, continue
      }

      if (isModelTurn(serverContent)) {
        let parts: Part[] = serverContent.modelTurn.parts;

        // when its audio that is returned for modelTurn
        const audioParts = parts.filter(
          (p) => p.inlineData && p?.inlineData?.mimeType?.startsWith("audio/pcm"),
        );
        const base64s = audioParts.map((p) => p.inlineData?.data);

        // strip the audio parts out of the modelTurn
        const otherParts = difference(parts, audioParts);
        // console.log("otherParts", otherParts);

        base64s.forEach((b64) => {
          if (b64) {
            const data = base64ToArrayBuffer(b64);
            this.emit("audio", data);
            this.log("server.audio", `buffer (${data.byteLength})`);
          }
        });
        if (!otherParts.length) {
          return;
        }

        parts = otherParts;

        const content: ModelTurn = { modelTurn: { parts } };
        this.emit("content", content);
        this.log("server.content", response);
      }
    } else {
      console.log("received unmatched message", response);
    }
  }

  /**
   * send realtimeInput, this is base64 chunks of "audio/pcm" and/or "image/jpg"
   */
  sendRealtimeInput(chunks: Blob[]) {
    let hasAudio = false;
    let hasVideo = false;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      if (chunk?.mimeType?.includes("audio")) {
        hasAudio = true;
      }
      if (chunk?.mimeType?.includes("image")) {
        hasVideo = true;
      }
      if (hasAudio && hasVideo) {
        break;
      }
      this._session?.sendRealtimeInput({ media: chunk });
    }
    const message = hasAudio && hasVideo ? "audio + video" : (hasAudio ? "audio" : hasVideo ? "video" : "unknown");
    this.log("client.realtimeInput", message);
  }

  /**
   * send a response to a function call and provide the id of the functions you are responding to
   */
  sendToolResponse(toolResponse: ToolResponseMessage["toolResponse"]) {
    const message: ToolResponseMessage = { toolResponse };
    this.log("client.toolResponse", message);

    this._session?.sendToolResponse(toolResponse as LiveSendToolResponseParameters);
  }

  /**
   * send normal content parts such as { text }
   */
  send(parts: PartListUnion, turnComplete: boolean = true) {
    const content: Content = createUserContent(parts);

    const clientContentRequest: ClientContentMessage = {
      clientContent: {
        turns: [content],
        turnComplete,
      },
    };
    this.log("client.send", clientContentRequest);
    this._session?.sendClientContent(clientContentRequest.clientContent as LiveSendClientContentParameters);
  }

  private setConnected(connected: boolean): void {
    this.connectedSubject.next(connected);
  }

  private addAudioData(data: ArrayBuffer): void {
    if (this.audioStreamer) {
      this.audioStreamer.addPCM16(new Uint8Array(data));
      if (this.isDeepgramAvailable()) {
        this.geminiTranscribeService?.sendAudioData(new Uint8Array(data));
      }
    }
  }

  private stopAudioStreamer(): void {
    if (this.audioStreamer) {
      this.audioStreamer.stop();
    }
  }

}
