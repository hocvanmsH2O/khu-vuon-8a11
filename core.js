/* Lõi tính toán + xử lí yêu cầu của ứng dụng Khu vườn.
   Dùng chung cho: Apps Script (máy chủ thật trên Google Trang tính) và chế độ thử trên trình duyệt.
   db cần có: all(bảng) -> [{...}], add(bảng, obj), addMany(bảng, [obj]), patch(bảng, cộtKhoá, giáTrị, {...}), now() -> Date */
var VuonCore = (function () {
  var SCHEMA = {
    CaiDat: ['khoa', 'gia_tri', 'ghi_chu'],
    HocSinh: ['id', 'ho_ten', 'to', 'o', 'ma', 'dang_hoc'],
    CanSu: ['hs_id', 'vai_tro', 'to'],
    MucDiem: ['ma', 'nhom', 'ten', 'diem', 'nguoi_ghi', 'muc_loi'],
    GhiDiem: ['id', 'thoi_gian', 'ngay', 'hs_id', 'to', 'ma_muc', 'ten_muc', 'diem', 'nhom', 'so_lan', 'muc_loi', 'ghi_chu', 'nguoi_ghi', 'trang_thai', 'nguoi_duyet', 'thoi_gian_duyet'],
    DoiBan: ['hs_kem', 'hs_duoc_kem'],
    Ong: ['id', 'hs_id', 'ngay', 'ly_do'],
    KhoQua: ['ma', 'bieu_tuong', 'ten', 'gia', 'so_luong'],
    DoiQua: ['id', 'thoi_gian', 'ngay', 'hs_id', 'ma_qua', 'ten_qua', 'so_qua', 'nguoi_ghi', 'trang_thai'],
    NhapKho: ['thoi_gian', 'ma_qua', 'ten_qua', 'so_luong', 'nguon', 'nguoi_ghi'],
    CauHay: ['cau', 'tac_gia']
  };
  var ROLE_LABEL = { to_truong: 'Tổ trưởng', to_pho: 'Tổ phó', lop_truong: 'Lớp trưởng', lop_pho_hoc_tap: 'Lớp phó học tập', chi_doi_truong: 'Chi đội trưởng', chi_doi_pho: 'Chi đội phó', thu_kho: 'Thủ kho' };
  var ROLE_KEY = {}; Object.keys(ROLE_LABEL).forEach(function (k) { ROLE_KEY[k] = k; ROLE_KEY[ROLE_LABEL[k].toLowerCase()] = k; });
  function roleKey(v) { return ROLE_KEY[String(v || '').trim().toLowerCase()] || ''; }
  function idOf(v) { return String(v || '').trim().split(/[\s·-]+/)[0]; }   /* "HS01 · Mai Tuấn Anh" -> "HS01" */
  function hsLabel(h) { return h.id + ' · ' + h.ten; }
  var GROUP_BAR = { 'Nề nếp': 'Nề nếp', 'Học tập': 'Học tập', 'Ứng xử': 'Sẻ chia', 'Tập thể': 'Sẻ chia' };

  /* ---------- tiện ích ngày ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseYmd(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function monthOf(s) { return String(s).slice(0, 7); }
  function addDays(s, n) { var d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
  function weekStart(s) { var d = parseYmd(s); var w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return ymd(d); }
  function stamp(d) { return ymd(d) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function uid(prefix, d) { return prefix + d.getTime().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }

  /* ---------- cài đặt ---------- */
  function settings(db) {
    var o = {};
    db.all('CaiDat').forEach(function (r) { o[str(r.khoa)] = str(r.gia_tri); });
    var moc = (o.moc || '0,15,35,50,65,80,95').split(',').map(num);
    return {
      lop: o.ten_lop || '', gvcn: o.gvcn || '', maCo: o.ma_co || '',
      moc: moc, tenMoc: (o.ten_moc || '').split(',').map(function (s) { return s.trim(); }),
      buocQua: num(o.diem_moi_qua) || 10, chuan: num(o.chuan_to) || 12,
      batDau: o.ngay_bat_dau || '2000-01-01', choPhien: o.ngay_cho_phien || '', gioChoPhien: o.gio_cho_phien || ''
    };
  }
  /* Tên gọi trên trang chung: tên riêng; trùng thì thêm chữ lót; vẫn trùng thì thêm chữ đầu của họ */
  function shortNames(hs) {
    function parts(n) { var w = n.trim().split(/\s+/); if (w.length > 1 && /^[A-ZĐ]$/.test(w[w.length - 1])) { var x = w.pop(); w[w.length - 1] += ' ' + x; } return w; }
    var P = hs.map(function (h) { return parts(h.ten); }), out = {};
    function pick(level) { return P.map(function (w) { var k = Math.min(level > 2 ? 2 : level, w.length); var s = w.slice(w.length - k).join(' '); return level > 2 && w.length > 2 ? w[0].charAt(0) + '. ' + s : s; }); }
    var a = pick(1), b = pick(2), c = pick(3);
    function dup(arr, i) { return arr.filter(function (x) { return x === arr[i]; }).length > 1; }
    hs.forEach(function (h, i) { out[h.id] = !dup(a, i) ? a[i] : !dup(b, i) ? b[i] : !dup(c, i) ? c[i] : h.ten; });
    return out;
  }
  function stageOf(p, moc) { var k = 0; for (var i = 0; i < moc.length; i++) if (p >= moc[i]) k = i; return k; }
  function fruitsOf(p, moc, step) { var q = moc[moc.length - 1]; return p >= q ? 1 + Math.floor((p - q) / step) : 0; }

  /* ---------- dữ liệu gốc ---------- */
  function load(db) {
    var S = settings(db);
    var hs = db.all('HocSinh').filter(function (r) { return str(r.dang_hoc) !== '0' && str(r.id); })
      .map(function (r) { return { id: str(r.id), ten: str(r.ho_ten), to: num(r.to), o: num(r.o), ma: str(r.ma) }; });
    var byId = {}; hs.forEach(function (h) { byId[h.id] = h; });
    var roles = {}; db.all('CanSu').forEach(function (r) {
      var id = idOf(r.hs_id), v = roleKey(r.vai_tro); if (!byId[id] || !v) return;
      (roles[id] = roles[id] || []).push({ vai: v, to: (v === 'to_truong' || v === 'to_pho') ? byId[id].to : (num(r.to) || byId[id].to) });
    });
    var items = {}; db.all('MucDiem').forEach(function (r) {
      items[str(r.ma)] = { ma: str(r.ma), nhom: str(r.nhom), ten: str(r.ten), diem: num(r.diem), ghi: str(r.nguoi_ghi), loi: str(r.muc_loi) };
    });
    var log = db.all('GhiDiem').map(function (r) {
      return { id: str(r.id), tg: str(r.thoi_gian), ngay: str(r.ngay), hs: str(r.hs_id), to: num(r.to), ma: str(r.ma_muc), ten: str(r.ten_muc),
        diem: num(r.diem), nhom: str(r.nhom), lan: num(r.so_lan) || 1, loi: str(r.muc_loi), note: str(r.ghi_chu), ghi: str(r.nguoi_ghi), tt: str(r.trang_thai) };
    });
    var pairs = db.all('DoiBan').map(function (r) { return { kem: idOf(r.hs_kem), duoc: idOf(r.hs_duoc_kem) }; });
    return { S: S, hs: hs, byId: byId, roles: roles, items: items, log: log, pairs: pairs };
  }

  /* Điểm tự động: Tuần trong (+2), Tuần trong của tổ (+1/bạn), Đôi bạn cùng tiến (+2). Chỉ tính từ các dòng đã duyệt. */
  function derived(D, today) {
    var out = [], ok = D.log.filter(function (e) { return e.tt === 'duyet'; });
    // Đôi bạn cùng tiến
    ok.forEach(function (e) {
      if (e.ma !== 'HT_TB') return;
      D.pairs.forEach(function (p) {
        if (p.duoc === e.hs && D.byId[p.kem]) out.push({ id: 'auto-db-' + e.id, ngay: e.ngay, hs: p.kem, to: D.byId[p.kem].to, ma: 'HT_DB', ten: 'Đôi bạn cùng tiến: ' + (D.byId[e.hs] ? D.byId[e.hs].ten : '') + ' tiến bộ', diem: 2, nhom: 'Học tập', lan: 1, tt: 'duyet', ghi: 'tu_dong', auto: true });
      });
    });
    // Tuần trong: các tuần đã kết thúc (thứ Hai -> Chủ nhật), từ tuần đầu tiên trọn vẹn sau ngày bắt đầu
    var w = weekStart(D.S.batDau); if (w < D.S.batDau) w = addDays(w, 7);
    var lastDone = addDays(weekStart(today), -7);
    while (w <= lastDone) {
      var end = addDays(w, 6), bad = {}, badTo = {};
      ok.forEach(function (e) { if (e.diem < 0 && e.ngay >= w && e.ngay <= end) { bad[e.hs] = 1; badTo[e.to] = 1; } });
      D.hs.forEach(function (h) {
        if (!bad[h.id]) out.push({ id: 'auto-tt-' + h.id + w, ngay: end, hs: h.id, to: h.to, ma: 'NN_TT', ten: 'Tuần trong (' + w.slice(8) + '/' + w.slice(5, 7) + ' – ' + end.slice(8) + '/' + end.slice(5, 7) + ')', diem: 2, nhom: 'Nề nếp', lan: 1, tt: 'duyet', ghi: 'tu_dong', auto: true });
        if (!badTo[h.to]) out.push({ id: 'auto-tto-' + h.id + w, ngay: end, hs: h.id, to: h.to, ma: 'NN_TTTO', ten: 'Tuần trong của tổ', diem: 1, nhom: 'Nề nếp', lan: 1, tt: 'duyet', ghi: 'tu_dong', auto: true });
      });
      w = addDays(w, 7);
    }
    return out;
  }
  function approved(D, today) { return D.log.filter(function (e) { return e.tt === 'duyet'; }).concat(derived(D, today)); }
  function sumBy(entries, filter) { var o = {}; entries.forEach(function (e) { if (filter(e)) o[e.hs] = (o[e.hs] || 0) + e.diem; }); return o; }

  function teamStats(D, entries, month) {
    var res = [];
    for (var t = 1; t <= 4; t++) {
      var mem = D.hs.filter(function (h) { return h.to === t; }).length || 1;
      var mine = entries.filter(function (e) { return monthOf(e.ngay) === month && e.to === t; }).sort(function (a, b) { return a.ngay < b.ngay ? -1 : 1; });
      var run = 0, day = '';
      mine.forEach(function (e) { run += e.diem; if (!day && run / mem >= D.S.chuan) day = e.ngay; });
      var avg = run / mem;
      res.push({ to: t, tb: Math.round(avg * 10) / 10, pt: Math.max(0, Math.min(100, Math.round(avg / D.S.chuan * 100))), day: avg >= D.S.chuan ? day : '' });
    }
    return res;
  }

  function honors(D, entries, today, teams) {
    var month = monthOf(today), lw = addDays(weekStart(today), -7), pw = addDays(lw, -7);
    var bad5 = {}; entries.forEach(function (e) { if ((e.loi === '5' || e.loi === 'DB') && monthOf(e.ngay) === month) bad5[e.hs] = 1; });
    var a = sumBy(entries, function (e) { return e.ngay >= lw && e.ngay <= addDays(lw, 6); });
    var b = sumBy(entries, function (e) { return e.ngay >= pw && e.ngay <= addDays(pw, 6); });
    var best = null, gain = 0;
    D.hs.forEach(function (h) { if (bad5[h.id]) return; var g = (a[h.id] || 0) - (b[h.id] || 0); if (g > gain) { gain = g; best = h; } });
    var full = teams.filter(function (t) { return t.day; }).sort(function (x, y) { return x.day < y.day ? -1 : 1; });
    return { vuonCao: best ? { id: best.id, ten: best.ten, to: best.to } : null, noRo: full.length ? full[0].to : 0, soToDay: full.length, toDay: full.map(function (t) { return t.to; }) };
  }

  function basket(db, D, entries, hsId, today) {
    var month = monthOf(today), byM = {};
    entries.forEach(function (e) { if (e.hs === hsId && monthOf(e.ngay) < month) byM[monthOf(e.ngay)] = (byM[monthOf(e.ngay)] || 0) + e.diem; });
    var harvested = 0; Object.keys(byM).forEach(function (m) { harvested += fruitsOf(byM[m], D.S.moc, D.S.buocQua); });
    var spent = 0, hold = 0;
    db.all('DoiQua').forEach(function (r) { if (str(r.hs_id) !== hsId) return; if (str(r.trang_thai) === 'duyet') spent += num(r.so_qua); else if (str(r.trang_thai) === 'cho') hold += num(r.so_qua); });
    return { daThu: harvested, conLai: harvested - spent, dangDoi: hold };
  }

  /* ---------- quyền ghi điểm ---------- */
  function rolesOf(D, id) { return (D.roles[id] || []).map(function (r) { return r.vai; }); }
  function isLeader(D, id) { var r = rolesOf(D, id); return r.indexOf('to_truong') >= 0 || r.indexOf('to_pho') >= 0; }
  function canRecord(D, user, item, target) {
    if (!item || item.ghi === 'tu_dong') return false;
    if (user.co) return true;
    if (!target || target.id === user.id) return false;
    var R = D.roles[user.id] || [];
    function has(v) { return R.filter(function (r) { return r.vai === v; }); }
    var lead = isLeader(D, target.id), tRoles = rolesOf(D, target.id);
    if (item.ghi === 'to_truong') {
      if (has('to_truong').some(function (r) { return r.to === target.to; }) && !lead) return true;
      if (has('lop_truong').length && lead) return true;
    }
    if (item.ghi === 'to_pho') {
      if (has('to_pho').some(function (r) { return r.to === target.to; }) && !lead) return true;
      if (has('lop_pho_hoc_tap').length && lead) return true;
    }
    if (item.ghi === 'chi_doi_truong') {
      if (has('chi_doi_truong').length && tRoles.indexOf('chi_doi_truong') < 0) return true;
      if (has('chi_doi_pho').length && tRoles.indexOf('chi_doi_truong') >= 0) return true;
    }
    if (item.ghi === 'chi_doi_pho') {
      if (has('chi_doi_pho').length && tRoles.indexOf('chi_doi_pho') < 0) return true;
      if (has('chi_doi_truong').length && tRoles.indexOf('chi_doi_pho') >= 0) return true;
    }
    return false;
  }

  function login(db, D, ma) {
    ma = str(ma).trim();
    if (!ma) throw new Error('Em nhập mã trước nhé.');
    if (D.S.maCo && ma === D.S.maCo) return { co: true, id: 'co', ten: D.S.gvcn || 'Cô chủ nhiệm', roles: ['co'] };
    if (db.locked && db.locked()) throw new Error('Có nhiều lần nhập sai mã nên hệ thống tạm khoá. Em thử lại sau 15 phút nhé.');
    var h = D.hs.filter(function (x) { return x.ma && x.ma === ma; })[0];
    if (!h) { if (db.fail) db.fail(); throw new Error('Mã chưa đúng. Em kiểm tra lại nhé.'); }
    return { co: false, id: h.id, ten: h.ten, to: h.to, roles: rolesOf(D, h.id) };
  }
  function needCo(u) { if (!u.co) throw new Error('Chỉ cô chủ nhiệm làm được việc này.'); }
  function needKho(u) { if (!u.co && u.roles.indexOf('thu_kho') < 0) throw new Error('Chỉ thủ kho hoặc cô làm được việc này.'); }

  /* ---------- các yêu cầu ---------- */
  function publicView(db) {
    var D = load(db), now = db.now(), today = ymd(now), month = monthOf(today);
    var E = approved(D, today);
    var pts = sumBy(E, function (e) { return monthOf(e.ngay) === month; });
    var bees = {}; db.all('Ong').forEach(function (r) { var n = str(r.ngay); if (monthOf(n) === month) bees[str(r.hs_id)] = (bees[str(r.hs_id)] || 0) + 1; });
    var teams = teamStats(D, E, month), SN = shortNames(D.hs);
    var kho = db.all('KhoQua').map(function (r) { return { ma: str(r.ma), bt: str(r.bieu_tuong), ten: str(r.ten), gia: num(r.gia), sl: num(r.so_luong) }; }).filter(function (g) { return g.ten; });
    var y = +month.slice(0, 4), m = +month.slice(5);
    var endM = ymd(new Date(y, m, 0));
    return {
      lop: D.S.lop, gvcn: D.S.gvcn, homNay: today, thang: m, nam: y, conNgay: Math.round((parseYmd(endM) - parseYmd(today)) / 864e5) + 1,
      moc: D.S.moc, tenMoc: D.S.tenMoc, buocQua: D.S.buocQua, chuan: D.S.chuan,
      choPhien: D.S.choPhien, gioChoPhien: D.S.gioChoPhien,
      hocSinh: D.hs.map(function (h) { var p = Math.max(0, pts[h.id] || 0); return { id: h.id, ten: SN[h.id], to: h.to, o: h.o, muc: stageOf(p, D.S.moc), qua: fruitsOf(p, D.S.moc, D.S.buocQua), ong: bees[h.id] || 0 }; }),
      to: teams, vinhDanh: (function (v) { if (v.vuonCao) v.vuonCao.ten = SN[v.vuonCao.id]; return v; })(honors(D, E, today, teams)),
      cauHay: db.all('CauHay').map(function (r) { return [str(r.cau), str(r.tac_gia)]; }).filter(function (q) { return q[0]; }),
      kho: kho
    };
  }

  function myPage(db, D, u, hsId) {
    var now = db.now(), today = ymd(now), month = monthOf(today);
    var h = D.byId[hsId]; if (!h) throw new Error('Không tìm thấy học sinh.');
    var E = approved(D, today);
    var mine = E.filter(function (e) { return e.hs === hsId && monthOf(e.ngay) === month; });
    var p = mine.reduce(function (a, e) { return a + e.diem; }, 0), pp = Math.max(0, p);
    var bars = { 'Nề nếp': 0, 'Học tập': 0, 'Sẻ chia': 0 };
    mine.forEach(function (e) { if (e.diem > 0) bars[GROUP_BAR[e.nhom] || 'Sẻ chia'] += e.diem; });
    var pend = D.log.filter(function (e) { return e.hs === hsId && e.tt === 'cho' && monthOf(e.ngay) === month; });
    var k = stageOf(pp, D.S.moc), next = k < D.S.moc.length - 1 ? D.S.moc[k + 1] : null;
    var nextFruit = k === D.S.moc.length - 1 ? D.S.moc[k] + fruitsOf(pp, D.S.moc, D.S.buocQua) * D.S.buocQua : null;
    var hist = mine.concat(pend).sort(function (a, b) { return a.ngay < b.ngay ? 1 : a.ngay > b.ngay ? -1 : 0; })
      .map(function (e) { return { ngay: e.ngay, ten: e.ten + (e.lan > 1 ? ' (' + e.lan + ' lần)' : ''), diem: e.diem, cho: e.tt === 'cho', note: e.note || '' }; });
    var bees = db.all('Ong').filter(function (r) { return str(r.hs_id) === hsId && monthOf(str(r.ngay)) === month; }).map(function (r) { return str(r.ly_do); });
    var orders = db.all('DoiQua').filter(function (r) { return str(r.hs_id) === hsId; }).map(function (r) { return { ngay: str(r.ngay), ten: str(r.ten_qua), qua: num(r.so_qua), tt: str(r.trang_thai) }; });
    return { id: h.id, ten: h.ten, to: h.to, diem: p, muc: k, tenMuc: D.S.tenMoc[k], qua: fruitsOf(pp, D.S.moc, D.S.buocQua),
      conThieu: next !== null ? next - pp : nextFruit - pp, mucSau: next !== null ? D.S.tenMoc[k + 1] : 'thêm 1 quả',
      thanh: bars, lichSu: hist, ong: bees, gio: basket(db, D, E, hsId, today), doiQua: orders };
  }

  function recordForm(db, D, u) {
    var list = [];
    D.hs.forEach(function (h) {
      var its = Object.keys(D.items).filter(function (k) { return canRecord(D, u, D.items[k], h); });
      if (its.length) list.push({ id: h.id, ten: h.ten, to: h.to, muc: its });
    });
    var items = {}; list.forEach(function (s) { s.muc.forEach(function (k) { items[k] = D.items[k]; }); });
    return { hocSinh: list, muc: items };
  }

  function water(db, D, u, rows) {
    if (!rows || !rows.length) throw new Error('Chưa có dòng nào để tưới.');
    if (rows.length > 300) throw new Error('Nhiều dòng quá, em chia thành vài lần nhé.');
    var now = db.now(), today = ymd(now), out = [], errs = [];
    rows.forEach(function (r, i) {
      var item = D.items[str(r.muc)], lan = Math.max(1, Math.min(20, Math.floor(num(r.lan) || 1)));
      var ngay = str(r.ngay) || today;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay) || ngay > today || ngay < addDays(today, -14)) { errs.push('Dòng ' + (i + 1) + ': ngày không hợp lệ (chỉ ghi trong 14 ngày gần đây).'); return; }
      var targets = str(r.hs) === '*' && u.co ? D.hs : [D.byId[str(r.hs)]];
      targets.forEach(function (h) {
        if (!h) { errs.push('Dòng ' + (i + 1) + ': không tìm thấy học sinh.'); return; }
        if (!canRecord(D, u, item, h)) { errs.push('Dòng ' + (i + 1) + ': em không phụ trách mục này cho bạn ' + h.ten + '.'); return; }
        out.push({ id: uid('G', now) + out.length, thoi_gian: stamp(now), ngay: ngay, hs_id: h.id, to: h.to, ma_muc: item.ma, ten_muc: item.ten,
          diem: item.diem * lan, nhom: item.nhom, so_lan: lan, muc_loi: item.loi, ghi_chu: str(r.note).slice(0, 200), nguoi_ghi: u.co ? 'co' : u.id,
          trang_thai: u.co ? 'duyet' : 'cho', nguoi_duyet: u.co ? 'co' : '', thoi_gian_duyet: u.co ? stamp(now) : '' });
      });
    });
    if (errs.length) throw new Error(errs.join('\n'));
    db.addMany('GhiDiem', out);
    return { soDong: out.length, choDuyet: !u.co };
  }

  function myRecent(db, D, u) {
    var since = addDays(ymd(db.now()), -14);
    return D.log.filter(function (e) { return e.ghi === (u.co ? 'co' : u.id) && e.ngay >= since; })
      .sort(function (a, b) { return a.tg < b.tg ? 1 : -1; }).slice(0, 80)
      .map(function (e) { return { id: e.id, ngay: e.ngay, hs: e.hs, ten: D.byId[e.hs] ? D.byId[e.hs].ten : e.hs, muc: e.ten, lan: e.lan, diem: e.diem, tt: e.tt }; });
  }
  function removeRow(db, D, u, id) {
    var e = D.log.filter(function (x) { return x.id === str(id); })[0];
    if (!e) throw new Error('Không tìm thấy dòng này.');
    if (!u.co && (e.ghi !== u.id || e.tt !== 'cho')) throw new Error('Em chỉ xoá được dòng mình ghi và cô chưa duyệt.');
    db.patch('GhiDiem', 'id', e.id, { trang_thai: 'xoa' });
    return { ok: true };
  }

  function pending(db, D) {
    var rows = D.log.filter(function (e) { return e.tt === 'cho'; }).map(function (e) {
      return { id: e.id, ngay: e.ngay, hs: e.hs, ten: D.byId[e.hs] ? D.byId[e.hs].ten : e.hs, to: e.to, muc: e.ten, lan: e.lan, diem: e.diem, loi: e.loi, note: e.note,
        nguoi: e.ghi === 'co' ? 'Cô' : (D.byId[e.ghi] ? D.byId[e.ghi].ten : e.ghi) };
    });
    var gifts = db.all('DoiQua').filter(function (r) { return str(r.trang_thai) === 'cho'; }).map(function (r) {
      return { id: str(r.id), ngay: str(r.ngay), ten: D.byId[str(r.hs_id)] ? D.byId[str(r.hs_id)].ten : '', qua: str(r.ten_qua), so: num(r.so_qua) };
    });
    return { diem: rows, doiQua: gifts };
  }
  function approve(db, D, u, ids, ok) {
    needCo(u); var now = stamp(db.now()), n = 0;
    (ids || []).forEach(function (id) {
      var e = D.log.filter(function (x) { return x.id === str(id) && x.tt === 'cho'; })[0];
      if (!e) return; db.patch('GhiDiem', 'id', e.id, { trang_thai: ok ? 'duyet' : 'tu_choi', nguoi_duyet: 'co', thoi_gian_duyet: now }); n++;
    });
    return { soDong: n };
  }

  function alerts(D, entries, today) {
    var ws = weekStart(today), out = [];
    D.hs.forEach(function (h) {
      var neg = entries.filter(function (e) { return e.hs === h.id && e.diem < 0 && e.ngay >= ws; });
      if (!neg.length) return;
      var l3 = neg.filter(function (e) { return e.loi === '3'; }).length, l4 = neg.some(function (e) { return e.loi === '4'; }), l5 = neg.some(function (e) { return e.loi === '5'; }), db = neg.some(function (e) { return e.loi === 'DB'; });
      var lv = db ? 'Lỗi Đặc biệt: tạm giữ đồ vật, mời phụ huynh, báo Ban giám hiệu' : l5 ? 'Lỗi Mức 5: viết bản tự kiểm điểm, mời phụ huynh' : l4 ? 'Lỗi Mức 4: báo phụ huynh'
        : (neg.length >= 5 || l3 >= 2) ? 'Phê bình, nhắn phụ huynh' : neg.length >= 3 ? 'Nhắc nhở riêng' : '';
      if (lv) out.push({ id: h.id, ten: h.ten, to: h.to, soLoi: neg.length, xuLi: lv });
    });
    return out;
  }

  function classView(db, D) {
    var now = db.now(), today = ymd(now), month = monthOf(today), E = approved(D, today);
    var pts = sumBy(E, function (e) { return monthOf(e.ngay) === month; });
    return {
      hocSinh: D.hs.map(function (h) { return { id: h.id, ten: h.ten, to: h.to, o: h.o, ma: h.ma, vai: rolesOf(D, h.id), diem: pts[h.id] || 0, gio: basket(db, D, E, h.id, today).conLai }; }),
      to: teamStats(D, E, month), canLuuY: alerts(D, E, today), maCo: D.S.maCo
    };
  }
  function changeTeam(db, D, u, hsId, to) {
    needCo(u); to = num(to); var h = D.byId[str(hsId)];
    if (!h) throw new Error('Không tìm thấy học sinh.');
    if (to < 1 || to > 4) throw new Error('Tổ phải từ 1 đến 4.');
    if (h.to === to) return { ok: true };
    var used = {}; D.hs.forEach(function (x) { if (x.to === to) used[x.o] = 1; });
    var o = 0; for (var i = 1; i <= 10; i++) if (!used[i]) { o = i; break; }
    if (!o) throw new Error('Luống của tổ ' + to + ' đã đủ 10 ô.');
    db.patch('HocSinh', 'id', h.id, { to: String(to), o: String(o) });
    return { ok: true, o: o };
  }
  function giveBee(db, D, u, hsId, why) {
    needCo(u); var h = D.byId[str(hsId)]; if (!h) throw new Error('Không tìm thấy học sinh.');
    var now = db.now(); db.add('Ong', { id: uid('O', now), hs_id: h.id, ngay: ymd(now), ly_do: str(why).slice(0, 120) || 'Cô tặng' });
    return { ok: true };
  }

  function codeTaken(D, c, exceptId) { return c === D.S.maCo || D.hs.some(function (h) { return h.ma === c && h.id !== exceptId; }); }
  function setMyCode(db, D, u, a, b) {
    needCo(u); a = str(a).trim(); b = str(b).trim();
    if (a !== b) throw new Error('Hai lần nhập mã mới chưa giống nhau.');
    if (a.length < 8 || !/[a-zA-Z]/.test(a) || !/[0-9]/.test(a) || /\s/.test(a)) throw new Error('Mã của cô cần ít nhất 8 kí tự, có cả chữ và số, không có dấu cách.');
    if (codeTaken(D, a, '')) throw new Error('Mã này trùng với mã của một bạn, cô chọn mã khác nhé.');
    db.patch('CaiDat', 'khoa', 'ma_co', { gia_tri: a });
    return { ok: true };
  }
  function setStudentCode(db, D, u, hsId, c) {
    needCo(u); var h = D.byId[str(hsId)]; if (!h) throw new Error('Không tìm thấy học sinh.');
    c = str(c).trim();
    if (!c) { do { c = String(100000 + Math.floor(Math.random() * 900000)); } while (codeTaken(D, c, h.id)); }
    if (!/^[0-9a-zA-Z]{4,12}$/.test(c)) throw new Error('Mã học sinh gồm 4–12 chữ hoặc số, không dấu, không cách.');
    if (codeTaken(D, c, h.id)) throw new Error('Mã này đã có người dùng.');
    db.patch('HocSinh', 'id', h.id, { ma: c });
    return { ok: true, ma: c };
  }

  var UNIQUE_PER_TEAM = { to_truong: 1, to_pho: 1 };
  function roleList(db, D) {
    var rows = [];
    D.hs.forEach(function (h) { (D.roles[h.id] || []).forEach(function (r) { rows.push({ hs: h.id, ten: h.ten, to: h.to, vai: r.vai, tenVai: ROLE_LABEL[r.vai] }); }); });
    return { vaiTro: ROLE_LABEL, canSu: rows, hocSinh: D.hs.map(function (h) { return { id: h.id, ten: h.ten, to: h.to }; }) };
  }
  function assignRole(db, D, u, hsId, vai) {
    needCo(u); var h = D.byId[idOf(hsId)], v = roleKey(vai);
    if (!h) throw new Error('Cô chọn một bạn trước nhé.');
    if (!v) throw new Error('Vai trò không hợp lệ.');
    var replaced = [], keep = [];
    db.all('CanSu').forEach(function (r) {
      var id = idOf(r.hs_id), k = roleKey(r.vai_tro), o = D.byId[id];
      if (!o || !k) return;                                   // bỏ dòng trống / sai
      if (id === h.id && k === v) return;                     // sẽ ghi lại bên dưới
      if (k === v && (!UNIQUE_PER_TEAM[v] || o.to === h.to)) { replaced.push(o.ten); return; }  // thay người cũ
      keep.push({ hs_id: hsLabel(o), vai_tro: ROLE_LABEL[k], to: String((k === 'to_truong' || k === 'to_pho') ? o.to : (str(r.to) || o.to)) });
    });
    keep.push({ hs_id: hsLabel(h), vai_tro: ROLE_LABEL[v], to: String(h.to) });
    db.replaceAll('CanSu', keep);
    return { ok: true, thayCho: replaced.join(', ') };
  }
  function removeRole(db, D, u, hsId, vai) {
    needCo(u); var id = idOf(hsId), v = roleKey(vai), keep = [];
    db.all('CanSu').forEach(function (r) {
      var i = idOf(r.hs_id), k = roleKey(r.vai_tro), o = D.byId[i];
      if (!o || !k || (i === id && k === v)) return;
      keep.push({ hs_id: hsLabel(o), vai_tro: ROLE_LABEL[k], to: String(str(r.to) || o.to) });
    });
    db.replaceAll('CanSu', keep);
    return { ok: true };
  }

  function store(db, D, u) {
    needKho(u);
    var E = approved(D, ymd(db.now()));
    return {
      kho: db.all('KhoQua').map(function (r) { return { ma: str(r.ma), bt: str(r.bieu_tuong), ten: str(r.ten), gia: num(r.gia), sl: num(r.so_luong) }; }).filter(function (g) { return g.ma; }),
      hocSinh: D.hs.map(function (h) { var b = basket(db, D, E, h.id, ymd(db.now())); return { id: h.id, ten: h.ten, to: h.to, gio: b.conLai - b.dangDoi }; }),
      doiQua: db.all('DoiQua').slice(-40).reverse().map(function (r) { return { ngay: str(r.ngay), ten: D.byId[str(r.hs_id)] ? D.byId[str(r.hs_id)].ten : '', qua: str(r.ten_qua), so: num(r.so_qua), tt: str(r.trang_thai) }; })
    };
  }
  function addStock(db, D, u, g) {
    needKho(u); var now = db.now(), sl = Math.floor(num(g.sl)), gia = Math.floor(num(g.gia));
    if (sl <= 0) throw new Error('Số lượng phải lớn hơn 0.');
    var kho = db.all('KhoQua'), cur = kho.filter(function (r) { return str(r.ma) === str(g.ma); })[0];
    if (cur) { db.patch('KhoQua', 'ma', str(cur.ma), { so_luong: num(cur.so_luong) + sl }); }
    else {
      if (!str(g.ten).trim()) throw new Error('Em nhập tên món quà nhé.');
      if (gia <= 0) throw new Error('Giá (số quả) phải lớn hơn 0.');
      var ma = 'Q' + pad(kho.length + 1) + now.getTime().toString(36).slice(-3);
      db.add('KhoQua', { ma: ma, bieu_tuong: str(g.bt) || '🎁', ten: str(g.ten).trim().slice(0, 60), gia: gia, so_luong: sl }); cur = { ma: ma, ten: g.ten };
    }
    db.add('NhapKho', { thoi_gian: stamp(now), ma_qua: str(cur.ma), ten_qua: str(cur.ten), so_luong: sl, nguon: str(g.nguon) || 'Phụ huynh', nguoi_ghi: u.co ? 'co' : u.id });
    return { ok: true };
  }
  function redeem(db, D, u, hsId, maQua) {
    needKho(u); var now = db.now(), today = ymd(now), h = D.byId[str(hsId)];
    if (!h) throw new Error('Không tìm thấy học sinh.');
    var g = db.all('KhoQua').filter(function (r) { return str(r.ma) === str(maQua); })[0];
    if (!g) throw new Error('Không tìm thấy món quà.');
    var reserved = 0; db.all('DoiQua').forEach(function (r) { if (str(r.ma_qua) === str(g.ma) && str(r.trang_thai) === 'cho') reserved++; });
    if (num(g.so_luong) - reserved <= 0) throw new Error('Món này đã hết.');
    var b = basket(db, D, approved(D, today), h.id, today);
    if (b.conLai - b.dangDoi < num(g.gia)) throw new Error('Bạn ' + h.ten + ' chưa đủ quả (còn ' + (b.conLai - b.dangDoi) + ' quả, cần ' + num(g.gia) + ').');
    var row = { id: uid('D', now), thoi_gian: stamp(now), ngay: today, hs_id: h.id, ma_qua: str(g.ma), ten_qua: str(g.ten), so_qua: num(g.gia), nguoi_ghi: u.co ? 'co' : u.id, trang_thai: u.co ? 'duyet' : 'cho' };
    db.add('DoiQua', row);
    if (u.co) db.patch('KhoQua', 'ma', str(g.ma), { so_luong: num(g.so_luong) - 1 });
    return { ok: true, choDuyet: !u.co };
  }
  function approveGift(db, D, u, ids, ok) {
    needCo(u); var n = 0;
    (ids || []).forEach(function (id) {
      var r = db.all('DoiQua').filter(function (x) { return str(x.id) === str(id) && str(x.trang_thai) === 'cho'; })[0];
      if (!r) return;
      db.patch('DoiQua', 'id', str(r.id), { trang_thai: ok ? 'duyet' : 'tu_choi' });
      if (ok) { var g = db.all('KhoQua').filter(function (x) { return str(x.ma) === str(r.ma_qua); })[0]; if (g) db.patch('KhoQua', 'ma', str(g.ma), { so_luong: Math.max(0, num(g.so_luong) - 1) }); }
      n++;
    });
    return { soDong: n };
  }

  /* Điểm vào duy nhất cho mọi yêu cầu */
  function handle(db, req) {
    req = req || {};
    var a = str(req.action);
    if (a === 'vuon') return publicView(db);
    var D = load(db), u = login(db, D, req.ma);
    switch (a) {
      case 'dangNhap': return u;
      case 'cuaEm': if (u.co) throw new Error('Mã này là mã của cô.'); return myPage(db, D, u, u.id);
      case 'xemHs': needCo(u); return myPage(db, D, u, str(req.hs));
      case 'mauGhi': return recordForm(db, D, u);
      case 'tuoi': return water(db, D, u, req.dong);
      case 'daGhi': return myRecent(db, D, u);
      case 'xoaDong': return removeRow(db, D, u, req.id);
      case 'choDuyet': needCo(u); return pending(db, D);
      case 'duyet': return approve(db, D, u, req.ids, req.ok !== false);
      case 'lop': needCo(u); return classView(db, D);
      case 'doiTo': return changeTeam(db, D, u, req.hs, req.to);
      case 'tangOng': return giveBee(db, D, u, req.hs, req.lyDo);
      case 'doiMaCo': return setMyCode(db, D, u, req.maMoi, req.nhapLai);
      case 'doiMaHs': return setStudentCode(db, D, u, req.hs, req.maMoi);
      case 'canSu': needCo(u); return roleList(db, D);
      case 'ganVaiTro': return assignRole(db, D, u, req.hs, req.vai);
      case 'boVaiTro': return removeRole(db, D, u, req.hs, req.vai);
      case 'kho': return store(db, D, u);
      case 'nhapKho': return addStock(db, D, u, req.qua || {});
      case 'doiQua': return redeem(db, D, u, req.hs, req.maQua);
      case 'duyetQua': return approveGift(db, D, u, req.ids, req.ok !== false);
      default: throw new Error('Yêu cầu không hợp lệ: ' + a);
    }
  }

  return { SCHEMA: SCHEMA, ROLE_LABEL: ROLE_LABEL, handle: handle, ymd: ymd, stageOf: stageOf, fruitsOf: fruitsOf, weekStart: weekStart, addDays: addDays, settings: settings, load: load, canRecord: canRecord };
})();
if (typeof module !== 'undefined') module.exports = VuonCore;
