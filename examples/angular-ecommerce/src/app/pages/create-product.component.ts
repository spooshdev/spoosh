import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { Router } from "@angular/router";
import { form } from "@spoosh/core";
import { InlineErrorComponent } from "../components/inline-error.component";
import { IconComponent } from "../components/icon.component";
import { injectWrite, invalidate } from "../api/spoosh";

@Component({
  selector: "app-create-product",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InlineErrorComponent, IconComponent],
  template: `
    <div class="create-product-page">
      <h1>Create Product</h1>

      <form (ngSubmit)="handleSubmit()" class="create-product-form">
        <div class="form-group">
          <label for="image">Product Image</label>
          <div class="image-upload-area">
            @if (imagePreview(); as preview) {
              <img [src]="preview" alt="Preview" class="image-preview" />
            } @else {
              <div class="image-placeholder">
                <app-icon name="image" [size]="48" />
                <span>Click to upload image</span>
              </div>
            }
            <input
              type="file"
              id="image"
              accept="image/*"
              (change)="handleImageChange($event)"
              class="image-input"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            [(ngModel)]="title"
            placeholder="Enter product title"
            required
          />
        </div>

        <div class="form-group">
          <label for="description">Description</label>
          <textarea
            id="description"
            name="description"
            [(ngModel)]="description"
            placeholder="Enter product description"
            rows="3"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="price">Price (cents)</label>
            <input
              type="number"
              id="price"
              name="price"
              [(ngModel)]="priceCents"
              placeholder="e.g. 2500 for $25.00"
              min="1"
              required
            />
          </div>

          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" name="inStock" [(ngModel)]="inStock" />
              In Stock
            </label>
          </div>
        </div>

        @if (createProduct.error(); as error) {
          <app-inline-error [message]="error.message" />
        }

        <button
          type="submit"
          class="submit-button"
          [disabled]="createProduct.loading()"
        >
          {{ createProduct.loading() ? "Creating..." : "Create Product" }}
        </button>
      </form>
    </div>
  `,
})
export class CreateProductComponent {
  private router = inject(Router);

  protected title = signal("");
  protected description = signal("");
  protected priceCents = signal<number | null>(null);
  protected inStock = signal(true);
  protected imageFile = signal<File | null>(null);
  protected imagePreview = signal<string | null>(null);

  protected createProduct = injectWrite((api) => api("products").POST());

  handleImageChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.imageFile.set(file);
    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  async handleSubmit() {
    const result = await this.createProduct.trigger({
      body: form({
        title: this.title(),
        description: this.description(),
        price_cents: this.priceCents() ?? 0,
        in_stock: this.inStock(),
        image: this.imageFile() ?? undefined,
      }),
    });

    if (result.data) {
      invalidate(["products"]);
      void this.router.navigate(["/"]);
    }
  }
}
