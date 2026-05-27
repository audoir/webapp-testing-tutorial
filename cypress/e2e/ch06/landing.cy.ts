describe('Landing page', () => {
  it('has a Product Catalog heading', () => {
    cy.visit('/')
    cy.get('h1').contains('Product Catalog')
  })

  it('displays product cards', () => {
    cy.visit('/')
    // Wait for products to load (the loading state disappears)
    cy.contains('Loading products...').should('not.exist')
    // At least one product card should be visible
    cy.get('[data-testid^="add-to-cart-"]').should('have.length.greaterThan', 0)
  })

  it('shows Sign in to Buy button when not logged in', () => {
    cy.visit('/')
    cy.contains('Loading products...').should('not.exist')
    cy.contains('Sign in to Buy').should('be.visible')
  })
})
