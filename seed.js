/* Dữ liệu khởi tạo: bộ tiêu chí lớp 8A11 (bản mới) + danh sách học sinh.
   Dùng chung cho Apps Script (tạo trang tính lần đầu) và chế độ thử trên web. */
var VuonSeed = (function () {
  var settings = [
    ['ten_lop', '8A11', 'Tên lớp hiện trên trang'],
    ['gvcn', 'Ms. H₂O', 'Tên cô chủ nhiệm'],
    ['ma_co', '', 'Mã đăng nhập của cô (tạo tự động, có thể đổi)'],
    ['moc', '0,15,35,50,65,80,95', '7 mốc điểm của cây (tạm, chỉnh sau 2 tuần chạy thử)'],
    ['ten_moc', 'Hạt Lấm tấm,Mầm Li ti,Chồi Biêng biếc,Cây Xanh xanh,Nụ Chúm chím,Hoa Rực rỡ,Quả Ngọt ngào', 'Tên 7 mức'],
    ['diem_moi_qua', '10', 'Sau mốc Quả, thêm bao nhiêu điểm thì thêm 1 quả'],
    ['chuan_to', '12', 'Điểm trung bình tháng để tổ tưới đầy bình (tạm)'],
    ['ngay_bat_dau', '2026-11-02', 'Ngày bắt đầu tính điểm (YYYY-MM-DD)'],
    ['ngay_cho_phien', '2026-12-01', 'Ngày Chợ phiên Quả ngọt sắp tới (YYYY-MM-DD)'],
    ['gio_cho_phien', 'trong giờ sinh hoạt lớp', 'Ghi chú thời gian chợ phiên']
  ];

  /* [mã, nhóm, tên việc, điểm, người ghi, mức lỗi] — người ghi: to_pho, to_truong, chi_doi_truong, chi_doi_pho, co, tu_dong */
  var items = [
    ['HT_PB', 'Học tập', 'Phát biểu xây dựng bài có chất lượng', 1, 'to_pho', ''],
    ['HT_KT8', 'Học tập', 'Bài kiểm tra đạt 8 điểm', 1, 'to_pho', ''],
    ['HT_KT9', 'Học tập', 'Bài kiểm tra đạt 9 điểm', 2, 'to_pho', ''],
    ['HT_KT10', 'Học tập', 'Bài kiểm tra đạt 10 điểm', 3, 'to_pho', ''],
    ['HT_TB', 'Học tập', 'Điểm tiến bộ (bài sau cao hơn bài trước từ 2 điểm)', 2, 'to_pho', ''],
    ['HT_KHEN', 'Học tập', 'Được thầy cô bộ môn khen trước lớp', 2, 'to_pho', ''],
    ['HT_DB', 'Học tập', 'Đôi bạn cùng tiến (bạn được kèm có điểm tiến bộ)', 2, 'tu_dong', ''],
    ['NN_TT', 'Nề nếp', 'Tuần trong: cả tuần không vi phạm', 2, 'tu_dong', ''],
    ['NN_TTTO', 'Nề nếp', 'Tuần trong của tổ: cả tổ không ai vi phạm', 1, 'tu_dong', ''],
    ['NN_TRUC', 'Nề nếp', 'Trực nhật, lao động tốt', 1, 'to_truong', ''],
    ['UX_GIUP', 'Ứng xử', 'Giúp đỡ bạn trong học tập, cuộc sống', 2, 'to_truong', ''],
    ['UX_VT', 'Ứng xử', 'Việc tốt: nhặt được của rơi trả lại, giúp người gặp khó khăn', 3, 'to_truong', ''],
    ['TT_DG', 'Tập thể', 'Đóng góp cho lớp (kê bàn ghế, mang đồ dùng, trang trí, giúp cô)', 1, 'chi_doi_truong', ''],
    ['TT_DGNB', 'Tập thể', 'Đóng góp nổi bật cho lớp', 2, 'chi_doi_truong', ''],
    ['TT_PT', 'Tập thể', 'Tham gia văn nghệ, thể thao, hoạt động Đội, cuộc thi', 2, 'chi_doi_pho', ''],
    ['TT_TAP', 'Tập thể', 'Tích cực tập luyện cho phong trào (mỗi buổi)', 1, 'chi_doi_pho', ''],
    ['TT_GIAI', 'Tập thể', 'Đạt giải cá nhân hoặc giải của đội', 5, 'chi_doi_pho', ''],
    ['TT_LOP', 'Tập thể', 'Lớp đạt giải tập thể (cộng cả lớp)', 2, 'co', ''],
    ['TT_CS', 'Tập thể', 'Cán sự hoàn thành tốt nhiệm vụ trong tuần', 2, 'co', ''],
    ['HOAN3', 'Nề nếp', 'Hoàn điểm sửa sai (lỗi Mức 5, đã thực hiện cam kết)', 3, 'co', ''],
    ['L1_MUON', 'Nề nếp', 'Đi học muộn', -1, 'to_truong', '1'],
    ['L1_TP', 'Nề nếp', 'Thiếu tác phong (khăn quàng, bảng tên, logo, giày, đồng phục)', -1, 'to_truong', '1'],
    ['L1_CHO', 'Nề nếp', 'Ngồi sai chỗ', -1, 'to_truong', '1'],
    ['L1_RA5', 'Nề nếp', 'Ra khỏi lớp trong 5 phút chuyển tiết khi chưa được phép', -1, 'to_truong', '1'],
    ['L1_QV', 'Nề nếp', 'Mang quà vặt vào lớp', -1, 'to_truong', '1'],
    ['L1_XE', 'Nề nếp', 'Để xe sai chỗ, đạp xe trong sân, không đội mũ bảo hiểm', -1, 'to_truong', '1'],
    ['L1_DD', 'Học tập', 'Quên đồ dùng học tập (mỗi môn 1 lỗi)', -1, 'to_pho', '1'],
    ['L1_BAI', 'Học tập', 'Chưa chuẩn bị bài (mỗi môn 1 lỗi)', -1, 'to_pho', '1'],
    ['L2_TT', 'Nề nếp', 'Mất trật tự (mỗi tiết bị nhắc 1 lỗi)', -2, 'to_truong', '2'],
    ['L2_RAC', 'Nề nếp', 'Xả rác, bỏ rác trong hộc bàn, viết vẽ bậy lên bàn', -2, 'to_truong', '2'],
    ['L2_VM', 'Ứng xử', 'Thiếu văn minh trong lời nói và hành động', -2, 'to_truong', '2'],
    ['L2_RA', 'Nề nếp', 'Tự ý ra khỏi lớp trong giờ học', -2, 'to_truong', '2'],
    ['L2_SD', 'Nề nếp', 'Bị Sao đỏ ghi tên', -2, 'co', '2'],
    ['L2_VPT', 'Tập thể', 'Vắng không lí do khi đã được phân công tham gia phong trào', -2, 'chi_doi_pho', '2'],
    ['L3_ND', 'Ứng xử', 'Nói dối thầy cô', -3, 'co', '3'],
    ['L3_GL', 'Học tập', 'Gian lận trong kiểm tra', -3, 'co', '3'],
    ['L3_TC', 'Ứng xử', 'Trêu chọc bạn', -3, 'to_truong', '3'],
    ['L3_LP', 'Ứng xử', 'Thiếu lễ phép', -3, 'to_truong', '3'],
    ['L3_NKP', 'Nề nếp', 'Nghỉ học không phép', -3, 'co', '3'],
    ['L4_PH', 'Nề nếp', 'Phá hoại tài sản (báo phụ huynh)', -5, 'co', '4'],
    ['L4_DT', 'Nề nếp', 'Dùng điện thoại trái quy định (báo phụ huynh)', -5, 'co', '4'],
    ['L5_DN', 'Ứng xử', 'Gây gổ, đánh nhau', -10, 'co', '5'],
    ['L5_KT', 'Ứng xử', 'Kì thị, bắt nạt, cô lập bạn', -10, 'co', '5'],
    ['L5_VL', 'Ứng xử', 'Vô lễ với thầy cô, nhân viên nhà trường', -10, 'co', '5'],
    ['LDB', 'Nề nếp', 'Mang hoặc dùng chất cấm, đồ vật cấm', -20, 'co', 'DB']
  ];

  var students = [
    ['Mai Tuấn Anh', 3], ['Nguyễn Hồng Quang Anh', 4], ['Nguyễn Xuân Quý Anh', 1], ['Phùng Tú Anh', 1],
    ['Thân Trâm Anh', 3], ['Nguyễn Sơn Bách', 4], ['Phạm Gia Bảo', 3], ['Dương Gia Bình', 1],
    ['Nguyễn Ngọc Bảo Châu', 2], ['Nguyễn Vũ Linh Chi', 4], ['Nguyễn Thùy Dương A', 3], ['Nguyễn Thùy Dương B', 2],
    ['Đặng Thị Thu Hà', 2], ['Bùi Gia Hân', 1], ['Cao Gia Huy', 1], ['Chu Chấn Hưng', 1],
    ['Nguyễn Đức Khôi', 2], ['Đào Tuệ Linh', 2], ['Phạm Nguyễn Hà Linh', 2], ['Nguyễn Đức Quang Minh', 1],
    ['Trần Hùng Hiểu Minh', 4], ['Phạm Kim Ngân', 1], ['Nguyễn Phạm Mai Nguyên', 4], ['Đào Phúc Bảo Nhi', 3],
    ['Nguyễn Bảo Nhi', 3], ['Nguyễn Trần Thảo Nhi', 4], ['Lương Minh Phú', 4], ['Đoàn Gia Phúc', 3],
    ['Đặng Anh Thư', 4], ['Lê Minh Thư', 2], ['Đỗ Quang Thứ', 4], ['Đoàn Yến Trang', 3],
    ['Đồng Quỳnh Trang', 2], ['Trương Hải Triết', 3], ['Mai Trọng Tuệ', 4], ['Đặng Đức Tùng', 2],
    ['Nguyễn Sơn Tùng', 3]
  ];

  var gifts = [
    ['Q01', '✏️', 'Bút gel màu', 2, 12], ['Q02', '🔖', 'Bộ bookmark', 3, 8], ['Q03', '📒', 'Sổ tay xinh', 5, 6],
    ['Q04', '🖍️', 'Bút highlight', 3, 10], ['Q05', '🎀', 'Kẹp tóc nơ', 4, 5], ['Q06', '🧸', 'Móc khóa thú bông', 8, 3]
  ];

  var quotes = [
    ['Ăn quả nhớ kẻ trồng cây.', 'Tục ngữ'], ['Kiến tha lâu cũng đầy tổ.', 'Tục ngữ'],
    ['Một cây làm chẳng nên non,\nBa cây chụm lại nên hòn núi cao.', 'Ca dao'],
    ['Vì lợi ích mười năm thì phải trồng cây,\nvì lợi ích trăm năm thì phải trồng người.', 'Hồ Chí Minh'],
    ['Có công mài sắt, có ngày nên kim.', 'Tục ngữ'], ['Hành trình vạn dặm bắt đầu từ một bước chân.', 'Lão Tử'],
    ['Bầu ơi thương lấy bí cùng,\nTuy rằng khác giống nhưng chung một giàn.', 'Ca dao'], ['Nước chảy đá mòn.', 'Tục ngữ'],
    ['Học thầy không tày học bạn.', 'Tục ngữ'], ['Ngọc không mài không thành đồ quý,\nngười không học không biết đạo.', 'Kinh Lễ'],
    ['Cây có cội, nước có nguồn.', 'Tục ngữ'], ['Đi một ngày đàng, học một sàng khôn.', 'Tục ngữ'],
    ['Thất bại là mẹ thành công.', 'Tục ngữ'], ['Tốt gỗ hơn tốt nước sơn.', 'Tục ngữ'], ['Lời chào cao hơn mâm cỗ.', 'Tục ngữ'],
    ['Học, học nữa, học mãi.', 'V. I. Lênin'], ['Người ta là hoa đất.', 'Tục ngữ'], ['Uống nước nhớ nguồn.', 'Tục ngữ'],
    ['Thua keo này, bày keo khác.', 'Tục ngữ'], ['Chuyên gia trong bất kì việc gì\ncũng từng là người mới bắt đầu.', 'Helen Hayes']
  ];

  var roleNames = {
    to_truong: 'Tổ trưởng', to_pho: 'Tổ phó', lop_truong: 'Lớp trưởng', lop_pho_hoc_tap: 'Lớp phó học tập',
    chi_doi_truong: 'Chi đội trưởng', chi_doi_pho: 'Chi đội phó', thu_kho: 'Thủ kho', co: 'Cô chủ nhiệm', tu_dong: 'Tự động'
  };

  /* Tạo nội dung các bảng lần đầu. code(): hàm sinh mã 6 chữ số. */
  function tables(code, longCode) {
    var seat = {}, hs = students.map(function (s, i) {
      seat[s[1]] = (seat[s[1]] || 0) + 1;
      return { id: 'HS' + (i < 9 ? '0' : '') + (i + 1), ho_ten: s[0], to: s[1], o: seat[s[1]], ma: code(), dang_hoc: 1 };
    });
    return {
      CaiDat: settings.map(function (r) { return { khoa: r[0], gia_tri: r[0] === 'ma_co' ? (longCode || randomLong)() : r[1], ghi_chu: r[2] }; }),
      HocSinh: hs, CanSu: [],
      MucDiem: items.map(function (r) { return { ma: r[0], nhom: r[1], ten: r[2], diem: r[3], nguoi_ghi: r[4], muc_loi: r[5] }; }),
      GhiDiem: [], DoiBan: [], Ong: [],
      KhoQua: gifts.map(function (g) { return { ma: g[0], bieu_tuong: g[1], ten: g[2], gia: g[3], so_luong: g[4] }; }),
      DoiQua: [], NhapKho: [],
      CauHay: quotes.map(function (q) { return { cau: q[0], tac_gia: q[1] }; })
    };
  }
  function randomLong() { var A = 'abcdefghjkmnpqrstuvwxyz23456789', s = ''; while (!(/[a-z]/.test(s) && /[0-9]/.test(s))) { s = ''; for (var i = 0; i < 10; i++) s += A.charAt(Math.floor(Math.random() * A.length)); } return s; }
  function randomCode() { return String(100000 + Math.floor(Math.random() * 900000)); }

  return { settings: settings, items: items, students: students, gifts: gifts, quotes: quotes, roleNames: roleNames, tables: tables, randomCode: randomCode, randomLong: randomLong };
})();
if (typeof module !== 'undefined') module.exports = VuonSeed;
