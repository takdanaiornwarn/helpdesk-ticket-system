
import { Component } from "react";

// ========================================
// GLOBAL REACT ERROR BOUNDARY
// STEP 13.7.1
// ========================================

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
    };
  }

  // Display fallback UI when rendering fails
  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  // Log technical details during development only
  componentDidCatch(error, info) {
    if (import.meta.env.DEV) {
      console.error(
        "React rendering error:",
        error,
        info.componentStack
      );
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="res-page">
          <section
            className="res-card"
            role="alert"
          >
            <div className="res-icon">
              !
            </div>

            <h1>Something went wrong</h1>

            <p>
              The application encountered an unexpected
              error while displaying this page.
            </p>

            <p className="res-muted">
              Please reload the application. If the
              problem continues, check the Browser
              Console for details.
            </p>

            <button
              type="button"
              className="res-primary-button"
              onClick={this.handleReload}
            >
              Reload Application
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
