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
import MemberSignup from "./pages/MemberSignup";
import NotFound from "./pages/NotFound";
import Install from "./pages/Install";

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
                <Routes>
                  <Route path="/" element={<div className="max-w-[500px] w-full mx-auto"><Index /></div>} />
                  <Route path="/register" element={<div className="max-w-[500px] w-full mx-auto"><Register /></div>} />
                  <Route path="/menu" element={<div className="max-w-[500px] w-full mx-auto"><MenuPage /></div>} />
                  <Route path="/checkout" element={<div className="max-w-[500px] w-full mx-auto"><Checkout /></div>} />
                  <Route path="/success" element={<div className="max-w-[500px] w-full mx-auto"><Success /></div>} />
                  <Route path="/admin-login" element={<div className="max-w-[500px] w-full mx-auto"><AdminLogin /></div>} />
                  <Route path="/member-signup" element={<div className="max-w-[500px] w-full mx-auto"><MemberSignup /></div>} />
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/install" element={<div className="max-w-[500px] w-full mx-auto"><Install /></div>} />
                  <Route path="*" element={<div className="max-w-[500px] w-full mx-auto"><NotFound /></div>} />
                </Routes>
            </div>
          </Toast95Provider>
        </CartProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
