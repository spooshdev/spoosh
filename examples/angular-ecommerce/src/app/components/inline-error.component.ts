import { ChangeDetectionStrategy, Component, input } from "@angular/core";
import { IconComponent } from "./icon.component";

@Component({
  selector: "app-inline-error",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconComponent],
  template: `
    <div class="inline-error" role="alert">
      <app-icon name="alert" />
      <span>{{ message() }}</span>
    </div>
  `,
})
export class InlineErrorComponent {
  /** Error message to display. */
  message = input.required<string>();
}
