import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { Toast95Provider } from "@/contexts/Toast95Context";
import Index from "./pages/Index";
import Register from "./pages/Register";
import MenuPage from "./pages/MenuPage";
import Checkout from "./pages/Checkout";
import Success from "./pages/Success";
import AdminLogin from "./pages/AdminLogin";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <CartProvider>
          <Toast95Provider>
            <div className="flex justify-center min-h-screen">
              <div className="w-full max-w-[480px]">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/menu" element={<MenuPage />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/success" element={<Success />} />
                  <Route path="/admin-login" element={<AdminLogin />} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </div>
          </Toast95Provider>
        </CartProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
