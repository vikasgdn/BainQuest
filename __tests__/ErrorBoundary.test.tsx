import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ErrorBoundary } from '@/app/ErrorBoundary';
function BrokenChild(): React.JSX.Element {
  throw new Error('test failure');
}
test('contains render failures and shows recovery guidance', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      /Please close and reopen BrainQuest to continue with your saved progress\./,
    );
  } finally {
    error.mockRestore();
  }
});
