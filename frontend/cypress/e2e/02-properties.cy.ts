describe('Properties Management', () => {
  const testLandlord = Cypress.env('testLandlord');
  const testTenant = Cypress.env('testTenant');

  beforeEach(() => {
    // Setup API interceptors
    cy.intercept('GET', '**/properties/**', { fixture: 'properties.json' }).as('getProperties');
    cy.intercept('POST', '**/properties/', {
      statusCode: 201,
      body: {
        id: 999,
        title: 'Test Property',
        status: 'available'
      }
    }).as('createProperty');
  });

  describe('Property Listing Page', () => {
    beforeEach(() => {
      cy.login(testTenant.email, testTenant.password);
      cy.visit('/app/properties');
    });

    it('should display properties list correctly', () => {
      cy.wait('@getProperties');
      cy.get('[data-testid="properties-list"]').should('be.visible');
      cy.get('[data-testid="property-card"]').should('have.length.at.least', 1);
      
      // Check property card content
      cy.get('[data-testid="property-card"]').first().within(() => {
        cy.get('[data-testid="property-title"]').should('be.visible');
        cy.get('[data-testid="property-price"]').should('be.visible');
        cy.get('[data-testid="property-location"]').should('be.visible');
        cy.get('[data-testid="property-type"]').should('be.visible');
      });
    });

    it('should filter properties by location', () => {
      cy.wait('@getProperties');
      
      cy.get('[data-testid="city-filter"]').type('Bogotá');
      cy.get('[data-testid="apply-filters"]').click();
      
      cy.get('[data-testid="property-card"]').should('contain', 'Bogotá');
    });

    it('should filter properties by price range', () => {
      cy.wait('@getProperties');
      
      cy.get('[data-testid="min-price-filter"]').type('1000000');
      cy.get('[data-testid="max-price-filter"]').type('2000000');
      cy.get('[data-testid="apply-filters"]').click();
      
      // Verify filtered results
      cy.get('[data-testid="property-card"]').should('have.length.at.least', 1);
    });

    it('should filter properties by type', () => {
      cy.wait('@getProperties');
      
      cy.get('[data-testid="property-type-filter"]').select('apartment');
      cy.get('[data-testid="apply-filters"]').click();
      
      cy.get('[data-testid="property-card"]').should('contain', 'Apartamento');
    });

    it('should show property details on click', () => {
      cy.wait('@getProperties');
      
      cy.intercept('GET', '**/properties/1/', { fixture: 'properties.json' }).as('getPropertyDetail');
      
      cy.get('[data-testid="property-card"]').first().click();
      
      cy.wait('@getPropertyDetail');
      cy.url().should('include', '/properties/1');
    });

    it('should handle search functionality', () => {
      cy.wait('@getProperties');
      
      cy.get('[data-testid="search-input"]').type('Zona Rosa');
      cy.get('[data-testid="search-button"]').click();
      
      cy.get('[data-testid="property-card"]').should('contain', 'Zona Rosa');
    });

    it('should handle pagination', () => {
      cy.wait('@getProperties');
      
      // Mock paginated response
      cy.intercept('GET', '**/properties/?page=2', {
        body: {
          results: [],
          count: 2,
          next: null,
          previous: '**/properties/?page=1'
        }
      }).as('getPropertiesPage2');
      
      cy.get('[data-testid="pagination-next"]').click();
      cy.wait('@getPropertiesPage2');
    });
  });

  describe('Property Detail Page', () => {
    beforeEach(() => {
      cy.login(testTenant.email, testTenant.password);
      cy.intercept('GET', '**/properties/1/', { fixture: 'properties.json' }).as('getPropertyDetail');
      cy.visit('/app/properties/1');
    });

    it('should display property details correctly', () => {
      cy.wait('@getPropertyDetail');
      
      cy.get('[data-testid="property-title"]').should('be.visible');
      cy.get('[data-testid="property-description"]').should('be.visible');
      cy.get('[data-testid="property-price"]').should('be.visible');
      cy.get('[data-testid="property-features"]').should('be.visible');
      cy.get('[data-testid="property-location"]').should('be.visible');
      cy.get('[data-testid="property-images"]').should('be.visible');
    });

    it('should show contact landlord button for tenants', () => {
      cy.wait('@getPropertyDetail');
      cy.get('[data-testid="contact-landlord"]').should('be.visible');
    });

    it('should handle image gallery', () => {
      cy.wait('@getPropertyDetail');
      
      cy.get('[data-testid="property-images"]').within(() => {
        cy.get('img').should('have.length.at.least', 1);
        cy.get('[data-testid="image-thumbnail"]').first().click();
        cy.get('[data-testid="image-modal"]').should('be.visible');
      });
    });

    it('should allow favoriting a property', () => {
      cy.intercept('POST', '**/properties/1/toggle-favorite/', {
        statusCode: 200,
        body: { favorited: true }
      }).as('toggleFavorite');
      
      cy.wait('@getPropertyDetail');
      cy.get('[data-testid="favorite-button"]').click();
      
      cy.wait('@toggleFavorite');
      cy.get('[data-testid="favorite-button"]').should('have.class', 'favorited');
    });
  });

  describe('Property Creation (Landlord)', () => {
    beforeEach(() => {
      cy.login(testLandlord.email, testLandlord.password);
      cy.visit('/app/properties/new');
    });

    it('should display property creation form', () => {
      cy.get('h1, h2').should('contain', 'Crear');
      cy.get('input[name="title"]').should('be.visible');
      cy.get('textarea[name="description"]').should('be.visible');
      cy.get('[data-testid="property-type-select"]').should('be.visible');
      cy.get('[data-testid="listing-type-select"]').should('be.visible');
      cy.get('input[name="total_area"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should validate required fields', () => {
      cy.get('button[type="submit"]').click();
      
      // Should show validation errors
      cy.get('[role="alert"], .error').should('be.visible');
    });

    it('should create property successfully', () => {
      const propertyData = {
        title: 'Test Apartment E2E',
        description: 'Beautiful test apartment for E2E testing',
        propertyType: 'Apartamento',
        listingType: 'Renta',
        address: 'Calle Test 123',
        city: 'Bogotá',
        area: 85,
        bedrooms: 2,
        bathrooms: 2,
        price: 1500000
      };

      cy.fillPropertyForm(propertyData);
      cy.get('button[type="submit"]').click();
      
      cy.wait('@createProperty');
      
      // Should show success message or redirect
      cy.get('[data-testid="success-modal"], [role="alert"]').should('contain', 'éxito');
    });

    it('should handle image upload', () => {
      // Mock file upload
      const fileName = 'test-image.jpg';
      cy.fixture(fileName, 'base64').then(fileContent => {
        cy.get('input[type="file"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName,
          mimeType: 'image/jpeg'
        }, { force: true });
      });
      
      cy.get('[data-testid="image-preview"]').should('be.visible');
    });

    it('should handle video upload', () => {
      cy.get('[data-testid="video-mode-file"]').click();
      
      // Mock video file
      const fileName = 'test-video.mp4';
      cy.fixture(fileName, 'base64').then(fileContent => {
        cy.get('input[type="file"][accept*="video"]').selectFile({
          contents: Cypress.Buffer.from(fileContent, 'base64'),
          fileName,
          mimeType: 'video/mp4'
        }, { force: true });
      });
    });

    it('should handle YouTube URL', () => {
      cy.get('[data-testid="video-mode-url"]').click();
      cy.get('input[name="video_url"]').type('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      
      cy.get('[data-testid="video-preview"]').should('be.visible');
    });

    it('should handle location selection', () => {
      cy.get('input[name="address"]').type('Zona Rosa, Bogotá');
      
      // Mock address suggestions
      cy.intercept('GET', '**/geocoding/**', {
        body: {
          features: [{
            place_name: 'Zona Rosa, Bogotá, Colombia',
            center: [-74.0721, 4.6667]
          }]
        }
      }).as('getAddressSuggestions');
      
      cy.wait(500); // Wait for debounce
      cy.wait('@getAddressSuggestions');
      
      cy.get('[data-testid="address-suggestion"]').first().click();
      cy.get('[data-testid="capture-location"]').click();
      
      cy.get('[data-testid="location-captured"]').should('be.visible');
    });

    it('should handle form errors gracefully', () => {
      cy.intercept('POST', '**/properties/', {
        statusCode: 400,
        body: { 
          title: ['This field is required'],
          total_area: ['This field is required']
        }
      }).as('createPropertyError');
      
      cy.get('button[type="submit"]').click();
      
      cy.wait('@createPropertyError');
      cy.get('[role="alert"]').should('contain', 'required');
    });
  });

  describe('Property Management (Landlord)', () => {
    beforeEach(() => {
      cy.login(testLandlord.email, testLandlord.password);
      cy.visit('/app/properties/my-properties');
    });

    it('should display landlord properties', () => {
      cy.intercept('GET', '**/properties/my-properties/', { fixture: 'properties.json' }).as('getMyProperties');
      
      cy.wait('@getMyProperties');
      cy.get('[data-testid="property-card"]').should('have.length.at.least', 1);
    });

    it('should allow editing properties', () => {
      cy.intercept('GET', '**/properties/my-properties/', { fixture: 'properties.json' }).as('getMyProperties');
      cy.intercept('GET', '**/properties/1/', { fixture: 'properties.json' }).as('getPropertyDetail');
      cy.intercept('PUT', '**/properties/1/', {
        statusCode: 200,
        body: { id: 1, title: 'Updated Property' }
      }).as('updateProperty');
      
      cy.wait('@getMyProperties');
      cy.get('[data-testid="edit-property"]').first().click();
      
      cy.wait('@getPropertyDetail');
      cy.get('input[name="title"]').clear().type('Updated Property Title');
      cy.get('button[type="submit"]').click();
      
      cy.wait('@updateProperty');
      cy.get('[role="alert"]').should('contain', 'actualizada');
    });

    it('should allow deleting properties', () => {
      cy.intercept('GET', '**/properties/my-properties/', { fixture: 'properties.json' }).as('getMyProperties');
      cy.intercept('DELETE', '**/properties/1/', { statusCode: 204 }).as('deleteProperty');
      
      cy.wait('@getMyProperties');
      cy.get('[data-testid="delete-property"]').first().click();
      
      // Confirm deletion
      cy.get('[data-testid="confirm-delete"]').click();
      
      cy.wait('@deleteProperty');
      cy.get('[role="alert"]').should('contain', 'eliminada');
    });

    it('should change property status', () => {
      cy.intercept('GET', '**/properties/my-properties/', { fixture: 'properties.json' }).as('getMyProperties');
      cy.intercept('PATCH', '**/properties/1/', {
        statusCode: 200,
        body: { id: 1, status: 'rented' }
      }).as('updatePropertyStatus');
      
      cy.wait('@getMyProperties');
      cy.get('[data-testid="property-status-select"]').first().select('rented');
      
      cy.wait('@updatePropertyStatus');
      cy.get('[role="alert"]').should('contain', 'actualizada');
    });
  });

  describe('Responsive Design', () => {
    beforeEach(() => {
      cy.login();
    });

    it('should work on mobile devices', () => {
      cy.viewport('iphone-6');
      cy.visit('/app/properties');
      
      cy.wait('@getProperties');
      cy.get('[data-testid="mobile-menu"]').should('be.visible');
      cy.get('[data-testid="properties-list"]').should('be.visible');
    });

    it('should work on tablet devices', () => {
      cy.viewport('ipad-2');
      cy.visit('/app/properties');
      
      cy.wait('@getProperties');
      cy.get('[data-testid="properties-list"]').should('be.visible');
    });
  });
});