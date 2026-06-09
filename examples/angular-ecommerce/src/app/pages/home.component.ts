import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  signal,
  viewChild,
} from "@angular/core";
import { InlineErrorComponent } from "../components/inline-error.component";
import { LoadingCardComponent } from "../components/loading-card.component";
import { ProductCardComponent } from "../components/product-card.component";
import { IconComponent } from "../components/icon.component";
import { injectRead, injectWrite, prefetch } from "../api/spoosh";
import type { ProductRaw } from "../api/schema";

@Component({
  selector: "app-home",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    InlineErrorComponent,
    LoadingCardComponent,
    ProductCardComponent,
    IconComponent,
  ],
  template: `
    <section>
      <div class="hero-section">
        <h1>Welcome to Spoosh Store</h1>
        <p>
          A demo e-commerce showcasing pagination, optimistic updates, retries,
          polling, prefetching, and data transforms.
        </p>
        <div class="tech-badges">
          <span class="tech-badge">Spoosh</span>
          <span class="tech-badge">Angular</span>
          <span class="tech-badge">TypeScript</span>
        </div>
      </div>

      <div class="section-header">
        <div>
          <h2>Products</h2>
          <p>Browse our collection with hover prefetch</p>
        </div>
      </div>

      @if (products.error(); as error) {
        <app-inline-error [message]="error.message" />
      }
      @if (addToCart.error(); as error) {
        <app-inline-error [message]="error.message" />
      }

      <div class="products-grid">
        @if (products.loading() && items().length === 0) {
          @for (placeholder of skeletons; track placeholder) {
            <app-loading-card />
          }
        } @else {
          @for (product of items(); track product.id) {
            <app-product-card
              [product]="product"
              (hovered)="onHover($event)"
              (addToCart)="handleAddToCart($event)"
            />
          }
        }
      </div>

      @if (isEmpty()) {
        <div class="empty-state">
          <h3>No products available</h3>
          <p>Check back later for new arrivals.</p>
        </div>
      }

      @if (items().length > 0) {
        <div class="section-actions">
          <button
            class="btn secondary"
            [disabled]="!hasPrev() || products.loading()"
            (click)="page.set(page() - 1)"
          >
            Previous
          </button>

          <span class="pagination-info">
            Page {{ page() }} of {{ totalPages() }}
          </span>

          <button
            class="btn secondary"
            [disabled]="!hasNext() || products.loading()"
            (click)="page.set(page() + 1)"
          >
            Next
          </button>
        </div>
      }

      <div class="settings-fab" #settingsFab>
        <button
          class="fab-btn"
          (click)="settingsOpen.set(!settingsOpen())"
          aria-label="Settings"
        >
          <app-icon name="settings" [size]="20" />
        </button>

        @if (settingsOpen()) {
          <div class="settings-panel">
            <h4>Spoosh Features</h4>

            <label class="toggle-row">
              <span>Prefetch on Hover</span>
              <input
                type="checkbox"
                [checked]="prefetchEnabled()"
                (change)="prefetchEnabled.set(!prefetchEnabled())"
              />
              <span class="toggle-switch"></span>
            </label>
          </div>
        }
      </div>
    </section>
  `,
})
export class HomeComponent {
  protected readonly skeletons = Array.from({ length: 8 }, (_, i) => i);

  protected page = signal(1);
  protected settingsOpen = signal(false);
  protected prefetchEnabled = signal(false);

  private settingsFab = viewChild<ElementRef<HTMLElement>>("settingsFab");

  protected products = injectRead((api) =>
    api("products").GET({ query: { page: this.page() } })
  );

  protected addToCart = injectWrite((api) => api("cart").POST());

  protected items = computed(() => this.products.data()?.items ?? []);
  protected totalPages = computed(() => this.products.data()?.total_pages ?? 1);
  protected hasPrev = computed(() => this.page() > 1);
  protected hasNext = computed(() => this.page() < this.totalPages());
  protected isEmpty = computed(
    () =>
      !this.products.loading() &&
      !this.products.error() &&
      this.items().length === 0
  );

  handleAddToCart(product: ProductRaw) {
    void this.addToCart.trigger({
      body: { product_id: product.id, quantity: 1 },
      optimistic: (cache) =>
        cache("cart").set((current) => {
          const items = current ?? [];
          const existing = items.find((item) => item.product_id === product.id);

          if (existing) {
            return items.map((item) =>
              item.product_id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          }

          return [
            {
              id: `cart-${product.id}`,
              product_id: product.id,
              title: product.title,
              image_url: product.image_url,
              quantity: 1,
              price_cents: product.price_cents,
            },
            ...items,
          ];
        }),
    });
  }

  onHover(id: string) {
    if (!this.prefetchEnabled()) return;

    void prefetch((api) => api("products/:id").GET({ params: { id } }), {
      staleTime: 12_000,
    });
  }

  @HostListener("document:click", ["$event"])
  protected onDocumentClick(event: MouseEvent) {
    if (!this.settingsOpen()) return;

    const el = this.settingsFab()?.nativeElement;
    if (el && !el.contains(event.target as Node)) {
      this.settingsOpen.set(false);
    }
  }
}
