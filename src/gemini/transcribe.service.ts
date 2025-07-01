import { Inject, Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, takeUntil, bufferTime, filter } from 'rxjs';
import { environment } from '../../src/environments/environment.development';
import { createClient, ListenLiveClient, LiveTranscriptionEvents } from "@deepgram/sdk";
import { reject } from 'lodash';

interface TranscribeStreamResult {
  isStreaming: Observable<boolean>;
  start: () => Promise<String | null>;
  stop: () => void;
}

interface TranscriptionFragment {
  transcript: string;
  source: string; // user or model
}

const KEEP_ALIVE_INTERVAL = 10 * 1000;  // 10 seconds

@Injectable()
export class TranscribeService implements OnDestroy {
  private rawStreamSubject = new Subject<TranscriptionFragment>();
  private streamSubject = new BehaviorSubject<TranscriptionFragment | null>(null);
  stream$ = this.streamSubject.asObservable();
  private isStreamingSubject = new BehaviorSubject<boolean>(false);
  isStreaming$ = this.isStreamingSubject.asObservable();
  private ngUnsubscribe = new Subject<void>();

  private _deepgram;
  private isDeepgramAvailable = () => false; //environment.DEEPGRAM_API_KEY.length>0;
  private socket: ListenLiveClient | undefined = undefined;
  private interval: any;

  constructor(
    @Inject('sampleRate') private sampleRate: number,
    @Inject('source') private source: string,
  ) { 
    if (this.isDeepgramAvailable()) {
      this._deepgram = createClient(environment.DEEPGRAM_API_KEY);

      // Buffer incoming transcripts for 2s and combine them
      this.rawStreamSubject.pipe(
        bufferTime(2000),
        filter(fragments => fragments.length > 0),
        takeUntil(this.ngUnsubscribe)
      ).subscribe(fragments => {
        const combinedTranscript = fragments
          .map(f => f.transcript)
          .join(' ')
          .trim();

        this.streamSubject.next({
          transcript: combinedTranscript,
          source: this.source
        });
      });
    }
    
    this.sampleRate = sampleRate;
    this.source = source;

    this.stream$.pipe(takeUntil(this.ngUnsubscribe)).subscribe();
  }

  ngOnDestroy(): void {
    this.stop(); // Ensure socket is closed
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  get isStreaming() {
    return this.isStreamingSubject.value;
  }

  start(): Promise<null> { 
    if (!this.isDeepgramAvailable()) {
      return Promise.reject("Deepgram not available");
    }
    this.socket = undefined;

    this.interval = setInterval(() => {
      console.log("Keep-alive ping to Deepgram");
      this.socket?.keepAlive();
    }, KEEP_ALIVE_INTERVAL);

    return new Promise((resolve, reject) => {
      this.socket = this._deepgram?.listen.live({
        model: 'nova-3',
        language: 'en-US',
        //encoding: 'linear16',
        //sample_rate: this.sampleRate,
        smart_format: true,
        //no_delay: true, // required together with smart_format not to leave gaps in the transcript
      });
      console.info('Deepgram live socket initialized');

      this.socket?.on(LiveTranscriptionEvents.Open, () => {
        console.log("Connected to Deepgram");

        this.socket?.on(LiveTranscriptionEvents.Transcript, (data) => {
          const transcript = data.channel.alternatives[0].transcript;
          if (transcript.length === 0) return;
          this.rawStreamSubject.next({
            transcript: transcript, 
            source: this.source
          });
        });
        this.socket?.on(LiveTranscriptionEvents.Metadata, (data) => {
          console.log(data);
        });
        this.socket?.on(LiveTranscriptionEvents.Error, (err) => {
          console.error(err);
          this.stop();
        });
        this.socket?.on(LiveTranscriptionEvents.Close, () => {
          console.log("Connection to Deepgram closed.");
          this.stop();
        });

        this.isStreamingSubject.next(true);
        resolve(null);
      });
    });
  }

  stop(): void {
    if (!this.isDeepgramAvailable()) {
      return;
    }

    if (this.socket?.isConnected()) {
      this.streamSubject.next(null);
      this.isStreamingSubject.next(false);
      console.log("Disconnected from Deepgram");
      
      if (this.interval) {
        clearInterval(this.interval);
        console.log("Cleared keep-alive ping to Deepgram");
      }
    }
  }

  sendAudioData(data: ArrayBuffer): void {
    if (!this.isDeepgramAvailable()) {
      return;
    }
    this.socket?.send(data);
  }
}
