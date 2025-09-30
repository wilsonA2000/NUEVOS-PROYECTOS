describe('Contract Management Flow', () => {
  beforeEach(() => {
    cy.loginAs('landlord')
    
    // Create test property for contract creation
    cy.createTestProperty({
      title: 'Contract Test Property',
      rent_price: 2000000
    })
  })

  afterEach(() => {
    cy.cleanupTestData()
  })

  describe('Contract Creation', () => {
    it('should create a new rental contract', () => {
      cy.navigateToPage('contracts')
      
      // Start new contract
      cy.get('[data-cy=new-contract-button]').click()
      
      // Fill contract form
      cy.get('[data-cy=contract-title-input]').type('Test Rental Contract')
      cy.get('[data-cy=contract-type-select]').select('rental_urban')
      
      // Select property
      cy.get('[data-cy=property-select]').select('Contract Test Property')
      
      // Select tenant
      cy.get('[data-cy=tenant-select]').select('tenant@test.com')
      
      // Set contract dates
      const startDate = new Date()
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year later
      
      cy.get('[data-cy=start-date-input]').type(startDate.toISOString().split('T')[0])
      cy.get('[data-cy=end-date-input]').type(endDate.toISOString().split('T')[0])
      
      // Set financial terms
      cy.get('[data-cy=monthly-rent-input]').clear().type('2000000')
      cy.get('[data-cy=security-deposit-input]').clear().type('2000000')
      cy.get('[data-cy=late-fee-input]').clear().type('100000')
      
      // Add contract description
      cy.get('[data-cy=contract-description-textarea]').type(
        'Standard urban rental contract with all amenities included'
      )
      
      // Save contract
      cy.get('[data-cy=save-contract-button]').click()
      
      // Should show success message
      cy.waitForNotification('Contract created successfully')
      
      // Should redirect to contract list
      cy.url().should('include', '/contracts')
      
      // Verify contract appears in list
      cy.get('[data-cy=contract-list]').should('contain', 'Test Rental Contract')
      
      // Verify contract status
      cy.get('[data-cy=contract-item]').first().within(() => {
        cy.get('[data-cy=contract-status]').should('contain', 'Draft')
      })
    })

    it('should validate required contract fields', () => {
      cy.navigateToPage('contracts')
      cy.get('[data-cy=new-contract-button]').click()
      
      // Try to save empty contract
      cy.get('[data-cy=save-contract-button]').click()
      
      // Should show validation errors
      cy.get('[data-cy=title-error]').should('be.visible')
      cy.get('[data-cy=property-error]').should('be.visible')
      cy.get('[data-cy=tenant-error]').should('be.visible')
      cy.get('[data-cy=start-date-error]').should('be.visible')
      cy.get('[data-cy=end-date-error]').should('be.visible')
    })

    it('should calculate contract terms automatically', () => {
      cy.navigateToPage('contracts')
      cy.get('[data-cy=new-contract-button]').click()
      
      // Select property with rent price
      cy.get('[data-cy=property-select]').select('Contract Test Property')
      
      // Monthly rent should auto-populate
      cy.get('[data-cy=monthly-rent-input]').should('have.value', '2000000')
      
      // Security deposit should auto-calculate (usually same as rent)
      cy.get('[data-cy=security-deposit-input]').should('have.value', '2000000')
      
      // Set contract duration
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-12-31')
      
      cy.get('[data-cy=start-date-input]').type('2024-01-01')
      cy.get('[data-cy=end-date-input]').type('2024-12-31')
      
      // Should calculate total contract value
      cy.get('[data-cy=total-contract-value]').should('contain', '24,000,000') // 12 months * 2M
    })
  })

  describe('Contract PDF Generation', () => {
    beforeEach(() => {
      cy.createTestContract({
        title: 'PDF Test Contract',
        status: 'draft'
      })
    })

    it('should generate PDF from contract', () => {
      cy.navigateToPage('contracts')
      
      // Find and open contract
      cy.get('[data-cy=contract-item]').contains('PDF Test Contract').click()
      
      // Should be on contract detail page
      cy.url().should('include', '/contracts/')
      
      // Generate PDF
      cy.get('[data-cy=generate-pdf-button]').click()
      
      // Should show PDF generation progress
      cy.get('[data-cy=pdf-generation-progress]').should('be.visible')
      
      // Wait for PDF generation to complete
      cy.get('[data-cy=pdf-ready-notification]', { timeout: 15000 }).should('be.visible')
      
      // PDF preview should be available
      cy.get('[data-cy=pdf-preview]').should('be.visible')
      
      // Download button should be enabled
      cy.get('[data-cy=download-pdf-button]').should('be.enabled')
      
      // Contract status should update
      cy.get('[data-cy=contract-status]').should('contain', 'PDF Generated')
    })

    it('should allow PDF editing before authentication', () => {
      cy.navigateToPage('contracts')
      cy.get('[data-cy=contract-item]').contains('PDF Test Contract').click()
      
      // Generate PDF first
      cy.get('[data-cy=generate-pdf-button]').click()
      cy.get('[data-cy=pdf-ready-notification]', { timeout: 15000 }).should('be.visible')
      
      // Edit PDF button should be available
      cy.get('[data-cy=edit-pdf-button]').click()
      
      // Should open PDF editor
      cy.get('[data-cy=pdf-editor]').should('be.visible')
      
      // Should have editing tools
      cy.get('[data-cy=pdf-editor-toolbar]').should('be.visible')
      cy.get('[data-cy=add-text-tool]').should('be.visible')
      cy.get('[data-cy=add-signature-field]').should('be.visible')
      
      // Make sample edit
      cy.get('[data-cy=add-text-tool]').click()
      cy.get('[data-cy=pdf-canvas]').click(400, 300) // Click to add text
      cy.get('[data-cy=text-input]').type('Additional clause: Property must be returned in original condition')
      cy.get('[data-cy=confirm-text-button]').click()
      
      // Save edited PDF
      cy.get('[data-cy=save-pdf-button]').click()
      
      // Should show success message
      cy.waitForNotification('PDF updated successfully')
      
      // Status should update
      cy.get('[data-cy=contract-status]').should('contain', 'Ready for Authentication')
    })
  })

  describe('Biometric Authentication Flow', () => {
    beforeEach(() => {
      // Skip biometric tests if disabled (e.g., in CI/CD)
      if (!Cypress.env('ENABLE_BIOMETRIC_TESTS')) {
        cy.log('Biometric tests disabled, skipping...')
        return
      }
      
      cy.createTestContract({
        title: 'Biometric Test Contract',
        status: 'ready_for_authentication'
      })
    })

    it('should start biometric authentication process', () => {
      if (!Cypress.env('ENABLE_BIOMETRIC_TESTS')) return
      
      cy.navigateToPage('contracts')
      cy.get('[data-cy=contract-item]').contains('Biometric Test Contract').click()
      
      // Start authentication
      cy.get('[data-cy=start-authentication-button]').click()
      
      // Should show authentication modal
      cy.get('[data-cy=biometric-auth-modal]').should('be.visible')
      
      // Should show authentication steps
      cy.get('[data-cy=auth-step-1]').should('contain', 'Face Verification')
      cy.get('[data-cy=auth-step-2]').should('contain', 'Document Verification')
      cy.get('[data-cy=auth-step-3]').should('contain', 'Combined Photo')
      cy.get('[data-cy=auth-step-4]').should('contain', 'Voice Recording')
      cy.get('[data-cy=auth-step-5]').should('contain', 'Digital Signature')
      
      // Start with first step
      cy.get('[data-cy=start-face-verification]').click()
      
      // Should show camera interface
      cy.get('[data-cy=camera-interface]').should('be.visible')
      cy.get('[data-cy=camera-preview]').should('be.visible')
      
      // Mock camera capture (in real test, this would use actual camera)
      cy.get('[data-cy=capture-face-button]').click()
      
      // Should proceed to next step
      cy.get('[data-cy=auth-step-2]').should('have.class', 'active')
    })

    it('should handle authentication errors gracefully', () => {
      if (!Cypress.env('ENABLE_BIOMETRIC_TESTS')) return
      
      cy.navigateToPage('contracts')
      cy.get('[data-cy=contract-item]').contains('Biometric Test Contract').click()
      
      cy.get('[data-cy=start-authentication-button]').click()
      
      // Simulate camera permission denied
      cy.window().then((win) => {
        // Mock getUserMedia to throw permission error
        const mockGetUserMedia = cy.stub(win.navigator.mediaDevices, 'getUserMedia')
        mockGetUserMedia.rejects(new Error('Permission denied'))
      })
      
      cy.get('[data-cy=start-face-verification]').click()
      
      // Should show error message
      cy.get('[data-cy=camera-error]')
        .should('be.visible')
        .and('contain', 'Camera permission is required')
      
      // Should provide alternative options
      cy.get('[data-cy=try-again-button]').should('be.visible')
      cy.get('[data-cy=contact-support-button]').should('be.visible')
    })

    it('should complete full authentication flow', () => {
      if (!Cypress.env('ENABLE_BIOMETRIC_TESTS')) return
      
      // This would be a comprehensive test of the full biometric flow
      // For demo purposes, we'll test the UI flow with mocked biometric data
      
      cy.navigateToPage('contracts')
      cy.get('[data-cy=contract-item]').contains('Biometric Test Contract').click()
      
      cy.get('[data-cy=start-authentication-button]').click()
      
      // Mock successful completion of each step
      const authSteps = [
        'face-verification',
        'document-verification', 
        'combined-photo',
        'voice-recording'
      ]
      
      authSteps.forEach((step, index) => {
        cy.get(`[data-cy=start-${step}]`).click()
        
        // Mock successful capture/verification
        cy.get(`[data-cy=complete-${step}]`).click()
        
        // Should show success for this step
        cy.get(`[data-cy=${step}-success]`).should('be.visible')
        
        // Should enable next step
        if (index < authSteps.length - 1) {
          cy.get(`[data-cy=auth-step-${index + 2}]`).should('not.have.class', 'disabled')
        }
      })
      
      // Should show overall authentication success
      cy.get('[data-cy=authentication-complete]').should('be.visible')
      
      // Should enable digital signature
      cy.get('[data-cy=proceed-to-signature]').should('be.enabled')
      
      // Contract status should update
      cy.get('[data-cy=contract-status]').should('contain', 'Authenticated')
    })
  })

  describe('Digital Signature', () => {
    beforeEach(() => {
      cy.createTestContract({
        title: 'Signature Test Contract',
        status: 'authenticated_pending_signature'
      })
    })

    it('should allow digital signature', () => {
      cy.navigateToPage('contracts')
      cy.get('[data-cy=contract-item]').contains('Signature Test Contract').click()
      
      // Open signature modal
      cy.get('[data-cy=sign-contract-button]').click()
      
      // Should show signature pad
      cy.get('[data-cy=signature-modal]').should('be.visible')
      cy.get('[data-cy=signature-pad]').should('be.visible')
      
      // Draw signature (simulate drawing on canvas)
      cy.get('[data-cy=signature-pad]').trigger('mousedown', { which: 1, pageX: 100, pageY: 100 })
      cy.get('[data-cy=signature-pad]').trigger('mousemove', { which: 1, pageX: 150, pageY: 120 })
      cy.get('[data-cy=signature-pad]').trigger('mousemove', { which: 1, pageX: 200, pageY: 100 })
      cy.get('[data-cy=signature-pad]').trigger('mouseup')
      
      // Confirm signature
      cy.get('[data-cy=confirm-signature-button]').click()
      
      // Should show signature confirmation
      cy.get('[data-cy=signature-confirmation]').should('be.visible')
      
      // Submit signature
      cy.get('[data-cy=submit-signature-button]').click()
      
      // Should show success message
      cy.waitForNotification('Contract signed successfully')
      
      // Contract status should update
      cy.get('[data-cy=contract-status]').should('contain', 'Fully Signed')
      
      // Should show signature details
      cy.get('[data-cy=signature-details]').should('be.visible')
      cy.get('[data-cy=signed-by]').should('contain', 'landlord@test.com')
      cy.get('[data-cy=signed-date]').should('be.visible')
    })

    it('should allow signature clearing and redoing', () => {
      cy.navigateToPage('contracts')
      cy.get('[data-cy=contract-item]').contains('Signature Test Contract').click()
      
      cy.get('[data-cy=sign-contract-button]').click()
      
      // Draw initial signature
      cy.get('[data-cy=signature-pad]').trigger('mousedown', { which: 1, pageX: 100, pageY: 100 })
      cy.get('[data-cy=signature-pad]').trigger('mousemove', { which: 1, pageX: 200, pageY: 100 })
      cy.get('[data-cy=signature-pad]').trigger('mouseup')
      
      // Clear signature
      cy.get('[data-cy=clear-signature-button]').click()
      
      // Signature pad should be empty
      cy.get('[data-cy=signature-pad]').should('not.have.class', 'has-signature')
      
      // Confirm button should be disabled
      cy.get('[data-cy=confirm-signature-button]').should('be.disabled')
      
      // Draw new signature
      cy.get('[data-cy=signature-pad]').trigger('mousedown', { which: 1, pageX: 50, pageY: 80 })
      cy.get('[data-cy=signature-pad]').trigger('mousemove', { which: 1, pageX: 250, pageY: 120 })
      cy.get('[data-cy=signature-pad]').trigger('mouseup')
      
      // Confirm button should be enabled
      cy.get('[data-cy=confirm-signature-button]').should('be.enabled')
    })
  })

  describe('Contract Status Flow', () => {
    it('should follow complete contract lifecycle', () => {
      // Create contract
      cy.navigateToPage('contracts')
      cy.get('[data-cy=new-contract-button]').click()
      
      // Fill minimum required fields
      cy.get('[data-cy=contract-title-input]').type('Lifecycle Test Contract')
      cy.get('[data-cy=contract-type-select]').select('rental_urban')
      cy.get('[data-cy=property-select]').select('Contract Test Property')
      cy.get('[data-cy=tenant-select]').select('tenant@test.com')
      cy.get('[data-cy=start-date-input]').type('2024-01-01')
      cy.get('[data-cy=end-date-input]').type('2024-12-31')
      
      cy.get('[data-cy=save-contract-button]').click()
      cy.waitForNotification('Contract created successfully')
      
      // Verify initial status
      cy.get('[data-cy=contract-item]').first().within(() => {
        cy.get('[data-cy=contract-status]').should('contain', 'Draft')
      })
      
      // Open contract
      cy.get('[data-cy=contract-item]').first().click()
      
      // Generate PDF
      cy.get('[data-cy=generate-pdf-button]').click()
      cy.get('[data-cy=pdf-ready-notification]', { timeout: 15000 }).should('be.visible')
      
      // Status should update to PDF Generated
      cy.get('[data-cy=contract-status]').should('contain', 'PDF Generated')
      
      // Mark as ready for authentication (skip editing for this test)
      cy.get('[data-cy=mark-ready-button]').click()
      
      // Status should update to Ready for Authentication
      cy.get('[data-cy=contract-status]').should('contain', 'Ready for Authentication')
      
      // Complete authentication (mocked)
      if (Cypress.env('ENABLE_BIOMETRIC_TESTS')) {
        cy.get('[data-cy=start-authentication-button]').click()
        // ... biometric flow would go here ...
        // Mock completion
        cy.get('[data-cy=mock-complete-auth]').click() // This would be a test helper
      }
      
      // Sign contract
      cy.get('[data-cy=sign-contract-button]').click()
      cy.get('[data-cy=signature-pad]').trigger('mousedown', { which: 1, pageX: 100, pageY: 100 })
      cy.get('[data-cy=signature-pad]').trigger('mousemove', { which: 1, pageX: 200, pageY: 100 })
      cy.get('[data-cy=signature-pad]').trigger('mouseup')
      cy.get('[data-cy=confirm-signature-button]').click()
      cy.get('[data-cy=submit-signature-button]').click()
      
      // Final status should be Active
      cy.get('[data-cy=contract-status]').should('contain', 'Active')
      
      // Should show contract activation date
      cy.get('[data-cy=activation-date]').should('be.visible')
      
      // Should enable contract management features
      cy.get('[data-cy=contract-actions]').should('be.visible')
      cy.get('[data-cy=download-contract-button]').should('be.enabled')
    })
  })

  describe('Contract Performance', () => {
    it('should handle contract creation within performance threshold', () => {
      const startTime = Date.now()
      
      cy.navigateToPage('contracts')
      cy.get('[data-cy=new-contract-button]').click()
      
      // Fill form quickly
      cy.fillContractForm({
        title: 'Performance Test Contract',
        property: 'Contract Test Property',
        tenant: 'tenant@test.com'
      })
      
      cy.get('[data-cy=save-contract-button]').click()
      
      cy.waitForNotification('Contract created successfully').then(() => {
        const totalTime = Date.now() - startTime
        cy.log(`Contract creation time: ${totalTime}ms`)
        expect(totalTime).to.be.lessThan(5000) // Should complete within 5 seconds
      })
    })

    it('should handle PDF generation performance', () => {
      cy.createTestContract({ title: 'PDF Performance Test' })
      
      cy.navigateToPage('contracts')
      cy.get('[data-cy=contract-item]').first().click()
      
      const startTime = Date.now()
      cy.get('[data-cy=generate-pdf-button]').click()
      
      cy.get('[data-cy=pdf-ready-notification]', { timeout: 20000 }).should('be.visible').then(() => {
        const pdfTime = Date.now() - startTime
        cy.log(`PDF generation time: ${pdfTime}ms`)
        expect(pdfTime).to.be.lessThan(15000) // Should complete within 15 seconds
      })
    })
  })
})