import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { invalidate, useRead, useWrite } from "../lib/spoosh";
import { InlineError } from "../components/InlineError";
import {
  CartIcon,
  CheckIcon,
  ChevronRightIcon,
  HeartIcon,
  StarIcon,
  XIcon,
} from "../components/icons";
import { formatPrice } from "../utils/formatPrice";
import type { CommentRaw, ProductRaw } from "../lib/schema";

export function ProductDetailPage() {
  const params = useParams();
  const productId = params.id;

  const productQuery = useRead(
    (api) => api("products/:id").GET({ params: { id: productId ?? "" } }),
    {
      enabled: Boolean(productId),
      staleTime: 10_000,
    }
  );

  const commentsQuery = useRead(
    (api) =>
      api("products/:id/comments").GET({ params: { id: productId ?? "" } }),
    {
      enabled: Boolean(productId),
      staleTime: 5_000,
    }
  );

  const [commentBody, setCommentBody] = useState("");

  const likeProduct = useWrite((api) => api("products/:id/like").POST());
  const addToCart = useWrite((api) => api("cart").POST());
  const postComment = useWrite((api) => api("products/:id/comments").POST());

  const product: ProductRaw | undefined = productQuery.data;
  const comments: CommentRaw[] = commentsQuery.data ?? [];

  const pendingCommentCount = comments.filter(
    (item) => item.status === "pending"
  ).length;

  async function handleLike() {
    if (!productId) return;

    await likeProduct.trigger({
      params: { id: productId },
      optimistic: (cache) =>
        cache(`products/:id`)
          .filter(({ params }) => params.id === productId)
          .set((current) =>
            current
              ? { ...current, likes_count: current.likes_count + 1 }
              : current
          ),
    });
  }

  async function handleAddToCart() {
    if (!product) return;

    await addToCart.trigger({
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
      // We don't invalidate here cuz if we go to cart page, it will fetch the latest cart data anyway.
      // This way we get an instant update to the cart UI without waiting for the server response.
    });
  }

  async function handleCommentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!productId) return;

    const content = commentBody.trim();
    if (!content) return;

    const tempId = `temp-id-${Date.now()}`;
    const result = await postComment.trigger({
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
      // Invalidate to get the real comment with the correct ID and status from the server
    });

    if (result.data) {
      setCommentBody("");
      invalidate([`products/${productId}/comments`]);
    }
  }

  if (!productId) {
    return <InlineError message="Missing product id." />;
  }

  if (productQuery.loading) {
    return (
      <div className="panel" style={{ textAlign: "center", padding: "3rem" }}>
        <div className="spinner" style={{ margin: "0 auto 1rem" }} />
        <p className="muted">Loading product details...</p>
      </div>
    );
  }

  if (productQuery.error || !product) {
    return (
      <div className="panel" style={{ maxWidth: "600px", margin: "0 auto" }}>
        <InlineError
          message={
            productQuery.error?.message ?? "Unable to load this product."
          }
        />
        <Link to="/" className="btn secondary" style={{ marginTop: "1rem" }}>
          Back to Products
        </Link>
      </div>
    );
  }

  return (
    <div>
      <nav className="breadcrumb" style={{ marginBottom: "1.5rem" }}>
        <Link to="/">Home</Link>
        <ChevronRightIcon />
        <Link to="/">Products</Link>
        <ChevronRightIcon />
        <span className="muted">{product.title}</span>
      </nav>

      <div className="detail-grid">
        <div className="detail-gallery">
          <img
            src={product.image_url}
            alt={product.title}
            className="detail-image"
          />
        </div>

        <div className="detail-info">
          <div className="detail-header">
            <h1>{product.title}</h1>
            <p className="price">{formatPrice(product.price_cents)}</p>
          </div>

          <div className="detail-meta">
            <div className="meta-item">
              <StarIcon width={18} height={18} />
              <span>{product.rating_avg.toFixed(1)} rating</span>
            </div>

            <div className="meta-item">
              <HeartIcon width={18} height={18} />
              <span>{product.likes_count} likes</span>
            </div>

            {product.in_stock ? (
              <span className="stock-badge in-stock">
                <CheckIcon />
                In Stock
              </span>
            ) : (
              <span className="stock-badge out-of-stock">
                <XIcon />
                Out of Stock
              </span>
            )}
          </div>

          <p className="detail-description">{product.description}</p>

          <div className="detail-actions">
            <button
              className="btn primary lg"
              disabled={!product.in_stock}
              onClick={() => void handleAddToCart()}
            >
              <CartIcon />
              Add to Cart
            </button>

            <button
              className="btn secondary lg"
              onClick={() => void handleLike()}
            >
              <HeartIcon />
              Like ({product.likes_count})
            </button>
          </div>

          {likeProduct.error && (
            <InlineError message={likeProduct.error.message} />
          )}
          {addToCart.error && <InlineError message={addToCart.error.message} />}
        </div>
      </div>

      <section className="comments-section">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <h2>Comments</h2>
          {pendingCommentCount > 0 && (
            <span className="pending-chip">{pendingCommentCount} pending</span>
          )}
        </div>

        <form className="comment-form" onSubmit={handleCommentSubmit}>
          <textarea
            rows={3}
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
            placeholder="Share your thoughts about this product..."
          />
          <button
            className="btn primary"
            disabled={postComment.loading}
            type="submit"
            style={{ alignSelf: "flex-start" }}
          >
            {postComment.loading ? "Posting..." : "Add Comment"}
          </button>
        </form>

        {postComment.error && (
          <InlineError message={postComment.error.message} />
        )}
        {commentsQuery.error && (
          <InlineError message={commentsQuery.error.message} />
        )}

        {comments.length === 0 ? (
          <div className="empty-state">
            <h3>No comments yet</h3>
            <p>Be the first to share your thoughts!</p>
          </div>
        ) : (
          <ul className="comment-list">
            {comments.map((comment) => (
              <li key={comment.id} className="comment-item">
                <div className="comment-header">
                  <strong>{comment.author_name}</strong>
                  <small>{new Date(comment.created_at).toLocaleString()}</small>
                </div>
                <p>{comment.body}</p>
                {comment.status === "pending" && (
                  <span className="pending-chip">pending</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
