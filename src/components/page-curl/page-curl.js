/**
 * page-curl — ヒーローセクションを「右下から紙をめくる」ように次セクションへ遷移させる演出。
 *
 * 依存なし / フレームワーク非依存 (ES module)。
 * スクロール／スワイプの量に応じてめくり具合が連続的に追従する「スクラブ」方式。
 *
 *   import { initPageCurl } from './page-curl.js';
 *   initPageCurl(document.querySelector('[data-page-curl]'), { onProgress: p => {} });
 *
 * DOM 構造（page-curl.css と対応）:
 *   <div class="pc" data-page-curl>
 *     <div class="pc__sheet">…ヒーローの中身…</div>
 *     <div class="pc__hint" aria-hidden="true">SCROLL</div>
 *   </div>
 * めくれる裏面 (.pc__flap) は初期化時に JS が生成し、.pc__sheet の内容を複製して
 * 「裏写り」として薄く敷く。マークアップの二重管理は不要。
 */

const DEFAULTS = {
  scrollDistance: 6000, // この px 分ホイール／スワイプすると完全にめくり切る（かなり重く・強く／長くスクロールし続けないと開かない）
  smoothing: 0.1,       // 0-1。大きいほどスクロールへの追従が速い。低すぎると入力に対して常に遅れてカクつく／
                         // 「効いてない」感じになるため、重さは scrollDistance 側で出し、ここは滑らかな追従を優先
  flickThreshold: 9000,  // 一回の入力量がこれ以上なら「強いスクロール」とみなして自動で最後までめくる（普通のホイール1クリックでは開かない強さ）
  settleDelay: 40,     // 入力が止まってからこの時間、中途半端なら元の状態へ戻す (ms)。
                         // 手を離したらすぐ戻る感触を優先して短くしている。トラックパッド／連続したホイール操作なら
                         // 毎回タイマーがリセットされ続けるので問題なく開ききれる
  idleCorner: 46,      // 静止時に折れている右下の三角の一辺 (px)
  showThrough: 0.14,   // 裏面に透ける表面の濃さ (0–0.4)
  allowReverse: true,  // ページ先頭で上スクロールすると元に戻る
  cornerHint: true,    // SCROLL ヒントの表示
  lockScroll: true,    // めくりきる前は本文のスクロールを止める
  onProgress: null,    // (p: 0→1) を毎フレーム通知（ヘッダーの出し入れ等に使う）
  onOpen: null,        // めくり切った時
  onClose: null,       // 元に戻ったとき
};

export function initPageCurl(root, options = {}) {
  if (!root) return null;
  const opt = { ...DEFAULTS, ...options };
  const sheet = root.querySelector('.pc__sheet');
  if (!sheet) throw new Error('[page-curl] .pc__sheet が見つかりません');

  const hint = root.querySelector('.pc__hint');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 裏面（めくれて立ち上がる紙）を生成 -------------------------------
  const flap = document.createElement('div');
  flap.className = 'pc__flap';
  flap.setAttribute('aria-hidden', 'true');
  const flapInner = document.createElement('div');
  flapInner.className = 'pc__flap-inner';
  const ghost = document.createElement('div');
  ghost.className = 'pc__flap-ghost';
  ghost.innerHTML = sheet.innerHTML;
  // 複製側は完全に不可視・非対話に落とす（id 重複と二重アニメを防ぐ）
  ghost.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  ghost.querySelectorAll('a,button,input,select,textarea').forEach((n) => {
    n.setAttribute('tabindex', '-1');
    n.setAttribute('aria-hidden', 'true');
  });
  ghost.querySelectorAll('*').forEach((n) => { n.style.animation = 'none'; });
  flapInner.appendChild(ghost);
  flap.appendChild(flapInner);
  const sheen = document.createElement('div');
  sheen.className = 'pc__flap-sheen';
  flap.appendChild(sheen);
  root.insertBefore(flap, hint || null);

  // ---- 状態 --------------------------------------------------------------
  let p = 0;                 // 現在の描画進捗 0（閉）→ 1（めくり切った）
  let target = 0;            // 入力（スクロール量）から導かれる目標進捗
  let phase = 'sheet';       // 'sheet'（ヒーロー表示中） | 'mid'（遷移中） | 'open'（めくり切って本文スクロール中）
  let raf = 0;
  let touchY = 0;
  let sweepFinished = false; // めくり始めに一度だけ描画アニメを完了させたか
  let originExtreme = 0;     // 最後に確定した静止状態（0=閉 / 1=開）。中途半端な時の「戻り先」
  let settleTimer = 0;       // 入力が止まった後、力不足なら戻すためのタイマー

  const lock = (on) => {
    if (!opt.lockScroll) return;
    const b = document.body, h = document.documentElement;
    if (on) { window.scrollTo(0, 0); b.style.overflow = 'hidden'; h.style.overflow = 'hidden'; }
    else { b.style.overflow = ''; h.style.overflow = ''; }
  };

  // 折れ線は x + y = c の直線。c を W+H-idle → 0 へ動かすだけで
  // 「右下の三角がだんだん大きくなり、最後に全体がめくれる」動きになる。
  const apply = (v) => {
    const r = root.getBoundingClientRect();
    const W = r.width, H = r.height;
    const c = (W + H - opt.idleCorner) * (1 - v);
    const rect = [[0, 0], [W, 0], [W, H], [0, H]];
    const keep = clipHalf(rect, c, true);
    const fold = clipHalf(rect, c, false);

    sheet.style.clipPath = keep.length > 2 ? poly(keep) : 'polygon(0 0,0 0,0 0)';
    sheet.style.opacity = keep.length > 2 ? '1' : '0';

    if (fold.length > 2) {
      // 折れ線に対する鏡像 (x,y) → (c-y, c-x)
      flap.style.clipPath = poly(fold.map((q) => [c - q[1], c - q[0]]));
      flap.style.opacity = String(v > 0.86 ? Math.max(0, (1 - v) / 0.14) : 1);
      flapInner.style.transform = `matrix(0,-1,-1,0,${c.toFixed(1)},${c.toFixed(1)})`;
      ghost.style.opacity = String(opt.showThrough);
    } else {
      flap.style.clipPath = 'polygon(0 0,0 0,0 0)';
    }

    if (hint) {
      hint.style.opacity = opt.cornerHint && v < 0.06 ? '' : '0';
      hint.style.right = Math.max(14, opt.idleCorner * 0.42) + 'px';
      hint.style.bottom = Math.max(10, opt.idleCorner * 0.32) + 'px';
    }
    if (opt.onProgress) opt.onProgress(v);
  };

  const settle = (done) => {
    phase = done === 1 ? 'open' : 'sheet';
    originExtreme = done;
    clearTimeout(settleTimer);
    if (done === 1) {
      lock(false);
      root.style.display = 'none';
      if (opt.onOpen) opt.onOpen();
    } else {
      lock(true);
      sweepFinished = false; // 次にまためくり始めた時、その回の描画アニメを改めて完了させられるように
      if (opt.onClose) opt.onClose();
    }
  };

  // p を target へ毎フレーム少しずつ近づける。止まったら（=target に追いついたら）自動停止。
  const tick = () => {
    raf = 0;
    const diff = target - p;
    if (Math.abs(diff) < 0.0015) p = target;
    else p += diff * opt.smoothing;
    apply(p);

    if (p === target) {
      if (target === 1 && phase !== 'open') settle(1);
      else if (target === 0 && phase !== 'sheet') settle(0);
      return;
    }
    raf = requestAnimationFrame(tick);
  };

  const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

  const finishSweepOnce = () => {
    if (sweepFinished) return;
    sweepFinished = true;
    // 表面の描画アニメが途中なら、めくり始めに完了させる
    if (sheet.getAnimations) {
      sheet.getAnimations({ subtree: true }).forEach((a) => { try { a.finish(); } catch (e) {} });
    }
  };

  // 入力が止まってから settleDelay 経っても中途半端なままなら、力が足りなかった
  // とみなして最後にいた状態（originExtreme）へ戻す。
  // target が既に 0 か 1（＝必要な距離分は動かし終えた）なら、p が追いつききる前でも
  // 巻き戻さない。追いつき次第 tick() 側の settle() が呼ばれる。
  const scheduleSpringBack = () => {
    clearTimeout(settleTimer);
    if (reduced) return;
    if (target === 0 || target === 1) return;
    settleTimer = window.setTimeout(() => {
      target = originExtreme;
      wake();
    }, opt.settleDelay);
  };

  const nudge = (deltaPx) => {
    const next = Math.min(1, Math.max(0, target + deltaPx / opt.scrollDistance));
    if (next === target) return false;
    if (next > target) finishSweepOnce();
    target = next;
    if (reduced) { p = target; apply(target); if (target === 0 || target === 1) settle(target); return true; }
    wake();
    scheduleSpringBack();
    return true;
  };

  // 一定以上の強さの入力を検知したら、途中の量に関わらず自動で最後まで／最初まで動かす
  const snapTo = (dest) => {
    clearTimeout(settleTimer);
    if (dest > target) finishSweepOnce();
    target = dest;
    if (reduced) { p = dest; apply(dest); settle(dest); return; }
    wake();
  };

  const reopenIfNeeded = () => {
    if (phase === 'open') {
      root.style.display = '';
      // 'sheet' にすると tick() の完了判定（phase !== 'sheet'）が「もう閉じ終わった」
      // と誤認して settle(0) が呼ばれなくなるため、遷移中を表す 'mid' にする
      phase = 'mid';
    }
  };

  // ---- 入力 --------------------------------------------------------------
  const onWheel = (e) => {
    if (phase !== 'open') {
      e.preventDefault();
      if (Math.abs(e.deltaY) >= opt.flickThreshold) snapTo(e.deltaY > 0 ? 1 : 0);
      else nudge(e.deltaY);
      return;
    }
    if (opt.allowReverse && window.scrollY <= 0 && e.deltaY < 0) {
      e.preventDefault();
      reopenIfNeeded();
      if (Math.abs(e.deltaY) >= opt.flickThreshold) snapTo(0);
      else nudge(e.deltaY);
    }
  };
  const onTouchStart = (e) => { touchY = e.touches[0].clientY; };
  const onTouchMove = (e) => {
    const y = e.touches[0].clientY;
    const dy = touchY - y; // 指を上へスワイプ = 正の値 = めくる方向
    if (phase !== 'open') {
      e.preventDefault();
      if (Math.abs(dy) >= opt.flickThreshold) snapTo(dy > 0 ? 1 : 0);
      else nudge(dy);
      touchY = y;
      return;
    }
    if (opt.allowReverse && window.scrollY <= 0 && dy < 0) {
      e.preventDefault();
      reopenIfNeeded();
      if (Math.abs(dy) >= opt.flickThreshold) snapTo(0);
      else nudge(dy);
      touchY = y;
    }
  };
  const onKey = (e) => {
    const down = ['ArrowDown', 'PageDown', ' ', 'Spacebar', 'End'].includes(e.key);
    const up = ['ArrowUp', 'PageUp', 'Home'].includes(e.key);
    if (phase !== 'open' && down) {
      e.preventDefault();
      finishSweepOnce();
      target = 1;
      if (reduced) { p = 1; apply(1); settle(1); return; }
      wake();
    } else if (phase === 'open' && up && window.scrollY <= 0 && opt.allowReverse) {
      e.preventDefault();
      reopenIfNeeded();
      target = 0;
      if (reduced) { p = 0; apply(0); settle(0); return; }
      wake();
    }
  };
  // 指を離した瞬間、タイマーを待たずに力が足りたかその場で判定する
  const onTouchEnd = () => {
    clearTimeout(settleTimer);
    if (reduced || target === 0 || target === 1) return;
    target = originExtreme;
    wake();
  };
  const onResize = () => apply(p);

  window.addEventListener('wheel', onWheel, { passive: false });
  window.addEventListener('touchstart', onTouchStart, { passive: true });
  window.addEventListener('touchmove', onTouchMove, { passive: false });
  window.addEventListener('touchend', onTouchEnd, { passive: true });
  window.addEventListener('touchcancel', onTouchEnd, { passive: true });
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  lock(true);
  apply(0);

  return {
    open: () => { finishSweepOnce(); target = 1; if (reduced) { p = 1; apply(1); settle(1); } else wake(); },
    close: () => { reopenIfNeeded(); target = 0; if (reduced) { p = 0; apply(0); settle(0); } else wake(); },
    get progress() { return p; },
    destroy() {
      cancelAnimationFrame(raf);
      clearTimeout(settleTimer);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      lock(false);
      flap.remove();
    },
  };
}

/** 凸多角形を直線 x+y=c で切る（keepLE=true で x+y<=c 側を残す） */
function clipHalf(pts, c, keepLE) {
  const f = (q) => (keepLE ? c - (q[0] + q[1]) : (q[0] + q[1]) - c);
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa > 0 && fb < 0) || (fa < 0 && fb > 0)) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

const poly = (pts) => 'polygon(' + pts.map((q) => `${q[0].toFixed(1)}px ${q[1].toFixed(1)}px`).join(',') + ')';

/** data-page-curl を持つ要素を自動初期化（オプションは data-* 属性で指定可） */
export function autoInitPageCurl(options = {}) {
  const el = document.querySelector('[data-page-curl]');
  if (!el) return null;
  const d = el.dataset;
  return initPageCurl(el, {
    ...(d.scrollDistance ? { scrollDistance: Number(d.scrollDistance) } : {}),
    ...(d.flickThreshold ? { flickThreshold: Number(d.flickThreshold) } : {}),
    ...(d.idleCorner ? { idleCorner: Number(d.idleCorner) } : {}),
    ...(d.showThrough ? { showThrough: Number(d.showThrough) } : {}),
    ...(d.allowReverse === 'false' ? { allowReverse: false } : {}),
    ...options,
  });
}
