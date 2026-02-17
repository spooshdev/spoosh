import { Link, useParams } from "react-router-dom";
import { useRead } from "../lib/spoosh";
import { InlineError } from "../components/InlineError";
import { CheckIcon, ShoppingBagIcon } from "../components/icons";
import type { OrderStatusRaw } from "../lib/schema";

export function OrderProcessingPage() {
  const params = useParams();
  const orderId = params.id;

  const orderStatusQuery = useRead(
    (api) => api("orders/:id/status").GET({ params: { id: orderId ?? "" } }),
    {
      enabled: Boolean(orderId),
      pollingInterval: ({ data }) => (data?.status === "paid" ? false : 2_000),
    }
  );

  const orderStatus: OrderStatusRaw | undefined = orderStatusQuery.data;

  if (!orderId) {
    return <InlineError message="Order id is required." />;
  }

  if (orderStatusQuery.loading && !orderStatus) {
    return (
      <div className="processing-page">
        <div className="processing-card">
          <div className="spinner" style={{ margin: "0 auto 1rem" }} />
          <p className="muted">Loading order status...</p>
        </div>
      </div>
    );
  }

  if (orderStatusQuery.error && !orderStatus) {
    return (
      <div className="processing-page">
        <div className="processing-card">
          <InlineError message={orderStatusQuery.error.message} />
        </div>
      </div>
    );
  }

  const status = orderStatus?.status ?? "processing";
  const paid = status === "paid";

  return (
    <div className="processing-page">
      <div className="processing-card">
        <h1>{paid ? "Order Complete!" : "Processing Order"}</h1>
        <p className="order-number">Order #{orderId}</p>

        <div className={`status-pill ${paid ? "ok" : "pending"}`}>
          {paid ? (
            <>
              <CheckIcon width={18} height={18} strokeWidth={2.5} />
              Payment Confirmed
            </>
          ) : (
            <>
              <span className="spinner" />
              Processing...
            </>
          )}
        </div>

        <ul className="progress-steps">
          <li className="progress-step done">
            <span className="step-indicator">
              <CheckIcon />
            </span>
            <div className="step-content">
              <h3>Order Placed</h3>
              <p>Your order has been received</p>
            </div>
          </li>

          <li className={`progress-step ${paid ? "done" : "active"}`}>
            <span className="step-indicator">{paid && <CheckIcon />}</span>
            <div className="step-content">
              <h3>Processing Payment</h3>
              <p>{paid ? "Payment confirmed" : "Polling every 2 seconds..."}</p>
            </div>
          </li>

          <li className={`progress-step ${paid ? "done" : ""}`}>
            <span className="step-indicator">{paid && <CheckIcon />}</span>
            <div className="step-content">
              <h3>Order Complete</h3>
              <p>
                {paid ? "Thank you for your purchase!" : "Waiting for payment"}
              </p>
            </div>
          </li>
        </ul>

        {orderStatus?.updated_at && (
          <p
            className="muted"
            style={{ fontSize: "0.8125rem", marginBottom: "1rem" }}
          >
            Last updated:{" "}
            {new Date(orderStatus.updated_at).toLocaleTimeString()}
          </p>
        )}

        {paid && (
          <Link className="btn primary lg" to="/">
            <ShoppingBagIcon />
            Continue Shopping
          </Link>
        )}
      </div>
    </div>
  );
}
