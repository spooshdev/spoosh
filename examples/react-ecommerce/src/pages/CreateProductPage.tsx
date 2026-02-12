import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { form } from "@spoosh/core";
import { useWrite, invalidate } from "../lib/spoosh";
import { ImageIcon } from "../components/icons";
import { InlineError } from "../components/InlineError";

export function CreateProductPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceCents, setPriceCents] = useState("");
  const [inStock, setInStock] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const createProduct = useWrite((api) => api("products").POST());

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const result = await createProduct.trigger({
      body: form({
        title,
        description,
        price_cents: parseInt(priceCents, 10) || 0,
        in_stock: inStock,
        image: imageFile ?? undefined,
      }),
    });

    if (result.data) {
      invalidate(["products"]);
      navigate("/");
    }
  };

  return (
    <div className="create-product-page">
      <h1>Create Product</h1>

      <form onSubmit={handleSubmit} className="create-product-form">
        <div className="form-group">
          <label htmlFor="image">Product Image</label>
          <div className="image-upload-area">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="image-preview" />
            ) : (
              <div className="image-placeholder">
                <ImageIcon width={48} height={48} />
                <span>Click to upload image</span>
              </div>
            )}
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              className="image-input"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter product title"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter product description"
            rows={3}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="price">Price (cents)</label>
            <input
              type="number"
              id="price"
              value={priceCents}
              onChange={(e) => setPriceCents(e.target.value)}
              placeholder="e.g. 2500 for $25.00"
              min="1"
              required
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => setInStock(e.target.checked)}
              />
              In Stock
            </label>
          </div>
        </div>

        {createProduct.error && (
          <InlineError message={createProduct.error.message} />
        )}

        <button
          type="submit"
          className="submit-button"
          disabled={createProduct.loading}
        >
          {createProduct.loading ? "Creating..." : "Create Product"}
        </button>
      </form>
    </div>
  );
}
