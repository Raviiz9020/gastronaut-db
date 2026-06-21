
import { render, screen } from '@testing-library/react';
import Header from '../header';
import { usePathname } from 'next/navigation';
import { useCustomer } from '@/context/customer-context';

// Mocks
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/context/cart-context', () => ({
  useCart: () => ({ totalItems: 0 }),
}));

jest.mock('@/context/customer-context', () => ({
  useCustomer: jest.fn(),
}));


describe('Header', () => {
  const mockUsePathname = usePathname as jest.Mock;
  const mockUseCustomer = useCustomer as jest.Mock;

  it('renders the logo and title on the menu page', () => {
    mockUsePathname.mockReturnValue('/menu');
    mockUseCustomer.mockReturnValue({ customer: null });

    render(<Header />);

    // Check for the logo and title (we'll check for the title text)
    expect(screen.getByText('Hyper Delivery')).toBeInTheDocument();
  });

  it('does not render on admin routes', () => {
    mockUsePathname.mockReturnValue('/admin/dashboard');
    mockUseCustomer.mockReturnValue({ customer: null });

    const { container } = render(<Header />);
    
    // The component should render null, so the container should be empty
    expect(container).toBeEmptyDOMElement();
  });

  it('shows login button when no customer is logged in', () => {
    mockUsePathname.mockReturnValue('/menu');
    mockUseCustomer.mockReturnValue({ customer: null });

    render(<Header />);

    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('shows user avatar and name when a customer is logged in', () => {
    mockUsePathname.mockReturnValue('/menu');
    const mockCustomer = {
      name: 'John Doe',
      imageUrl: 'https://placehold.co/40x40.png',
    };
    mockUseCustomer.mockReturnValue({ customer: mockCustomer });

    render(<Header />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    const avatarImage = screen.getByAltText('John Doe');
    expect(avatarImage).toBeInTheDocument();
  });
});
