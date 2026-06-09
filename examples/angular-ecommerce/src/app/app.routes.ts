import { Routes } from "@angular/router";
import { HomeComponent } from "./pages/home.component";
import { CreateProductComponent } from "./pages/create-product.component";
import { ProductDetailComponent } from "./pages/product-detail.component";
import { CartComponent } from "./pages/cart.component";
import { CheckoutComponent } from "./pages/checkout.component";
import { OrderProcessingComponent } from "./pages/order-processing.component";

export const routes: Routes = [
  { path: "", component: HomeComponent },
  { path: "products/new", component: CreateProductComponent },
  { path: "products/:id", component: ProductDetailComponent },
  { path: "cart", component: CartComponent },
  { path: "checkout", component: CheckoutComponent },
  { path: "orders/:id", component: OrderProcessingComponent },
];
