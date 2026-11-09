
import { useEffect, useState } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ErrorBoundary from "./components/ErrorBoundary";

import {
  loginUser,
  getCurrentUser,
} from "./services/api";

import "./App.css";
import "./styles/Resilience.css";

// ========================================
// SESSION KEY
// ========================================

const TOKEN_KEY = "helpdesk_token";

// ========================================
// NETWORK STATUS BANNER
// ========================================

function NetworkBanner() {
  const [isOnline, setIsOnline] = useState(
    () => navigator.onLine
  );

  useEffect(() => {
    function updateNetworkStatus() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener(
      "online",
      updateNetworkStatus
    );

    window.addEventListener(
      "offline",
      updateNetworkStatus
    );

    return () => {
      window.removeEventListener(
        "online",
        updateNetworkStatus
      );

      window.removeEventListener(
        "offline",
        updateNetworkStatus
      );
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div
      className="res-offline-banner"
      role="status"
    >
      You are offline. Please check your internet
      connection.
    </div>
  );
}

// ========================================
// MAIN APPLICATION
// ========================================

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  const [initializing, setInitializing] = useState(true);
  const [restoreAttempt, setRestoreAttempt] = useState(0);

  const [connectionError, setConnectionError] =
    useState("");

  const [authMessage, setAuthMessage] = useState("");

  // ========================================
  // GLOBAL SESSION EXPIRATION EVENT
  // ========================================

  useEffect(() => {
    function handleSessionExpired() {
      sessionStorage.removeItem(TOKEN_KEY);

      setUser(null);
      setToken(null);

      setInitializing(false);
      setConnectionError("");

      setAuthMessage(
        "Your session has expired. Please log in again."
      );
    }

    window.addEventListener(
      "helpdesk:session-expired",
      handleSessionExpired
    );

    return () => {
      window.removeEventListener(
        "helpdesk:session-expired",
        handleSessionExpired
      );
    };
  }, []);

  // ========================================
  // RESTORE LOGIN SESSION
  // ========================================

  useEffect(() => {
    let active = true;

    async function checkAuthentication() {
      const savedToken =
        sessionStorage.getItem(TOKEN_KEY);

      if (!savedToken) {
        if (active) {
          setInitializing(false);
        }

        return;
      }

      try {
        const currentUser =
          await getCurrentUser(savedToken);

        if (active) {
          setUser(currentUser);
          setToken(savedToken);
          setConnectionError("");
          setAuthMessage("");
        }
      } catch (error) {
        if (!active) return;

        if (
          error.status === 401 ||
          error.status === 403
        ) {
          // Token rejected by Backend
          sessionStorage.removeItem(TOKEN_KEY);

          setUser(null);
          setToken(null);
          setConnectionError("");

          setAuthMessage(
            "Your session has expired. Please log in again."
          );
        } else {
          // Backend unavailable: keep the token
          // so the user can retry without losing it.
          setConnectionError(
            error.message ||
              "Unable to connect to the Backend."
          );
        }
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    }

    checkAuthentication();

    return () => {
      active = false;
    };
  }, [restoreAttempt]);

  // ========================================
  // LOGIN
  // ========================================

  async function handleLogin({ email, password }) {
    // 1. Request JWT
    const loginResult = await loginUser(
      email,
      password
    );

    // 2. Verify the JWT with the Backend
    const currentUser = await getCurrentUser(
      loginResult.token
    );

    // 3. Save token for this browser session
    sessionStorage.setItem(
      TOKEN_KEY,
      loginResult.token
    );

    // 4. Update application state
    setToken(loginResult.token);
    setUser(currentUser);

    setAuthMessage("");
    setConnectionError("");
  }

  // ========================================
  // LOGOUT
  // ========================================

  function handleLogout() {
    sessionStorage.removeItem(TOKEN_KEY);

    setToken(null);
    setUser(null);

    setAuthMessage("");
    setConnectionError("");
  }

  // ========================================
  // RETRY BACKEND CONNECTION
  // ========================================

  function handleRetryConnection() {
    setConnectionError("");
    setInitializing(true);

    setRestoreAttempt((value) => value + 1);
  }

  // ========================================
  // RETURN TO LOGIN
  // ========================================

  function handleReturnToLogin() {
    sessionStorage.removeItem(TOKEN_KEY);

    setToken(null);
    setUser(null);

    setInitializing(false);
    setConnectionError("");
    setAuthMessage("");
  }

  // ========================================
  // SELECT CURRENT SCREEN
  // ========================================

  let content;

  if (initializing) {
    content = (
      <main className="res-page">
        <section
          className="res-card"
          role="status"
        >
          <div className="res-spinner" />

          <h1>Checking authentication</h1>

          <p>
            Verifying your login session...
          </p>
        </section>
      </main>
    );
  } else if (connectionError) {
    content = (
      <main className="res-page">
        <section className="res-card" role="alert">
          <div className="res-icon">!</div>

          <h1>Connection Problem</h1>

          <p>
            The application cannot verify your
            session with the Backend.
          </p>

          <div className="res-error-message">
            {connectionError}
          </div>

          <div className="res-button-row">
            <button
              type="button"
              className="res-primary-button"
              onClick={handleRetryConnection}
            >
              Try Again
            </button>

            <button
              type="button"
              className="res-secondary-button"
              onClick={handleReturnToLogin}
            >
              Go to Login
            </button>
          </div>
        </section>
      </main>
    );
  } else if (!user || !token) {
    content = (
      <>
        <Login onLogin={handleLogin} />

        {authMessage && (
          <div
            className="res-auth-notice"
            role="alert"
          >
            {authMessage}
          </div>
        )}
      </>
    );
  } else {
    content = (
      <Dashboard
        user={user}
        token={token}
        onLogout={handleLogout}
      />
    );
  }

  // ========================================
  // RENDER WITH ERROR BOUNDARY
  // ========================================

  return (
    <ErrorBoundary key={user?.id ?? "guest"}>
      <NetworkBanner />
      {content}
    </ErrorBoundary>
  );
}

export default App;
