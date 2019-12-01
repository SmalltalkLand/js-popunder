/**
 * Smart Popunder maker.
 * This class provides an easy way to make a popunder.
 * Avoid blocked on Google Chrome
 *
 * Note: For Google Chrome, to avoid blocked so each popunder will be  fired by each click.
 *
 * @author: Phan Thanh Cong aka chiplove <ptcong90@gmail.com>
 * @license: MIT
 *
 * Edit by: Rafel Sansó <rafel.sanso@gmail.com>
 * 
 * Changelog
 *
 * version 2.3.2.1; Apr 23, 2015
 * - Eventually, the popup doesn't launch. To prevent this I comment lines 174, 180 and 208
 * 
 */
(function(window){
    "use strict";

    var Popunder = function(url, options){ this.__construct(url, options); },
    counter = 0,
    lastPopTime = 0,
    alertCalled = false,
    baseName = 'ChipPopunder',
    parent = top != self ? top : self,
    userAgent = navigator.userAgent.toLowerCase(),
    browser = {
        webkit: /webkit/.test(userAgent),
        mozilla: /mozilla/.test(userAgent) && !/(compatible|webkit)/.test(userAgent),
        chrome: /chrome/.test(userAgent),
        msie: /msie|trident\//.test(userAgent) && !/opera/.test(userAgent),
        firefox: /firefox/.test(userAgent),
        safari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
        opera: /opera/.test(userAgent),
        version: parseInt(userAgent.match(/(?:[^\s]+(?:ri|ox|me|ra)\/|trident\/.*?rv:)([\d]+)/i)[1], 10)
    },
    helper = {
        simulateClick: function(url) {
            var a = document.createElement("a"),
                nothing = "",
                evt = document.createEvent("MouseEvents");
            a.href = url || "data:text/html,<script>window.close();<\/script>;";
            document.body.appendChild(a);
            evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, true, false, false, true, 0, null);
            a.dispatchEvent(evt);
            a.parentNode.removeChild(a);
        },
        blur:  function(popunder) {
            try {
                popunder.blur();
                popunder.opener.window.focus();
                window.self.window.focus();
                window.focus();
                if (browser.firefox) {
                    this.openCloseWindow(popunder);
                } else if (browser.webkit) {
                    // try to blur popunder window on chrome
                    // but not works on chrome 41
                    // so we should wrap this to avoid chrome display warning
                    if (!browser.chrome || (browser.chrome && browser.version < 41)) {
                        this.openCloseTab();
                    }
                } else if (browser.msie) {
                    setTimeout(function() {
                        popunder.blur();
                        popunder.opener.window.focus();
                        window.self.window.focus();
                        window.focus();
                    }, 1000);
                }
            } catch(err) {}
        },
        openCloseWindow: function(popunder) {
            var tmp = popunder.window.open("about:blank");
            tmp.focus();
            tmp.close();
            setTimeout(function() {
                try {
                    tmp = popunder.window.open("about:blank");
                    tmp.focus();
                    tmp.close();
                } catch (e) {}
            }, 1);
        },
        openCloseTab: function() {
            this.simulateClick();
        },
        detachEvent: function(event, callback, object) {
            var object = object || window;
            if (!object.removeEventListener) {
                return object.detachEvent("on" + event, callback);
            }
            return object.removeEventListener(event, callback);
        },
        attachEvent: function(event, callback, object) {
            var object = object || window;
            if (!object.addEventListener) {
                return object.attachEvent("on" + event, callback);
            }
            return object.addEventListener(event, callback);
        },
        mergeObject: function() {
            var obj = {}, i, k;
            for(i = 0; i < arguments.length; i++) {
                for (k in arguments[i]) {
                    obj[k] = arguments[i][k];
                }
            }
            return obj;
        },
        getCookie: function(name) {
            var cookieMatch = document.cookie.match(new RegExp(name+"=[^;]+", "i"));
            return cookieMatch ? decodeURIComponent(cookieMatch[0].split("=")[1]) : null;
        },
        setCookie: function(name, value, expires, path) {
            // expires must be number of minutes or instance of Date;
            if(expires === null || typeof expires == 'undefined') {
                expires = '';
            } else {
                var date;
                if (typeof expires == 'number') {
                    date = new Date();
                    date.setTime(date.getTime() + expires * 60 * 1e3);
                } else {
                    date = expires;
                }
                expires = "; expires=" + date.toUTCString();
            }
            document.cookie = name + "=" + escape(value) + expires + "; path=" + (path || '/');
        }
    };

    Popunder.prototype = {
        defaultWindowOptions: {
            width      : window.screen.width,
            height     : window.screen.height,
            left       : 0,
            top        : 0,
            location   : 1,
            toolbar    : 1,
            status     : 1,
            menubar    : 1,
            scrollbars : 1,
            resizable  : 1
        },
        defaultPopOptions: {
            cookieExpires : null, // in minutes
            cookiePath    : '/',
            newTab        : true,
            blur          : true,
            blurByAlert   : false, //
            chromeDelay   : 500,
            smart         : false, // for feature, if browsers block event click to window/body
            beforeOpen    : function(){},
            afterOpen     : function(){}
        },
        // Must use the options to create a new window in chrome
        __chromeNewWindowOptions: {
            scrollbars : 0
        },
        __construct: function(url, options) {
            this.url      = url;
            this.index    = counter++;
            this.name     = baseName + '_' + (this.index);
            this.executed = false;

            this.setOptions(options);
            this.register();
        },
        register: function() {
            //if (this.isExecuted()) return;
            var self = this, w, i,
            elements = [],
            eventName = 'click',
            run = function(e) {
                // e.preventDefault();
                //if (self.shouldExecute()) {
                    lastPopTime = new Date().getTime();
                    self.setExecuted();
                    self.options.beforeOpen.call(undefined, this);
                    if (self.options.newTab) {
                        if (browser.chrome && browser.version > 30 && self.options.blur) {
                            window.open('javascript:window.focus()', '_self', '');
                            helper.simulateClick(self.url);
                            w = null;
                        } else {
                            w = parent.window.open(self.url || 'about: blank', '_blank');
                            setTimeout(function(){
                                if (!alertCalled && self.options.blurByAlert) {
                                    alertCalled = true;
                                    alert();
                                }
                            }, 3);
                        }
                    } else {
                        w = parent.window.open(self.url || 'about: blank', this.url, self.getParams());
                    }
                    if (self.options.blur) {
                        helper.blur(w);
                    }
                    self.options.afterOpen.call(undefined, this,w);
                    for(i in elements) {
                        helper.detachEvent(eventName, run, elements[i]);
                    }
                //}
            },
            inject = function(e){
                if (self.isExecuted()) {
                    helper.detachEvent('mousemove', inject);
                    return;
                }
                try {
                    if (e.originalTarget && typeof e.originalTarget[self.name] == 'undefined') {
                        e.originalTarget[self.name] = true;
                        helper.attachEvent(eventName, run, e.originalTarget);
                        elements.push(e.originalTarget);
                    }
                } catch(err) {}
            };

            // smart injection
            if (this.options.smart) {
                helper.attachEvent('mousemove', inject);
            } else {
                helper.attachEvent(eventName, run, window);
                elements.push(window);

                helper.attachEvent(eventName, run, document);
                elements.push(document);
            }
        },
        shouldExecute: function() {
            if (browser.chrome && lastPopTime && lastPopTime + this.options.chromeDelay > new Date().getTime()) {
                return false;
            }
            return !this.isExecuted();
        },
        isExecuted: function() {
            return this.executed || !!helper.getCookie(this.name);
        },
        setExecuted: function() {
            this.executed = true;
            helper.setCookie(this.name, 1, this.options.cookieExpires, this.options.cookiePath);
        },
        setOptions: function(options) {
            this.options = helper.mergeObject(this.defaultWindowOptions, this.defaultPopOptions, options || {});
            if (!this.options.newTab && browser.chrome) {
                for(var k in this.__chromeNewWindowOptions) {
                    this.options[k] = this.__chromeNewWindowOptions[k];
                }
            }
        },
        getParams: function() {
            var params = '', k;
            for (k in this.options) {
                if (typeof this.defaultWindowOptions[k] != 'undefined') {
                    params += (params ? "," : "") + k + "=" + this.options[k];
                }
            }
            return params;
        }
    };
    Popunder.make = function(url, options) {
        return new this(url, options);
    };
    window.SmartPopunder = Popunder;
})(window);
