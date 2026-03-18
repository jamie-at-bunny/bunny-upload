import {
  Directive,
  ElementRef,
  input,
  output,
  inject,
  OnInit,
  OnDestroy,
} from "@angular/core";
import {
  createDropzone,
  type Dropzone,
  type FileState,
  type UploadResult,
} from "@bunny.net/upload-core";

/**
 * Turn any element into an upload dropzone.
 *
 * ```html
 * <div bunnyDropzone [accept]="['image/*']" maxSize="10mb" (completed)="onComplete($event)">
 *   Drop files here
 * </div>
 * ```
 */
@Directive({
  selector: "[bunnyDropzone]",
  standalone: true,
  exportAs: "bunnyDropzone",
  host: {
    "[class.bunny-dropzone--active]": "isDragOver",
  },
})
export class UploadDropzoneDirective implements OnInit, OnDestroy {
  readonly endpoint = input<string>();
  readonly accept = input<string[]>();
  readonly maxSize = input<string | number>();
  readonly maxFiles = input<number>();
  readonly autoUpload = input(true);

  readonly completed = output<UploadResult[]>();
  readonly stateChange = output<FileState[]>();

  isDragOver = false;

  private el = inject(ElementRef);
  private dropzone?: Dropzone;

  ngOnInit() {
    this.dropzone = createDropzone(this.el.nativeElement, {
      endpoint: this.endpoint(),
      restrictions: {
        allowedTypes: this.accept(),
        maxFileSize: this.maxSize(),
        maxFiles: this.maxFiles(),
      },
      autoUpload: this.autoUpload(),
      onDragOver: (over) => {
        this.isDragOver = over;
      },
      onComplete: (results) => {
        this.completed.emit(results);
      },
      onStateChange: (files) => {
        this.stateChange.emit(files);
      },
    });
  }

  ngOnDestroy() {
    this.dropzone?.destroy();
  }

  openFilePicker() {
    this.dropzone?.openFilePicker();
  }
}
