import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Shield, Calendar } from "lucide-react";
import { NotificationBell } from "@/components/notification-bell";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Raya Activities — Student Activities Platform" },
      {
        name: "description",
        content:
          "Discover and join student activities on campus. Sign up, meet new people, and make memories.",
      },
      {
        property: "og:title",
        content: "Raya Activities — Student Activities Platform",
      },
      {
        property: "og:description",
        content:
          "Raya Activities is a student platform for discovering, joining, and managing campus activities.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "twitter:title",
        content: "Raya Activities — Student Activities Platform",
      },
      {
        name: "twitter:description",
        content:
          "Raya Activities is a student platform for discovering, joining, and managing campus activities.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6dbb9221-c5df-4014-9665-1c2965360db0/id-preview-2c3db0b7--c6b38aba-57a9-4421-84a5-94a46c90d9f5.lovable.app-1777646663886.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/6dbb9221-c5df-4014-9665-1c2965360db0/id-preview-2c3db0b7--c6b38aba-57a9-4421-84a5-94a46c90d9f5.lovable.app-1777646663886.png",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href:
          "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Manrope:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Header() {
  const { user, isAdmin, signOut, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-lg font-bold text-primary"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-hero text-primary-foreground shadow-soft">
           <img
  src="/logo.png"
  alt="Raya Activities"
  className="h-10 w-10 rounded-lg object-cover"
/>
          </span>
          Raya Activities
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 flex-wrap justify-end">
          {!loading && user ? (
            <>
              <Link to="/" className="inline-block">
                <Button variant="ghost" size="sm">
                  Activities
                </Button>
              </Link>

              <Link to="/my-activities" className="inline-block">
                <Button variant="ghost" size="sm">
                  My activities
                </Button>
              </Link>

              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="gap-1.5">
                    <Shield className="h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              )}

              <NotificationBell />

              <Button
  variant="outline"
  size="icon"
  onClick={signOut}
  className="h-9 w-9 shrink-0"
>
  <LogOut className="h-4 w-4" />
</Button>
            </>
          ) : !loading ? (
            <Link to="/auth">
              <Button size="sm">Sign in</Button>
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col">
        <Header />

        <main className="flex-1">
          <Outlet />
        </main>

        <footer className="border-t py-6 text-center text-sm text-muted-foreground">
          Raya Activities — Student Activities Platform
        </footer>
      </div>

      <Toaster />
    </AuthProvider>
  );
}