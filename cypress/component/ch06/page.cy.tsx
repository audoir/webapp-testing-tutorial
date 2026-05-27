import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import Navbar from '../../../components/Navbar'
import { CartProvider } from '../../../context/CartContext'

// Create a minimal mock of the Next.js App Router so that components
// using useRouter / usePathname don't throw "invariant expected app router
// to be mounted" when mounted outside a full Next.js context.
const mockRouter = {
  back: () => {},
  forward: () => {},
  push: () => {},
  replace: () => {},
  refresh: () => {},
  prefetch: () => {},
  hmrRefresh: () => {},
}

function withAppRouter(component: React.ReactNode) {
  return (
    <AppRouterContext.Provider value={mockRouter as any}>
      <CartProvider>
        {component}
      </CartProvider>
    </AppRouterContext.Provider>
  )
}

describe('<Navbar />', () => {
  beforeEach(() => {
    // Stub the auth and cart API calls made by Navbar on mount
    cy.intercept('GET', '/api/auth/me', { isLoggedIn: false }).as('authMe')
    cy.intercept('GET', '/api/cart', { items: [] }).as('cart')
  })

  it('renders the brand link', () => {
    cy.mount(withAppRouter(<Navbar />))
    cy.get('a').contains('ShopNext').should('be.visible')
  })

  it('renders the Products navigation link', () => {
    cy.mount(withAppRouter(<Navbar />))
    cy.get('a').contains('Products').should('be.visible')
  })

  it('renders Sign In and Register links when logged out', () => {
    cy.mount(withAppRouter(<Navbar />))
    cy.wait('@authMe')
    cy.contains('Sign In').should('be.visible')
    cy.contains('Register').should('be.visible')
  })
})
