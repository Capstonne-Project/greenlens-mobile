#!/usr/bin/env python3
"""
Hook: PreToolUse -> Write
Prevents the AI from creating a new file if a similar file/functionality already exists.
Monitors only core layers (components, hooks, services, stores).
"""

import sys
import json
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# TARGET LAYERS CONFIGURATION
# ---------------------------------------------------------------------------
TARGET_LAYERS = ["src/components", "src/hooks", "src/services", "src/stores", "src/utils"]
IGNORE_DIRS = {"node_modules", ".git", "__pycache__", "dist", "build", ".expo"}

def get_core_name(filename: str) -> str:
    """
    Extracts the core semantic name of the file.
    Example: 'auth.service.ts' -> 'auth'
             'ButtonPrimary.tsx' -> 'buttonprimary'
             'useAuth.ts' -> 'useauth'
    """
    # Get the first part before the dot
    base = filename.split('.')[0].lower()
    
    # Filter out common suffixes for better matching (e.g., LoginScreen -> login)
    suffixes = ['screen', 'component', 'service', 'store', 'hook', 'context', 'provider']
    for suffix in suffixes:
        if base.endswith(suffix) and len(base) > len(suffix):
            base = base[:-len(suffix)]
            break
            
    # Remove 'use' prefix if it's a hook (e.g., useAuth -> auth)
    if base.startswith('use') and len(base) > 3:
        base = base[3:]
        
    return base

def main():
    # 1. Read JSON input safely
    try:
        raw_data = sys.stdin.read()
        if not raw_data:
            sys.exit(0)
        data = json.loads(raw_data)
    except Exception:
        sys.exit(0)

    # Filter for the "Write" tool
    tool_name = data.get("tool_name", data.get("tool", ""))
    if tool_name and tool_name.lower() not in ["write", "create_file"]:
        # If it's an Edit tool, skip because it's modifying an existing file
        pass

    # 2. Extract file path
    raw_path = (
        data.get("file_path") or 
        data.get("tool_input", {}).get("file_path") or 
        ""
    )
    if not raw_path:
        sys.exit(0)

    file_path = Path(raw_path).resolve()
    cwd = Path(os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())).resolve()

    # 3. Check if the file is in the monitored layers
    # Use .as_posix() to convert \ (Windows) to / (Mac/Linux) for cross-platform matching
    rel_path_str = file_path.as_posix()
    is_target_layer = any(layer in rel_path_str for layer in TARGET_LAYERS)
    
    if not is_target_layer:
        sys.exit(0) # Not in the monitored zone -> Allow

    # 4. If the file ALREADY EXISTS -> This is an overwrite/update action -> Allow
    if file_path.exists():
        sys.exit(0)

    # 5. Analyze the intended file name
    core_name = get_core_name(file_path.name)
    
    # Skip if the core name is too short (prevents false positives like 'ui.ts')
    if len(core_name) <= 2:
        sys.exit(0)

    # 6. Scan the project to find similar files
    src_dir = cwd / "src"
    if not src_dir.exists():
        sys.exit(0)

    similar_files = []
    
    for root, dirs, files in os.walk(src_dir):
        # Prune unneeded directories to drastically speed up the scan
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        
        for f in files:
            # Only care about source code files
            if not f.endswith(('.ts', '.tsx', '.js', '.jsx')):
                continue
                
            f_core = get_core_name(f)
            
            # Smart Matching: Two-way containment match
            # Example: intent to create 'auth' -> finds 'useAuth', 'auth.service', 'AuthContext'
            if core_name in f_core or f_core in core_name:
                match_path = Path(root) / f
                rel_match = match_path.relative_to(cwd)
                similar_files.append(str(rel_match))
            
            # Limit to 8 files to avoid terminal spam
            if len(similar_files) >= 8:
                break
        if len(similar_files) >= 8:
            break

    # 7. If similar files are found -> BLOCK THE AI!
    if similar_files:
        msg = [
            "⚠️ GUARD BLOCK: Detected existing files with similar functionality in the project:",
            ""
        ]
        for sf in similar_files:
            msg.append(f"  → {sf}")
            
        msg.extend([
            "",
            "💡 ARCHITECTURE PRINCIPLE: Please RE-USE existing files instead of creating new ones to avoid Duplicate Code.",
            "If you are certain this function/component needs to be newly created (e.g., distinctly different business logic), briefly explain your reasoning in the chat and I will allow it."
        ])
        
        # Print to stderr and exit 1 -> The Agent sees this as a Tool Error and stops to read
        print("\n".join(msg), file=sys.stderr)
        sys.exit(1)

    sys.exit(0)

if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Principle: If the tooling fails, do not crash the AI's workflow -> allow silently
        sys.exit(0)