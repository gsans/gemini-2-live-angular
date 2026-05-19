---
name: whiteboard-info
description: "Create popular LinkedIn-style whiteboard infographics from user-provided information. Use for: generating process diagrams, comparison charts, frameworks, and mind maps in a hand-drawn whiteboard style."
---

# Whiteboard Infographic Skill

This skill enables the creation of high-quality, "hand-drawn" whiteboard infographics that are popular on LinkedIn. These infographics feature a clean, minimalist aesthetic with realistic dry-erase marker textures, sketchy boxes, and winding arrows.

## Workflow

To create a whiteboard infographic, follow these steps:

1.  **Analyze Input**: Determine the core topic and the structure of the information (e.g., a 5-step process, a 2x2 matrix, or a comparison).
2.  **Select Pattern**: Choose the most appropriate design pattern from `/home/ubuntu/skills/whiteboard-info/references/design_patterns.md`.
3.  **Generate Prompt**: Use the `generate_prompt.py` script to create a structured image generation prompt.
    ```bash
    echo '{"topic": "Your Topic", "steps": ["Step 1", "Step 2", "Step 3"]}' | python3 /home/ubuntu/skills/whiteboard-info/scripts/generate_prompt.py
    ```
4.  **Create Image**: Use the `generate` tool with the generated prompt. Ensure the style is consistent with the "whiteboard" aesthetic.
5.  **Refine and Deliver**: Review the generated image for clarity and visual appeal. If necessary, refine the prompt and regenerate.

## Design Patterns

| Pattern | Best For | Visual Structure |
| :--- | :--- | :--- |
| **Sequential Process** | Workflows, roadmaps, step-by-step guides | 3-7 boxes connected by winding arrows in an S-curve. |
| **Comparison** | Before vs. After, Old Way vs. New Way | Side-by-side boxes with a vertical divider. |
| **Framework** | 2x2 matrices, categorization | Four quadrants defined by two intersecting axes. |
| **Central Concept** | Mind maps, topic breakdowns | One central box with branches radiating to smaller boxes. |

## Prompting Guidelines

When generating the infographic, always include these key visual elements in the prompt:
- **Background**: Bright white board with subtle dry-erase marker streaks.
- **Ink**: Black and blue ink with a realistic marker texture.
- **Elements**: Hand-drawn sketchy boxes, winding arrows, and simple minimalist icons.
- **Text**: Handwritten-style font, all caps for headings, clear and legible.

Refer to `/home/ubuntu/skills/whiteboard-info/references/design_patterns.md` for specific prompt additions for each pattern.
