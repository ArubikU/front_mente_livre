import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/AuthProvider";
import Index from "./pages/Index";
import Therapists from "./pages/Therapists";
import BookAppointment from "./pages/BookAppointment";
import Payment from "./pages/Payment";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ManageAvailability from "./pages/ManageAvailability";
import NotFound from "./pages/NotFound";
import AuthPage from "./pages/AuthPage";
import UserDashboard from "./pages/UserDashboard";
import TherapistDashboard from "./pages/TherapistDashboard";
import TermsAndConditions from "./pages/TermsAndConditions";
import AboutUs from "./pages/AboutUs";
import ResetPassword from "./pages/ResetPassword";
import PaymentStatus from "./pages/PaymentStatus";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/conocenos" element={<AboutUs />} />
            <Route path="/terapeutas" element={<Therapists />} />
            <Route path="/reservar/:therapistId" element={<BookAppointment />} />
            <Route path="/pago/:appointmentId" element={<Payment />} />
            <Route path="/payment/success" element={<PaymentStatus />} />
            <Route path="/payment/failure" element={<PaymentStatus />} />
            <Route path="/payment/pending" element={<PaymentStatus />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/mi-cuenta" element={<UserDashboard />} />
            <Route path="/admin" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/mi-perfil" element={<TherapistDashboard />} />
            <Route path="/admin/disponibilidad" element={<ManageAvailability />} />
            <Route path="/terminos-y-condiciones" element={<TermsAndConditions />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
