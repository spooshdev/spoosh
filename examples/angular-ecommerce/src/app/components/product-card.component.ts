import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from "@angular/core";
import { RouterLink } from "@angular/router";
import { IconComponent } from "./icon.component";
import { formatPrice } from "../utils/format-price";
import type { ProductRaw } from "../api/schema";

@Component({
  selector: "app-product-card",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent],
  template: `
    <article class="product-card" (mouseenter)="hovered.emit(product().id)">
      <a class="product-link" [routerLink]="['/products', product().id]">
        <div class="product-image-wrap">
          <img
            [src]="product().image_url"
            [alt]="product().title"
            class="product-image"
            loading="lazy"
          />

          <div class="product-badges">
            @if (!product().in_stock) {
              <span class="product-badge out-of-stock">Sold Out</span>
            }
          </div>

          <button
            type="button"
            class="wishlist-btn"
            (click)="$event.preventDefault(); $event.stopPropagation()"
          >
            <app-icon name="heart" />
          </button>
        </div>

        <div class="product-content">
          <span class="product-category">Electronics</span>
          <h3>{{ product().title }}</h3>
          <p class="description">{{ product().description }}</p>
          <div class="product-meta">
            <span class="product-price">
              {{ formatPrice(product().price_cents) }}
            </span>
            <span class="product-rating">
              <app-icon name="star" />
              {{ product().rating_avg.toFixed(1) }}
            </span>
          </div>
        </div>
      </a>

      <button
        type="button"
        class="btn primary"
        [disabled]="!product().in_stock"
        (click)="addToCart.emit(product())"
      >
        <app-icon name="cart" />
        {{ product().in_stock ? "Add to Cart" : "Out of Stock" }}
      </button>
    </article>
  `,
})
export class ProductCardComponent {
  /** Product to render. */
  product = input.required<ProductRaw>();

  /** Emits the product id when the card is hovered (used for prefetch). */
  hovered = output<string>();

  /** Emits when the user adds this product to the cart. */
  addToCart = output<ProductRaw>();

  protected readonly formatPrice = formatPrice;
}
