#!/usr/bin/env python3
"""
Hook: PostToolUse Write|Edit
Kiểm tra lỗi (Type-check/Lint) ngay sau khi AI sửa file.
Kết hợp ưu điểm chống spam của Bash và sự thông minh/đa ngôn ngữ của Python.
"""

import sys
import json
import re
import os
import subprocess
from pathlib import Path

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def walk_up(file_path: Path, filename: str) -> Path | None:
    """Leo ngược lên các thư mục cha để tìm file config (như tsconfig.json)"""
    for parent in [file_path.parent] + list(file_path.parents):
        candidate = parent / filename
        if candidate.exists():
            return candidate
    return None

def format_feedback(title: str, output: str, error_pattern: str, max_lines: int = 40) -> str | None:
    """Hàm định dạng output: Cắt bớt dòng để chống spam và đếm tổng số lỗi"""
    lines = output.strip().splitlines()
    if not lines:
        return None

    # Đếm số lượng lỗi thực sự dựa trên Regex
    error_count = len([l for l in lines if re.search(error_pattern, l)])
    if error_count == 0:
        return None

    # Giới hạn số dòng output (chống spam context window của AI)
    truncated = lines[:max_lines]
    result = f"🔴 {title}:\n\n" + "\n".join(truncated)
    
    if len(lines) > max_lines:
        result += "\n... (đã cắt bớt log để tiết kiệm bộ nhớ)"

    result += f"\n\n=> Tổng cộng: {error_count} lỗi cần fix. Hãy sửa ngay!"
    return result

# ---------------------------------------------------------------------------
# Language-specific checkers
# ---------------------------------------------------------------------------

def check_typescript(file_path: Path) -> str | None:
    tsconfig = walk_up(file_path, "tsconfig.json")
    if not tsconfig:
        return None
    
    cwd = tsconfig.parent
    # Xử lý gọi npx an toàn cho cả Windows và macOS/Linux
    npx_cmd = "npx.cmd" if os.name == "nt" else "npx"
    
    result = subprocess.run(
        [npx_cmd, "tsc", "--noEmit", "--pretty", "false"],
        capture_output=True, text=True, cwd=str(cwd)
    )
    
    output = result.stdout + result.stderr
    return format_feedback(f"TypeScript errors sau khi edit {file_path.name}", output, r"error TS\d+:")

def check_python(file_path: Path) -> str | None:
    result = subprocess.run(
        [sys.executable, "-m", "py_compile", str(file_path)],
        capture_output=True, text=True
    )
    output = (result.stdout + result.stderr).strip()
    if result.returncode != 0 and output:
        return f"🔴 Python syntax error trong {file_path.name}:\n{output}"
    return None

def check_go(file_path: Path) -> str | None:
    go_mod = walk_up(file_path, "go.mod")
    if not go_mod:
        return None
    
    result = subprocess.run(["go", "build", "./..."], capture_output=True, text=True, cwd=str(go_mod.parent))
    output = result.stdout + result.stderr
    return format_feedback(f"Golang build errors", output, r"\\w+\\.go:\\d+:\\d+:")

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

CHECKERS = {
    ".ts": check_typescript,
    ".tsx": check_typescript,
    ".py": check_python,
    ".go": check_go,
}

def main() -> None:
    # 1. Đọc JSON từ đầu vào (nhanh và an toàn hơn node -e)
    try:
        raw_data = sys.stdin.read()
        if not raw_data:
            return
        data = json.loads(raw_data)
    except Exception:
        return

    # 2. Bóc tách đường dẫn file từ nhiều ngóc ngách của JSON
    raw_path = (
        data.get("file_path") or 
        data.get("tool_input", {}).get("file_path") or 
        data.get("tool_response", {}).get("file_path") or 
        ""
    )
    
    if not raw_path:
        return

    file_path = Path(raw_path)
    suffix = file_path.suffix.lower()
    
    checker = CHECKERS.get(suffix)
    if not checker:
        return

    # 3. Chạy kiểm tra lỗi
    try:
        error_msg = checker(file_path)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return

    # 4. Trả kết quả về cho AI theo chuẩn JSON Hook
    if error_msg:
        payload = {
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": error_msg,
            }
        }
        print(json.dumps(payload))

if __name__ == "__main__":
    # Luôn exit 0 để không làm crash luồng chạy của AI, dù có lỗi xảy ra ở script này
    try:
        main()
    except Exception:
        sys.exit(0)