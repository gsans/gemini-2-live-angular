
import { Component, forwardRef, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-custom-select',
  templateUrl: './select.component.html',
  styleUrls: ['./select.component.css'],
  imports: [],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CustomSelectComponent),
      multi: true
    }
  ]
})
export class CustomSelectComponent implements ControlValueAccessor, OnInit {
  @Input() options: SelectOption[] = [];

  // Add a new input for default value
  @Input() defaultValue?: string;

  value: SelectOption | null = null;
  @Output() selectionChange = new EventEmitter<SelectOption>();

  // ControlValueAccessor implementation   
  onChange: any = () => { };
  onTouched: any = () => { };

  ngOnInit() {
    // Set default value if provided
    if (this.defaultValue) {
      const defaultOption = this.options.find(opt => opt.value === this.defaultValue);
      if (defaultOption) {
        this.value = defaultOption;
        this.onChange(defaultOption);
      }
    } else if (this.options.length > 0) {
      // If no default specified, select first option
      this.value = this.options[0];
      this.onChange(this.options[0]);
    }
  }

  writeValue(value: SelectOption): void {
    this.value = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onSelectChange(event: Event) {
    const selectedValue = (event.target as HTMLSelectElement).value;
    const selectedOption = this.options.find(opt => opt.value === selectedValue);

    if (selectedOption) {
      this.value = selectedOption;
      this.onChange(selectedOption);
      this.selectionChange.emit(selectedOption);
    }
  }
}