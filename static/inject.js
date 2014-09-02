
var tms = {
    pageUrlChanged: function () {
        try {
            // Contact parent of iframe
            // Give correct URL & Title of page
            if (window.top) {
                if (window.top.updateTitleTo) {
                    window.top.updateTitleTo(document.title);
                }
                if (window.top.updateUrlTo) {
                    window.top.updateUrlTo(document.location.href);
                }
            }
        } catch(e) {
        }
    },
    pageUrlChanging: function () {
        try {
            if (window.top && window.top.testPageUnloading) {
                // notify parent frame
                window.top.testPageUnloading();
            }
        } catch(e) {
        }
    },
    validateDigitalDataLayer: function () {
        try {
            if (window.top && window.top.validate && typeof digitalData !== "undefined") {
                window.top.validate(digitalData);
            }
        } catch(e) {
        }
    },
    refresh: function () {
        try {
            tms.validateDigitalDataLayer();
        } catch(e) {
        }
    }
};

document.addEventListener('DOMContentLoaded', function () {
    try {
        // Make sure injected code is not within a nested iframe
        if (window.top !== window.parent) {
            return;
        }

        tms.pageUrlChanged();
        tms.validateDigitalDataLayer();

        // If url is changed without page reloading (on Ajax sites)
        // Make sure parent is notified
        var pushState = history.pushState;
        history.pushState = function (state) {
            if (typeof history.onpushstate === "function") {
                history.onpushstate({state: state});
            }
            tms.pageUrlChanged();
            return pushState.apply(history, arguments);
        };

        window.onpopstate = tms.pageUrlChanged;

        window.onunload = tms.pageUrlChanging;
    } catch(e) {
    }
});
