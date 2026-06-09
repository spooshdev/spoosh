import { ChangeDetectionStrategy, Component } from "@angular/core";

@Component({
  selector: "app-loading-card",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="loading-card">
      <div class="shimmer media"></div>
      <div class="shimmer line"></div>
      <div class="shimmer line short"></div>
      <div class="shimmer line"></div>
      <div class="shimmer line btn"></div>
    </article>
  `,
})
export class LoadingCardComponent {}
