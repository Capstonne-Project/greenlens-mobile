---
name: task-selector
description: Suggest and select the best agent/command/rules before execution
---

Analyze `$ARGUMENTS` and propose the best execution route for this project.

Requirements:

1. Detect intent from natural language.
2. Suggest up to 5 actions:
   - Best agent
   - Best command
   - Direct execution option
   - Optional backup route
3. Explain each suggestion in one short line.
4. Ask the user to select one option (number or custom instruction).
5. After user selection, proceed with that route.

Output template:

Detected intent: <intent>

Suggested actions:
- [1] Agent: <agent-name> - <reason>
- [2] Command: <command-name> - <reason>
- [3] Direct execution - <reason>
- [4] Backup route - <reason>

Reply with 1/2/3/4 (or custom).
