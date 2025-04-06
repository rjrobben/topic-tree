import json
import re
import sys

def parse_line(line):
    """Parses a line to extract level, code (optional), and name, handling spaced dots."""
    stripped_leading_ws = line.lstrip(' ') # Remove only leading spaces
    indent_ws = len(line) - len(stripped_leading_ws)
    trimmed = stripped_leading_ws.strip() # Remove trailing whitespace

    if not trimmed:
        return None

    top_level_match = re.match(r"^(\d+)\s+(.*)", trimmed)
    # Match dots potentially separated by whitespace: sequence of (dot + optional space)
    dot_match = re.match(r"^((\.\s*)+)\s+(.*)", trimmed)

    node = {"children": []}
    level = 0 # Default level

    if top_level_match:
        level = 0 # Top level items are level 0
        node["code"] = top_level_match.group(1)
        node["name"] = top_level_match.group(2).strip()
    elif dot_match:
        # Count actual dots in the matched sequence (group 1)
        dot_sequence = dot_match.group(1)
        num_dots = dot_sequence.count('.')
        level = num_dots + 1 # Level is dot count + 1
        node["name"] = dot_match.group(3).strip() # Name is in group 3 now
    elif indent_ws > 0: # Indented but no dots or code -> Level 1
        level = 1
        node["name"] = trimmed
    else: # No indentation, no code, no dots - treat as level 1.
        level = 1
        node["name"] = trimmed

    node["level"] = level # Use 'level'
    return node

# build_hierarchy remains the same as it uses the calculated 'level'

def build_hierarchy(lines):
    """Builds the nested hierarchy from parsed lines based on calculated level."""
    # This function is now called within main during line-by-line processing
    # It's kept here for clarity but isn't directly called with all lines at once.
    # The logic is moved into the main loop.
    pass # Placeholder, logic moved to main

def main():
    input_file = "taxhier_MC.txt"
    output_file = "taxonomy.json"

    print(f"⏳ Reading {input_file} line by line...")
    try:
        # Process file line by line for memory efficiency
        root = {"name": "root", "children": [], "level": -1} # Dummy root
        stack = [root] # Stack holds nodes, top is current parent context

        with open(input_file, 'r', encoding='utf-8') as f:
            print("🌳 Building hierarchy...")
            for line in f: # Iterate directly over the file object
                current_node = parse_line(line)
                if not current_node:
                    continue # Skip blank lines

                current_level = current_node["level"]

                # Pop stack until parent level is less than current level
                while stack[-1]["level"] >= current_level:
                    stack.pop()

                # Add current node to the children of the parent (now at top of stack)
                parent = stack[-1]
                # Add node without the 'level' key
                parent["children"].append({k: v for k, v in current_node.items() if k != 'level'})

                # Push current node onto stack to become potential parent
                stack.append(current_node)

        hierarchy = root["children"] # Final hierarchy is children of the dummy root

        print(f"💾 Writing JSON to {output_file}...")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(hierarchy, f, indent=2, ensure_ascii=False)

        print(f"✅ Successfully converted {input_file} to {output_file}")

    except FileNotFoundError:
        print(f"❌ Error: Input file '{input_file}' not found.")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error processing file: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
