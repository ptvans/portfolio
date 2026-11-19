/* ColorBrewer web tool — vanilla JS, no dependencies.
 * Color data: colorbrewer_schemes.js (global `colorbrewer`) and cmyk.js (global `cmyk`). */
(function () {
	"use strict";

	var SCHEMES = {
		sequential: ["BuGn", "BuPu", "GnBu", "OrRd", "PuBu", "PuBuGn", "PuRd", "RdPu", "YlGn", "YlGnBu", "YlOrBr", "YlOrRd"],
		singlehue: ["Blues", "Greens", "Greys", "Oranges", "Purples", "Reds"],
		diverging: ["BrBG", "PiYG", "PRGn", "PuOr", "RdBu", "RdGy", "RdYlBu", "RdYlGn", "Spectral"],
		qualitative: ["Accent", "Dark2", "Paired", "Pastel1", "Pastel2", "Set1", "Set2", "Set3"]
	};
	var MAX_CLASSES = { sequential: 9, diverging: 11, qualitative: 12 };
	var LEARN_TITLES = {
		number: "Number of data classes",
		schemes: "Types of color schemes",
		usability: "Usability icons",
		howtouse: "How to use: map diagnostics",
		credits: "Credits",
		downloads: "Downloads",
		context: "Map context and background"
	};
	var SCORES = [
		{ key: "blind", icon: "colorblind", ok: "Colorblind safe", maybe: "Possibly not colorblind safe", bad: "Not colorblind safe" },
		{ key: "copy", icon: "photocopy", ok: "Photocopy safe", maybe: "Possibly not photocopy safe", bad: "Not photocopy safe" },
		{ key: "screen", icon: "laptop", ok: "LCD friendly", maybe: "Possibly not LCD friendly", bad: "Not LCD friendly" },
		{ key: "print", icon: "colorprint", ok: "Print friendly", maybe: "Possibly not print friendly", bad: "Not print friendly" }
	];

	var state = {
		type: "sequential",
		scheme: "BuGn",
		n: 3,
		system: "hex",
		borders: true,
		borderColor: "#000000"
	};

	var $ = function (sel, root) { return (root || document).querySelector(sel); };
	var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

	var el = {
		num: $("#num-classes"),
		ramps: $("#ramps"),
		single: $("#singlehue"),
		singleGroup: $("#single-group"),
		multiLabel: $("#multi-label"),
		noMatch: $("#no-match"),
		name: $("#scheme-name"),
		scores: $("#scores"),
		swatches: $("#swatches"),
		permalink: $("#permalink"),
		js: $("#export-js"),
		css: $("#export-css"),
		ase: $("#ase"),
		gpl: $("#gpl"),
		map: $("#map-container"),
		counties: $("#counties"),
		overlays: $("#overlays"),
		probe: $("#probe"),
		transparency: $("#transparency"),
		transparencyOut: $("#transparency-out"),
		dialog: $("#learnmore"),
		toast: $("#toast")
	};

	// One stylesheet drives all map coloring, instead of restyling ~3,000 paths.
	var mapStyle = document.createElement("style");
	document.head.appendChild(mapStyle);

	/* ---------- color helpers ---------- */

	function parseRgb(c) {
		var m = c.match(/\d+/g);
		return { r: +m[0], g: +m[1], b: +m[2] };
	}
	function toHex(c) {
		var rgb = parseRgb(c);
		return "#" + ((1 << 24) | (rgb.r << 16) | (rgb.g << 8) | rgb.b).toString(16).slice(1);
	}
	function toRgb(c) {
		var rgb = parseRgb(c);
		return rgb.r + "," + rgb.g + "," + rgb.b;
	}
	function rgbToHsl(rgb) {
		var r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
		var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
		var h = 0, s = 0, l = (max + min) / 2;
		if (d) {
			s = d / (1 - Math.abs(2 * l - 1));
			h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
			h = (h * 60 + 360) % 360;
		}
		return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
	}
	// HCL = CIE LCh(ab), D65 white — the same space as d3.hcl() and CSS lch().
	function rgbToHcl(rgb) {
		function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
		var r = lin(rgb.r), g = lin(rgb.g), b = lin(rgb.b);
		var x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
		var y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
		var z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883;
		function f(t) { return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116; }
		var fx = f(x), fy = f(y), fz = f(z);
		var L = 116 * fy - 16, A = 500 * (fx - fy), B = 200 * (fy - fz);
		var C = Math.sqrt(A * A + B * B);
		var H = C < 0.5 ? 0 : (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
		return { h: Math.round(H), c: Math.round(C), l: Math.round(L) };
	}
	function colorsOf(scheme, n) { return (colorbrewer[scheme] && colorbrewer[scheme][n]) || null; }
	function formatColor(scheme, n, i, system) {
		var c = colorbrewer[scheme][n][i];
		if (system === "cmyk") return cmyk[scheme][n][i].join(",");
		if (system === "rgb") return toRgb(c);
		if (system === "hsl") { var hsl = rgbToHsl(parseRgb(c)); return hsl.h + "," + hsl.s + "%," + hsl.l + "%"; }
		if (system === "hcl") { var hcl = rgbToHcl(parseRgb(c)); return hcl.h + "," + hcl.c + "," + hcl.l; }
		return toHex(c);
	}
	// A CSS color string for the JS array export in the current format.
	function cssColor(c, system) {
		var rgb = parseRgb(c);
		if (system === "rgb" || system === "cmyk") return "rgb(" + toRgb(c) + ")";
		if (system === "hsl") { var hsl = rgbToHsl(rgb); return "hsl(" + hsl.h + "," + hsl.s + "%," + hsl.l + "%)"; }
		if (system === "hcl") { var hcl = rgbToHcl(rgb); return "lch(" + hcl.l + "% " + hcl.c + " " + hcl.h + ")"; }
		return toHex(c);
	}

	/* ---------- scheme properties ---------- */

	function property(scheme, key, n) {
		var p = colorbrewer[scheme].properties[key];
		return p.length > 1 ? p[n - 3] : p[0];
	}
	function passesFilters(scheme) {
		if (!colorsOf(scheme, state.n)) return false;
		if ($("#blindcheck").checked && property(scheme, "blind", state.n) !== 1) return false;
		if ($("#printcheck").checked && property(scheme, "print", state.n) !== 1) return false;
		if ($("#copycheck").checked && property(scheme, "copy", state.n) !== 1) return false;
		return true;
	}

	/* ---------- rendering ---------- */

	function rampButton(scheme) {
		var colors = colorbrewer[scheme][5];
		var b = document.createElement("button");
		b.type = "button";
		b.className = "ramp";
		b.dataset.scheme = scheme;
		b.setAttribute("role", "radio");
		b.setAttribute("aria-label", scheme);
		b.title = scheme;
		b.innerHTML = colors.map(function (c) { return "<span style='background:" + c + "'></span>"; }).join("");
		return b;
	}

	function renderRamps() {
		var multi = SCHEMES[state.type].filter(passesFilters);
		var single = state.type === "sequential" ? SCHEMES.singlehue.filter(passesFilters) : [];

		el.ramps.replaceChildren.apply(el.ramps, multi.map(rampButton));
		el.single.replaceChildren.apply(el.single, single.map(rampButton));
		el.singleGroup.hidden = state.type !== "sequential";
		el.multiLabel.hidden = state.type !== "sequential";

		var available = multi.concat(single);
		el.noMatch.hidden = available.length > 0;
		document.body.classList.toggle("no-scheme", !available.length);

		if (!available.length) { clearScheme(); return; }
		setScheme(available.indexOf(state.scheme) >= 0 ? state.scheme : available[0]);
	}

	function clearScheme() {
		mapStyle.textContent = "#county-map path{fill:#ccc}";
		el.name.textContent = "No matching scheme";
		el.scores.replaceChildren();
		el.swatches.replaceChildren();
	}

	function setScheme(scheme) {
		state.scheme = scheme;
		$$(".ramp").forEach(function (b) {
			var on = b.dataset.scheme === scheme;
			b.classList.toggle("selected", on);
			b.setAttribute("aria-checked", on);
			b.tabIndex = on ? 0 : -1;
		});
		el.name.textContent = state.n + "-class " + scheme;
		applyMapColors();
		renderScores();
		renderSwatches();
		renderExports();
		history.replaceState(null, "", "#type=" + state.type + "&scheme=" + scheme + "&n=" + state.n);
		el.permalink.value = location.href;
	}

	function applyMapColors() {
		var colors = colorsOf(state.scheme, state.n);
		if (!colors) return;
		var css = colors.map(function (c, i) {
			var sel = "#county-map .q" + i + "-" + state.n;
			return state.borders ? sel + "{fill:" + c + "}" : sel + "{fill:" + c + ";stroke:" + c + ";stroke-width:1}";
		}).join("\n");
		css += "\n#county-map g{stroke:" + state.borderColor + "}";
		mapStyle.textContent = css;
	}

	function renderScores() {
		el.scores.replaceChildren.apply(el.scores, SCORES.map(function (s) {
			var v = property(state.scheme, s.key, state.n);
			var level = v === 1 ? "ok" : v === 2 ? "maybe" : "bad";
			var suffix = level === "ok" ? "" : level === "bad" ? "_avoid" : "_maybe";
			var li = document.createElement("li");
			li.className = "score " + level;
			li.innerHTML = "<img src='images/" + s.icon + suffix + ".png' alt='' width='27' height='27'><span>" + s[level] + "</span>";
			return li;
		}));
	}

	function renderSwatches() {
		var colors = colorbrewer[state.scheme][state.n];
		el.swatches.replaceChildren.apply(el.swatches, colors.map(function (c, i) {
			var value = formatColor(state.scheme, state.n, i, state.system);
			var li = document.createElement("li");
			var b = document.createElement("button");
			b.type = "button";
			b.className = "swatch";
			b.dataset.value = value;
			b.setAttribute("aria-label", "Copy " + value);
			b.innerHTML = "<span class='chip' style='background:" + c + "'></span><code>" + value + "</code>";
			li.appendChild(b);
			return li;
		}));
	}

	function renderExports() {
		var colors = colorbrewer[state.scheme][state.n];
		el.js.value = "[" + colors.map(function (c) { return "'" + cssColor(c, state.system) + "'"; }).join(",") + "]";
		el.css.value = colors.map(function (c, i) {
			return "." + state.scheme + " .q" + i + "-" + state.n + "{fill:" + c + "}";
		}).join(" ");
		el.ase.href = "export/ase/" + state.scheme + "_" + state.n + ".ase";
		el.gpl.href = "export/gpl/" + state.scheme + "_" + state.n + ".gpl";
	}

	/* ---------- state changes ---------- */

	function setType(type) {
		if (!MAX_CLASSES[type]) type = "sequential";
		state.type = type;
		$$("#scheme-type input").forEach(function (r) { r.checked = r.value === type; });
		var max = MAX_CLASSES[type];
		$$("#num-classes option").forEach(function (o) { o.disabled = +o.value > max; });
		if (state.n > max) state.n = max;
		el.num.value = state.n;
		renderRamps();
	}

	function setClasses(n) {
		n = Math.max(3, Math.min(MAX_CLASSES[state.type], parseInt(n, 10) || 3));
		state.n = n;
		el.num.value = n;
		renderRamps();
	}

	/* ---------- map ---------- */

	function loadSvg(url) {
		return fetch(url).then(function (r) {
			if (!r.ok) throw new Error(url + " " + r.status);
			return r.text();
		}).then(function (text) {
			var svg = new DOMParser().parseFromString(text, "image/svg+xml").documentElement;
			svg.setAttribute("viewBox", "0 0 756 581");
			svg.removeAttribute("width");
			svg.removeAttribute("height");
			svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
			return document.importNode(svg, true);
		});
	}

	var countySvg, highlight;
	loadSvg("map/map.svg").then(function (svg) {
		countySvg = svg;
		svg.id = "county-map";
		svg.setAttribute("role", "img");
		svg.setAttribute("aria-label", "Choropleth map of US counties colored with the selected scheme");
		el.counties.appendChild(svg);
		el.map.classList.remove("loading");
		initProbe(svg);
		applyMapColors();
	}).catch(function (err) {
		el.map.classList.remove("loading");
		el.map.classList.add("error");
		console.error(err);
	});

	function classIndexOf(path) {
		var m = path.getAttribute("class").match(new RegExp("q(\\d+)-" + state.n + "(\\s|$)"));
		return m ? +m[1] : -1;
	}

	function initProbe(svg) {
		var g = svg.querySelector("g");
		var pinned = false;

		function show(path, x, y) {
			var i = classIndexOf(path);
			if (i < 0 || !colorsOf(state.scheme, state.n)) return;
			el.probe.innerHTML = "<strong>" + state.scheme + " class " + (i + 1) + "</strong>" +
				"<span><span class='chip' style='background:" + colorbrewer[state.scheme][state.n][i] + "'></span>" + formatColor(state.scheme, state.n, i, "hex") + "</span>" +
				"<span>RGB " + formatColor(state.scheme, state.n, i, "rgb") + "</span>" +
				"<span>CMYK " + formatColor(state.scheme, state.n, i, "cmyk") + "</span>" +
				"<span>HSL " + formatColor(state.scheme, state.n, i, "hsl") + "</span>" +
				"<span>HCL " + formatColor(state.scheme, state.n, i, "hcl") + "</span>";
			if (highlight) highlight.remove();
			highlight = path.cloneNode();
			highlight.classList.add("highlight");
			g.appendChild(highlight);
			el.probe.hidden = false;
			move(x, y);
		}
		function move(x, y) {
			var box = el.map.getBoundingClientRect();
			var px = x - box.left, py = y - box.top;
			var w = el.probe.offsetWidth, h = el.probe.offsetHeight;
			var left = px + 14 + w > box.width ? px - w - 14 : px + 14;
			var top = py - h - 14 < 0 ? py + 14 : py - h - 14;
			el.probe.style.transform = "translate(" + Math.max(4, left) + "px," + Math.max(4, top) + "px)";
		}
		function hide() {
			el.probe.hidden = true;
			if (highlight) { highlight.remove(); highlight = null; }
			pinned = false;
		}

		// Mouse: hover. Touch/pen: tap a county to pin its tooltip, tap elsewhere to clear.
		g.addEventListener("pointerover", function (e) {
			if (e.pointerType !== "mouse" || e.target.tagName !== "path" || e.target === highlight) return;
			show(e.target, e.clientX, e.clientY);
		});
		g.addEventListener("pointermove", function (e) {
			if (e.pointerType === "mouse" && !el.probe.hidden) move(e.clientX, e.clientY);
		});
		g.addEventListener("pointerout", function (e) {
			if (e.pointerType === "mouse" && !g.contains(e.relatedTarget)) hide();
		});
		svg.addEventListener("click", function (e) {
			if (e.pointerType === "mouse") return;
			if (e.target.tagName === "path" && e.target !== highlight) { show(e.target, e.clientX, e.clientY); pinned = true; }
			else hide();
		});
		document.addEventListener("pointerdown", function (e) {
			if (pinned && !el.map.contains(e.target)) hide();
		});
		window.addEventListener("scroll", function () { if (pinned) hide(); }, { passive: true });
	}

	var overlaysLoaded = null;
	function ensureOverlays() {
		if (!overlaysLoaded) {
			overlaysLoaded = loadSvg("map/overlays.svg").then(function (svg) {
				el.overlays.appendChild(svg);
				return svg;
			});
		}
		return overlaysLoaded;
	}

	function updateLayers() {
		var roads = $("#roadscheck").checked, cities = $("#citiescheck").checked;
		if (roads || cities) {
			ensureOverlays().then(function (svg) {
				var r = svg.querySelector("#roads"), c = svg.querySelector("#cities");
				r.style.display = $("#roadscheck").checked ? "" : "none";
				c.style.display = $("#citiescheck").checked ? "" : "none";
				svg.querySelector("#road-lines").style.stroke = $("#road-color").value;
				c.style.fill = $("#city-color").value;
			});
		} else if (overlaysLoaded) {
			overlaysLoaded.then(function (svg) {
				svg.querySelector("#roads").style.display = "none";
				svg.querySelector("#cities").style.display = "none";
			});
		}
	}

	function setTransparency(pct) {
		el.transparency.value = pct;
		el.transparencyOut.textContent = pct + "%";
		el.map.style.setProperty("--county-opacity", 1 - pct / 100);
	}

	function setBackground(kind) {
		var terrain = kind === "terrain";
		el.map.classList.toggle("terrain", terrain);
		if (terrain && countySvg && !countySvg.querySelector("#terrain-img")) {
			var img = document.createElementNS("http://www.w3.org/2000/svg", "image");
			img.id = "terrain-img";
			img.setAttribute("href", "map/terrain.jpg");
			img.setAttribute("x", -31);
			img.setAttribute("y", -58);
			img.setAttribute("width", 835);
			img.setAttribute("height", 683);
			countySvg.insertBefore(img, countySvg.querySelector("g"));
		}
		// Terrain is invisible under opaque colors, so start it half transparent.
		if (terrain && +el.transparency.value === 0) setTransparency(50);
		if (!terrain && +el.transparency.value === 50) setTransparency(0);
	}

	/* ---------- learn more dialog ---------- */

	function openLearnMore(page) {
		$("#learnmore-title").textContent = LEARN_TITLES[page] || "";
		var content = $("#learnmore-content");
		content.textContent = "Loading…";
		if (el.dialog.showModal) el.dialog.showModal(); else el.dialog.setAttribute("open", "");
		fetch("learnmore/" + page + ".html").then(function (r) { return r.text(); }).then(function (html) {
			var doc = new DOMParser().parseFromString(html, "text/html");
			$$("img[src]", doc).forEach(function (img) {
				var src = img.getAttribute("src");
				if (!/^(https?:|\/|learnmore\/|images\/)/.test(src)) img.setAttribute("src", "learnmore/" + src);
			});
			$$("a[href^='http']", doc).forEach(function (a) { a.target = "_blank"; a.rel = "noopener"; });
			content.replaceChildren.apply(content, Array.prototype.slice.call(doc.body.childNodes));
		}).catch(function () { content.textContent = "Couldn't load this page."; });
	}

	/* ---------- copy ---------- */

	var toastTimer;
	function toast(msg) {
		el.toast.textContent = msg;
		el.toast.classList.add("show");
		clearTimeout(toastTimer);
		toastTimer = setTimeout(function () { el.toast.classList.remove("show"); }, 1600);
	}
	function copy(text, label) {
		var done = function () { toast("Copied " + label); };
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
		} else { fallbackCopy(text); done(); }
	}
	function fallbackCopy(text) {
		var ta = document.createElement("textarea");
		ta.value = text;
		ta.setAttribute("readonly", "");
		ta.style.position = "fixed"; ta.style.opacity = "0";
		document.body.appendChild(ta);
		ta.select();
		try { document.execCommand("copy"); } catch (e) { /* ignore */ }
		ta.remove();
	}

	/* ---------- events ---------- */

	el.num.addEventListener("change", function () { setClasses(this.value); });
	$$("#scheme-type input").forEach(function (r) {
		r.addEventListener("change", function () { setType(this.value); });
	});
	$$("#filters input").forEach(function (c) { c.addEventListener("change", renderRamps); });
	$$("#color-system input").forEach(function (r) {
		r.addEventListener("change", function () {
			state.system = this.value;
			renderSwatches();
			renderExports();
		});
	});

	function onRampClick(e) {
		var b = e.target.closest(".ramp");
		if (b) setScheme(b.dataset.scheme);
	}
	el.ramps.addEventListener("click", onRampClick);
	el.single.addEventListener("click", onRampClick);
	// Arrow keys move between ramps, like a radio group.
	$(".ramp-groups").addEventListener("keydown", function (e) {
		var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
		if (!keys[e.key] || !e.target.classList.contains("ramp")) return;
		e.preventDefault();
		var all = $$(".ramp");
		var next = all[(all.indexOf(e.target) + keys[e.key] + all.length) % all.length];
		setScheme(next.dataset.scheme);
		next.focus();
	});

	el.swatches.addEventListener("click", function (e) {
		var b = e.target.closest(".swatch");
		if (b) copy(b.dataset.value, b.dataset.value);
	});
	$$("button.copy").forEach(function (b) {
		b.addEventListener("click", function () {
			var input = document.getElementById(b.dataset.copy);
			copy(input.value, input.labels[0].textContent.toLowerCase());
		});
	});
	$$(".export input").forEach(function (i) {
		i.addEventListener("focus", function () { this.select(); });
	});

	$("#borderscheck").addEventListener("change", function () { state.borders = this.checked; applyMapColors(); });
	$("#border-color").addEventListener("input", function () { state.borderColor = this.value; applyMapColors(); });
	$("#roadscheck").addEventListener("change", updateLayers);
	$("#citiescheck").addEventListener("change", updateLayers);
	$("#road-color").addEventListener("input", updateLayers);
	$("#city-color").addEventListener("input", updateLayers);
	$("#bg-color").addEventListener("input", function () { el.map.style.setProperty("--map-bg", this.value); });
	$$("input[name=background]").forEach(function (r) {
		r.addEventListener("change", function () { setBackground(this.value); });
	});
	el.transparency.addEventListener("input", function () { setTransparency(+this.value); });

	$$("[data-learn]").forEach(function (b) {
		b.addEventListener("click", function () { openLearnMore(b.dataset.learn); });
	});
	$("#close").addEventListener("click", function () { el.dialog.close(); });
	el.dialog.addEventListener("click", function (e) { if (e.target === el.dialog) el.dialog.close(); });

	/* ---------- init ---------- */

	// Map options start collapsed on phones so the scheme picker comes first.
	if (window.matchMedia("(max-width: 759px)").matches) $(".map-options").open = false;

	// Accept both #type=…&scheme=…&n=… and the older ?type=… permalinks.
	var currentHash;
	function readUrl() {
		if (location.hash === currentHash) return;
		var params = new URLSearchParams(location.hash.slice(1) || location.search.slice(1));
		state.type = MAX_CLASSES[params.get("type")] ? params.get("type") : "sequential";
		state.n = parseInt(params.get("n"), 10) || 3;
		if (colorbrewer[params.get("scheme")]) state.scheme = params.get("scheme");
		setType(state.type);
		setClasses(state.n);
		currentHash = location.hash;
	}
	window.addEventListener("hashchange", readUrl);
	readUrl();
})();
