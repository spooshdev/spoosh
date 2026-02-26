import { Link } from "react-router-dom";
import { InlineError } from "../components/InlineError";
import { CartIcon, TrashIcon } from "../components/icons";
import { formatPrice } from "../utils/formatPrice";
import { useRead, useWrite } from "../lib/spoosh";
import type { CartItemRaw } from "../lib/schema";

export function CartPage() {
  const cartQuery = useRead((api) => api("cart").GET(), {
    // To always fetch fresh cart data, cuz in a real app the
    // cart can gets updated from other places or some items are no longer available
    staleTime: 0,
  });

  const items: CartItemRaw[] = cartQuery.data ?? [];
  const totalCents = items.reduce(
    (sum, item) => sum + item.price_cents * item.quantity,
    0
  );

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  const removeItem = useWrite((api) => api("cart/:id").DELETE());

  async function handleRemove(itemId: string) {
    await removeItem.trigger({
      params: { id: itemId },
      optimistic: (cache) =>
        cache("cart").set((current) =>
          (current ?? []).filter((item) => item.id !== itemId)
        ),
      invalidate: ["self", "cart"],
    });
  }

  if (cartQuery.loading) {
    return (
      <div className="cart-page">
        <div className="panel" style={{ textAlign: "center", padding: "3rem" }}>
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p className="muted">Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Shopping Cart</h1>
        <span className="cart-count">{totalUnits} items</span>
      </div>

      {cartQuery.error && <InlineError message={cartQuery.error.message} />}
      {removeItem.error && <InlineError message={removeItem.error.message} />}

      {items.length === 0 ? (
        <div className="empty-state">
          <CartIcon width={64} height={64} strokeWidth={1.5} />
          <h3>Your cart is empty</h3>
          <p>Looks like you haven't added any items yet.</p>
          <Link to="/" className="btn primary">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map((item) => (
              <article key={item.id} className="cart-item">
                <img src={item.image_url} alt={item.title} />

                <div className="cart-item-info">
                  <h3>{item.title}</h3>
                  <p className="quantity">Qty: {item.quantity}</p>
                  <span className="price">
                    {formatPrice(item.price_cents * item.quantity)}
                  </span>
                </div>

                <div className="cart-item-actions">
                  <button
                    className="btn secondary sm"
                    onClick={() => void handleRemove(item.id)}
                  >
                    <TrashIcon />
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="cart-summary">
            <h2>Order Summary</h2>

            <div className="summary-row">
              <span>Subtotal ({totalUnits} items)</span>
              <span>{formatPrice(totalCents)}</span>
            </div>

            <div className="summary-row">
              <span>Shipping</span>
              <span>Free</span>
            </div>

            <div className="summary-row total">
              <span>Total</span>
              <span>{formatPrice(totalCents)}</span>
            </div>

            <Link to="/checkout" className="btn primary full">
              Proceed to Checkout
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
