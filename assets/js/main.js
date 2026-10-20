(function () {
  // Header: sits at the top of the hero; once scrolled out of view a compact copy slides in and stays (is-stuck)
  var header = document.querySelector(".site-header");
  var stickAt = 0;
  // phones: the header is always fixed (CSS), so it only needs to darken once the page moves
  var phoneHeader = window.matchMedia("(max-width: 920px)");
  function measureHeader() { header.classList.remove("is-stuck"); stickAt = phoneHeader.matches ? 8 : header.offsetHeight + 80; onScroll(); }
  function onScroll() { header.classList.toggle("is-stuck", window.scrollY > stickAt); }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measureHeader);
  measureHeader();

  // Mobile menu
  var toggle = document.getElementById("menu-toggle");
  var links = document.getElementById("nav-links");
  function setMenu(open) {
    links.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  toggle.addEventListener("click", function () { setMenu(!links.classList.contains("open")); });
  links.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  document.addEventListener("click", function (e) { if (links.classList.contains("open") && !e.target.closest(".nav")) setMenu(false); });

  // Header: the link of the section in view gets .active (the glowing underline). Decided at the middle of the screen.
  var navLinks = Array.prototype.filter.call(links.querySelectorAll('a[href^="#"]'), function (a) {
    return a.hash.length > 1 && document.querySelector(a.hash);
  });
  if (navLinks.length && "IntersectionObserver" in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = "#" + entry.target.id;
        navLinks.forEach(function (a) { a.classList.toggle("active", a.hash === id); });
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    navLinks.forEach(function (a) { spy.observe(document.querySelector(a.hash)); });
  }

  // Scroll reveal (staggered inside a group)
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) {
      var siblings = el.parentElement ? el.parentElement.querySelectorAll(":scope > .reveal") : [];
      var i = Array.prototype.indexOf.call(siblings, el);
      el.style.transitionDelay = (Math.max(0, i) * 110) + "ms";
      io.observe(el);
    });
  } else {
    items.forEach(function (el) { el.classList.add("visible"); });
  }

  // Message form (the enquiry modal): inline validation per field, live counter, sending and
  // success states; both post to api/contact.php. Returns { reset } so the modal can clear the form when it closes.
  var wireMessageForm = function (form) {
    var status = form.querySelector(".form-status");
    var success = form.querySelector(".cx-success");
    var setStatus = function (kind, text) { status.className = "form-status" + (kind ? " " + kind : ""); status.textContent = text; };
    var rules = {
      name: function (v) { return v.trim().length >= 2 ? "" : "Please enter your name."; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Please enter a valid email address."; },
      subject: function (v) { return v.trim().length >= 3 ? "" : "Please enter a subject."; },
      message: function (v) { return v.trim().length >= 10 ? "" : "Please write at least 10 characters."; }
    };
    var fieldBox = function (name) { return form.querySelector('.cx-field[data-field="' + name + '"]'); };
    var showError = function (name, msg) {
      var box = fieldBox(name); if (!box) return;
      box.classList.toggle("is-invalid", !!msg); box.classList.toggle("is-valid", !msg);
      var err = box.querySelector(".cx-error"); if (err) err.textContent = msg || "";
    };
    var validate = function (name, value) { var msg = rules[name] ? rules[name](value) : ""; showError(name, msg); return !msg; };
    Object.keys(rules).forEach(function (name) {
      var el = form.elements[name]; if (!el) return;
      var touched = false;
      el.addEventListener("blur", function () { touched = true; validate(name, el.value); });
      el.addEventListener("input", function () { if (touched || fieldBox(name).classList.contains("is-invalid")) validate(name, el.value); });
      el.addEventListener("change", function () { if (touched) validate(name, el.value); });
    });
    var msgEl = form.elements.message, count = form.querySelector(".cx-count span"), countWrap = form.querySelector(".cx-count");
    var updateCount = function () {
      if (!msgEl || !count) return;
      count.textContent = msgEl.value.length; countWrap.classList.toggle("near", msgEl.value.length > 1800);
    };
    if (msgEl && count) { msgEl.addEventListener("input", updateCount); updateCount(); }
    var clearFields = function () {
      form.reset(); updateCount(); setStatus("", "");
      form.querySelectorAll(".cx-field").forEach(function (b) { b.classList.remove("is-valid", "is-invalid"); });
    };
    var btn = form.querySelector(".cx-submit"), btnText = form.querySelector(".cx-btn-text"), btnLabel = btnText.textContent;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true, first = null;
      Object.keys(rules).forEach(function (name) { if (!validate(name, form.elements[name].value)) { ok = false; first = first || form.elements[name]; } });
      if (!ok) { setStatus("err", "Please fix the highlighted fields."); if (first) first.focus(); return; }
      btn.disabled = true; form.classList.add("is-sending"); btnText.textContent = "Sending"; setStatus("", "");
      fetch(form.getAttribute("action"), { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) { return r.json().catch(function () { return { ok: false, error: "Unexpected response from the server." }; }); })
        .then(function (data) {
          if (data.ok) {
            clearFields();
            success.hidden = false; success.setAttribute("tabindex", "-1"); success.focus();
          } else {
            if (data.fields) Object.keys(data.fields).forEach(function (k) { showError(k, data.fields[k]); });
            setStatus("err", data.error || "Something went wrong. Please try again.");
          }
        })
        .catch(function () { setStatus("err", "Network error. Please check your connection and try again."); })
        .finally(function () { btn.disabled = false; form.classList.remove("is-sending"); btnText.textContent = btnLabel; });
    });
    var again = form.querySelector(".cx-again:not([data-enquiry-close])");
    if (again) again.addEventListener("click", function () { success.hidden = true; setStatus("", ""); form.elements.name.focus(); });
    return { reset: function () { clearFields(); success.hidden = true; } };
  };

  // Enquiry modal: opened by every [data-enquiry] (header button, phone menu), closed by its buttons, Escape or a
  // click on the backdrop. Focus returns to the opener. Browsers without <dialog> go to the How it works section instead.
  var enq = document.getElementById("enquiry-modal");
  var enqForm = document.getElementById("enquiry-form");
  var openers = document.querySelectorAll("[data-enquiry]");
  if (enq && enqForm && typeof enq.showModal === "function") {
    var enqCtl = wireMessageForm(enqForm);
    var enqOpener = null;
    var openEnq = function (e) {
      e.preventDefault();
      enqOpener = e.currentTarget;
      setMenu(false);
      enq.showModal();
      document.body.classList.add("enq-open");
      setTimeout(function () { enqForm.elements.name.focus(); }, 60);
    };
    Array.prototype.forEach.call(openers, function (b) { b.addEventListener("click", openEnq); });
    enq.querySelectorAll("[data-enquiry-close]").forEach(function (b) { b.addEventListener("click", function () { enq.close(); }); });
    enq.addEventListener("click", function (e) { if (e.target === enq) enq.close(); });
    enq.addEventListener("close", function () {
      document.body.classList.remove("enq-open");
      enqCtl.reset();
      if (enqOpener && enqOpener.focus) enqOpener.focus();
    });
  } else {
    Array.prototype.forEach.call(openers, function (b) { b.addEventListener("click", function () { location.hash = "#get-started"; }); });
  }

  // Newsletter: posts to api/subscribe.php and shows the answer next to the field.
  var sub = document.querySelector("form.subscribe");
  if (sub) {
    sub.setAttribute("action", "api/subscribe.php");
    var note = document.createElement("p");
    note.className = "sub-status"; note.setAttribute("role", "status"); note.setAttribute("aria-live", "polite");
    sub.appendChild(note);
    sub.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = sub.querySelector("input[name=email]"), btn = sub.querySelector("button");
      btn.disabled = true; note.className = "sub-status"; note.textContent = "Subscribing…";
      fetch(sub.getAttribute("action"), { method: "POST", body: new FormData(sub), headers: { Accept: "application/json" } })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (data) {
          note.className = "sub-status " + (data.ok ? "ok" : "err");
          note.textContent = data.ok ? data.message : (data.error || "Could not subscribe. Please try again.");
          if (data.ok) input.value = "";
        })
        .catch(function () { note.className = "sub-status err"; note.textContent = "Network error. Please try again."; })
        .finally(function () { btn.disabled = false; });
    });
  }

  document.getElementById("year").textContent = new Date().getFullYear();

  // Explore list: all rows closed; a row opens only while hovered or focused, and closes when the pointer leaves
  var exploreItems = document.querySelectorAll(".explore-item");
  if (exploreItems.length) {
    var openItem = function (item) {
      exploreItems.forEach(function (it) {
        var on = it === item;
        it.classList.toggle("is-open", on);
        it.querySelector(".explore-row").setAttribute("aria-expanded", String(on));   // the tags row shows while open
      });
    };
    exploreItems.forEach(function (item, i) {
      var row = item.querySelector(".explore-row");
      row.addEventListener("pointerenter", function () { openItem(item); });
      row.addEventListener("focus", function () { openItem(item); });
      item.addEventListener("pointerleave", function () { if (!item.contains(document.activeElement)) openItem(null); });
      row.addEventListener("blur", function () { setTimeout(function () { if (!item.matches(":hover") && !item.contains(document.activeElement)) openItem(null); }, 0); });
      row.addEventListener("keydown", function (e) {
        var next = e.key === "ArrowDown" ? i + 1 : e.key === "ArrowUp" ? i - 1 : -1;
        if (next >= 0 && next < exploreItems.length) { e.preventDefault(); exploreItems[next].querySelector(".explore-row").focus(); }
      });
    });
  }

  // Reader: a reading panel opened by any [data-read] link (the "Find out more" rows and the Getting started step
  // links). Panels carry data-group; previous / next walk only the panels of the group that was opened.
  var reader = document.getElementById("explore-reader");
  if (reader && typeof reader.showModal === "function") {
    var panels = Array.prototype.slice.call(reader.querySelectorAll(".rd-article"));
    var titles = { foundation: "Foundation", blogs: "Blogs", announcements: "Announcements", faqs: "FAQs",
                   wallet: "Choose your wallet", setup: "Configure your wallet", get: "Get some SevaCoin",
                   data: "Secure patient data", wellness: "Wellness incentives", governance: "Governance" };
    var groupNames = { explore: "Explore", steps: "Getting started", about: "What is SevaCoin?" };
    var rdBody = reader.querySelector(".rd-body"), rdOpener = null, group = [], current = 0;
    var showPanel = function (i) {
      current = (i + group.length) % group.length;
      var id = group[current].dataset.panel;
      panels.forEach(function (p) { p.hidden = p !== group[current]; });
      document.getElementById("rd-crumb-group").textContent = groupNames[group[current].dataset.group] || "";
      document.getElementById("rd-crumb-now").textContent = titles[id];
      document.getElementById("rd-prev-name").textContent = titles[group[(current - 1 + group.length) % group.length].dataset.panel];
      document.getElementById("rd-next-name").textContent = titles[group[(current + 1) % group.length].dataset.panel];
      reader.setAttribute("aria-label", titles[id]);
      rdBody.scrollTop = 0;
    };
    document.querySelectorAll("a[data-read]").forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        var target = reader.querySelector('.rd-article[data-panel="' + link.dataset.read + '"]');
        if (!target) return;
        rdOpener = link;
        group = panels.filter(function (p) { return p.dataset.group === target.dataset.group; });
        showPanel(group.indexOf(target));
        reader.showModal();
        document.body.classList.add("rd-open");
        rdBody.focus();
      });
    });
    reader.querySelectorAll("[data-reader-step]").forEach(function (b) {
      b.addEventListener("click", function () { showPanel(current + parseInt(b.dataset.readerStep, 10)); rdBody.focus(); });
    });
    reader.querySelectorAll("[data-reader-close]").forEach(function (b) { b.addEventListener("click", function () { reader.close(); }); });
    reader.addEventListener("click", function (e) { if (e.target === reader) reader.close(); });
    // "Ask us a question" closes the reader first, then the enquiry modal opens from its own [data-enquiry] handler
    var ask = reader.querySelector(".rd-ask");
    if (ask) ask.addEventListener("click", function () { rdOpener = null; reader.close(); }, true);
    reader.addEventListener("close", function () {
      document.body.classList.remove("rd-open");
      if (rdOpener) rdOpener.focus();
    });
  }

  // Mission video: the card opens a modal and plays the video; closing stops it. The file only loads on first play.
  var vd = document.getElementById("video-modal");
  var vdOpener = document.querySelector(".mission-video[data-video]");
  if (vd && vdOpener) {
    var player = vd.querySelector("video");
    if (typeof vd.showModal !== "function") {
      vdOpener.addEventListener("click", function () { window.open(vdOpener.dataset.video, "_blank", "noopener"); });
    } else {
      vdOpener.addEventListener("click", function () {
        // load explicitly: if the browser blocks autoplay, the video is still ready behind its play control
        if (!player.getAttribute("src")) { player.preload = "auto"; player.setAttribute("src", vdOpener.dataset.video); player.load(); }
        vd.showModal();
        document.body.classList.add("enq-open");
        var p = player.play(); if (p && p.catch) p.catch(function () {});
      });
      vd.querySelector("[data-video-close]").addEventListener("click", function () { vd.close(); });
      vd.addEventListener("click", function (e) { if (e.target === vd) vd.close(); });
      vd.addEventListener("close", function () { player.pause(); document.body.classList.remove("enq-open"); vdOpener.focus(); });
    }
  }

  // Why section: the whole scene tilts a little towards the pointer (eased by CSS)
  var whyFrame = document.querySelector(".why-frame");
  if (whyFrame && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var whySection = whyFrame.closest("section");
    whySection.addEventListener("pointermove", function (e) {
      var r = whyFrame.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      whyFrame.style.setProperty("--rx", (x * 3).toFixed(2) + "deg");
      whyFrame.style.setProperty("--ry", (-y * 2.2).toFixed(2) + "deg");
    });
    whySection.addEventListener("pointerleave", function () {
      ["--rx", "--ry"].forEach(function (k) { whyFrame.style.setProperty(k, "0deg"); });
    });
  }

  // Hero fallback coins (shown only when the 3D scene is not running): one coin per network node that
  // carries data-coin, placed on that node and landing when the node lights (its --d).
  // They live inside .globe-fixed (with the picture and the strings) so they drift with the globe; that wrapper is
  // scaled down by CSS, so --k (1 / that scale) keeps the coin sizes the same fraction of the stage.
  var wrap = document.querySelector(".globe-fixed");
  var net = document.querySelector(".network");
  if (wrap && net && window.DOMPoint) {
    var coins = [];
    var wrapScale = function () { try { return new DOMMatrix(getComputedStyle(wrap).transform).a || 1; } catch (e) { return 1; } };
    wrap.style.setProperty("--k", String(1 / wrapScale()));
    net.querySelectorAll(".node[data-coin]").forEach(function (n, i) {
      var el = document.createElement("div");
      el.className = "coin coin-s";
      el.style.setProperty("--w", (parseFloat(n.dataset.coin) * 100) + "%");
      el.style.setProperty("--d", n.style.getPropertyValue("--d"));
      el.style.setProperty("--ry", ((i % 2 ? 14 : -14) + (i % 3) * 4) + "deg");
      el.style.setProperty("--rz", (((i % 4) - 1.5) * 4) + "deg");
      el.style.setProperty("--f", (5.5 + (i % 5) * 0.6) + "s");
      el.innerHTML = '<img src="assets/brand/seva-coin-icon-simple.svg" alt="">';
      wrap.appendChild(el);
      coins.push({ el: el, x: +n.getAttribute("cx"), y: +n.getAttribute("cy") });
    });
    // The main coin sits on the hub where every string starts (the "M" of the paths)
    var mainCoin = wrap.querySelector(".coin-main");
    if (mainCoin) coins.push({ el: mainCoin, x: 1110, y: 400 });
    // SVG units -> % of the wrapper box, through the SVG's own matrix (covers the viewBox "slice" fit; the wrapper's
    // CSS transform applies to the coins as well, so it is left out on purpose)
    var placeCoins = function () {
      var m = net.getCTM(), w = net.clientWidth, h = net.clientHeight;
      if (!m || !w) return;
      coins.forEach(function (c) {
        var p = new DOMPoint(c.x, c.y).matrixTransform(m);
        c.el.style.left = (p.x / w * 100) + "%";
        c.el.style.top = (p.y / h * 100) + "%";
      });
      wrap.classList.add("coins-placed");
    };
    placeCoins();
    window.addEventListener("resize", placeCoins);
  }

  // Hero SEVA Coin (assets/coin): kept over the hub where every string starts (1110 x 400 in the network's
  // coordinates). It sits above the globe layer so its buttons and hover tilt work; while the hero is on screen it
  // follows the globe's slow drift and pointer parallax.
  var heroCoin = document.querySelector(".hero-coin");
  var heroEl = document.querySelector(".hero");
  if (heroCoin && net && heroEl && window.DOMPoint) {
    var placeHeroCoin = function () {
      var m = net.getScreenCTM();
      if (!m) return;
      var p = new DOMPoint(1110, 400).matrixTransform(m), r = heroEl.getBoundingClientRect();
      heroCoin.style.left = (p.x - r.left).toFixed(1) + "px";
      heroCoin.style.top = (p.y - r.top).toFixed(1) + "px";
      heroCoin.classList.add("is-placed");
    };
    placeHeroCoin();
    window.addEventListener("resize", placeHeroCoin);
    window.addEventListener("load", placeHeroCoin);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
      var heroOn = false, follow = function () { if (!heroOn) return; placeHeroCoin(); requestAnimationFrame(follow); };
      new IntersectionObserver(function (en) { var was = heroOn; heroOn = en[0].isIntersecting; if (heroOn && !was) follow(); }).observe(heroEl);
    }
  }

  // Language dropdown: flag + code button, list of flags; switching runs GTranslate (doGTranslate('en|xx'))
  var lang = document.getElementById("lang");
  if (lang) {
    var lbtn = lang.querySelector(".lang-btn"), llist = lang.querySelector(".lang-list");
    var opts = Array.prototype.slice.call(llist.querySelectorAll("li"));
    var EN = { lang: "en", code: "EN", flag: lbtn.querySelector("img").getAttribute("src").replace(/[^/]+.svg$/, "en.svg"), title: "English" };
    var all = [EN].concat(opts.map(function (li) { return { lang: li.dataset.lang, code: li.dataset.code, flag: li.querySelector("img").getAttribute("src"), title: li.title }; }));
    var render = function (cur) {
      lbtn.querySelector("img").src = cur.flag;
      lbtn.querySelector(".lang-code").textContent = cur.code;
      lbtn.setAttribute("aria-label", "Language: " + cur.title);
      // the list shows every language except the current one
      llist.innerHTML = all.filter(function (l) { return l.lang !== cur.lang; }).map(function (l) {
        return '<li role="option" tabindex="-1" data-lang="' + l.lang + '" title="' + l.title + '"><img src="' + l.flag + '" width="22" height="15" alt=""><span>' + l.code + "</span></li>";
      }).join("");
    };
    var current = function () {
      var m = document.cookie.match(/googtrans=\/[^/]*\/([^;]+)/);
      var code = m ? decodeURIComponent(m[1]) : "en";
      return all.filter(function (l) { return l.lang === code; })[0] || EN;
    };
    var open = function (on) {
      llist.hidden = !on;
      lbtn.setAttribute("aria-expanded", String(on));
      if (on) { var first = llist.querySelector("li"); if (first) first.focus(); }
    };
    var choose = function (code) {
      var l = all.filter(function (x) { return x.lang === code; })[0];
      if (!l) return;
      if (typeof window.doGTranslate === "function") window.doGTranslate("en|" + l.lang);
      render(l); open(false); lbtn.focus();
    };
    render(current());
    lbtn.addEventListener("click", function (e) { e.stopPropagation(); open(llist.hidden); });
    llist.addEventListener("click", function (e) { var li = e.target.closest("li"); if (li) choose(li.dataset.lang); });
    llist.addEventListener("keydown", function (e) {
      var items = Array.prototype.slice.call(llist.querySelectorAll("li")), i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); (items[i + 1] || items[0]).focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (items[i]) choose(items[i].dataset.lang); }
      else if (e.key === "Escape") { open(false); lbtn.focus(); }
    });
    document.addEventListener("click", function (e) { if (!lang.contains(e.target)) open(false); });
  }

  // Preview hook: ?heroT=<seconds> freezes every CSS animation at that moment (3D views read it too)
  var heroT = parseFloat(new URLSearchParams(location.search).get("heroT"));
  if (!isNaN(heroT)) {
    var freeze = function () {
      document.getAnimations().forEach(function (a) { a.pause(); a.currentTime = heroT * 1000; });
    };
    freeze(); setTimeout(freeze, 150); setTimeout(freeze, 800);
  }
})();
