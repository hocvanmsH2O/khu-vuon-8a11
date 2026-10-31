/* Cơ sở dữ liệu trong bộ nhớ (dùng cho chế độ thử trên trình duyệt và kiểm thử). */
var VuonMemDB = function (tables, nowFn, onChange) {
  var T = JSON.parse(JSON.stringify(tables));
  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  return {
    all: function (n) { return copy(T[n] || []); },
    add: function (n, o) { (T[n] = T[n] || []).push(copy(o)); if (onChange) onChange(T); },
    addMany: function (n, a) { T[n] = (T[n] || []).concat(copy(a)); if (onChange) onChange(T); },
    patch: function (n, k, v, o) { var r = (T[n] || []).filter(function (x) { return String(x[k]) === String(v); })[0]; if (r) { for (var f in o) r[f] = o[f]; if (onChange) onChange(T); } },
    replaceAll: function (n, a) { T[n] = copy(a); if (onChange) onChange(T); },
    now: nowFn || function () { return new Date(); },
    fails: [],
    fail: function () { this.fails.push(Date.now()); },
    locked: function () { var c = Date.now() - 10 * 60e3; this.fails = this.fails.filter(function (t) { return t > c; }); return this.fails.length >= 30; },
    dump: function () { return copy(T); }
  };
};
if (typeof module !== 'undefined') module.exports = VuonMemDB;
