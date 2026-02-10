import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { MobileWrapper } from "@/components/layout/MobileWrapper";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/AuthPage";
import Home from "@/pages/Home";
import Matches from "@/pages/Matches";
import Chat from "@/pages/Chat";
import Profile from "@/pages/Profile";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/home" component={Home} />
      <Route path="/matches" component={Matches} />
      <Route path="/chat" component={Matches} /> {/* Redirect chat tab to matches list */}
      <Route path="/chat/:id" component={Chat} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MobileWrapper>
        <Router />
      </MobileWrapper>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
