import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { InlineErrorComponent } from "../components/inline-error.component";
import { IconComponent } from "../components/icon.component";
import { injectRead, injectWrite } from "../api/spoosh";
import { formatPrice } from "../utils/format-price";

@Component({
  selector: "app-checkout",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InlineErrorComponent, IconComponent],
  template: `
    <div class="checkout-grid">
      <div class="checkout-form-section">
        <div>
          <h1>Checkout</h1>
          <p class="subtitle muted">Complete your order securely.</p>
        </div>

        <form class="checkout-form" (ngSubmit)="handleSubmit()">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input
              id="email"
              name="email"
              type="email"
              [(ngModel)]="email"
              placeholder="your@email.com"
              required
            />
          </div>

          <div class="form-group">
            <label for="address">Shipping Address</label>
            <textarea
              id="address"
              name="address"
              rows="4"
              [(ngModel)]="address"
              placeholder="Enter your full shipping address"
              required
            ></textarea>
          </div>

          @if (checkout.error(); as error) {
            <app-inline-error [message]="error.message" />
          }

          <button
            class="btn primary lg full"
            [disabled]="
              cartQuery.loading() || checkout.loading() || totalUnits() === 0
            "
            type="submit"
          >
            <app-icon name="lock" />
            {{ checkout.loading() ? "Processing Payment..." : "Place Order" }}
          </button>

          <p class="muted" style="text-align: center; font-size: 0.8125rem">
            Your payment information is secure and encrypted.
          </p>
        </form>
      </div>

      <aside class="order-summary">
        <h2>Order Summary</h2>

        @if (cartQuery.loading()) {
          <div style="padding: 2rem 0; text-align: center">
            <div class="spinner" style="margin: 0 auto 1rem"></div>
            <p class="muted">Loading cart...</p>
          </div>
        } @else if (items().length === 0) {
          <p class="muted" style="padding: 1rem 0">Your cart is empty</p>
        } @else {
          <ul class="order-items">
            @for (item of items(); track item.id) {
              <li class="order-item">
                <span>{{ item.title }} x {{ item.quantity }}</span>
                <strong>{{
                  formatPrice(item.price_cents * item.quantity)
                }}</strong>
              </li>
            }
          </ul>
        }

        @if (!cartQuery.loading()) {
          <div class="summary-row" style="margin-top: 1rem">
            <span>Subtotal</span>
            <span>{{ formatPrice(totalCents()) }}</span>
          </div>

          <div class="summary-row">
            <span>Shipping</span>
            <span>Free</span>
          </div>

          <div class="summary-total">
            <span>Total</span>
            <span>{{ formatPrice(totalCents()) }}</span>
          </div>
        }
      </aside>
    </div>
  `,
})
export class CheckoutComponent {
  private router = inject(Router);

  protected email = signal("shopper@example.com");
  protected address = signal("121 Market Street, San Francisco, CA");

  protected cartQuery = injectRead((api) => api("cart").GET(), {
    staleTime: 0,
    transform: (items) => ({
      totalCents: items.reduce(
        (sum, item) => sum + item.price_cents * item.quantity,
        0
      ),
      totalUnits: items.reduce((sum, item) => sum + item.quantity, 0),
    }),
  });

  protected checkout = injectWrite((api) => api("checkout").POST());

  protected items = computed(() => this.cartQuery.data() ?? []);
  protected summary = computed(
    () =>
      this.cartQuery.meta().transformedData ?? { totalCents: 0, totalUnits: 0 }
  );
  protected totalCents = computed(() => this.summary().totalCents);
  protected totalUnits = computed(() => this.summary().totalUnits);

  protected readonly formatPrice = formatPrice;

  async handleSubmit() {
    const result = await this.checkout.trigger({
      body: { email: this.email().trim(), address: this.address().trim() },
      invalidate: ["self", "cart"],
    });

    if (!result.data) {
      return;
    }

    void this.router.navigate(["/orders", result.data.order_id]);
  }
}
