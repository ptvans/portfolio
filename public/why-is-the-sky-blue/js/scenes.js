$(document).ready(function(){
var Fx = window.SkyFx;
var mq;

var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reducedMotion) {
    $.fx.off = true;   // jQuery fades and slides finish instantly
}

// A short name for each scene, used in its #link, and a title for the progress dots.
var SLUGS = ["intro", "guesses", "particles", "scatter", "rayleigh", "chart", "blue-sky", "sunset", "conclusion"];
var TITLES = ["Why is the sky blue?", "Some guesses", "Small particles", "Scattering", "Rayleigh",
              "How much each color scatters", "The blue sky", "Sunset", "There you have it"];

// On the sunset scene, the text switches to the "blue sky" text above this sun angle.
var SKY_TEXT_SWITCH = 30;

// ================================
// Classes
// ================================
var Model = Backbone.Model.extend({
    defaults: {
        currentStage: 0,
        sunPosition: "hidden",   // "hidden", "in" (behind the Earth) or "sky"
        sunAngle: 90             // degrees above the observer's horizon, when in the sky
    },

    stages: [
        "intro",
        "night",
        "particles",
        "scatter",
        "raleigh",
        "physics",
        "skyblue",
        "skyothercolors",
        "conclusion"
    ],

    next: function() {
        if (this.get("currentStage") < this.stages.length - 1) {
            this.set("currentStage", this.get("currentStage") + 1);
        } else {
            this.set("currentStage", 0);
        }
    },

    prev: function() {
        if (this.get("currentStage") > 0 ) {
            this.set("currentStage", this.get("currentStage") - 1);
        } else {
            this.set("currentStage", this.stages.length - 1);
        }
    },

    getCurrentStage: function() {
        var currentStage = this.get("currentStage");
        return this.stages[currentStage];
    }

});

// Sun positions for each screen size: overhead ("up"), near the horizon ("down")
// and behind the Earth ("in"). Angles in between follow an arc around the observer.
function sunAnchors() {
    switch(mq) {
        case "phone":
            return { up: { left: 330, top: 70 },  down: { left: 0, top: 190 },   in: { left: 260, top: 300 } };
        case "tablet":
            return { up: { left: 500, top: 120 }, down: { left: -10, top: 280 }, in: { left: 430, top: 450 } };
        case "desktop-large":
            return { up: { left: 850, top: 50 },  down: { left: -70, top: 300 }, in: { left: 710, top: 620 } };
        default:
            return { up: { left: 490, top: 80 },  down: { left: -80, top: 310 }, in: { left: 470, top: 540 } };
    }
}

function px(p) { return { left: p.left + "px", top: p.top + "px" }; }

// The anchors above were drawn for the original sun, which was four times today's size.
// The sun keeps the same centers.
function originalSunSize() {
    switch(mq) {
        case "phone": return 140;
        case "tablet": return 200;
        case "desktop-large": return 350;
        default: return 250;
    }
}
function anchorCenter(p) {
    var half = originalSunSize() / 2;
    return { x: p.left + half, y: p.top + half };
}
function sunSize() {
    return Fx.box($("#sun")[0]).w;
}
function placeCenter(x, y) {
    var size = sunSize();
    return px({ left: x - size / 2, top: y - size / 2 });
}

// Behind the Earth: moved out so the smaller sun still peeks past the edge as much as before.
function sunBehindEarth() {
    var c = anchorCenter(sunAnchors().in);
    var e = Fx.box($("#earth-day")[0]);
    var dx = c.x - (e.x + e.w / 2), dy = c.y - (e.y + e.h / 2), d = Math.sqrt(dx * dx + dy * dy) || 1;
    var push = (originalSunSize() - sunSize()) / 2;
    return placeCenter(c.x + dx / d * push, c.y + dy / d * push);
}

// The sun in the sky: js/fx/main.js works out where, from the observer's
// horizon (the Earth turns with the angle), using the anchors above.
function sunPlacement(deg) {
    var c = Fx.sunCenter(deg);
    return placeCenter(c.x, c.y);
}
Fx.sunAnchorCenters = function() {
    var a = sunAnchors();
    return { up: anchorCenter(a.up), down: anchorCenter(a.down) };
};

// Fade helpers that are safe to interrupt midway.
function showText(sel, ms) {
    $(sel).stop(true).css({ display: "block", opacity: $(sel).is(":visible") ? $(sel).css("opacity") : 0 }).fadeTo(ms || 400, 1);
}
function hideText(sel, ms) {
    $(sel).stop(true).fadeTo(ms || 300, 0, function() { $(this).hide().css("opacity", ""); });
}

var SunView = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'render', 'follow');
        this.settled = false;
        this.model.on('change:sunPosition', this.render);
        this.model.on('change:sunAngle', this.follow);
        $(window).on('resize', this.follow);
    },

    render: function() {
        var view = this;
        var sunPosition = this.model.get("sunPosition");
        this.settled = false;
        this.$el.stop(true);

        switch (sunPosition) {
            case "in":
                this.$el.animate(sunBehindEarth(), 1200).show();
                break;
            case "sky":
                this.$el.animate(sunPlacement(this.model.get("sunAngle")), 1200, function() {
                    view.settled = true;
                    view.trigger("moved");
                }).show();
                break;
            default:
                this.$el.hide();
            break;
        }
        return this;
    },

    follow: function() {
        if (this.model.get("sunPosition") === "sky" && this.settled) {
            this.$el.css(sunPlacement(this.model.get("sunAngle")));
            this.trigger("moved");
        }
    }

});

var ObserverView = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'render');
        this.model.on('change:sunPosition', this.render);
    },

    render: function() {
        if (this.model.get("sunPosition") === "sky") {
            $(this.el).fadeIn();
        } else {
            $(this.el).hide();
        }
        return this;
    }

});

var ShareButtonView = Backbone.View.extend({
    initialize: function() {
        _.bindAll(this, 'render');
        this.model.on('change:currentStage', this.render);
    },

    render: function() {
        if (this.model.get('currentStage') == 8) {
            $(this.el).fadeIn(1200);
        } else {
            $(this.el).hide();
        }

        return this;
    }
});


var View = Backbone.View.extend({

    events: {
        "click #next": "nextStage",
        "click #prev": "previousStage",
        "keydown": "processKey"
    },

    eventsDisabled: {
        "keydown": "processKey"
    },

    isEventsDisabled: false,

    initialize: function() {
        _.bindAll(this, 'render', 'enableButtons', 'disableButtons', 'onAngle', 'onSlider', 'checkTextOverlap');
        this.model.on('change:currentStage', this.render);
        this.model.on('change:sunAngle', this.onAngle);

        this.sunView = new SunView({"model": model, "el": "#sun"});
        this.sunView.on("moved", this.checkTextOverlap);
        this.observerView = new ObserverView({"model": model, "el": "#observer"});
        this.shareButtonView = new ShareButtonView({"model": model, "el": "#share-bar"});
        this.skyText = "blue";

        $("#sun-angle")
            .on("input change", this.onSlider)
            .on("keydown", function(e) { e.stopPropagation(); });  // arrows move the sun, not the scene

        this.buildProgress();
        $(window).on("hashchange", _.bind(this.onHash, this));
        this.listenForSwipes();
    },

    processKey: function(e) {
        if (this.isEventsDisabled) {
            return true;
        }
        if (e.keyCode == 37) {
            this.previousStage();
            return false;
        } else if (e.keyCode == 39) {
            this.nextStage();
            return false;
        }
        return true;
    },

    nextStage: function() {
        this.model.next();
    },

    previousStage: function() {
        if (this.model.get("currentStage") > 0) {
            this.model.prev();
        }
    },

    goTo: function(n) {
        if (n >= 0 && n < SLUGS.length && n !== this.model.get("currentStage")) {
            this.model.set("currentStage", n);
        }
    },

    // Progress dots: one link per scene.
    buildProgress: function() {
        var nav = $("#progress");
        _.each(SLUGS, function(slug, i) {
            $("<a>", {
                href: "#" + slug,
                "class": "dot",
                "aria-label": "Scene " + (i + 1) + ": " + TITLES[i],
                title: TITLES[i]
            }).appendTo(nav);
        });
    },

    // A #scene link, typed or clicked, jumps to that scene.
    onHash: function() {
        var n = _.indexOf(SLUGS, location.hash.slice(1));
        if (n < 0) return;
        if (this.isEventsDisabled) {
            this.updateHash();   // mid-transition: ignore, and put the link back
            return;
        }
        this.goTo(n);
    },

    updateHash: function() {
        var slug = SLUGS[this.model.get("currentStage")];
        if (location.hash.slice(1) !== slug && window.history.replaceState) {
            history.replaceState(null, "", "#" + slug);
        }
    },

    // Swipe left for the next scene, right to go back.
    listenForSwipes: function() {
        var view = this, start = null;
        document.addEventListener("touchstart", function(e) {
            var t = e.touches[0];
            var ignore = $(e.target).closest("input, .scatter-chart, #observer-card, a, button").length;
            start = (e.touches.length === 1 && !ignore) ? { x: t.clientX, y: t.clientY } : null;
        }, { passive: true });
        document.addEventListener("touchend", function(e) {
            if (!start || view.isEventsDisabled) return;
            var t = e.changedTouches[0], dx = t.clientX - start.x, dy = t.clientY - start.y;
            start = null;
            if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
            if (dx < 0) view.nextStage(); else view.previousStage();
        }, { passive: true });
    },

    // After each scene has appeared: update the link, the dots, the back
    // button, and tell screen readers what the new scene says.
    afterStage: function() {
        var n = this.model.get("currentStage");
        var stage = "#stage-" + this.model.stages[n];
        this.updateHash();
        $("#progress .dot").removeAttr("aria-current").eq(n).attr("aria-current", "step");
        $("#prev").toggle(n > 0);
        var box = $(stage + " .text-box, " + stage + " #title").first().clone();
        box.find("svg").remove();   // the chart describes itself; don't read out its axis numbers
        var parts = box.find("p").length ? box.find("p").map(function() { return $(this).text(); }).get() : [box.text()];
        var text = parts.join(" ").replace(/\s+/g, " ").trim();
        $("#scene-announcer").text("Scene " + (n + 1) + " of " + SLUGS.length + ". " + text);
    },

    // Set the page straight to a scene's finished state, with quick fades.
    // Used for going back and for jumping; "next" plays each scene's own animation.
    applyState: function(n, done) {
        var model = this.model, Q = 300;
        var name = model.stages[n];
        cancelAnimationFrame(this.tween);
        function show(sel, on) {
            var el = $(sel).stop(true, true);
            if (on) el.fadeIn(Q); else el.fadeOut(Q);
        }

        $(".stage").stop(true, true).not("#stage-" + name).fadeOut(Q);
        $(".text-box p").removeClass("under-sun");
        Fx.turnEarth(n === 6 || n === 7);
        if (n === 0) $("#shade").stop(true, true).slideDown(Q); else $("#shade").stop(true, true).slideUp(Q);
        show("#earth-day", true);
        show("#earth-night", n >= 1 && n <= 5);
        show("#particles", n >= 2);
        show("#particle-detail", n === 2 || n === 3);
        if (n === 2 || n === 3) Fx.magnifier.setBeam(n === 3);
        $("#wavelength-chart").toggle(n === 5);

        if (n === 6 || n === 7) {
            model.set({ sunAngle: n === 6 ? 90 : 4 });
            model.set({ sunPosition: "sky" });
            Fx.showDock();
            Fx.startSky();
            this.skyText = n === 7 ? "other" : "blue";
        } else {
            Fx.hideDock();
            Fx.stopSky();
            model.set({ sunPosition: n >= 2 && n <= 5 ? "in" : "hidden" });
        }
        $("#next").text(n === 0 ? "GO" : n === SLUGS.length - 1 ? "Restart" : "GOT IT");

        setTimeout(function() {
            $("#stage-" + name).stop(true, true).fadeIn(Q, done);
        }, Q);
    },

    onAngle: function() {
        Fx.setAngle(this.model.get("sunAngle"));
    },

    onSlider: function(e) {
        var deg = +e.target.value;
        this.model.set("sunAngle", deg);
        var want = deg >= SKY_TEXT_SWITCH ? "blue" : "other";
        if (want !== this.skyText) {
            this.skyText = want;
            hideText(want === "blue" ? "#stage-skyothercolors" : "#stage-skyblue");
            showText(want === "blue" ? "#stage-skyblue" : "#stage-skyothercolors");
        }
        this.checkTextOverlap();
    },

    // Fade text that the sun is passing behind, so neither is lost.
    checkTextOverlap: function() {
        var s = $("#sun")[0].getBoundingClientRect();
        var cx = s.left + s.width / 2, cy = s.top + s.height / 2, r = s.width * 0.36;
        $("#daylight-text p, #sunset-text p").each(function() {
            // Test each line of text, so centered lines aren't caught by their empty margins.
            var range = document.createRange();
            range.selectNodeContents(this);
            var hit = s.width > 0 && _.some(range.getClientRects(), function(t) {
                var dx = Math.max(t.left - cx, 0, cx - t.right), dy = Math.max(t.top - cy, 0, cy - t.bottom);
                return t.width > 0 && dx * dx + dy * dy < r * r;
            });
            $(this).toggleClass("under-sun", hit);
        });
    },

    // Move the sun smoothly along its arc.
    tweenAngle: function(to, ms, done) {
        var model = this.model, from = model.get("sunAngle"), t0 = performance.now();
        cancelAnimationFrame(this.tween);
        if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) ms = 1;
        var view = this;
        function step(now) {
            var k = Math.min((now - t0) / ms, 1);
            var ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
            model.set("sunAngle", from + (to - from) * ease);
            if (k < 1) view.tween = requestAnimationFrame(step);
            else if (done) done();
        }
        this.tween = requestAnimationFrame(step);
    },

    showIntro: function(callback) {
        $("#stage-conclusion").hide();
        $("#earth-day").fadeIn(800);
        $("#shade").slideDown(800, function() {
            $("#stage-intro").fadeIn(600, callback);
        });
        $("#next").text("GO");
        this.model.set({sunPosition: "hidden"});
    },
    showNight: function(callback) {
        $("#stage-intro").fadeOut(600, function() {
            $("#shade").slideUp(800);
            $("#earth-night").fadeIn(800);
            $("#stage-night").delay(800).fadeIn(600, callback);
            $("#particle-detail:visible, #sun:visible, #particles:visible").fadeOut(800);
        });
        $("#next").text("GOT IT");
    },
    showParticles: function(callback) {
        var model = this.model;
        $("#stage-night").fadeOut(600, function() {
            model.set({sunPosition: "in"});
            $("#particles").fadeIn({
                "duration": 1000,
                "easing": "linear",
                "complete": function() {
                    $("#stage-particles").fadeIn(600, callback);
                    $("#particle-detail").fadeIn(600);
                    Fx.magnifier.setBeam(false);
                }
            });
        });
    },
    showScatter: function(callback) {
        $("#stage-particles").fadeOut(600, function() {
            $("#stage-scatter").fadeIn(600, function() {
                Fx.magnifier.setBeam(true);
                callback();
            });
        });
    },
    showRaleigh: function(callback) {
        $("#stage-scatter").fadeOut(600, function() {
            $("#particle-detail").fadeOut(400, function() {
                $("#stage-raleigh").fadeIn(600, callback);
            });
        });

    },
    showPhysics: function(callback) {
        $("#stage-raleigh").fadeOut(600, function() {
            $("#stage-physics").fadeIn(600, function() {
                $("#wavelength-chart").fadeIn(600, callback);
            });
        });
    },
    showSkyblue: function(callback) {
        var model = this.model, view = this;

        Fx.showDock();   // the chart shrinks into place on the Earth and stays
        Fx.turnEarth(true);   // the Earth turns to make room
        $("#stage-physics").fadeOut(600, function() {
            model.set({ sunAngle: 90 });
            model.set({ sunPosition: "sky" });
            $("#earth-night").fadeOut({"duration": 2400, "easing": "linear"});
            setTimeout(Fx.startSky, 1800);
            $("#stage-skyblue").delay(2400).fadeIn(600, callback);
        });
    },
    showSkyothercolors: function(callback) {
        var view = this;
        this.skyText = "other";
        this.tweenAngle(4, 2600);
        $("#stage-skyblue").delay(300).fadeOut(600, function() {
            $("#stage-skyothercolors").fadeIn(600, callback);
        });
    },
    showConclusion: function(callback) {
        var model = this.model;
        cancelAnimationFrame(this.tween);
        Fx.stopSky();
        Fx.hideDock();
        Fx.turnEarth(false);
        $("#sun, #observer").fadeOut(400);
        $("#stage-skyblue").fadeOut(600);
        $("#stage-skyothercolors").fadeOut(600);
        setTimeout(function() {
            $("#stage-conclusion").fadeIn(400, callback);
            model.set({ sunPosition: "hidden" });
        }, 620);
        $("#next").text("Restart");
    },

    enableButtons: function() {
        this.isEventsDisabled = false;
        this.undelegateEvents();
        this.delegateEvents(this.events);
        $(".bttn").removeClass("disabled").removeAttr("aria-disabled");
    },

    // While a scene animates in, the buttons dim and ignore presses. They stay
    // in place (rather than disappearing) so keyboard focus isn't lost.
    disableButtons: function() {
        this.isEventsDisabled = true;
        this.undelegateEvents();
        this.delegateEvents(this.eventsDisabled);
        $(".bttn").addClass("disabled").attr("aria-disabled", "true");
    },

    render: function() {
        var view = this;
        var n = this.model.get("currentStage");
        var from = this.model.previous("currentStage");
        var currentStageStr = this.model.getCurrentStage();
        var fn = 'show' + currentStageStr.charAt(0).toUpperCase() + currentStageStr.slice(1);
        function done() {
            view.enableButtons();
            view.afterStage();
        }

        if (n > 0) {
            this.disableButtons();
        }
        // Moving forward one scene (or restarting) plays that scene's own animation.
        var initial = !this.rendered;
        this.rendered = true;
        var forward = initial ? n === 0 : (n === from + 1 || (n === 0 && from === SLUGS.length - 1));
        if (forward) {
            this[fn](done);
            if (n === 0) this.afterStage();
        } else {
            this.applyState(n, done);
        }
        return this;
    }
});


enquire.register("screen and (max-width: 480px)", {
    match : function() {
        mq = 'phone';
    }
});

enquire.register("screen and (min-width: 481px) and (max-width: 767px)", {
    match : function() {
        mq = 'tablet';
    }
});

enquire.register("screen and (min-width: 768px) and (max-width: 1399px)", {
    match : function() {
        mq = 'desktop';
    }
});

enquire.register("screen and (min-width: 1400px)", {
    match : function() {
        mq = 'desktop-large';
    }
});


// keep the wrapper sized to the window, including after a resize or a
// load in a background tab (where the initial height can be 0)
function fitWrapper() {
    $("#wrapper").css({"height": $(window).height()});
}
$(window).on("resize", fitWrapper);
fitWrapper();

var model = new Model();
var view = new View({"model": model, el: "body"});

Fx.layout();   // now that the screen size and the sun's anchors are known

// Open at the scene named in the link, if any.
var startAt = _.indexOf(SLUGS, location.hash.slice(1));
if (startAt > 0) {
    model.set({ currentStage: startAt }, { silent: true });
}
view.render();

});
