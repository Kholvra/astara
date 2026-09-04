# Astara — Product Requirements

Folder ini adalah source of truth untuk backlog requirement tingkat produk Astara.

## Struktur

- [`backlog.md`](backlog.md) adalah index ringkas seluruh backlog Astara.
- [`items/`](items/) berisi satu folder per requirement.
- [`policies/definition-of-ready.md`](policies/definition-of-ready.md) menjelaskan kapan item boleh diserahkan ke engineering.
- [`policies/definition-of-done.md`](policies/definition-of-done.md) menjelaskan kapan paket requirement dianggap selesai pada Domain 1.

## Konvensi proyek

- Profile: `product-app`.
- ID baru: `REQ-001`, `REQ-002`, dan seterusnya.
- Status awal item: `discovery` sampai perilaku, scope, dan keputusan penting disahkan.
- `priority` dan `size` tetap `unset` sampai ada keputusan manusia; nilai yang sudah disetujui dicatat di backlog dan metadata item.
- `backlog.md` memuat item MVP dan item masa depan yang sudah disebut dalam dokumen; item yang ditunda tetap terlihat tetapi tidak dianggap scope MVP.
- Pada tabel open questions, `Project owner (proposed)` adalah usulan agent yang masih harus dikonfirmasi sebagai owner akuntabel; itu bukan assignment final.

## Sumber konteks

- [`docs/design.md`](../design.md) adalah keputusan produk terbaru. Jika berbeda dengan brief awal, dokumen ini yang diikuti.
- [`docs/transit-walking-map-product-brief.md`](../transit-walking-map-product-brief.md) adalah brief awal dan konteks visi.
- [`docs/astara-map-research.md`](../astara-map-research.md) adalah riset teknis map, routing, dan data trust.

Nama produk resmi yang dipakai mulai 2 September 2026 adalah **Astara**.

## Current workflow state

Backlog ini dimulai sebagai baseline discovery hasil pemecahan vertikal dari dokumen yang sudah ada. Setelah refinement dan triage lanjutan, REQ-001 sampai REQ-006 dan REQ-012 sampai REQ-016 memiliki paket `01-requirement.md`, `02-acceptance-criteria.md`, dan `03-readiness-review.md`; semuanya kini `Ready` setelah priority/size disetujui pada 2026-09-04. Keputusan perilaku utama contest/demo sudah dicatat, termasuk mobile-first. Bukti eksekusi seperti snapshot, golden cases, dan uji pemahaman tetap menjadi pekerjaan domain berikutnya. REQ-007 sampai REQ-011 tetap berada pada capture/discovery karena outcome post-MVP belum cukup jelas untuk dispesifikasi tanpa mengarang scope.

Lima item baru memisahkan outcome yang sebelumnya terlalu besar: route card dan instruksi (`REQ-012`), kontrol waktu/tarif/preferensi (`REQ-013`), evidence akses pejalan kaki (`REQ-014`), state dan recovery planner (`REQ-015`), serta validasi pemahaman pengguna (`REQ-016`). Privacy lokasi, terminologi/content, accessibility, dan performance tetap ditulis sebagai contract atau acceptance lintas item terkait agar backlog tidak terpecah menjadi pekerjaan teknis yang kehilangan outcome.

Triage dan dependency graph di [`backlog.md`](backlog.md) mencatat keputusan triage yang sudah disetujui serta dependency yang masih perlu dikonfirmasi pada engineering kickoff. Tidak ada source code atau test yang termasuk dalam paket Domain 1 ini.
