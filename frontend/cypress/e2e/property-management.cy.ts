describe('Property Management', () => {
  beforeEach(() => {
    // Setup authenticated user
    cy.window().then((win) => {
      win.localStorage.setItem('token', 'mock-token');
    });

    cy.intercept('GET', '/api/v1/auth/me/', {
      fixture: 'user.json',
    }).as('getCurrentUser');

    cy.intercept('GET', '/api/v1/properties/**', {
      fixture: 'properties.json',
    }).as('getProperties');
  });

  describe('Property Listing', () => {
    it('should display properties list', () => {
      cy.visit('/properties');
      cy.wait('@getCurrentUser');
      cy.wait('@getProperties');

      // Verify properties are displayed
      cy.get('[data-testid="property-card"]').should('have.length.at.least', 1);
      cy.contains('Apartamento en el centro').should('be.visible');
      cy.contains('Casa amplia en zona residencial').should('be.visible');
    });

    it('should search properties', () => {
      cy.intercept('GET', '/api/v1/properties/**', (req) => {
        if (req.query.search === 'apartamento') {
          req.reply({
            statusCode: 200,
            body: {
              results: [
                {
                  id: 1,
                  title: 'Apartamento en el centro',
                  description: 'Hermoso apartamento con vista al parque',
                  property_type: 'apartment',
                  price: 2500000,
                  bedrooms: 3,
                  bathrooms: 2,
                  area: 120,
                  is_available: true,
                  city: 'Bogotá',
                  state: 'Cundinamarca',
                  country: 'Colombia',
                },
              ],
              count: 1,
              next: null,
              previous: null,
            },
          });
        }
      }).as('searchProperties');

      cy.visit('/properties');
      cy.wait('@getCurrentUser');
      cy.wait('@getProperties');

      cy.searchProperties('apartamento');
      cy.wait('@searchProperties');

      // Verify search results
      cy.get('[data-testid="property-card"]').should('have.length', 1);
      cy.contains('Apartamento en el centro').should('be.visible');
    });

    it('should filter properties by type', () => {
      cy.intercept('GET', '/api/v1/properties/**', (req) => {
        if (req.query.property_type === 'apartment') {
          req.reply({
            statusCode: 200,
            body: {
              results: [
                {
                  id: 1,
                  title: 'Apartamento en el centro',
                  property_type: 'apartment',
                  price: 2500000,
                },
              ],
              count: 1,
            },
          });
        }
      }).as('filterProperties');

      cy.visit('/properties');
      cy.wait('@getCurrentUser');
      cy.wait('@getProperties');

      // Apply filter
      cy.get('[data-testid="property-type-filter"]').select('apartment');
      cy.get('[data-testid="apply-filters-button"]').click();

      cy.wait('@filterProperties');

      // Verify filtered results
      cy.get('[data-testid="property-card"]').should('have.length', 1);
      cy.contains('Apartamento en el centro').should('be.visible');
    });

    it('should filter properties by price range', () => {
      cy.intercept('GET', '/api/v1/properties/**', (req) => {
        if (req.query.min_price && req.query.max_price) {
          req.reply({
            statusCode: 200,
            body: {
              results: [
                {
                  id: 1,
                  title: 'Apartamento en el centro',
                  price: 2500000,
                },
              ],
              count: 1,
            },
          });
        }
      }).as('filterByPrice');

      cy.visit('/properties');
      cy.wait('@getCurrentUser');
      cy.wait('@getProperties');

      // Set price range
      cy.get('[data-testid="min-price-input"]').clear().type('2000000');
      cy.get('[data-testid="max-price-input"]').clear().type('3000000');
      cy.get('[data-testid="apply-filters-button"]').click();

      cy.wait('@filterByPrice');

      // Verify results
      cy.get('[data-testid="property-card"]').should('have.length', 1);
    });

    it('should toggle between grid and list view', () => {
      cy.visit('/properties');
      cy.wait('@getCurrentUser');
      cy.wait('@getProperties');

      // Should start in grid view
      cy.get('[data-testid="property-grid"]').should('be.visible');

      // Switch to list view
      cy.get('[data-testid="list-view-button"]').click();
      cy.get('[data-testid="property-list"]').should('be.visible');
      cy.get('[data-testid="property-grid"]').should('not.exist');

      // Switch back to grid view
      cy.get('[data-testid="grid-view-button"]').click();
      cy.get('[data-testid="property-grid"]').should('be.visible');
    });

    it('should show property map', () => {
      cy.visit('/properties');
      cy.wait('@getCurrentUser');
      cy.wait('@getProperties');

      // Toggle map view
      cy.get('[data-testid="toggle-map-button"]').click();
      cy.get('[data-testid="property-map"]').should('be.visible');

      // Hide map
      cy.get('[data-testid="toggle-map-button"]').click();
      cy.get('[data-testid="property-map"]').should('not.exist');
    });

    it('should handle pagination', () => {
      // Mock paginated response
      cy.intercept('GET', '/api/v1/properties/**', (req) => {
        const page = req.query.page || 1;
        if (page === '1') {
          req.reply({
            statusCode: 200,
            body: {
              results: [{ id: 1, title: 'Property 1' }],
              count: 20,
              next: '/api/v1/properties/?page=2',
              previous: null,
            },
          });
        } else if (page === '2') {
          req.reply({
            statusCode: 200,
            body: {
              results: [{ id: 2, title: 'Property 2' }],
              count: 20,
              next: null,
              previous: '/api/v1/properties/?page=1',
            },
          });
        }
      }).as('getPaginatedProperties');

      cy.visit('/properties');
      cy.wait('@getCurrentUser');
      cy.wait('@getPaginatedProperties');

      // Should show pagination info
      cy.contains('Mostrando 1-1 de 20').should('be.visible');

      // Go to next page
      cy.get('[data-testid="next-page-button"]').click();
      cy.wait('@getPaginatedProperties');

      // Verify page 2 content
      cy.contains('Property 2').should('be.visible');
    });
  });

  describe('Property Details', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/v1/properties/1/', {
        statusCode: 200,
        body: {
          id: 1,
          title: 'Apartamento en el centro',
          description: 'Hermoso apartamento con vista al parque en zona privilegiada',
          property_type: 'apartment',
          address: 'Calle 123 #45-67',
          city: 'Bogotá',
          state: 'Cundinamarca',
          country: 'Colombia',
          postal_code: '110111',
          price: 2500000,
          bedrooms: 3,
          bathrooms: 2,
          area: 120,
          is_available: true,
          images: [
            { id: 1, image: '/media/property1.jpg', is_primary: true },
            { id: 2, image: '/media/property1_2.jpg', is_primary: false },
          ],
          latitude: 4.5709,
          longitude: -74.2973,
          landlord: {
            id: 1,
            first_name: 'Juan',
            last_name: 'Pérez',
            email: 'juan@example.com',
          },
          amenities: ['Parqueadero', 'Gimnasio', 'Piscina'],
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
        },
      }).as('getPropertyDetail');
    });

    it('should display property details', () => {
      cy.visit('/properties/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getPropertyDetail');

      // Verify property information
      cy.contains('Apartamento en el centro').should('be.visible');
      cy.contains('$2,500,000 COP/mes').should('be.visible');
      cy.contains('3 habitaciones').should('be.visible');
      cy.contains('2 baños').should('be.visible');
      cy.contains('120 m²').should('be.visible');
      cy.contains('Bogotá, Cundinamarca').should('be.visible');

      // Verify description
      cy.contains('Hermoso apartamento con vista al parque').should('be.visible');

      // Verify amenities
      cy.contains('Parqueadero').should('be.visible');
      cy.contains('Gimnasio').should('be.visible');
      cy.contains('Piscina').should('be.visible');
    });

    it('should show property images gallery', () => {
      cy.visit('/properties/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getPropertyDetail');

      // Verify image gallery
      cy.get('[data-testid="property-image-gallery"]').should('be.visible');
      cy.get('[data-testid="property-image"]').should('have.length.at.least', 1);

      // Test image navigation if multiple images
      cy.get('[data-testid="next-image-button"]').should('be.visible');
      cy.get('[data-testid="prev-image-button"]').should('be.visible');
    });

    it('should show property location on map', () => {
      cy.visit('/properties/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getPropertyDetail');

      // Verify map is displayed
      cy.get('[data-testid="property-location-map"]').should('be.visible');
    });

    it('should allow contacting landlord', () => {
      cy.intercept('POST', '/api/v1/messages/', {
        statusCode: 201,
        body: {
          id: 1,
          subject: 'Consulta sobre propiedad',
          content: 'Estoy interesado en esta propiedad',
        },
      }).as('sendMessage');

      cy.visit('/properties/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getPropertyDetail');

      // Click contact landlord button
      cy.get('[data-testid="contact-landlord-button"]').click();

      // Fill contact form
      cy.get('[data-testid="contact-subject-input"]').type('Consulta sobre propiedad');
      cy.get('[data-testid="contact-message-input"]').type('Estoy interesado en esta propiedad. ¿Podríamos programar una visita?');
      cy.get('[data-testid="send-message-button"]').click();

      cy.wait('@sendMessage');

      // Verify success message
      cy.contains('Mensaje enviado exitosamente').should('be.visible');
    });

    it('should toggle favorite status', () => {
      cy.intercept('POST', '/api/v1/properties/1/toggle-favorite/', {
        statusCode: 200,
        body: { is_favorite: true },
      }).as('toggleFavorite');

      cy.visit('/properties/1');
      cy.wait('@getCurrentUser');
      cy.wait('@getPropertyDetail');

      // Toggle favorite
      cy.get('[data-testid="favorite-button"]').click();
      cy.wait('@toggleFavorite');

      // Verify success message
      cy.contains('Agregado a favoritos').should('be.visible');
    });

    it('should handle property not found', () => {
      cy.intercept('GET', '/api/v1/properties/999/', {
        statusCode: 404,
        body: {
          detail: 'Propiedad no encontrada',
        },
      }).as('getPropertyNotFound');

      cy.visit('/properties/999');
      cy.wait('@getCurrentUser');
      cy.wait('@getPropertyNotFound');

      // Verify error message
      cy.contains('Propiedad no encontrada').should('be.visible');
    });
  });

  describe('Property Creation (Landlord)', () => {
    beforeEach(() => {
      // Mock landlord user
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: {
          id: 1,
          email: 'landlord@verihome.com',
          user_type: 'landlord',
          first_name: 'Landlord',
          last_name: 'User',
        },
      }).as('getLandlordUser');
    });

    it('should create a new property', () => {
      cy.intercept('POST', '/api/v1/properties/', {
        statusCode: 201,
        body: {
          id: 3,
          title: 'Nueva Propiedad',
          description: 'Propiedad creada por test',
          property_type: 'apartment',
          price: 2000000,
          bedrooms: 2,
          bathrooms: 1,
          area: 80,
          city: 'Cali',
        },
      }).as('createProperty');

      cy.visit('/properties/new');
      cy.wait('@getLandlordUser');

      const propertyData = {
        title: 'Nueva Propiedad',
        description: 'Una nueva propiedad para alquilar',
        property_type: 'apartment',
        address: 'Calle Nueva 456',
        city: 'Cali',
        state: 'Valle del Cauca',
        country: 'Colombia',
        price: 2000000,
        bedrooms: 2,
        bathrooms: 1,
        area: 80,
      };

      cy.fillPropertyForm(propertyData);
      cy.get('[data-testid="create-property-button"]').click();

      cy.wait('@createProperty');

      // Verify success and redirect
      cy.contains('Propiedad creada exitosamente').should('be.visible');
      cy.url().should('include', '/properties/3');
    });

    it('should validate required fields in property form', () => {
      cy.visit('/properties/new');
      cy.wait('@getLandlordUser');

      // Try to submit empty form
      cy.get('[data-testid="create-property-button"]').click();

      // Verify validation messages
      cy.contains('Título es requerido').should('be.visible');
      cy.contains('Descripción es requerida').should('be.visible');
      cy.contains('Dirección es requerida').should('be.visible');
      cy.contains('Precio es requerido').should('be.visible');
    });

    it('should upload property images', () => {
      cy.intercept('POST', '/api/v1/properties/*/upload-images/', {
        statusCode: 200,
        body: {
          images: [
            { id: 1, image: '/media/uploaded1.jpg', is_primary: true },
          ],
        },
      }).as('uploadImages');

      cy.visit('/properties/new');
      cy.wait('@getLandlordUser');

      // Fill basic form
      cy.get('[data-testid="property-title-input"]').type('Test Property');
      cy.get('[data-testid="property-description-input"]').type('Test Description');

      // Upload images
      cy.get('[data-testid="image-upload-input"]').selectFile('cypress/fixtures/test-image.jpg');
      
      // Wait for preview
      cy.get('[data-testid="image-preview"]').should('be.visible');
    });
  });

  describe('Property Management (Landlord)', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/v1/auth/me/', {
        statusCode: 200,
        body: {
          id: 1,
          email: 'landlord@verihome.com',
          user_type: 'landlord',
          first_name: 'Landlord',
          last_name: 'User',
        },
      }).as('getLandlordUser');

      cy.intercept('GET', '/api/v1/properties/my-properties/', {
        statusCode: 200,
        fixture: 'properties.json',
      }).as('getMyProperties');
    });

    it('should display landlord properties', () => {
      cy.visit('/my-properties');
      cy.wait('@getLandlordUser');
      cy.wait('@getMyProperties');

      // Verify properties are displayed
      cy.get('[data-testid="my-property-card"]').should('have.length.at.least', 1);
      cy.contains('Apartamento en el centro').should('be.visible');
    });

    it('should edit property', () => {
      cy.intercept('PUT', '/api/v1/properties/1/', {
        statusCode: 200,
        body: {
          id: 1,
          title: 'Apartamento Actualizado',
          price: 2800000,
        },
      }).as('updateProperty');

      cy.visit('/my-properties');
      cy.wait('@getLandlordUser');
      cy.wait('@getMyProperties');

      // Click edit button
      cy.get('[data-testid="edit-property-1"]').click();

      // Update property
      cy.get('[data-testid="property-title-input"]')
        .clear()
        .type('Apartamento Actualizado');
      cy.get('[data-testid="property-price-input"]')
        .clear()
        .type('2800000');

      cy.get('[data-testid="save-property-button"]').click();

      cy.wait('@updateProperty');
      cy.contains('Propiedad actualizada exitosamente').should('be.visible');
    });

    it('should delete property with confirmation', () => {
      cy.intercept('DELETE', '/api/v1/properties/1/', {
        statusCode: 204,
        body: {},
      }).as('deleteProperty');

      cy.visit('/my-properties');
      cy.wait('@getLandlordUser');
      cy.wait('@getMyProperties');

      // Click delete button
      cy.get('[data-testid="delete-property-1"]').click();

      // Confirm deletion
      cy.get('[data-testid="confirm-delete-button"]').click();

      cy.wait('@deleteProperty');
      cy.contains('Propiedad eliminada exitosamente').should('be.visible');
    });

    it('should toggle property availability', () => {
      cy.intercept('PATCH', '/api/v1/properties/1/toggle-availability/', {
        statusCode: 200,
        body: { is_available: false },
      }).as('toggleAvailability');

      cy.visit('/my-properties');
      cy.wait('@getLandlordUser');
      cy.wait('@getMyProperties');

      // Toggle availability
      cy.get('[data-testid="toggle-availability-1"]').click();

      cy.wait('@toggleAvailability');
      cy.contains('Disponibilidad actualizada').should('be.visible');
    });
  });

  describe('Favorites', () => {
    beforeEach(() => {
      cy.intercept('GET', '/api/v1/properties/favorites/', {
        statusCode: 200,
        fixture: 'properties.json',
      }).as('getFavorites');
    });

    it('should display user favorites', () => {
      cy.visit('/favorites');
      cy.wait('@getCurrentUser');
      cy.wait('@getFavorites');

      // Verify favorites are displayed
      cy.get('[data-testid="favorite-property-card"]').should('have.length.at.least', 1);
      cy.contains('Apartamento en el centro').should('be.visible');
    });

    it('should remove property from favorites', () => {
      cy.intercept('POST', '/api/v1/properties/1/toggle-favorite/', {
        statusCode: 200,
        body: { is_favorite: false },
      }).as('removeFavorite');

      cy.visit('/favorites');
      cy.wait('@getCurrentUser');
      cy.wait('@getFavorites');

      // Remove from favorites
      cy.get('[data-testid="remove-favorite-1"]').click();

      cy.wait('@removeFavorite');
      cy.contains('Removido de favoritos').should('be.visible');
    });
  });
});