describe('Property Management', () => {
  beforeEach(() => {
    cy.loginAs('landlord')
  })

  afterEach(() => {
    // Clean up test data
    cy.cleanupTestData()
  })

  describe('Property Creation', () => {
    it('should create a new property successfully', () => {
      cy.navigateToPage('property-form')
      
      // Fill property form
      const propertyData = {
        title: `Test Property ${Date.now()}`,
        description: 'Beautiful test property with great amenities',
        address: 'Calle de Prueba 123',
        city: 'Medellín',
        rent_price: '2500000',
        sale_price: '450000000',
        bedrooms: '3',
        bathrooms: '2',
        area: '120'
      }
      
      cy.fillPropertyForm(propertyData)
      
      // Select property type
      cy.get('[data-cy=property-type-select]').click()
      cy.get('[data-value=apartment]').click()
      
      // Add amenities
      cy.get('[data-cy=amenity-parqueadero]').check()
      cy.get('[data-cy=amenity-piscina]').check()
      cy.get('[data-cy=amenity-gimnasio]').check()
      
      // Upload property images
      cy.uploadPropertyImages(3)
      
      // Set main image
      cy.get('[data-cy=image-item]').first().within(() => {
        cy.get('[data-cy=set-main-image]').click()
      })
      
      // Measure form submission performance
      const startTime = Date.now()
      
      // Submit form
      cy.get('[data-cy=save-property-button]').click()
      
      // Wait for success notification
      cy.waitForNotification('Property created successfully')
      
      // Should redirect to property list
      cy.url().should('include', '/properties')
      
      // Verify property appears in list
      cy.get('[data-cy=property-list]').should('contain', propertyData.title)
      
      // Measure total creation time
      const totalTime = Date.now() - startTime
      cy.log(`Property creation time: ${totalTime}ms`)
      expect(totalTime).to.be.lessThan(10000) // Should complete within 10 seconds
    })

    it('should validate required fields', () => {
      cy.navigateToPage('property-form')
      
      // Try to submit empty form
      cy.get('[data-cy=save-property-button]').click()
      
      // Should show validation errors
      cy.get('[data-cy=title-error]').should('be.visible')
      cy.get('[data-cy=address-error]').should('be.visible')
      cy.get('[data-cy=city-error]').should('be.visible')
      cy.get('[data-cy=rent-price-error]').should('be.visible')
      
      // Fill required fields gradually and verify errors disappear
      cy.get('[data-cy=title-input]').type('Test Property')
      cy.get('[data-cy=title-error]').should('not.exist')
      
      cy.get('[data-cy=address-input]').type('Test Address')
      cy.get('[data-cy=address-error]').should('not.exist')
    })

    it('should handle image upload errors gracefully', () => {
      cy.navigateToPage('property-form')
      cy.fillPropertyForm()
      
      // Try to upload invalid file type
      cy.get('[data-cy=image-upload]').selectFile({
        contents: Cypress.Buffer.from('not an image'),
        fileName: 'test.txt',
        mimeType: 'text/plain'
      }, { force: true })
      
      // Should show error message
      cy.get('[data-cy=upload-error]')
        .should('be.visible')
        .and('contain', 'Invalid file type')
    })

    it('should save property as draft', () => {
      cy.navigateToPage('property-form')
      
      // Fill partial form
      cy.get('[data-cy=title-input]').type('Draft Property')
      cy.get('[data-cy=address-input]').type('Draft Address')
      
      // Save as draft
      cy.get('[data-cy=save-draft-button]').click()
      
      cy.waitForNotification('Property saved as draft')
      
      // Verify draft appears in property list with draft status
      cy.navigateToPage('properties')
      cy.get('[data-cy=property-list]').should('contain', 'Draft Property')
      cy.get('[data-cy=property-status-draft]').should('be.visible')
    })
  })

  describe('Property Listing and Search', () => {
    beforeEach(() => {
      // Create test properties
      cy.createTestProperty({ title: 'Luxury Apartment Poblado', city: 'Medellín', rent_price: 3000000 })
      cy.createTestProperty({ title: 'Cozy House Envigado', city: 'Envigado', rent_price: 1500000 })
      cy.createTestProperty({ title: 'Modern Studio Sabaneta', city: 'Sabaneta', rent_price: 800000 })
    })

    it('should display property list correctly', () => {
      cy.navigateToPage('properties')
      
      // Verify property list loads
      cy.get('[data-cy=property-list]').should('be.visible')
      cy.get('[data-cy=property-card]').should('have.length.at.least', 3)
      
      // Verify property card information
      cy.get('[data-cy=property-card]').first().within(() => {
        cy.get('[data-cy=property-title]').should('be.visible')
        cy.get('[data-cy=property-price]').should('be.visible')
        cy.get('[data-cy=property-location]').should('be.visible')
        cy.get('[data-cy=property-image]').should('be.visible')
      })
    })

    it('should search properties by title', () => {
      cy.navigateToPage('properties')
      
      // Search for specific property
      cy.searchProperties('Luxury Apartment')
      
      // Should show filtered results
      cy.get('[data-cy=property-card]').should('have.length', 1)
      cy.get('[data-cy=property-card]').should('contain', 'Luxury Apartment Poblado')
    })

    it('should filter properties by price range', () => {
      cy.navigateToPage('properties')
      
      // Apply price filter
      cy.applyPropertyFilters({
        price_range: { min: 1000000, max: 2000000 }
      })
      
      // Should show properties within price range
      cy.get('[data-cy=property-card]').each(($card) => {
        cy.wrap($card).find('[data-cy=property-price]').invoke('text').then((priceText) => {
          const price = parseInt(priceText.replace(/[^0-9]/g, ''))
          expect(price).to.be.at.least(1000000)
          expect(price).to.be.at.most(2000000)
        })
      })
    })

    it('should filter properties by city', () => {
      cy.navigateToPage('properties')
      
      // Apply city filter
      cy.applyPropertyFilters({ city: 'Medellín' })
      
      // Should show only Medellín properties
      cy.get('[data-cy=property-card]').should('have.length', 1)
      cy.get('[data-cy=property-card]').should('contain', 'Medellín')
    })

    it('should handle pagination correctly', () => {
      // Create many test properties to test pagination
      for (let i = 1; i <= 15; i++) {
        cy.createTestProperty({ title: `Property ${i}` })
      }
      
      cy.navigateToPage('properties')
      
      // Should show pagination controls
      cy.get('[data-cy=pagination]').should('be.visible')
      cy.get('[data-cy=next-page]').should('be.visible')
      
      // Test pagination
      cy.get('[data-cy=next-page]').click()
      cy.url().should('include', 'page=2')
      
      // Should load new properties
      cy.get('[data-cy=property-list]').should('be.visible')
    })
  })

  describe('Property Details', () => {
    beforeEach(() => {
      cy.createTestProperty({
        title: 'Detailed Test Property',
        description: 'This is a detailed property for testing',
        amenities: ['parqueadero', 'piscina', 'gimnasio']
      })
    })

    it('should display property details correctly', () => {
      cy.navigateToPage('properties')
      
      // Click on property to view details
      cy.get('[data-cy=property-card]').first().click()
      
      // Should navigate to property detail page
      cy.url().should('include', '/properties/')
      
      // Verify property details are displayed
      cy.get('[data-cy=property-title]').should('contain', 'Detailed Test Property')
      cy.get('[data-cy=property-description]').should('be.visible')
      cy.get('[data-cy=property-price]').should('be.visible')
      cy.get('[data-cy=property-amenities]').should('be.visible')
      cy.get('[data-cy=property-images]').should('be.visible')
      
      // Test image gallery
      cy.get('[data-cy=property-image]').should('have.length.at.least', 1)
      
      // Test amenities display
      cy.get('[data-cy=amenity-item]').should('have.length.at.least', 3)
    })

    it('should allow property interest request', () => {
      cy.navigateToPage('properties')
      cy.get('[data-cy=property-card]').first().click()
      
      // Click interest button
      cy.get('[data-cy=property-interest-button]').click()
      
      // Should open interest modal
      cy.get('[data-cy=interest-modal]').should('be.visible')
      
      // Fill interest form
      cy.get('[data-cy=message-input]').type('I am interested in this property. Please contact me.')
      cy.get('[data-cy=phone-input]').type('3001234567')
      cy.get('[data-cy=employment-type-select]').select('employed')
      
      // Submit interest
      cy.get('[data-cy=submit-interest-button]').click()
      
      // Should show success message
      cy.waitForNotification('Interest request sent successfully')
      
      // Modal should close
      cy.get('[data-cy=interest-modal]').should('not.exist')
    })

    it('should display similar properties', () => {
      // Create similar properties
      cy.createTestProperty({ title: 'Similar Property 1', city: 'Medellín', rent_price: 2000000 })
      cy.createTestProperty({ title: 'Similar Property 2', city: 'Medellín', rent_price: 2200000 })
      
      cy.navigateToPage('properties')
      cy.get('[data-cy=property-card]').first().click()
      
      // Should show similar properties section
      cy.get('[data-cy=similar-properties]').should('be.visible')
      cy.get('[data-cy=similar-property-card]').should('have.length.at.least', 2)
    })
  })

  describe('Property Management (Landlord)', () => {
    beforeEach(() => {
      cy.createTestProperty({
        title: 'Landlord Property',
        description: 'Property for landlord management tests'
      })
    })

    it('should allow property editing', () => {
      cy.navigateToPage('properties')
      
      // Click edit button on property
      cy.get('[data-cy=property-card]').first().within(() => {
        cy.get('[data-cy=edit-property-button]').click()
      })
      
      // Should navigate to edit form
      cy.url().should('include', '/properties/') 
      cy.url().should('include', '/edit')
      
      // Update property information
      cy.get('[data-cy=title-input]').clear().type('Updated Property Title')
      cy.get('[data-cy=description-input]').clear().type('Updated description')
      
      // Save changes
      cy.get('[data-cy=save-property-button]').click()
      
      // Should show success message
      cy.waitForNotification('Property updated successfully')
      
      // Verify changes are reflected
      cy.navigateToPage('properties')
      cy.get('[data-cy=property-list]').should('contain', 'Updated Property Title')
    })

    it('should allow property deletion', () => {
      cy.navigateToPage('properties')
      
      // Click delete button
      cy.get('[data-cy=property-card]').first().within(() => {
        cy.get('[data-cy=delete-property-button]').click()
      })
      
      // Should show confirmation dialog
      cy.get('[data-cy=delete-confirmation-dialog]').should('be.visible')
      
      // Confirm deletion
      cy.get('[data-cy=confirm-delete-button]').click()
      
      // Should show success message
      cy.waitForNotification('Property deleted successfully')
      
      // Property should be removed from list
      cy.get('[data-cy=property-list]').should('not.contain', 'Landlord Property')
    })

    it('should toggle property active status', () => {
      cy.navigateToPage('properties')
      
      // Toggle property status
      cy.get('[data-cy=property-card]').first().within(() => {
        cy.get('[data-cy=toggle-status-button]').click()
      })
      
      // Should show confirmation
      cy.get('[data-cy=status-change-dialog]').should('be.visible')
      cy.get('[data-cy=confirm-status-change]').click()
      
      // Should update status
      cy.waitForNotification('Property status updated')
      
      // Verify status change is reflected
      cy.get('[data-cy=property-card]').first().within(() => {
        cy.get('[data-cy=property-status]').should('contain', 'Inactive')
      })
    })
  })

  describe('Property Performance', () => {
    it('should load property list within performance threshold', () => {
      cy.navigateToPage('properties')
      
      // Measure page load time
      cy.measurePageLoad(3000)
      
      // Verify all elements load correctly
      cy.get('[data-cy=property-list]').should('be.visible')
      cy.get('[data-cy=search-input]').should('be.visible')
      cy.get('[data-cy=filters-button]').should('be.visible')
    })

    it('should handle search performance', () => {
      cy.navigateToPage('properties')
      
      // Measure search response time
      const startTime = Date.now()
      cy.searchProperties('test')
      
      cy.get('[data-cy=loading-spinner]').should('not.exist')
      
      cy.then(() => {
        const searchTime = Date.now() - startTime
        cy.log(`Search time: ${searchTime}ms`)
        expect(searchTime).to.be.lessThan(2000) // Should complete within 2 seconds
      })
    })
  })
})