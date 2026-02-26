import { useEffect, useRef, useState } from "react";
import { InlineError } from "../components/InlineError";
import { LoadingCard } from "../components/LoadingCard";
import { ProductCard } from "../components/ProductCard";
import { SettingsIcon } from "../components/icons";
import { prefetch, useRead, useWrite } from "../lib/spoosh";
import type { ProductRaw } from "../lib/schema";

export function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [prefetchEnabled, setPrefetchEnabled] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settingsOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(event.target as Node)
      ) {
        setSettingsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [settingsOpen]);

  const [page, setPage] = useState(1);

  const products = useRead((api) =>
    api("products").GET({
      query: { page },
    })
  );

  const addToCart = useWrite((api) => api("cart").POST());

  const addErrorMessage = addToCart.error?.message;

  const items = products.data?.items ?? [];
  const totalPages = products.data?.total_pages ?? 1;
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const isEmptyProducts =
    !products.loading && !products.error && items.length === 0;

  function handleAddToCart(product: ProductRaw) {
    void addToCart.trigger({
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

  return (
    <section>
      <div className="hero-section">
        <h1>Welcome to Spoosh Store</h1>
        <p>
          A demo e-commerce showcasing pagination, optimistic updates, retries,
          polling, prefetching, and data transforms.
        </p>
        <div className="tech-badges">
          <span className="tech-badge">Spoosh</span>
          <span className="tech-badge">React</span>
          <span className="tech-badge">TypeScript</span>
        </div>
      </div>

      <div className="section-header">
        <div>
          <h2>Products</h2>
          <p>Browse our collection with hover prefetch</p>
        </div>
      </div>

      {products.error && <InlineError message={products.error.message} />}
      {addErrorMessage && <InlineError message={addErrorMessage} />}

      <div className="products-grid">
        {products.loading && items.length === 0
          ? Array.from({ length: 8 }, (_, index) => (
              <LoadingCard key={`loading-${index}`} />
            ))
          : items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onHover={(id) => {
                  if (prefetchEnabled) {
                    void prefetch(
                      (api) => api("products/:id").GET({ params: { id } }),
                      { staleTime: 12_000 }
                    );
                  }
                }}
                onAddToCart={handleAddToCart}
              />
            ))}
      </div>

      {isEmptyProducts && (
        <div className="empty-state">
          <h3>No products available</h3>
          <p>Check back later for new arrivals.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="section-actions">
          <button
            className="btn secondary"
            disabled={!hasPrev || products.loading}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>

          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>

          <button
            className="btn secondary"
            disabled={!hasNext || products.loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      <div className="settings-fab" ref={settingsRef}>
        <button
          className="fab-btn"
          onClick={() => setSettingsOpen(!settingsOpen)}
          aria-label="Settings"
        >
          <SettingsIcon width={20} height={20} />
        </button>

        {settingsOpen && (
          <div className="settings-panel">
            <h4>Spoosh Features</h4>

            <label className="toggle-row">
              <span>Prefetch on Hover</span>
              <input
                type="checkbox"
                checked={prefetchEnabled}
                onChange={(e) => setPrefetchEnabled(e.target.checked)}
              />
              <span className="toggle-switch" />
            </label>
          </div>
        )}
      </div>
    </section>
  );
}
