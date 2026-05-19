import sys
import json

def generate_whiteboard_prompt(data):
    topic = data.get("topic", "a business process")
    steps = data.get("steps", [])
    num_steps = len(steps)
    
    steps_text = ""
    if steps:
        steps_text = f" showing a {num_steps}-step process: " + ", ".join([f"Step {i+1}: {step}" for i, step in enumerate(steps)])
    
    prompt = (
        f"A whiteboard infographic about {topic}{steps_text}. "
        "Hand-drawn sketchy boxes connected by winding arrows. "
        "Each step features a simple black marker icon relevant to the step's content. "
        "Minimalist, clean, professional sketch style. "
        "Realistic dry-erase marker texture, black and blue ink on a bright white board. "
        "The text is handwritten-style, all caps for headings, clear and legible. "
        "High resolution, 4k, professional lighting."
    )
    return prompt

if __name__ == "__main__":
    try:
        input_data = json.load(sys.stdin)
        print(generate_whiteboard_prompt(input_data))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
