# CloudDesigner - Ignition 8.3 Context

## Quick Reference

### Access Points
- **This Desktop**: VNC via Guacamole at http://localhost:8080/
- **Context Page**: http://localhost:8080/context
- **Auto-Login**: http://localhost:8080/connect

### Login Credentials
- **Username**: designer
- **Password**: designer

---

## Ignition Designer 8.3

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save project |
| Ctrl+Shift+O | Quick open resource |
| Ctrl+F | Find in current context |
| Ctrl+Shift+F | Find in project |
| Ctrl+Shift+P | Preview Perspective view |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Escape | Cancel / Deselect |

### Designer UI Layout
```
┌─────────────┬───────────────────────────────────────┬─────────────┐
│   PROJECT   │           MAIN EDITOR                 │  PROPERTY   │
│   BROWSER   │                                       │   EDITOR    │
│             │   (View/Script/Tag Editor)            │             │
│  - Project  │                                       │  Props      │
│    - Persp  │                                       │  Position   │
│      -Views │                                       │  Styles     │
│    - Tags   │                                       │  Scripts    │
├─────────────┴───────────────────────────────────────┴─────────────┤
│                    OUTPUT CONSOLE                                  │
└────────────────────────────────────────────────────────────────────┘
```

---

## Common Tasks

### Create Perspective View
```
Project Browser → Perspective → Views → Right-click → New View
```

### Add Tag Binding
```
Select component → Property Editor → Click chain icon → Select Tag
```

### Create Project Script
```
Project Browser → Scripting → Project Library → Right-click → New Script
```

---

## Scripting Patterns (Python/Jython)

### Read Tag
```python
value = system.tag.readBlocking(["[default]Path/To/Tag"])[0].value
```

### Write Tag
```python
system.tag.writeBlocking(["[default]Path/To/Tag"], [newValue])
```

### Named Query
```python
results = system.db.runNamedQuery("QueryName", {"param": value})
```

### Navigate Perspective
```python
system.perspective.navigate("/path/to/view", {"param": "value"})
```

---

## Perspective Components

| Category | Components |
|----------|------------|
| Containers | Flex Container, Coordinate, Column, Tab, Breakpoint |
| Inputs | Text Field, Numeric Entry, Dropdown, Toggle, Button |
| Display | Label, Value Display, Icon, Image, LED, Gauge |
| Data | Table, Power Chart, XY Chart, Pie/Bar Chart |

---

## Gateway Connection
Use `host.docker.internal` to connect to gateways running on your host machine.

Example: `http://host.docker.internal:8088`

---

## Hybrid Workflow with Claude Code CLI

For complex tasks like creating views or writing scripts:

1. **Chrome sidebar**: Describe what you need
2. **Claude Code CLI**: Generates the JSON/code files
3. **Designer**: Project → Scan Project to reload
4. **Chrome sidebar**: Verify result in Designer

---

## File Locations

| Item | Path |
|------|------|
| Designer Launcher | `/home/designer/.local/share/designerlauncher/` |
| Ignition Config | `/home/designer/.ignition/` |
| Workspace | `/workspace/` |

---

## Guacamole Clipboard

Press **Ctrl+Alt+Shift** to open the Guacamole sidebar for clipboard access.
