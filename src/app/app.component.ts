import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { MultimodalLiveService } from '../gemini/gemini-client.service';
import { Subscription } from 'rxjs';
import { Part, FunctionResponse } from '@google/genai';

import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModelTurn, ToolCall, TranscriptionFragment, TurnComplete } from '../gemini/types';
import { ControlTrayComponent } from './control-tray/control-tray.component';
import { SidePanelComponent } from "./side-panel/side-panel.component";
import { Renderer2 } from '@angular/core';

type ChatMessage = {
  role: string;
  text: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [ReactiveFormsModule, ControlTrayComponent, SidePanelComponent],
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('myVideo') myVideoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('infoBox') infoBox!: ElementRef<HTMLDivElement>;


  title = 'gemini-2-live-angular';
  isConnected: boolean = false;
  volume: number = 0;
  streamedMessage: string = '';
  messages: ChatMessage[] = [];
  private connectedSubscription: Subscription | undefined;
  private contentSubscription: Subscription | undefined;
  private toolSubscription: Subscription | undefined;
  private microphoneTranscriptionSubscription: Subscription | undefined;
  private geminiTranscriptionSubscription: Subscription | undefined;

  chatForm = new FormGroup({
    message: new FormControl('Write a poem.'),
  });
  isFormEmpty: boolean = this.chatForm.value?.message?.length === 0;


  constructor(
    private multimodalLiveService: MultimodalLiveService,
    private renderer: Renderer2,
  ) { }

  ngOnInit(): void {
    this.connectedSubscription = this.multimodalLiveService.connected$.subscribe(
      (connected) => {
        console.log('Connected:', connected);
        this.isConnected = connected;
      },
    );
    this.contentSubscription = this.multimodalLiveService.content$.subscribe(
      (data) => {
        if (!data) return;
        let turn = data as ModelTurn;
        let turnComplete = (data as TurnComplete).turnComplete;
        if (turn) {
          if (this.streamedMessage.length > 0) {
            this.messages.pop();
          } 
          let incomingMessage = turn.modelTurn.parts?.[0]?.text as string;
          if (incomingMessage) {
            this.streamedMessage += incomingMessage;
            this.messages.push({
              role: 'model',
              text: this.streamedMessage
            });
          }
        }
        if (turnComplete) {
          this.messages.push({
            role: 'model',
            text: this.streamedMessage
          });
          this.streamedMessage = '';
        }
      },
    );
    this.toolSubscription = this.multimodalLiveService.tool$.subscribe(
      (data) => {
        // Executable function code.
        interface WeatherParams {
          location: string;
          unit: string;
        }
        const functions = {
          getCurrentWeather: ({ location, unit }: WeatherParams) => {
            // mock API response
            return {
              location,
              temperature: "25°" + (unit.toLowerCase() === "celsius" ? "C" : "F"),
            };
          }
        };

        if (!data) return;
        let toolCall = data as ToolCall;
        const call = toolCall.functionCalls?.[0];
        const id = toolCall.functionCalls?.[0].id;
        if (call) {
          // Call the actual function
          if (call.name === "getCurrentWeather" && call.args) {
            // Remember to add additional checks for the function name and parameters
            const { location, unit } = call.args as { location: string, unit: string };
            const callResponse = functions[call.name]({ location, unit }) as Record<string, string>;
            // Send the API response back to the model
            this.multimodalLiveService.sendToolResponse({
              functionResponses: {
                id,
                name: call.name,
                response: callResponse,
              } as FunctionResponse,
            } as any);
          }
        }
      },
    );

    // if (this.multimodalLiveService.microphoneTranscribeService) {
    //   this.microphoneTranscriptionSubscription = this.multimodalLiveService.microphoneTranscribeService?.stream$.subscribe(
    //     (fragment: TranscriptionFragment | null) => {
    //       if (!fragment) return;
    //       console.log('Transcription fragment received:', fragment);
    //       this.messages.push({
    //         role: fragment.source,
    //         text: fragment.transcript
    //       });
    //     },
    //   );
    // }

    // if (this.multimodalLiveService.geminiTranscribeService) {
    //   this.geminiTranscriptionSubscription = this.multimodalLiveService.geminiTranscribeService?.stream$.subscribe(
    //     (fragment: TranscriptionFragment | null) => {
    //       if (!fragment) return;
    //       console.log('Transcription fragment received:', fragment);
    //       this.messages.push({
    //         role: fragment.source,
    //         text: fragment.transcript
    //       });
    //     },
    //   );
    // }

    setTimeout(() => {
      this.renderer.setStyle(this.infoBox.nativeElement, "opacity", "0");
    }, 10000 );
  }

  ngOnDestroy(): void {
    if (this.connectedSubscription) {
      this.connectedSubscription.unsubscribe();
      console.log('Connected:', this.isConnected);
    }
  }

  connect(): void {
    this.multimodalLiveService.connect().catch(err => {
      console.error("Failed to connect:", err);
    });
  }

  disconnect(): void {
    this.multimodalLiveService.disconnect();
  }

  send(): void {
    this.streamedMessage = ''; // reset streamed message
    let message = (this.chatForm.value?.message as string)?.trim();
    if (!message) return;
    let part: Part | Part[] = {
      text: message,
    };
    this.multimodalLiveService.send(part);
    this.messages.push({
      role: 'user',
      text: message
    });
    this.chatForm.reset();
  }

  reset(): void {
    this.chatForm.reset();
  }

  handleVideoStreamChange(stream: MediaStream | null) {
    // Handle the video stream change here (e.g., update the video element)
    if(this.myVideoRef){
      this.myVideoRef.nativeElement.srcObject = stream;
      this.renderer.setStyle(this.myVideoRef.nativeElement, "visibility", "visible");
    }
  }
}