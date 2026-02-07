# Perspective Playbooks

Playbooks for Perspective (web-based HMI) browser automation using Playwright.

## Available Playbooks

| Playbook | Description |
|----------|-------------|
| `test_buttons.yaml` | Test button interactions and click handling |
| `test_inputs.yaml` | Test input field interactions and form validation |
| `test_docks.yaml` | Test dock panel navigation and layout |
| `test_discovery_debug.yaml` | Debug playbook for component discovery |
| `test_suite_master.yaml` | Master test suite that runs multiple test playbooks |
| `test_verification_examples.yaml` | Examples of verification step patterns |
| `test_visual_consistency.yaml` | Visual consistency checks across views |

## Capabilities

Perspective playbooks enable:
- Automated UI testing for Perspective applications
- Session management and authentication testing
- Component interaction validation (buttons, inputs, dropdowns)
- View navigation and dock panel testing
- Real-time data verification
- Live browser streaming during execution (2 FPS)
- AI-powered visual verification (`perspective.verify_with_ai`)

## Usage

1. Navigate to the **Playbooks** page in the Toolbox
2. Select a Perspective playbook
3. Configure the gateway URL and credentials
4. Click **Run** to execute with live browser preview

See `docs/playbook_syntax.md` for the full YAML syntax reference.
