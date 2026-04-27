---
name: all
description: Hiện toàn bộ cheat-sheet của dự án GreenLens — skills, commands, hooks, agents, rules. Dùng skill này bất cứ khi nào muốn xem lại có gì trong .claude, quên lệnh nào, hoặc muốn hiểu workflow làm việc tổng quan. Keyword trigger: /all, "có gì", "xem lại", "cheat sheet", "tôi có gì".
argument-hint: [section? skills|commands|hooks|agents|rules]
---

# GreenLens — Cheat Sheet `.claude`

> Tất cả tool, skill, command, hook, agent trong 1 trang.

---

## SLASH COMMANDS (gõ `/tên`)

| Command | Dùng khi nào |
|---|---|
| `/feature <FeatureName>` | Scaffold feature mới A→Z (types → service → store → hook → UI → screen) |
| `/screen <ScreenName>` | Tạo 1 màn hình mới (screen + component + hook) |
| `/component <ComponentName>` | Tạo 1 UI component trong `src/components/` |
| `/plan [--fast\|--hard\|--parallel\|--two]` | Lên kế hoạch feature — `--hard` cho feature phức tạp |
| `/execute [plan-file]` | Implement theo plan có sẵn |
| `/fix [--auto\|--quick\|--review]` | Debug + fix bug có cấu trúc: Scout → Diagnose → Fix → Review |
| `/code-review [pr-url\|blank]` | Review code local hoặc GitHub PR |
| `/learn` | Rút pattern từ session hiện tại, lưu thành skill |
| `/debug` | Debug crash / lỗi runtime / Metro / navigation |
| `/security` | Audit bảo mật toàn app hoặc 1 phần |
| `/performance` | Audit lag, re-render thừa, FlatList chậm |
| `/build-app <android\|ios> [dev\|preview\|prod]` | Build APK/IPA |
| `/frontend-design <mô tả>` | Tạo UI đẹp, độc đáo, production-grade |
| `/coding-level <0-5>` | Điều chỉnh độ giải thích (0=ELI5, 5=God Mode) |
| `/all` | Xem cheat sheet này |

---

## HOOKS (tự động, không cần gọi)

| Khi nào | Hook | Làm gì |
|---|---|---|
| Trước khi tạo file mới | `pre_write_guard.py` | Cảnh báo nếu file tương tự đã tồn tại — tránh duplicate |
| Trước Write/Edit/Bash | `observe.py pre` | Ghi lại action để học pattern |
| Trước Write/Edit/Bash | `suggest_compact.py` | Gợi ý `/compact` khi context quá lớn |
| Sau Write/Edit/Bash | `observe.py post` | Ghi kết quả action để học |
| Sau Write/Edit | `build-check.py` | Chạy TypeScript check — báo lỗi ngay |
| Khi gửi prompt | `plan-context.py` | Inject nội dung plan đang active vào context |
| Trước compact | `pre-compact.py` | Lưu state học được trước khi compact |
| Khi bắt đầu session | `session-start.py` | Load context từ session trước |
| Khi kết thúc session | `session-end.py` | Lưu session summary |

---

## AGENTS (tự động spawn khi cần, hoặc qua Agent tool)

| Agent | Khi nào được dùng |
|---|---|
| `ui-component-builder` | Tạo component trong `src/components/` |
| `screen-builder` | Tạo màn hình mới trong `app/` |
| `api-integrator` | Tạo service, types, React Query hooks |
| `rn-debugger` | Debug crash, lỗi Metro, NativeWind, Reanimated |
| `code-reviewer` | Review code sau khi implement xong |
| `researcher` | Tìm hiểu thư viện, API, best practices |
| `planner` | Lên kế hoạch implementation |
| `plan-reviewer` | Review plan trước khi execute |
| `git-manager` | Quản lý git: commit, PR, merge |
| `project-manager` | Theo dõi tiến độ, task management |
| `docs-manager` | Viết/cập nhật documentation |
| `scout` | Explore codebase, tìm file, pattern |

---

## RULES (luôn áp dụng, không cần gọi)

| File | Nội dung |
|---|---|
| `01-project-overview` | Tech stack, commands, feature checklist |
| `02-folder-structure` | Cấu trúc thư mục, quy tắc đặt file |
| `03-design-tokens` | Colors (`#139B40`), typography, spacing |
| `04-ux-and-animation` | UX principles, haptics, Reanimated patterns |
| `05-component-patterns` | Component, hook patterns, TypeScript |
| `06-service-store-patterns` | Axios service, Zustand store patterns |
| `07-styling-nativewind` | NativeWind v4, className rules |

**Quy tắc cốt lõi không bao giờ vi phạm:**
- File đúng layer (`app/` chỉ routing, `src/services/` chỉ API)
- Màu dùng `bg-primary` / `text-primary` — không hard-code `#139B40`
- Mọi Pressable có animation press (Reanimated)
- Mọi list có skeleton loader
- Không dùng `Animated` API cũ
- Component có TypeScript interface cho props

---

## WORKFLOW ĐIỂN HÌNH

```
Tính năng mới
  → /plan --hard "tên feature"
  → /execute plans/<file>.md
  → /code-review
  → /security (trước khi merge)

Bug
  → /fix --review "mô tả bug"

Component mới
  → /component <Tên>

Màn hình mới
  → /screen <Tên>

Feature hoàn chỉnh (A→Z)
  → /feature <TênFeature>

Build test
  → /build-app android dev
```

---

## CẤU TRÚC FILE `.claude`

```
.claude/
├── hooks/          ← Python scripts tự động
├── skills/         ← /skill-name commands
├── commands/       ← /command-name shortcuts
├── agents/         ← Specialized sub-agents
├── rules/          ← Project conventions (luôn active)
├── session-data/   ← Session state, compaction log
└── settings.json   ← Hook config, permissions
```
