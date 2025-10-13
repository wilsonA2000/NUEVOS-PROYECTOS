describe('Real-Time Messaging with WebSocket', () => {
  beforeEach(() => {
    // Skip WebSocket tests if disabled
    if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) {
      cy.log('WebSocket tests disabled, skipping...')
      return
    }
    
    cy.loginAs('landlord')
  })

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection successfully', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.task('testWebSocketConnection', {
        url: Cypress.env('WS_MESSAGING'),
        timeout: Cypress.env('MAX_WEBSOCKET_CONNECTION_TIME')
      }).then((result) => {
        expect(result.success).to.be.true
      })
    })

    it('should handle WebSocket connection errors gracefully', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      // Test connection to invalid WebSocket URL
      cy.task('testWebSocketConnection', {
        url: 'ws://localhost:9999/invalid/',
        timeout: 2000
      }).then((result) => {
        // Should fail gracefully
        expect(result).to.be.null
      }, (error) => {
        // Error is expected for invalid URL
        expect(error.message).to.include('timeout')
      })
    })

    it('should reconnect automatically after connection loss', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.visit('/messages')
      
      // Establish WebSocket connection
      cy.establishWebSocketConnection('/messaging/').then((ws) => {
        // Simulate connection loss
        ws.close()
        
        // Wait for automatic reconnection
        cy.wait(3000)
        
        // Verify reconnection indicator
        cy.get('[data-cy=websocket-status]').should('contain', 'Connected')
      })
    })
  })

  describe('Real-Time Chat', () => {
    beforeEach(() => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      // Create test property for messaging context
      cy.createTestProperty({
        title: 'Chat Test Property'
      })
    })

    it('should send and receive messages in real-time', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.visit('/messages')
      
      // Start new conversation
      cy.get('[data-cy=new-message-button]').click()
      cy.get('[data-cy=recipient-select]').select('tenant@test.com')
      cy.get('[data-cy=subject-input]').type('Test Real-Time Message')
      
      // Send message via WebSocket
      const testMessage = `WebSocket test message ${Date.now()}`
      cy.sendChatMessage(testMessage)
      
      // Verify message appears immediately
      cy.get('[data-cy=message-list]').should('contain', testMessage)
      
      // Verify message has sending/sent status
      cy.get('[data-cy=message-status]').should('contain', 'sent')
    })

    it('should show typing indicators', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.visit('/messages')
      
      // Open existing conversation
      cy.get('[data-cy=conversation-item]').first().click()
      
      // Start typing
      cy.get('[data-cy=message-input]').type('This is a test message...')
      
      // Should show typing indicator to other users
      cy.get('[data-cy=typing-indicator]').should('be.visible')
      
      // Stop typing
      cy.wait(2000)
      
      // Typing indicator should disappear
      cy.get('[data-cy=typing-indicator]').should('not.exist')
    })

    it('should handle message delivery status', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.visit('/messages')
      cy.get('[data-cy=conversation-item]').first().click()
      
      const testMessage = `Delivery test ${Date.now()}`
      cy.sendChatMessage(testMessage)
      
      // Should show delivery status progression
      cy.get('[data-cy=message-item]').last().within(() => {
        // Should start as sending
        cy.get('[data-cy=message-status]').should('contain', 'sending')
        
        // Should change to sent
        cy.get('[data-cy=message-status]', { timeout: 5000 }).should('contain', 'sent')
        
        // Should eventually show delivered (if recipient is online)
        cy.get('[data-cy=message-status]', { timeout: 10000 }).should('contain', 'delivered')
      })
    })

    it('should support message attachments', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.visit('/messages')
      cy.get('[data-cy=conversation-item]').first().click()
      
      // Attach file
      cy.get('[data-cy=attach-file-button]').click()
      cy.uploadFile('[data-cy=file-input]', 'test-document.pdf', 'application/pdf')
      
      // Add message text
      cy.get('[data-cy=message-input]').type('Here is the document you requested')
      
      // Send message with attachment
      cy.get('[data-cy=send-message-button]').click()
      
      // Verify message with attachment appears
      cy.get('[data-cy=message-item]').last().within(() => {
        cy.get('[data-cy=message-attachment]').should('be.visible')
        cy.get('[data-cy=attachment-name]').should('contain', 'test-document.pdf')
      })
    })

    it('should handle multiple participants in group chat', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      // This would require multiple WebSocket connections
      // For now, we'll test the UI components
      
      cy.visit('/messages')
      
      // Create group conversation
      cy.get('[data-cy=new-group-chat-button]').click()
      cy.get('[data-cy=group-name-input]').type('Test Group Chat')
      
      // Add participants
      cy.get('[data-cy=add-participant-button]').click()
      cy.get('[data-cy=participant-select]').select('tenant@test.com')
      cy.get('[data-cy=add-participant-button]').click()
      cy.get('[data-cy=participant-select]').select('service@test.com')
      
      // Create group
      cy.get('[data-cy=create-group-button]').click()
      
      // Send message to group
      const groupMessage = `Group message ${Date.now()}`
      cy.sendChatMessage(groupMessage)
      
      // Verify message appears in group chat
      cy.get('[data-cy=message-list]').should('contain', groupMessage)
      
      // Verify participant list
      cy.get('[data-cy=group-participants]').should('contain', 'tenant@test.com')
      cy.get('[data-cy=group-participants]').should('contain', 'service@test.com')
    })
  })

  describe('Real-Time Notifications', () => {
    beforeEach(() => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.visit('/dashboard')
    })

    it('should receive real-time notifications', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      // Establish notification WebSocket connection
      cy.establishWebSocketConnection('/notifications/').then((ws) => {
        // Simulate incoming notification
        const notification = {
          type: 'new_message',
          title: 'New Message',
          message: 'You have received a new message',
          timestamp: new Date().toISOString()
        }
        
        cy.sendWebSocketMessage(ws, notification)
        
        // Verify notification appears
        cy.get('[data-cy=notification-bell]').should('have.class', 'has-new-notifications')
        cy.get('[data-cy=notification-count]').should('contain', '1')
        
        // Click to view notifications
        cy.get('[data-cy=notification-bell]').click()
        cy.get('[data-cy=notification-list]').should('contain', 'New Message')
      })
    })

    it('should handle different notification types', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      const notificationTypes = [
        { type: 'property_inquiry', title: 'Property Inquiry', icon: 'property' },
        { type: 'contract_signed', title: 'Contract Signed', icon: 'contract' },
        { type: 'payment_received', title: 'Payment Received', icon: 'payment' },
        { type: 'maintenance_request', title: 'Maintenance Request', icon: 'maintenance' }
      ]
      
      cy.establishWebSocketConnection('/notifications/').then((ws) => {
        notificationTypes.forEach((notif, index) => {
          cy.sendWebSocketMessage(ws, {
            type: notif.type,
            title: notif.title,
            message: `Test ${notif.title}`,
            timestamp: new Date().toISOString()
          })
          
          // Verify notification count increases
          cy.get('[data-cy=notification-count]').should('contain', (index + 1).toString())
        })
        
        // Open notifications panel
        cy.get('[data-cy=notification-bell]').click()
        
        // Verify all notifications appear with correct icons
        notificationTypes.forEach((notif) => {
          cy.get('[data-cy=notification-list]').within(() => {
            cy.get(`[data-cy=notification-${notif.type}]`).should('be.visible')
            cy.get(`[data-cy=notification-icon-${notif.icon}]`).should('be.visible')
          })
        })
      })
    })

    it('should mark notifications as read', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.establishWebSocketConnection('/notifications/').then((ws) => {
        // Send test notification
        cy.sendWebSocketMessage(ws, {
          type: 'test_notification',
          title: 'Test Notification',
          message: 'This is a test notification',
          timestamp: new Date().toISOString()
        })
        
        // Open notifications
        cy.get('[data-cy=notification-bell]').click()
        
        // Click on notification to mark as read
        cy.get('[data-cy=notification-item]').first().click()
        
        // Notification count should decrease
        cy.get('[data-cy=notification-count]').should('contain', '0')
        
        // Notification should show as read
        cy.get('[data-cy=notification-item]').first().should('have.class', 'read')
      })
    })
  })

  describe('User Status Updates', () => {
    it('should show user online/offline status', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.visit('/messages')
      
      // Establish user status WebSocket connection
      cy.establishWebSocketConnection('/user-status/').then((ws) => {
        // Should show current user as online
        cy.get('[data-cy=user-status-indicator]').should('have.class', 'online')
        
        // Send status update for another user
        cy.sendWebSocketMessage(ws, {
          type: 'user_status_update',
          user_id: 'tenant@test.com',
          status: 'online',
          last_seen: new Date().toISOString()
        })
        
        // Should update user status in UI
        cy.get('[data-cy=contact-list]').within(() => {
          cy.get('[data-user=tenant@test.com]').within(() => {
            cy.get('[data-cy=status-indicator]').should('have.class', 'online')
          })
        })
      })
    })

    it('should handle user presence updates', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.visit('/messages')
      
      cy.establishWebSocketConnection('/user-status/').then((ws) => {
        // Simulate user going offline
        cy.sendWebSocketMessage(ws, {
          type: 'user_status_update',
          user_id: 'tenant@test.com',
          status: 'offline',
          last_seen: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 minutes ago
        })
        
        // Should show user as offline with last seen time
        cy.get('[data-cy=contact-list]').within(() => {
          cy.get('[data-user=tenant@test.com]').within(() => {
            cy.get('[data-cy=status-indicator]').should('have.class', 'offline')
            cy.get('[data-cy=last-seen]').should('contain', '5 minutes ago')
          })
        })
      })
    })
  })

  describe('WebSocket Error Handling', () => {
    it('should handle WebSocket disconnection gracefully', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.visit('/messages')
      
      cy.establishWebSocketConnection('/messaging/').then((ws) => {
        // Force disconnect
        ws.close()
        
        // Should show disconnection indicator
        cy.get('[data-cy=websocket-status]', { timeout: 5000 })
          .should('contain', 'Reconnecting...')
        
        // Should attempt to reconnect
        cy.get('[data-cy=websocket-status]', { timeout: 10000 })
          .should('contain', 'Connected')
      })
    })

    it('should queue messages when offline', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.visit('/messages')
      cy.get('[data-cy=conversation-item]').first().click()
      
      // Simulate offline state
      cy.window().then((win) => {
        // Mock navigator.onLine
        Object.defineProperty(win.navigator, 'onLine', {
          writable: true,
          value: false
        })
        
        // Trigger offline event
        win.dispatchEvent(new Event('offline'))
      })
      
      // Try to send message while offline
      const offlineMessage = `Offline message ${Date.now()}`
      cy.sendChatMessage(offlineMessage)
      
      // Should show message as queued
      cy.get('[data-cy=message-item]').last().within(() => {
        cy.get('[data-cy=message-status]').should('contain', 'queued')
      })
      
      // Simulate coming back online
      cy.window().then((win) => {
        Object.defineProperty(win.navigator, 'onLine', {
          writable: true,
          value: true
        })
        win.dispatchEvent(new Event('online'))
      })
      
      // Message should be sent when back online
      cy.get('[data-cy=message-item]').last().within(() => {
        cy.get('[data-cy=message-status]', { timeout: 5000 }).should('contain', 'sent')
      })
    })
  })

  describe('WebSocket Performance', () => {
    it('should establish WebSocket connection within performance threshold', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      const startTime = Date.now()
      
      cy.establishWebSocketConnection('/messaging/').then(() => {
        const connectionTime = Date.now() - startTime
        cy.log(`WebSocket connection time: ${connectionTime}ms`)
        
        expect(connectionTime).to.be.lessThan(Cypress.env('MAX_WEBSOCKET_CONNECTION_TIME'))
      })
    })

    it('should handle high-frequency message updates', () => {
      if (!Cypress.env('ENABLE_WEBSOCKET_TESTS')) return
      
      cy.visit('/messages')
      cy.get('[data-cy=conversation-item]').first().click()
      
      cy.establishWebSocketConnection('/messaging/').then((ws) => {
        // Send multiple messages rapidly
        const messageCount = 10
        const messages = []
        
        for (let i = 1; i <= messageCount; i++) {
          const message = `Rapid message ${i}`
          messages.push(message)
          cy.sendWebSocketMessage(ws, {
            type: 'new_message',
            message: message,
            timestamp: new Date().toISOString()
          })
        }
        
        // All messages should appear in order
        messages.forEach((message, index) => {
          cy.get('[data-cy=message-list]').should('contain', message)
        })
        
        // UI should remain responsive
        cy.get('[data-cy=message-input]').should('be.enabled')
        cy.get('[data-cy=send-message-button]').should('be.enabled')
      })
    })
  })
})