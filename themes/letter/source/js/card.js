/* ============================================================
   信纸风分享卡片 (card.js)
   文章页选中文字 → 生成信纸风卡片图（霞鹜文楷 + 羊皮纸横纹）
   含署名 + 文章链接二维码，可下载/长按保存用于分享
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 仅文章页启用 ---------- */
  var postContent = document.querySelector('.post-content');
  if (!postContent) return;

  /* ---------- 文章元信息（post.ejs 通过 #card-meta 注入） ---------- */
  var meta = document.getElementById('card-meta');
  var POST_TITLE = meta ? (meta.getAttribute('data-title') || '') : '';
  var POST_DATE  = meta ? (meta.getAttribute('data-date')  || '') : '';
  var POST_URL   = meta ? (meta.getAttribute('data-url')   || location.href) : location.href;
  var SITE_NAME  = meta ? (meta.getAttribute('data-site')  || '写给你的信') : '写给你的信';

  /* ---------- 配色（与 style.css 变量一致） ---------- */
  var C = {
    paper:     '#f5f4ed',
    paperCard: '#fbfaf4',
    ink:       '#1B365D',
    text:      '#3a352e',
    muted:     '#8b8275',
    rule:      '#d9d3c4',
    lineSoft:  'rgba(217,211,196,0.45)'
  };

  /* ---------- 画布参数 ---------- */
  var W = 1080, H = 1350, DPR = 2;     // 4:5，@2x 保证清晰
  var FONT = '"LXGW WenKai", serif';   // 与 @font-face family 一致

  /* ---------- 工具：创建元素 ---------- */
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /* ============================================================
     DOM 构建：浮动按钮 + 移动端入口 + 弹层（编辑/预览）
     ============================================================ */

  // 浮动「生成卡片」按钮（桌面选区触发）
  var fab = el('button', 'card-fab');
  fab.id = 'cardFab';
  fab.type = 'button';
  fab.setAttribute('role', 'button');
  fab.setAttribute('tabindex', '0');
  fab.setAttribute('aria-label', '生成分享卡片');
  fab.textContent = '生成卡片';
  document.body.appendChild(fab);

  // 移动端底部入口（iOS 选区菜单遮挡兜底）
  var mobileEntry = el('div', 'card-mobile-entry');
  mobileEntry.innerHTML =
    '<button type="button" class="card-mobile-btn">生成分享卡片</button>' +
    '<span class="card-mobile-hint">先选中文字再点这里，或在框内编辑后生成</span>';
  postContent.appendChild(mobileEntry);
  var mobileBtn = mobileEntry.querySelector('.card-mobile-btn');

  // 弹层
  var modal = el('div', 'card-modal');
  modal.id = 'cardModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', '分享卡片');
  modal.innerHTML =
    '<div class="card-modal-inner">' +
      '<button type="button" class="card-modal-close" aria-label="关闭">×</button>' +
      // 编辑阶段
      '<div class="card-stage card-stage-edit active">' +
        '<div class="card-modal-title">生成分享卡片</div>' +
        '<textarea class="card-edit-text" placeholder="输入或粘贴要做成卡片的文字"></textarea>' +
        '<div class="card-actions" style="margin-top:.75rem">' +
          '<button type="button" class="card-btn card-btn-primary card-gen-btn">生成卡片</button>' +
        '</div>' +
      '</div>' +
      // 预览阶段
      '<div class="card-stage card-stage-preview">' +
        '<div class="card-modal-title">分享卡片预览</div>' +
        '<img class="card-preview" alt="分享卡片预览">' +
        '<p class="card-loading" style="text-align:center;color:var(--muted);margin:.5rem 0 0;font-size:.85rem">生成中…</p>' +
        '<div class="card-actions">' +
          '<button type="button" class="card-btn card-btn-primary card-download-btn">下载图片</button>' +
          '<button type="button" class="card-btn card-reedit-btn">重新编辑</button>' +
        '</div>' +
        '<p class="card-tip mobile-only">提示：长按上方图片可保存到相册</p>' +
        '<p class="card-tip desktop-only">点击「下载图片」保存到本地</p>' +
      '</div>' +
    '</div>';
  document.body.appendChild(modal);

  // 元素引用
  var stageEdit    = modal.querySelector('.card-stage-edit');
  var stagePreview = modal.querySelector('.card-stage-preview');
  var editText     = modal.querySelector('.card-edit-text');
  var genBtn       = modal.querySelector('.card-gen-btn');
  var previewImg   = modal.querySelector('.card-preview');
  var loadingTip   = modal.querySelector('.card-loading');
  var downloadBtn  = modal.querySelector('.card-download-btn');
  var reEditBtn    = modal.querySelector('.card-reedit-btn');
  var closeBtn     = modal.querySelector('.card-modal-close');

  var currentCanvas = null;   // 当前生成的 canvas，供下载
  var lastText = '';          // 桌面最近一次选区文字

  /* ============================================================
     选区交互
     ============================================================ */

  function getSelectionTextInPost() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return '';
    var range = sel.getRangeAt(0);
    if (!postContent.contains(range.commonAncestorContainer)) return '';
    var t = range.toString();
    return t ? t.trim() : '';
  }

  function positionFab() {
    var sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { hideFab(); return; }
    var range = sel.getRangeAt(0);
    var rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) { hideFab(); return; }
    var text = getSelectionTextInPost();
    if (text.length < 2) { hideFab(); return; }
    lastText = text;

    var fabW = fab.offsetWidth || 96;
    var left = rect.left + rect.width / 2 - fabW / 2;
    if (left < 8) left = 8;
    if (left > window.innerWidth - fabW - 8) left = window.innerWidth - fabW - 8;
    var top = rect.bottom + 8;
    if (top > window.innerHeight - 48) top = rect.top - 44; // 选区上方避让
    fab.style.left = left + 'px';
    fab.style.top = top + 'px';
    fab.classList.add('visible');
  }

  function hideFab() { fab.classList.remove('visible'); }

  // mouseup/touchend 后选区稳定，定位按钮
  postContent.addEventListener('mouseup', function () {
    requestAnimationFrame(positionFab);
  });
  postContent.addEventListener('touchend', function () {
    setTimeout(positionFab, 80);
  });

  // 选区清空时隐藏
  document.addEventListener('selectionchange', function () {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed) hideFab();
  });
  // 滚动/缩放隐藏（位置会失效）
  window.addEventListener('scroll', hideFab, { passive: true });
  window.addEventListener('resize', hideFab);

  // 点击按钮不丢失选区
  fab.addEventListener('mousedown', function (e) { e.preventDefault(); });
  fab.addEventListener('click', function () {
    if (lastText) { hideFab(); generateAndPreview(lastText); }
  });
  fab.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (lastText) { hideFab(); generateAndPreview(lastText); }
    }
  });

  /* ============================================================
     弹层控制
     ============================================================ */

  function openEdit(text) {
    stageEdit.classList.add('active');
    stagePreview.classList.remove('active');
    editText.value = text || '';
    modal.classList.add('open');
    setTimeout(function () { editText.focus(); }, 50);
  }

  function openPreviewLoading() {
    stagePreview.classList.add('active');
    stageEdit.classList.remove('active');
    previewImg.removeAttribute('src');
    loadingTip.style.display = 'block';
    modal.classList.add('open');
  }

  function showPreview(canvas) {
    currentCanvas = canvas;
    loadingTip.style.display = 'none';
    previewImg.src = canvas.toDataURL('image/png');
  }

  function closeModal() { modal.classList.remove('open'); }

  mobileBtn.addEventListener('click', function () {
    openEdit(getSelectionTextInPost() || '');
  });
  genBtn.addEventListener('click', function () {
    var t = editText.value.trim();
    if (t.length < 1) { editText.focus(); return; }
    generateAndPreview(t);
  });
  reEditBtn.addEventListener('click', function () {
    openEdit(editText.value);
  });
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  /* ============================================================
     字体预加载：确保 Canvas 绘制时 LXGW WenKai 子集已就绪
     ============================================================ */

  function ensureFont(text) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return document.fonts.load('48px ' + FONT, text)
      .then(function () { return document.fonts.ready; })
      .catch(function () { /* 降级 serif，仍可生成 */ });
  }

  /* ============================================================
     主流程：生成卡片并预览
     ============================================================ */

  function generateAndPreview(text) {
    openPreviewLoading();
    ensureFont(text).then(function () {
      try {
        var canvas = drawCard(text);
        showPreview(canvas);
      } catch (err) {
        loadingTip.textContent = '生成失败，请重试';
        console.error('[card] draw error:', err);
      }
    });
  }

  /* ============================================================
     Canvas 绘制
     ============================================================ */

  // 行首禁止符（不能出现在行首）
  var NO_LINE_START = '，。、；：！？）」』】］｝,.;:!?)]}…·';

  function wrapText(ctx, text, maxWidth) {
    var lines = [];
    var paras = text.split(/\n+/);
    for (var p = 0; p < paras.length; p++) {
      var para = paras[p];
      if (para === '') { lines.push(''); continue; }
      var line = '';
      for (var i = 0; i < para.length; i++) {
        var ch = para[i];
        var test = line + ch;
        if (ctx.measureText(test).width > maxWidth && line.length > 0) {
          // 行首禁则：若 ch 不可在行首，把它留在上一行尾
          if (NO_LINE_START.indexOf(ch) >= 0) {
            lines.push(line + ch);
            line = '';
          } else {
            lines.push(line);
            line = ch;
          }
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
    }
    return lines;
  }

  function drawCard(text) {
    var canvas = document.createElement('canvas');
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    var ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);
    ctx.textBaseline = 'alphabetic';

    /* 1. 羊皮纸底 */
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, W, H);

    /* 2. 信纸卡片矩形 */
    var pad = 80;
    var cardX = pad, cardY = pad;
    var cardW = W - pad * 2;
    var cardH = H - pad * 2;
    ctx.fillStyle = C.paperCard;
    ctx.fillRect(cardX, cardY, cardW, cardH);
    // 极柔纸张边界（上下 1px rule）
    ctx.strokeStyle = C.rule;
    ctx.lineWidth = 1;
    ctx.strokeRect(cardX + 0.5, cardY + 0.5, cardW - 1, cardH - 1);

    /* 3. 正文区与字号自适应 */
    var contentX = cardX + 70;
    var contentW = cardW - 140;
    var contentTop = cardY + 120;
    var footH = 230;                                  // 底部署名+二维码预留
    var contentBottom = cardY + cardH - footH;
    var contentMaxH = contentBottom - contentTop;

    var sizes = [50, 46, 42, 38, 34, 30];
    var chosen = null, lines = null, lineH = null;
    for (var i = 0; i < sizes.length; i++) {
      var fs = sizes[i];
      var lh = fs * 1.85;                             // 复刻 1.85em 行距/横纹间距
      ctx.font = fs + 'px ' + FONT;
      var ls = wrapText(ctx, text, contentW);
      if (ls.length * lh <= contentMaxH) {
        chosen = fs; lines = ls; lineH = lh; break;
      }
    }
    if (!chosen) {                                    // 最小字号仍超长 → 截断 12 行
      chosen = sizes[sizes.length - 1];
      lineH = chosen * 1.85;
      ctx.font = chosen + 'px ' + FONT;
      lines = wrapText(ctx, text, contentW).slice(0, 12);
      if (lines.length === 12) {
        lines[11] = lines[11].replace(/[…。.!！?？\s]*$/, '') + '…';
      }
    }

    /* 4. 信纸横纹（间距 = lineH，文字坐于横纹上） */
    ctx.fillStyle = C.lineSoft;
    for (var k = 1; ; k++) {
      var ly = contentTop + k * lineH;
      if (ly > contentBottom) break;
      ctx.fillRect(contentX - 24, ly, contentW + 48, 1);
    }

    /* 5. 左侧墨蓝竖线（呼应 blockquote border-left） */
    var decoH = Math.min(lines.length * lineH, contentMaxH);
    ctx.fillStyle = C.ink;
    ctx.fillRect(contentX - 28, contentTop, 3, decoH);

    /* 6. 正文文字 */
    ctx.fillStyle = C.text;
    ctx.font = chosen + 'px ' + FONT;
    ctx.textAlign = 'left';
    for (var r = 0; r < lines.length; r++) {
      var baseline = contentTop + (r + 1) * lineH - chosen * 0.22;
      ctx.fillText(lines[r], contentX, baseline);
    }

    /* 7. 底部分隔线（宽 40%，呼应 .post-content hr） */
    var footY = cardY + cardH - footH + 20;
    ctx.strokeStyle = C.rule;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cardX + cardW * 0.3, footY);
    ctx.lineTo(cardX + cardW * 0.7, footY);
    ctx.stroke();

    /* 8. 署名区 */
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = C.ink;
    ctx.font = '600 34px ' + FONT;
    ctx.fillText(SITE_NAME, contentX, footY + 28);
    if (POST_TITLE) {
      ctx.fillStyle = C.text;
      ctx.font = '24px ' + FONT;
      ctx.fillText(truncate(ctx, POST_TITLE, contentW - 180), contentX, footY + 76);
    }
    if (POST_DATE) {
      ctx.fillStyle = C.muted;
      ctx.font = '20px ' + FONT;
      ctx.fillText(POST_DATE, contentX, footY + 110);
    }

    /* 9. 右下二维码 */
    var qrSize = 150;
    drawQR(ctx, POST_URL, cardX + cardW - qrSize - 30, footY + 18, qrSize);

    ctx.textBaseline = 'alphabetic'; // 复位
    return canvas;
  }

  function truncate(ctx, str, maxWidth) {
    if (ctx.measureText(str).width <= maxWidth) return str;
    var s = str;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxWidth) {
      s = s.slice(0, -1);
    }
    return s + '…';
  }

  /* ============================================================
     二维码（qrcode-generator，模块色墨蓝，背景透出信纸底）
     ============================================================ */

  function drawQR(ctx, text, x, y, size) {
    try {
      var qr = qrcode(0, 'M');     // typeNumber 0 = 自动，ecLevel M
      qr.addData(text || location.href);
      qr.make();
      var count = qr.getModuleCount();
      var cell = size / count;
      ctx.fillStyle = C.ink;
      for (var r = 0; r < count; r++) {
        for (var c = 0; c < count; c++) {
          if (qr.isDark(r, c)) {
            ctx.fillRect(x + c * cell, y + r * cell, cell + 0.6, cell + 0.6);
          }
        }
      }
      return true;
    } catch (e) {
      // fallback：文字链接
      ctx.fillStyle = C.muted;
      ctx.font = '18px ' + FONT;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('扫码访问', x + size, y);
      ctx.fillText(text, x + size, y + 26, size);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      return false;
    }
  }

  /* ============================================================
     下载
     ============================================================ */

  function sanitize(s) {
    return (s || '').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 60);
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function dateStr() {
    var d = new Date();
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  }

  function download() {
    if (!currentCanvas) return;
    var fname = sanitize(SITE_NAME + '-' + POST_TITLE) + '-' + dateStr() + '.png';
    if (currentCanvas.toBlob) {
      currentCanvas.toBlob(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
      }, 'image/png');
    } else {
      var a = document.createElement('a');
      a.href = currentCanvas.toDataURL('image/png');
      a.download = fname;
      a.click();
    }
  }
  downloadBtn.addEventListener('click', download);

})();
