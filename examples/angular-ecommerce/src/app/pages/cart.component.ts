import { ChangeDetectionStrategy, Component, computed } from "@angular/core";
import { RouterLink } from "@angular/router";
import { InlineErrorComponent } from "../components/inline-error.component";
import { IconComponent } from "../components/icon.component";
import { injectRead, injectWrite } from "../api/spoosh";
import { formatPrice } from "../utils/format-price";

@Component({
  selector: "app-cart",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, InlineErrorComponent, IconComponent],
  template: `
    <div class="cart-page">
      @if (cartQuery.loading()) {
        <div class="panel" style="text-align: center; padding: 3rem">
          <div class="spinner" style="margin: 0 auto 1rem"></div>
          <p class="muted">Loading your cart...</p>
        </div>
      } @else {
        <div class="cart-header">
          <h1>Shopping Cart</h1>
          <span class="cart-count">{{ totalUnits() }} items</span>
        </div>

        @if (cartQuery.error(); as error) {
          <app-inline-error [message]="error.message" />
        }
        @if (removeItem.error(); as error) {
          <app-inline-error [message]="error.message" />
        }

        @if (items().length === 0) {
          <div class="empty-state">
            <app-icon name="cart" [size]="64" />
            <h3>Your cart is empty</h3>
            <p>Looks like you haven't added any items yet.</p>
            <a routerLink="/" class="btn primary">Continue Shopping</a>
          </div>
        } @else {
          <div class="cart-layout">
            <div class="cart-items">
              @for (item of items(); track item.id) {
                <article class="cart-item">
                  <img [src]="item.image_url" [alt]="item.title" />

                  <div class="cart-item-info">
                    <h3>{{ item.title }}</h3>
                    <p class="quantity">Qty: {{ item.quantity }}</p>
                    <span class="price">
                      {{ formatPrice(item.price_cents * item.quantity) }}
                    </span>
                  </div>

                  <div class="cart-item-actions">
                    <button
                      class="btn secondary sm"
                      (click)="handleRemove(item.id)"
                    >
                      <app-icon name="trash" />
                      Remove
                    </button>
                  </div>
                </article>
              }
            </div>

            <aside class="cart-summary">
              <h2>Order Summary</h2>

              <div class="summary-row">
                <span>Subtotal ({{ totalUnits() }} items)</span>
                <span>{{ formatPrice(totalCents()) }}</span>
              </div>

              <div class="summary-row">
                <span>Shipping</span>
                <span>Free</span>
              </div>

              <div class="summary-row total">
                <span>Total</span>
                <span>{{ formatPrice(totalCents()) }}</span>
              </div>

              <a routerLink="/checkout" class="btn primary full">
                Proceed to Checkout
              </a>
            </aside>
          </div>
        }
      }
    </div>
  `,
})
export class CartComponent {
  protected cartQuery = injectRead((api) => api("cart").GET(), {
    staleTime: 0,
  });

  protected removeItem = injectWrite((api) => api("cart/:id").DELETE());

  protected items = computed(() => this.cartQuery.data() ?? []);
  protected totalUnits = computed(() =>
    this.items().reduce((sum, item) => sum + item.quantity, 0)
  );
  protected totalCents = computed(() =>
    this.items().reduce(
      (sum, item) => sum + item.price_cents * item.quantity,
      0
    )
  );

  protected readonly formatPrice = formatPrice;

  async handleRemove(itemId: string) {
    await this.removeItem.trigger({
      params: { id: itemId },
      optimistic: (cache) =>
        cache("cart").set((current) =>
          (current ?? []).filter((item) => item.id !== itemId)
        ),
    });
  }
}
