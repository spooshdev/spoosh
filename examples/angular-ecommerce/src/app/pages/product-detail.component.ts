import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { InlineErrorComponent } from "../components/inline-error.component";
import { IconComponent } from "../components/icon.component";
import { injectRead, injectWrite, invalidate } from "../api/spoosh";

@Component({
  selector: "app-product-detail",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, InlineErrorComponent, IconComponent],
  template: `
    @if (productQuery.loading()) {
      <div class="panel" style="text-align: center; padding: 3rem">
        <div class="spinner" style="margin: 0 auto 1rem"></div>
        <p class="muted">Loading product details...</p>
      </div>
    } @else if (productQuery.error() || !product()) {
      <div class="panel" style="max-width: 600px; margin: 0 auto">
        <app-inline-error
          [message]="
            productQuery.error()?.message ?? 'Unable to load this product.'
          "
        />
        <a routerLink="/" class="btn secondary" style="margin-top: 1rem">
          Back to Products
        </a>
      </div>
    } @else if (product(); as item) {
      <div>
        <nav class="breadcrumb" style="margin-bottom: 1.5rem">
          <a routerLink="/">Home</a>
          <app-icon name="chevron-right" />
          <a routerLink="/">Products</a>
          <app-icon name="chevron-right" />
          <span class="muted">{{ item.title }}</span>
        </nav>

        <div class="detail-grid">
          <div class="detail-gallery">
            <img
              [src]="item.image_url"
              [alt]="item.title"
              class="detail-image"
            />
          </div>

          <div class="detail-info">
            <div class="detail-header">
              <h1>{{ item.title }}</h1>
              <p class="price">{{ formatPrice(item.price_cents) }}</p>
            </div>

            <div class="detail-meta">
              <div class="meta-item">
                <app-icon name="star" />
                <span>{{ item.rating_avg.toFixed(1) }} rating</span>
              </div>

              <div class="meta-item">
                <app-icon name="heart" />
                <span>{{ item.likes_count }} likes</span>
              </div>

              @if (item.in_stock) {
                <span class="stock-badge in-stock">
                  <app-icon name="check" />
                  In Stock
                </span>
              } @else {
                <span class="stock-badge out-of-stock">
                  <app-icon name="x" />
                  Out of Stock
                </span>
              }
            </div>

            <p class="detail-description">{{ item.description }}</p>

            <div class="detail-actions">
              <button
                class="btn primary lg"
                [disabled]="!item.in_stock"
                (click)="handleAddToCart()"
              >
                <app-icon name="cart" />
                Add to Cart
              </button>

              <button class="btn secondary lg" (click)="handleLike()">
                <app-icon name="heart" />
                Like ({{ item.likes_count }})
              </button>
            </div>

            @if (likeProduct.error(); as error) {
              <app-inline-error [message]="error.message" />
            }
            @if (addToCart.error(); as error) {
              <app-inline-error [message]="error.message" />
            }
          </div>
        </div>

        <section class="comments-section">
          <div style="display: flex; align-items: center; gap: 0.75rem">
            <h2>Comments</h2>
            @if (pendingCommentCount() > 0) {
              <span class="pending-chip"
                >{{ pendingCommentCount() }} pending</span
              >
            }
          </div>

          <form class="comment-form" (ngSubmit)="handleCommentSubmit()">
            <textarea
              rows="3"
              [(ngModel)]="commentBody"
              name="commentBody"
              placeholder="Share your thoughts about this product..."
            ></textarea>
            <button
              class="btn primary"
              [disabled]="postComment.loading()"
              type="submit"
              style="align-self: flex-start"
            >
              {{ postComment.loading() ? "Posting..." : "Add Comment" }}
            </button>
          </form>

          @if (postComment.error(); as error) {
            <app-inline-error [message]="error.message" />
          }
          @if (commentsQuery.error(); as error) {
            <app-inline-error [message]="error.message" />
          }

          @if (comments().length === 0) {
            <div class="empty-state">
              <h3>No comments yet</h3>
              <p>Be the first to share your thoughts!</p>
            </div>
          } @else {
            <ul class="comment-list">
              @for (comment of comments(); track comment.id) {
                <li class="comment-item">
                  <div class="comment-header">
                    <strong>{{ comment.author_name }}</strong>
                    <small>{{ formatDate(comment.created_at) }}</small>
                  </div>
                  <p>{{ comment.body }}</p>
                  @if (comment.status === "pending") {
                    <span class="pending-chip">pending</span>
                  }
                </li>
              }
            </ul>
          }
        </section>
      </div>
    }
  `,
})
export class ProductDetailComponent {
  /** Product id bound from the `products/:id` route param. */
  id = input<string>("");

  protected commentBody = signal("");

  protected productQuery = injectRead(
    (api) => api("products/:id").GET({ params: { id: this.id() } }),
    {
      enabled: () => this.id() !== "",
      staleTime: 10_000,
    }
  );

  protected commentsQuery = injectRead(
    (api) => api("products/:id/comments").GET({ params: { id: this.id() } }),
    {
      enabled: () => this.id() !== "",
      staleTime: 5_000,
    }
  );

  protected likeProduct = injectWrite((api) => api("products/:id/like").POST());
  protected addToCart = injectWrite((api) => api("cart").POST());
  protected postComment = injectWrite((api) =>
    api("products/:id/comments").POST()
  );

  protected product = computed(() => this.productQuery.data());
  protected comments = computed(() => this.commentsQuery.data() ?? []);
  protected pendingCommentCount = computed(
    () => this.comments().filter((item) => item.status === "pending").length
  );

  protected formatPrice(priceCents: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(priceCents / 100);
  }

  protected formatDate(value: string) {
    return new Date(value).toLocaleString();
  }

  async handleLike() {
    const productId = this.id();
    if (!productId) return;

    await this.likeProduct.trigger({
      params: { id: productId },
      optimistic: (cache) =>
        cache("products/:id")
          .filter(({ params }) => params.id === productId)
          .set((current) =>
            current
              ? { ...current, likes_count: current.likes_count + 1 }
              : current
          ),
    });
  }

  async handleAddToCart() {
    const item = this.product();
    if (!item) return;

    await this.addToCart.trigger({
      body: { product_id: item.id, quantity: 1 },
      optimistic: (cache) =>
        cache("cart").set((current) => {
          const items = current ?? [];
          const existing = items.find((entry) => entry.product_id === item.id);

          if (existing) {
            return items.map((entry) =>
              entry.product_id === item.id
                ? { ...entry, quantity: entry.quantity + 1 }
                : entry
            );
          }

          return [
            {
              id: `cart-${item.id}`,
              product_id: item.id,
              title: item.title,
              image_url: item.image_url,
              quantity: 1,
              price_cents: item.price_cents,
            },
            ...items,
          ];
        }),
    });
  }

  async handleCommentSubmit() {
    const productId = this.id();
    if (!productId) return;

    const content = this.commentBody().trim();
    if (!content) return;

    const tempId = `temp-id-${Date.now()}`;
    const result = await this.postComment.trigger({
      params: { id: productId },
      body: { body: content },
      optimistic: (cache) =>
        cache("products/:id/comments")
          .filter(({ params }) => params.id === productId)
          .set((current) => [
            {
              id: tempId,
              product_id: productId,
              author_name: "You",
              body: content,
              created_at: new Date().toISOString(),
              status: "pending",
            },
            ...(current ?? []),
          ]),
      invalidate: ["self"],
    });

    if (result.data) {
      this.commentBody.set("");
      invalidate([`products/${productId}/comments`]);
    }
  }
}
