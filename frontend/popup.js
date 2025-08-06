

window.MelingoPopup = {

    show: function(message, triggerType = 'default') {
        this.hide();
        
        const popup = this.createPopup(message, triggerType);
        

        document.body.appendChild(popup);
        
        setTimeout(() => {
            popup.classList.add('melingo-popup-visible');
        }, 10);
        
        setTimeout(() => {
            this.hide();
        }, 10000);
    },
    

    hide: function() {
        const existing = document.getElementById('melingo-popup');
        if (existing) {
            existing.classList.remove('melingo-popup-visible');
            setTimeout(() => {
                if (existing.parentNode) {
                    existing.parentNode.removeChild(existing);
                }
            }, 300);
        }
    },
    

    createPopup: function(message, triggerType) {
        const popup = document.createElement('div');
        popup.id = 'melingo-popup';
        popup.className = `melingo-popup melingo-popup-${triggerType}`;
        
        const icon = this.getIcon(triggerType);
        
        popup.innerHTML = `
            <div class="melingo-popup-content">
                <div class="melingo-popup-icon">${icon}</div>
                <div class="melingo-popup-message">${message}</div>
                <div class="melingo-popup-actions">
                    <button class="melingo-popup-btn melingo-popup-btn-primary" onclick="MelingoPopup.handleAction('accept')">
                        Yes, I'm interested!
                    </button>
                    <button class="melingo-popup-btn melingo-popup-btn-close" onclick="MelingoPopup.hide()">
                        ×
                    </button>
                </div>
            </div>
        `;
        
        return popup;
    },
    

    getIcon: function(triggerType) {
        const icons = {
            'discount': '🎉',
            'urgency': '⚡',
            'help': '💬',
            'recommendation': '👍',
            'default': '✨'
        };
        return icons[triggerType] || icons.default;
    },
    

    handleAction: function(action) {
        if (action === 'accept') {
            if (window.MelingoTracker) {
                window.MelingoTracker.trackClick(document.getElementById('melingo-popup'), {
                    popup_action: 'accept',
                    custom_event: 'popup_interaction'
                });
            }
            
            alert('Great! Here\'s your discount code: MELINGO10');
        }
        
        this.hide();
    }
};
