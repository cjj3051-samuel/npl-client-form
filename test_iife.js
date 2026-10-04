// Quick test IIFE for privacy overlay
(function() {
  try {
    var body = document.getElementById('privacyText');
    var fill = document.getElementById('privacyProgressFill');
    var pct = document.getElementById('privacyProgressPct');
    var btn = document.getElementById('btnAcceptPrivacy');
    if (!body || !fill || !pct || !btn) {
      console.error('Missing elements: body=' + !!body + ' fill=' + !!fill + ' pct=' + !!pct + ' btn=' + !!btn);
      return;
    }
    window.updatePrivacyProgress = function() {
      var scrollTop = body.scrollTop;
      var scrollHeight = body.scrollHeight;
      var clientHeight = body.clientHeight;
      var scrollable = scrollHeight - clientHeight;
      if (scrollable <= 0) { fill.style.width = '100%'; pct.textContent = '100%'; btn.disabled = false; return; }
      var progress = Math.round((scrollTop / scrollable) * 100);
      fill.style.width = progress + '%';
      pct.textContent = progress + '%';
      btn.disabled = progress < 98;
    };
    body.addEventListener('scroll', window.updatePrivacyProgress);
    window.addEventListener('resize', window.updatePrivacyProgress);
    setTimeout(function() {
      var b = document.getElementById('btnAcceptPrivacy');
      if (b && b.disabled) { b.disabled = false; fill.style.width = '100%'; pct.textContent = '100%'; }
    }, 3000);
    setTimeout(window.updatePrivacyProgress, 100);
    console.log('SUCCESS: IIFE ran. btn.disabled=' + btn.disabled + ' scrollH=' + body.scrollHeight + ' clientH=' + body.clientHeight);
  } catch(e) {
    console.error('ERROR: ' + e.message);
  }
})();
