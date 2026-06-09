import { ChangeDetectionStrategy, Component, computed } from "@angular/core";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { IconComponent } from "./components/icon.component";
import { injectRead } from "./api/spoosh";

@Component({
  selector: "app-root",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  template: `
    <div class="app-shell">
      <header class="site-header">
        <div class="container">
          <div class="header-inner">
            <a routerLink="/" class="logo">
              <app-icon name="logo" svgClass="logo-icon" />
              <span>Spoosh Store</span>
            </a>

            <nav class="main-nav">
              <a
                routerLink="/"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
              >
                <app-icon name="home" svgClass="nav-icon" />
                Home
              </a>
              <a routerLink="/products/new" routerLinkActive="active">
                <app-icon name="plus" svgClass="nav-icon" />
                Create
              </a>
              <a routerLink="/checkout" routerLinkActive="active">
                <app-icon name="credit-card" svgClass="nav-icon" />
                Checkout
              </a>
            </nav>

            <div class="header-actions">
              <a routerLink="/cart" class="cart-btn">
                <app-icon name="cart" />
                @if (totalUnits() > 0) {
                  <span class="badge">{{ totalUnits() }}</span>
                }
              </a>
            </div>
          </div>
        </div>
      </header>

      <main class="container page-body">
        <router-outlet />
      </main>

      <footer class="site-footer">
        <div class="container">
          <div class="footer-inner">
            <div class="footer-brand">
              <a
                href="https://spoosh.dev"
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>Spoosh Store</strong>
              </a>
              — Typesafe API toolkit with composable plugins
            </div>
            <div class="footer-links">
              <a
                href="https://github.com/spooshdev/spoosh/tree/main/examples/angular-ecommerce"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <a
                href="https://spoosh.dev/docs/angular"
                target="_blank"
                rel="noopener noreferrer"
              >
                Documentation
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `,
})
export class AppComponent {
  private cart = injectRead((api) => api("cart").GET(), { staleTime: 4_000 });

  protected totalUnits = computed(() =>
    (this.cart.data() ?? []).reduce((sum, item) => sum + item.quantity, 0)
  );
}
