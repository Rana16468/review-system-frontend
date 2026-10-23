'use client';

import { Provider } from 'react-redux';
;
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { store } from './redux/store';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </Provider>
  );
}