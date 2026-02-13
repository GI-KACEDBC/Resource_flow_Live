// ## Error Boundary Component
// ## Catches JavaScript errors in child components and displays fallback UI
import React, { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

class ErrorBoundary extends Component {
  // ## Initialize state with no errors
  state = {
    hasError: false,
    error: null,
  };

  // ## Static method to update state when error is caught
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // ## Log error details to console for debugging
  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  // ## Render error UI or children based on error state
  render() {
    // ## If error occurred, show error message UI
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-6 text-center">
            {/* ## Error icon */}
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
            {/* ## Error heading */}
            <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
            {/* ## Display error message or default message */}
            <p className="text-slate-600 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            {/* ## Button to reset error state and navigate home */}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.href = '/';
              }}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    // ## No error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
