/* Kết nối dữ liệu.
   - Nếu config.js có apiUrl: gọi máy chủ Google Apps Script thật.
   - Nếu chưa có: chạy CHẾ ĐỘ THỬ ngay trong trình duyệt với dữ liệu mẫu (lưu tạm trên máy này). */
var VuonAPI = (function () {
  var C = window.VUON_CONFIG || {};
  var url = (C.apiUrl || '').trim();
  var demo = !url;
  var KEY = 'vuon-demo-v2';
  var CODES = { co: '999999', toTruong1: '111111', toPho1: '222222', thuKho: '333333', lopTruong: '444444', chiDoiTruong: '555555', hocSinh: '1234' };
  var db = null;

  function rng(seed) { return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }
  function buildDemo() {
    var R = rng(42), n = 0;
    var T = VuonSeed.tables(function () { n++; return String(700000 + n * 137); });
    var now = new Date(), Y = now.getFullYear(), M = now.getMonth();
    var first = VuonCore.ymd(new Date(Y, M, 1));
    T.CaiDat.forEach(function (r) {
      if (r.khoa === 'ma_co') r.gia_tri = CODES.co;
      if (r.khoa === 'chuan_to') r.gia_tri = '40';
      if (r.khoa === 'ngay_bat_dau') r.gia_tri = VuonCore.ymd(new Date(Y, M - 1, 1));
      if (r.khoa === 'ngay_cho_phien') r.gia_tri = VuonCore.ymd(new Date(Y, M + 1, 1));
    });
    function setCode(id, c) { T.HocSinh.forEach(function (h) { if (h.id === id) h.ma = c; }); }
    setCode('HS03', CODES.toTruong1); setCode('HS04', CODES.toPho1); setCode('HS20', CODES.thuKho); setCode('HS10', CODES.hocSinh);
    setCode('HS21', CODES.lopTruong); setCode('HS15', CODES.chiDoiTruong);
    T.CanSu = [
      { hs_id: 'HS03', vai_tro: 'to_truong', to: 1 }, { hs_id: 'HS04', vai_tro: 'to_pho', to: 1 },
      { hs_id: 'HS13', vai_tro: 'to_truong', to: 2 }, { hs_id: 'HS17', vai_tro: 'to_pho', to: 2 },
      { hs_id: 'HS05', vai_tro: 'to_truong', to: 3 }, { hs_id: 'HS07', vai_tro: 'to_pho', to: 3 },
      { hs_id: 'HS02', vai_tro: 'to_truong', to: 4 }, { hs_id: 'HS06', vai_tro: 'to_pho', to: 4 },
      { hs_id: 'HS21', vai_tro: 'lop_truong', to: 4 }, { hs_id: 'HS19', vai_tro: 'lop_pho_hoc_tap', to: 2 },
      { hs_id: 'HS15', vai_tro: 'chi_doi_truong', to: 1 }, { hs_id: 'HS16', vai_tro: 'chi_doi_pho', to: 1 },
      { hs_id: 'HS20', vai_tro: 'thu_kho', to: 1 }
    ];
    T.DoiBan = [{ hs_kem: 'HS14', hs_duoc_kem: 'HS08' }];
    var items = {}; T.MucDiem.forEach(function (m) { items[m.ma] = m; });
    var pos = ['HT_PB', 'HT_PB', 'HT_PB', 'HT_KT8', 'HT_KT9', 'HT_KT10', 'NN_TRUC', 'UX_GIUP', 'TT_DG', 'TT_PT', 'HT_KHEN'];
    var neg = ['L1_MUON', 'L1_TP', 'L1_BAI', 'L2_TT', 'L1_DD'];
    var log = [], k = 0, today = now.getDate();
    function add(h, ma, day, lan, tt, by) {
      var it = items[ma]; k++;
      log.push({ id: 'DEMO' + k, thoi_gian: day + ' 20:00:00', ngay: day, hs_id: h.id, to: h.to, ma_muc: ma, ten_muc: it.ten, diem: it.diem * lan, nhom: it.nhom,
        so_lan: lan, muc_loi: it.muc_loi, ghi_chu: '', nguoi_ghi: by || 'co', trang_thai: tt || 'duyet', nguoi_duyet: tt === 'cho' ? '' : 'co', thoi_gian_duyet: '' });
    }
    T.HocSinh.forEach(function (h, i) {
      var act = R() * 1.6 + (i % 7 === 0 ? 0.9 : 0);
      for (var d = 1; d <= today; d++) {
        var day = VuonCore.ymd(new Date(Y, M, d)), dow = new Date(Y, M, d).getDay();
        if (dow === 0 || dow === 6) continue;
        if (R() < 0.55 * act) add(h, pos[Math.floor(R() * pos.length)], day, 1 + Math.floor(R() * 3 * act));
        if (R() < 0.06) add(h, neg[Math.floor(R() * neg.length)], day, 1);
      }
      for (var d2 = 3; d2 <= 27; d2 += 2) if (R() < 0.75 * act) add(h, pos[Math.floor(R() * pos.length)], VuonCore.ymd(new Date(Y, M - 1, d2)), 2 + Math.floor(R() * 5 * act));
    });
    var t1 = T.HocSinh.filter(function (h) { return h.to === 1 && h.id !== 'HS03' && h.id !== 'HS04'; });
    add(t1[0], 'NN_TRUC', first > VuonCore.ymd(now) ? first : VuonCore.ymd(now), 1, 'cho', 'HS03');
    add(t1[1], 'L1_MUON', VuonCore.ymd(now), 1, 'cho', 'HS03');
    add(t1[2], 'UX_GIUP', VuonCore.ymd(now), 1, 'cho', 'HS03');
    T.GhiDiem = log;
    T.Ong = [{ id: 'O1', hs_id: 'HS03', ngay: first, ly_do: 'Giúp cô trang trí lớp' }, { id: 'O2', hs_id: 'HS31', ngay: first, ly_do: 'Đạt giải cờ vua' }, { id: 'O3', hs_id: 'HS25', ngay: first, ly_do: 'Việc tốt' }];
    return T;
  }
  function getDB() {
    if (db) return db;
    var T = null;
    try { var s = localStorage.getItem(KEY); if (s) T = JSON.parse(s); } catch (e) {}
    if (!T) T = buildDemo();
    db = VuonMemDB(T, null, function (all) { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch (e) {} });
    try { localStorage.setItem(KEY, JSON.stringify(db.dump())); } catch (e) {}
    return db;
  }

  function call(req) {
    if (demo) {
      return new Promise(function (ok, bad) {
        setTimeout(function () { try { ok(VuonCore.handle(getDB(), req)); } catch (e) { bad(e); } }, 120);
      });
    }
    var p = req.action === 'vuon'
      ? fetch(url + (url.indexOf('?') < 0 ? '?' : '&') + 'action=vuon')
      : fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req) });
    return p.then(function (r) { return r.json(); }, function () { throw new Error('Không kết nối được. Em kiểm tra mạng rồi thử lại nhé.'); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'Có lỗi xảy ra.'); return j.data; });
  }
  function resetDemo() { try { localStorage.removeItem(KEY); } catch (e) {} db = null; }

  return { call: call, demo: demo, codes: CODES, resetDemo: resetDemo };
})();
