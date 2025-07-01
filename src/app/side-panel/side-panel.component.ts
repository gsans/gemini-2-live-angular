import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef
} from '@angular/core';
import { FormControl, FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { LoggerService } from '../logging/logger.service';
import { MultimodalLiveService } from '../../gemini/gemini-client.service';

import { LoggerComponent } from '../logger/logger.component';
import { CustomSelectComponent } from '../select/select.component';
import { StreamingLog } from '../../gemini/types';

export type LoggerFilterType = 'conversations' | 'tools' | 'none';

interface FilterOption {
  value: string;
  label: string;
}

interface LogEvent {
  text: string;
}

@Component({
  selector: 'app-side-panel',
  templateUrl: './side-panel.component.html',
  styleUrls: ['./side-panel.component.css'],
  imports: [FormsModule, LoggerComponent, CustomSelectComponent],
})
export class SidePanelComponent implements OnInit, OnDestroy {
  @ViewChild('inputArea') inputArea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('loggerContainer') loggerContainer!: ElementRef<HTMLDivElement>;

  open = false;
  connected = false;
  textInput = '';

  filterOptions: FilterOption[] = [
    { value: 'conversations', label: 'Conversations' },
    { value: 'tools', label: 'Tool Use' },
    { value: 'none', label: 'All' },
  ];

  selectedFilter = 'none';
  logs: any[] = [];

  private logSubscription: Subscription | null = null;

  constructor(
    private multimodalLiveService: MultimodalLiveService,
    private loggerService: LoggerService
  ) { }

  ngOnInit() {
    this.loggerService.logs$.subscribe(logs => {
      this.logs = logs;
      this.scrollToBottom();
    });

    this.multimodalLiveService.connected$.subscribe(status => {
      this.connected = status;
    });

    this.multimodalLiveService.on('log', (log: StreamingLog) => {
      this.loggerService.log(log);
    });
  }

  ngOnDestroy() {
    if (this.logSubscription) {
      this.logSubscription.unsubscribe();
    }
  }

  togglePanel() {
    this.open = !this.open;
  }

  handleSubmit() {
    if (this.textInput.trim()) {
      this.multimodalLiveService.send([{ text: this.textInput }]);
      this.textInput = '';
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.handleSubmit();
    }
  }

  onSelectedOptionChange(event: any) {
    this.selectedFilter = event.value;
  }
  

  private scrollToBottom() {
    if (this.loggerContainer) {
      const el = this.loggerContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    }
  }

}
