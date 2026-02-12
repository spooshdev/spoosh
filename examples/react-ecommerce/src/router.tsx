import { createBrowserRouter } from "react-router-dom";
import { CartPage } from "./pages/CartPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { CreateProductPage } from "./pages/CreateProductPage";
import { HomePage } from "./pages/HomePage";
import { OrderProcessingPage } from "./pages/OrderProcessingPage";
import { OrdersLayout, RootLayout } from "./pages/RootLayout";
import { ProductDetailPage } from "./pages/ProductDetailPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "products/new", element: <CreateProductPage /> },
      { path: "products/:id", element: <ProductDetailPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      {
        path: "orders",
        element: <OrdersLayout />,
        children: [{ path: ":id", element: <OrderProcessingPage /> }],
      },
    ],
  },
]);
