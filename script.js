(function () {
  "use strict";

  /* ============================================================
     Sample data — loaded via "Muat contoh"
     ============================================================ */
  const SAMPLE_DATA = `IF21\t100210092\tBela Negara dan Widya Mwat Yasa\tIF-C\t2\t
Selasa 15:00 - 16:45 Patt.II-2A
Heriyanto Dr. A.Md., S.Kom., M.Cs.
0
IF21\t100210122\tBahasa Indonesia\tIF-D\t2\t
Rabu 15:00 - 16:45 Patt.II-3B
Hermanto S.Pd., M.Hum.
0
IF21\t123210163\tStruktur Data\tIF-B\t3\t
Senin 15:00 - 17:30 Patt.II-3B
Heriyanto Dr. A.Md., S.Kom., M.Cs.
0
IF21\t123210172\tKomputer dan Masyarakat\tIF-A\t2\t
Kamis 15:00 - 16:45 Patt.I-3B
Oliver Samuel S. S.Kom., M.Eng.
0
IF21\t123210182\tKomputasi Numerik\tIF-C\t2\t
Rabu 07:30 - 09:15 Patt.II-3A
Dhimas Arief D S.T., Ph.D.
0
IF21\t123210192\tInteraksi Manusia dan Komputer\tIF-C\t2\t
Selasa 12:30 - 14:15 Patt.II-3D
Aldila Putri Linanzha , S.Kom., M.Cs.
0
IF21\t123210202\tSistem Digital\tIF-B\t2\t
Senin 10:00 - 11:45 Patt.I-3B
Budi Santosa S.Si., M.T.
0
IF21\t123210213\tGeoinformatika\tIF-D\t3\t
Rabu 12:30 - 15:00 Patt.II-2A
Andiko Putro Suryotomo S.Kom., M.Cs.
0
IF21\t123210222\tPemrograman Web\tIF-E\t2\t
Kamis 10:00 - 11:45 Patt.III-3B
Dessyanto Boedi P S.T., M.T.
0
IF21\t123210231\tPraktikum Implementasi Struktur Data\tIF-D\t1\t
Selasa 10:30 - 12:30 Laboratorium Komputasi
Heriyanto Dr. A.Md., S.Kom., M.Cs.
0
IF21\t123210241\tPraktikum Pemrograman Web\tIF-J\t1\t
Kamis 13:00 - 15:00 Laboratorium Basis Data
Dessyanto Boedi P S.T., M.T.
0
IF21\t123210382\tRiset Operasi\tIF-B\t2\t
Senin 12:30 - 14:15 Patt.I-3C
Bambang Yuwono S.T., M.T.
0`;

  const DAY_NAMES = ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"];
  const DAY_LABEL = {
    senin: "Senin", selasa: "Selasa", rabu: "Rabu", kamis: "Kamis",
    jumat: "Jumat", sabtu: "Sabtu", minggu: "Minggu"
  };
  const DAY_ORDER = DAY_NAMES.reduce((acc, d, i) => { acc[d] = i; return acc; }, {});

  /* ============================================================
     DOM references
     ============================================================ */
  const el = {
    rawInput: document.getElementById("raw-input"),
    parseBtn: document.getElementById("parse-btn"),
    exampleBtn: document.getElementById("example-btn"),
    clearBtn: document.getElementById("clear-btn"),
    status: document.getElementById("parse-status"),
    resultsSection: document.getElementById("results-section"),
    resultCount: document.getElementById("result-count"),
    searchInput: document.getElementById("search-input"),
    dayChips: document.getElementById("day-chips"),
    cardView: document.getElementById("card-view"),
    tableView: document.getElementById("table-view"),
    tableBody: document.getElementById("table-body"),
    emptyState: document.getElementById("empty-state"),
    cardTemplate: document.getElementById("card-template"),
    toggleBtns: Array.from(document.querySelectorAll(".toggle-btn"))
  };

  let courses = [];
  let activeDays = new Set();
  let currentView = "card";

  /* ============================================================
     Parsing
     ============================================================ */

  // Turn raw pasted text into an array of course records.
  function parseCourses(raw) {
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const records = [];
    const problems = [];
    let i = 0;

    while (i < lines.length) {
      const headerLine = lines[i];

      // A header line is expected to contain tab-separated fields.
      if (!headerLine.includes("\t")) {
        problems.push(`Baris tidak dikenali dan dilewati: "${headerLine.slice(0, 60)}"`);
        i++;
        continue;
      }

      const fields = headerLine.split("\t").map((f) => f.trim()).filter((f) => f.length > 0);

      if (fields.length < 4) {
        problems.push(`Baris data tidak lengkap dan dilewati: "${headerLine.slice(0, 60)}"`);
        i++;
        continue;
      }

      const [prodi, kode, nama, kelas, sks] = fields;
      i++;

      const scheduleLine = lines[i] || "";
      i++;
      const lecturerLine = lines[i] || "";
      i++;

      let extra = null;
      if (i < lines.length && /^\d+$/.test(lines[i])) {
        extra = lines[i];
        i++;
      }

      records.push({
        prodi: prodi || "",
        kode: kode || "",
        nama: nama || "(Tanpa nama mata kuliah)",
        kelas: kelas || "",
        sks: sks || "",
        schedule: parseSchedule(scheduleLine),
        rawSchedule: scheduleLine,
        lecturer: lecturerLine,
        extra: extra
      });
    }

    return { records, problems };
  }

  // Pull day / time / room out of a schedule line like:
  // "Selasa 15:00 - 16:45 Patt.II-2A"
  function parseSchedule(line) {
    const match = line.match(/^([A-Za-z]+)\s+(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})\s+(.+)$/);
    if (!match) {
      return { day: "", dayKey: "", time: "", room: line || "", raw: line };
    }
    const [, day, start, end, room] = match;
    const dayKey = day.toLowerCase();
    return {
      day: DAY_LABEL[dayKey] || day,
      dayKey: DAY_NAMES.includes(dayKey) ? dayKey : "",
      time: `${start.replace(".", ":")}\u2013${end.replace(".", ":")}`,
      room: room.trim(),
      raw: line
    };
  }

  /* ============================================================
     Rendering
     ============================================================ */

  function renderAll() {
    const filtered = getFilteredCourses();

    el.resultCount.textContent = `(${filtered.length} dari ${courses.length})`;
    el.emptyState.hidden = filtered.length > 0;
    el.cardView.hidden = !(currentView === "card" && filtered.length > 0);
    el.tableView.hidden = !(currentView === "table" && filtered.length > 0);

    renderCards(filtered);
    renderTable(filtered);
  }

  function getFilteredCourses() {
    const q = el.searchInput.value.trim().toLowerCase();

    return courses.filter((c) => {
      if (activeDays.size > 0 && !activeDays.has(c.schedule.dayKey)) return false;
      if (!q) return true;
      const haystack = [c.nama, c.lecturer, c.kelas, c.kode, c.schedule.room]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  function renderCards(list) {
    el.cardView.innerHTML = "";
    const frag = document.createDocumentFragment();

    list.forEach((c) => {
      const node = el.cardTemplate.content.cloneNode(true);
      const dayStamp = node.querySelector("[data-day-stamp]");
      dayStamp.textContent = c.schedule.day ? c.schedule.day.slice(0, 3).toUpperCase() : "\u2014";
      if (c.schedule.dayKey) dayStamp.setAttribute("data-day", c.schedule.dayKey);

      node.querySelector("[data-sks-badge]").textContent = c.sks ? `${c.sks} SKS` : "\u2014";
      node.querySelector("[data-title]").textContent = c.nama;
      node.querySelector("[data-code]").textContent = [c.prodi, c.kode].filter(Boolean).join(" \u00b7 ");
      node.querySelector("[data-schedule]").textContent = c.schedule.day
        ? `${c.schedule.day}, ${c.schedule.time}`
        : (c.rawSchedule || "\u2014");
      node.querySelector("[data-room]").textContent = c.schedule.room || "\u2014";
      node.querySelector("[data-class]").textContent = c.kelas || "\u2014";
      node.querySelector("[data-lecturer]").textContent = c.lecturer || "\u2014";

      const extraEl = node.querySelector("[data-extra]");
      if (c.extra !== null) {
        extraEl.hidden = false;
        extraEl.textContent = `Kolom tambahan pada data asli: ${c.extra}`;
      }

      frag.appendChild(node);
    });

    el.cardView.appendChild(frag);
  }

  function renderTable(list) {
    el.tableBody.innerHTML = "";
    const frag = document.createDocumentFragment();

    list.forEach((c) => {
      const tr = document.createElement("tr");

      tr.appendChild(makeCell(c.nama, "cell-course"));
      tr.appendChild(makeCell(c.kelas || "\u2014"));
      tr.appendChild(makeCell(c.sks || "\u2014"));
      tr.appendChild(makeCell(c.schedule.day || "\u2014"));
      tr.appendChild(makeCell(c.schedule.time || "\u2014", "cell-mono"));
      tr.appendChild(makeCell(c.schedule.room || "\u2014"));
      tr.appendChild(makeCell(c.lecturer || "\u2014"));

      frag.appendChild(tr);
    });

    el.tableBody.appendChild(frag);
  }

  function makeCell(text, cls) {
    const td = document.createElement("td");
    td.textContent = text;
    if (cls) td.className = cls;
    return td;
  }

  function renderDayChips() {
    el.dayChips.innerHTML = "";
    const daysPresent = DAY_NAMES.filter((d) => courses.some((c) => c.schedule.dayKey === d));

    daysPresent.forEach((day) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = DAY_LABEL[day];
      btn.setAttribute("aria-pressed", activeDays.has(day) ? "true" : "false");
      btn.addEventListener("click", () => {
        if (activeDays.has(day)) activeDays.delete(day);
        else activeDays.add(day);
        renderDayChips();
        renderAll();
      });
      el.dayChips.appendChild(btn);
    });
  }

  /* ============================================================
     Events
     ============================================================ */

  el.parseBtn.addEventListener("click", () => {
    const raw = el.rawInput.value;

    if (!raw.trim()) {
      setStatus("Tempelkan data terlebih dahulu sebelum memproses.", true);
      el.resultsSection.hidden = true;
      return;
    }

    const { records, problems } = parseCourses(raw);

    if (records.length === 0) {
      setStatus("Tidak ada mata kuliah yang berhasil dikenali. Periksa kembali format data Anda.", true);
      el.resultsSection.hidden = true;
      return;
    }

    courses = records;
    activeDays = new Set();

    let message = `Berhasil memproses ${records.length} mata kuliah.`;
    if (problems.length > 0) {
      message += ` ${problems.length} baris dilewati karena tidak dikenali.`;
    }
    setStatus(message, false);

    el.resultsSection.hidden = false;
    renderDayChips();
    renderAll();
    el.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  el.exampleBtn.addEventListener("click", () => {
    el.rawInput.value = SAMPLE_DATA;
    el.parseBtn.click();
  });

  el.clearBtn.addEventListener("click", () => {
    el.rawInput.value = "";
    el.rawInput.focus();
    courses = [];
    el.resultsSection.hidden = true;
    setStatus("", false);
  });

  el.searchInput.addEventListener("input", renderAll);

  el.toggleBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentView = btn.dataset.view;
      el.toggleBtns.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
      renderAll();
    });
  });

  function setStatus(msg, isError) {
    el.status.textContent = msg;
    el.status.classList.toggle("is-error", !!isError);
  }
})();
