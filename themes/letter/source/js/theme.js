(function () {
  var KEY = 'letter-theme';
  var btn = document.getElementById('themeToggle');
  function apply(t) {
    if (t === 'white') {
      document.documentElement.setAttribute('data-theme', 'white');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (btn) btn.textContent = t === 'white' ? '白纸' : '羊皮纸';
  }
  // 初始应用已保存的偏好
  apply(localStorage.getItem(KEY));
  if (btn) {
    btn.addEventListener('click', function () {
      var now = document.documentElement.getAttribute('data-theme') === 'white' ? '' : 'white';
      if (now) {
        localStorage.setItem(KEY, now);
      } else {
        localStorage.removeItem(KEY);
      }
      apply(now);
    });
  }
})();
