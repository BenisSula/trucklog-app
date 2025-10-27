import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Header from '../Header';
// import { AuthProvider } from '../../contexts/AuthContext'; // Commented out to fix lint warning

// Mock the auth context
const mockUser = {
  id: 1,
  username: 'testuser',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  phone_number: '',
  license_number: '',
  company_name: '',
  is_driver: true,
  date_joined: '2023-01-01T00:00:00Z',
  last_login: '2023-01-01T00:00:00Z',
};

const mockAuthContext = {
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
  error: null,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  clearError: jest.fn(),
  refreshUser: jest.fn(),
};

// Mock the auth context
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the header with logo and title', () => {
    renderWithProviders(<Header />);
    
    expect(screen.getByText('TruckLog')).toBeInTheDocument();
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // Truck icon
  });

  it('displays user information when authenticated', () => {
    renderWithProviders(<Header />);
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('calls logout when logout button is clicked', () => {
    renderWithProviders(<Header />);
    
    const logoutButton = screen.getByTitle('Logout');
    fireEvent.click(logoutButton);
    
    expect(mockAuthContext.logout).toHaveBeenCalledTimes(1);
  });

  it('renders notification and user buttons', () => {
    renderWithProviders(<Header />);
    
    const notificationButton = screen.getByRole('button', { name: '' }); // Bell icon
    const userButton = screen.getByRole('button', { name: '' }); // User icon
    
    expect(notificationButton).toBeInTheDocument();
    expect(userButton).toBeInTheDocument();
  });
});



