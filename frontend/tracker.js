
(function() {
    'use strict';
    
    const CONFIG = {
        apiUrl: window.MELINGO_API_URL || 'http://localhost:8000', 
        sessionKey: 'melingo_session_id',
        sessionTimeoutKey: 'melingo_session_expires',
        sessionTimeout: window.MELINGO_SESSION_TIMEOUT || 30 * 60 * 1000,
        debug: window.MELINGO_DEBUG || true
    };
    

    window.MelingoTracker = {
        sessionId: null,
        startTime: null,
        lastActivity: null,
        eventQueue: [],
        lastAnalysisTime: null,
        

        init: function() {
            this.sessionId = this.getOrCreateSessionId();
            this.startTime = Date.now();
            this.lastActivity = Date.now();
            
            this.log('Tracker initialized', { sessionId: this.sessionId });
            
            this.trackPageView();
            
            this.setupEventListeners();
            
            this.startPeriodicAnalysis();
        },
        
        getOrCreateSessionId: function() {
            let sessionId = localStorage.getItem(CONFIG.sessionKey);
            let sessionExpires = localStorage.getItem(CONFIG.sessionTimeoutKey);
            
            if (sessionId && sessionExpires) {
                const expiresTime = parseInt(sessionExpires);
                const now = Date.now();
                
                if (now < expiresTime) {
                    this.extendSession();
                    this.log('Existing session found', { sessionId, expiresIn: (expiresTime - now) / 1000 + 's' });
                    return sessionId;
                } else {
                    this.log('Session expired, creating new one');
                    this.clearSession();
                }
            }
            
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            this.setSession(sessionId);
            this.log('New session created', { sessionId });
            
            return sessionId;
        },
        

        setSession: function(sessionId) {
            const expiresAt = Date.now() + CONFIG.sessionTimeout;
            localStorage.setItem(CONFIG.sessionKey, sessionId);
            localStorage.setItem(CONFIG.sessionTimeoutKey, expiresAt.toString());
        },
        

        extendSession: function() {
            const expiresAt = Date.now() + CONFIG.sessionTimeout;
            localStorage.setItem(CONFIG.sessionTimeoutKey, expiresAt.toString());
        },
        

        clearSession: function() {
            localStorage.removeItem(CONFIG.sessionKey);
            localStorage.removeItem(CONFIG.sessionTimeoutKey);
        },
        

        detectPageType: function() {
            const url = window.location.href.toLowerCase();
            const pathname = window.location.pathname.toLowerCase();
            
            if (pathname.includes('/products/')) return 'product';
            if (pathname.includes('/collections/')) return 'category';
            if (pathname.includes('/cart')) return 'cart';
            if (pathname.includes('/checkout')) return 'checkout';
            if (pathname === '/' || pathname === '') return 'home';
            
            return 'other';
        },
        

        trackPageView: function() {
            const event = {
                session_id: this.sessionId,
                event_type: 'page_view',
                page_type: this.detectPageType(),
                page_url: window.location.href,
                timestamp: Date.now() / 1000,
                data: {
                    title: document.title,
                    referrer: document.referrer
                }
            };
            
            this.sendEvent(event);
        },
        

        trackClick: function(element, customData = {}) {
            const event = {
                session_id: this.sessionId,
                event_type: 'click',
                page_type: this.detectPageType(),
                page_url: window.location.href,
                timestamp: Date.now() / 1000,
                data: {
                    element_type: element.tagName.toLowerCase(),
                    element_class: element.className,
                    element_id: element.id,
                    element_text: element.textContent?.substring(0, 100),
                    ...customData
                }
            };
            
            this.sendEvent(event);
        },

        trackAddToCart: function(productData = {}) {
            const event = {
                session_id: this.sessionId,
                event_type: 'add_to_cart',
                page_type: this.detectPageType(),
                page_url: window.location.href,
                timestamp: Date.now() / 1000,
                data: productData
            };
            
            this.sendEvent(event);
        },
        

        sendEvent: function(event) {
            this.eventQueue.push(event);
            this.lastActivity = Date.now();
            
            this.extendSession();
            
            this.log('Tracking event', event);
            
            fetch(CONFIG.apiUrl + '/track', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(event)
            })
            .then(response => response.json())
            .then(data => {
                this.log('Event sent successfully', data);
            })
            .catch(error => {
                this.log('Error sending event', error);
            });
        },
        

        requestAnalysis: function() {
            this.log('Requesting analysis...');
            
            fetch(CONFIG.apiUrl + '/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ session_id: this.sessionId })
            })
            .then(response => response.json())
            .then(data => {
                this.log('Analysis received', data);
                this.handleAnalysisResponse(data);
            })
            .catch(error => {
                this.log('Error requesting analysis', error);
            });
        },
        

        handleAnalysisResponse: function(response) {
            if (response.should_show_message && response.message) {
                this.log('Showing message:', response.message);
                
                // Show popup if available, otherwise log to console
                if (window.MelingoPopup) {
                    window.MelingoPopup.show(response.message, response.trigger_type);
                } else {
                    console.log('🎯 AI MESSAGE:', response.message);
                    console.log('🏷️ TRIGGER TYPE:', response.trigger_type);
                }
            }
        },
        

        setupEventListeners: function() {
            document.addEventListener('click', (e) => {
                const target = e.target;
                
                if (target.matches('[name="add"], .btn-cart, .add-to-cart, [data-action="add-to-cart"]')) {
                    this.trackAddToCart({
                        button_text: target.textContent?.trim()
                    });
                }
                
                if (target.matches('button, a, .btn, [role="button"]')) {
                    this.trackClick(target);
                }
            });
            
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    this.log('Page hidden');
                } else {
                    this.log('Page visible');
                    this.lastActivity = Date.now();
                }
            });
        },
        

        startPeriodicAnalysis: function() {
            setInterval(() => {
                const timeSinceStart = Date.now() - this.startTime;
                const eventCount = this.eventQueue.length;
                const now = Date.now();
                
                const timeSinceLastAnalysis = this.lastAnalysisTime ? now - this.lastAnalysisTime : Infinity;
                const analysisIntervalMet = timeSinceLastAnalysis > 3 * 60 * 1000;
                
                if (timeSinceStart > 60000 && eventCount >= 3 && analysisIntervalMet) { 
                    this.requestAnalysis();
                    this.lastAnalysisTime = now;
                    this.log('Analysis requested', { 
                        timeSinceStart: Math.round(timeSinceStart / 1000) + 's',
                        eventCount,
                        timeSinceLastAnalysis: Math.round(timeSinceLastAnalysis / 1000) + 's'
                    });
                }
            }, 30000);
        },
        

        log: function(message, data = null) {
            if (CONFIG.debug) {
                console.log('🎯 Melingo:', message, data || '');
            }
        }
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            MelingoTracker.init();
        });
    } else {
        MelingoTracker.init();
    }
    
})();
