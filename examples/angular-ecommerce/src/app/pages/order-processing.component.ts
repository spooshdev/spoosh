import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { InlineErrorComponent } from "../components/inline-error.component";
import { IconComponent } from "../components/icon.component";
import { injectRead } from "../api/spoosh";

@Component({
  selector: "app-order-processing",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, InlineErrorComponent, IconComponent],
  template: `
    <div class="processing-page">
      @if (orderStatusQuery.loading() && !orderStatus()) {
        <div class="processing-card">
          <div class="spinner" style="margin: 0 auto 1rem"></div>
          <p class="muted">Loading order status...</p>
        </div>
      } @else if (orderStatusQuery.error() && !orderStatus()) {
        <div class="processing-card">
          <app-inline-error
            [message]="
              orderStatusQuery.error()?.message ?? 'Unable to load order.'
            "
          />
        </div>
      } @else {
        <div class="processing-card">
          <h1>{{ paid() ? "Order Complete!" : "Processing Order" }}</h1>
          <p class="order-number">Order #{{ id() }}</p>

          <div
            class="status-pill"
            [class.ok]="paid()"
            [class.pending]="!paid()"
          >
            @if (paid()) {
              <app-icon name="check" [size]="18" />
              Payment Confirmed
            } @else {
              <span class="spinner"></span>
              Processing...
            }
          </div>

          <ul class="progress-steps">
            <li class="progress-step done">
              <span class="step-indicator">
                <app-icon name="check" />
              </span>
              <div class="step-content">
                <h3>Order Placed</h3>
                <p>Your order has been received</p>
              </div>
            </li>

            <li
              class="progress-step"
              [class.done]="paid()"
              [class.active]="!paid()"
            >
              <span class="step-indicator">
                @if (paid()) {
                  <app-icon name="check" />
                }
              </span>
              <div class="step-content">
                <h3>Processing Payment</h3>
                <p>
                  {{
                    paid() ? "Payment confirmed" : "Polling every 2 seconds..."
                  }}
                </p>
              </div>
            </li>

            <li class="progress-step" [class.done]="paid()">
              <span class="step-indicator">
                @if (paid()) {
                  <app-icon name="check" />
                }
              </span>
              <div class="step-content">
                <h3>Order Complete</h3>
                <p>
                  {{
                    paid()
                      ? "Thank you for your purchase!"
                      : "Waiting for payment"
                  }}
                </p>
              </div>
            </li>
          </ul>

          @if (orderStatus()?.updated_at; as updatedAt) {
            <p class="muted" style="font-size: 0.8125rem; margin-bottom: 1rem">
              Last updated: {{ formatTime(updatedAt) }}
            </p>
          }

          @if (paid()) {
            <a class="btn primary lg" routerLink="/">
              <app-icon name="shopping-bag" />
              Continue Shopping
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class OrderProcessingComponent {
  /** Order id bound from the `orders/:id` route param. */
  id = input<string>("");

  protected orderStatusQuery = injectRead(
    (api) => api("orders/:id/status").GET({ params: { id: this.id() } }),
    {
      enabled: () => this.id() !== "",
      pollingInterval: ({ data }) => (data?.status === "paid" ? false : 2_000),
    }
  );

  protected orderStatus = computed(() => this.orderStatusQuery.data());
  protected paid = computed(() => this.orderStatus()?.status === "paid");

  protected formatTime(value: string) {
    return new Date(value).toLocaleTimeString();
  }
}
