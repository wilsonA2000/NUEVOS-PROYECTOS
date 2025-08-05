/**
 * ErrorBoundaries - Centralized exports for all error boundaries
 * Provides easy access to module-specific error boundaries
 */

// Base error boundary
export { default as ErrorBoundary } from './ErrorBoundary';

// Module-specific error boundaries
export { default as PropertiesErrorBoundary } from '../properties/PropertiesErrorBoundary';
export { default as UsersErrorBoundary } from '../users/UsersErrorBoundary';
export { default as PaymentsErrorBoundary } from '../payments/PaymentsErrorBoundary';
export { default as MessagingErrorBoundary } from '../messaging/MessagingErrorBoundary';
export { default as ContractsErrorBoundary } from '../contracts/ContractsErrorBoundary';
export { default as RatingsErrorBoundary } from '../ratings/RatingsErrorBoundary';

// Higher-order component for wrapping routes with error boundaries
import React, { ReactNode } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface WithErrorBoundaryProps {
  children: ReactNode;
  module?: string;
  fallback?: ReactNode;
}

export const withErrorBoundary = (
  WrappedComponent: React.ComponentType<any>,
  module?: string
) => {
  const WithErrorBoundaryComponent = (props: any) => (
    <ErrorBoundary module={module}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithErrorBoundaryComponent;
};

// Route-level error boundary wrapper
export const RouteErrorBoundary: React.FC<WithErrorBoundaryProps> = ({
  children,
  module,
  fallback,
}) => (
  <ErrorBoundary module={module} fallback={fallback}>
    {children}
  </ErrorBoundary>
);