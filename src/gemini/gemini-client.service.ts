import { Injectable, OnDestroy, ɵRender3NgModuleRef } from '@angular/core';
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

import { LoggerService } from '../app/logging/logger.service';
import { McpService } from './gemini-mcp.service';

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
  public mcpService: McpService = new McpService();


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
  private microphoneTranscriptionSubscription: Subscription | undefined;
  private geminiTranscriptionSubscription: Subscription | undefined;

  // Native transcription buffering
  private userTranscriptBuffer: string = '';
  private modelTranscriptBuffer: string = '';
  private userTranscriptTimeout: ReturnType<typeof setTimeout> | null = null;
  private modelTranscriptTimeout: ReturnType<typeof setTimeout> | null = null;
  private static readonly TRANSCRIPT_FLUSH_TIMEOUT_MS = 2000;

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

    //maxOutputTokens: 100,
    mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM, // API only supports "low" and "medium" for now
    contextWindowCompression: {
      triggerTokens: '25600',
      slidingWindow: { targetTokens: '12800' },
    },
    // Native Gemini transcription (no Deepgram needed)
    inputAudioTranscription: {},
    outputAudioTranscription: {},
  };

  private async getCustomConfig(user: any) {
    let userConfig;
    let customConfig;
    let model: string = "";

    if (user.affectiveAudio && !user.proactiveAudio) {
      userConfig = {
        systemInstruction: "You are a helpful assistant. Precede every reply with a dad joke and something along the lines of 'did you get it?' and a chuckle or laugh.",
        enableAffectiveDialog: true,
        tools: [
          { googleSearch: {} },
        ],
      };
    } else if (!user.affectiveAudio && user.proactiveAudio) {
      userConfig = {
        systemInstruction: "You are a helpful assistant.",
        proactivity: { proactiveAudio: true },
        tools: [
          { googleSearch: {} },
        ],
      };
    } else {
      userConfig = {
        systemInstruction: {
          parts: [
            createPartFromText('You are a helpful assistant.'),
          ],
        },
        speechConfig: {
          //languageCode: 'en-US',
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Zephyr',
            }
          }
        },
        tools: [
          { googleSearch: {} },
          { codeExecution: {} },
          // { urlContext: {} }, // cannot be used together with Search or CodeExecution
          // vanilla function calling
          // {
          //   functionDeclarations: [
          //     this.getCurrentWeatherFunction,
          //   ],
          // },
          await this.mcpService.start(),
        ],
      }
    }
    if (user.affectiveAudio || user.proactiveAudio) {
      // Both Affective Dialog and Proactive Audio features are only supported in the
      // gemini-2.5-flash-native-audio-latest model, and are unsupported in gemini-3.1-flash-live-preview.
      model = "gemini-2.5-flash-native-audio-latest";
    } else {
      model = "gemini-3.1-flash-live-preview";
    }
    customConfig = {
      model,
      config: {
        ...this.config,
        ...userConfig,
        // Note: explicitVadSignal is only supported in Gemini Enterprise Agent Platform mode (Vertex AI)
        // and is unsupported in Gemini Developer API mode (v1alpha with API Key), so we omit it here.
      }
    };
    return customConfig;
  }

  constructor(
    private loggerService: LoggerService
  ) {
    super();

    this._ai = new GoogleGenAI({
      apiKey: environment.API_KEY,
      apiVersion: "v1alpha",
    });
    this.initializeAudioStreamer();
    this.setupEventListeners();
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

  async ngOnDestroy(): Promise<void> {
    await this.mcpService.stop();
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect(); // Ensure disconnection on service destruction
  }

  private async initializeAudioStreamer(): Promise<void> {
    try {
      const audioCtx = await audioContext({ id: 'audio-out' });
      this.audioStreamer = new AudioStreamer(audioCtx);
      await this.audioStreamer.addWorklet<any>(
        'vu-meter',
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

  async connect(nativeAudio: any): Promise<boolean> {
    let model: string = "";
    let setup;
    let userConfig: LiveConnectConfig = {};
    this._session?.close(); // Close any existing session
    this._session = null;

    setup = await this.getCustomConfig(nativeAudio);

    return new Promise(async (resolve, reject) => {
      this._session = await this._ai.live.connect({
        model: setup.model,
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
        config: setup.config as LiveConnectConfig,
      });
    });
  }

  async disconnect() {
    await this.mcpService.stop();
    this._session?.close();
    this._session = null;
    this.stopAudioStreamer(); // Stop audio on disconnect
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

      // Handle native Gemini transcription — buffer by turn
      const sc = serverContent as any;
      if (sc.inputTranscription?.text) {
        this.bufferTranscript('user', sc.inputTranscription.text);
      }
      if (sc.outputTranscription?.text) {
        this.bufferTranscript('model', sc.outputTranscription.text);
      }

      if (isInterrupted(serverContent)) {
        this.flushTranscripts(); // flush any pending transcripts on interruption
        this.log("receive.serverContent", "interrupted");
        this.emit("interrupted");
        return;
      }
      if (isTurnComplete(serverContent)) {
        this.flushTranscripts(); // flush buffered transcripts at end of turn
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
   * Buffer transcription fragments and reset the inactivity timeout.
   */
  private bufferTranscript(source: 'user' | 'model', text: string): void {
    if (source === 'user') {
      this.userTranscriptBuffer += text;
      if (this.userTranscriptTimeout) clearTimeout(this.userTranscriptTimeout);
      this.userTranscriptTimeout = setTimeout(() => this.flushUserTranscript(), MultimodalLiveService.TRANSCRIPT_FLUSH_TIMEOUT_MS);
    } else {
      this.modelTranscriptBuffer += text;
      if (this.modelTranscriptTimeout) clearTimeout(this.modelTranscriptTimeout);
      this.modelTranscriptTimeout = setTimeout(() => this.flushModelTranscript(), MultimodalLiveService.TRANSCRIPT_FLUSH_TIMEOUT_MS);
    }
  }

  private flushUserTranscript(): void {
    if (this.userTranscriptBuffer.trim()) {
      this.log('user-transcript', this.userTranscriptBuffer.trim());
    }
    this.userTranscriptBuffer = '';
    if (this.userTranscriptTimeout) {
      clearTimeout(this.userTranscriptTimeout);
      this.userTranscriptTimeout = null;
    }
  }

  private flushModelTranscript(): void {
    if (this.modelTranscriptBuffer.trim()) {
      this.log('model-transcript', this.modelTranscriptBuffer.trim());
    }
    this.modelTranscriptBuffer = '';
    if (this.modelTranscriptTimeout) {
      clearTimeout(this.modelTranscriptTimeout);
      this.modelTranscriptTimeout = null;
    }
  }

  private flushTranscripts(): void {
    this.flushUserTranscript();
    this.flushModelTranscript();
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
        this._session?.sendRealtimeInput({ audio: chunk });
      } else if (chunk?.mimeType?.includes("image") || chunk?.mimeType?.includes("video")) {
        hasVideo = true;
        this._session?.sendRealtimeInput({ video: chunk });
      } else {
        this._session?.sendRealtimeInput({ media: chunk });
      }
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
    }
  }

  private stopAudioStreamer(): void {
    if (this.audioStreamer) {
      this.audioStreamer.stop();
    }
  }

}
