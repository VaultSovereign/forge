import React from 'react';

type Props = { children: React.ReactNode };
type State = { error?: Error };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('UI ErrorBoundary', { error, info });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16 }}>
          <h2>Something went wrong.</h2>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.message}</pre>
          <button onClick={() => this.setState({ error: undefined })}>Dismiss</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
