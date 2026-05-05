import gradio as gr
import torch
import torch.nn as nn
import torch.nn.functional as F

# ─────────────────────────────────────────────
# Constants (must match your training config)
# ─────────────────────────────────────────────
WORD_SIZE = 13
ALPHABET_SIZE = 27
EMBED_DIM = 64
HIDDEN_SIZE = 512
NUM_LAYERS = 1

# ─────────────────────────────────────────────
# Character encoding helpers
# ─────────────────────────────────────────────
def char_to_num(char):
    return 0 if char == '_' else ord(char) - 96

def num_to_char(num):
    return '_' if num == 0 else chr(num + 96)

# ─────────────────────────────────────────────
# Model definition
# ─────────────────────────────────────────────
class AutocompleteModel(nn.Module):
    def __init__(self, alphabet_size, embed_dim, hidden_size, num_layers):
        super().__init__()
        self.hidden_size = hidden_size
        self.embedding = nn.Embedding(alphabet_size, embed_dim)
        self.lstm = nn.LSTMCell(embed_dim, hidden_size)
        self.fc = nn.Linear(hidden_size, alphabet_size)

    def forward(self, character, hidden_state, cell_state):
        embedded = self.embedding(character)
        hidden_state, cell_state = self.lstm(embedded, (hidden_state, cell_state))
        output = self.fc(hidden_state)
        return output, hidden_state, cell_state

    def initial_state(self):
        return torch.zeros(1, self.hidden_size), torch.zeros(1, self.hidden_size)

# ─────────────────────────────────────────────
# Load model
# ─────────────────────────────────────────────
model = AutocompleteModel(ALPHABET_SIZE, EMBED_DIM, HIDDEN_SIZE, NUM_LAYERS)
model.load_state_dict(torch.load("best_model.pth", map_location="cpu"))
model.eval()
print("Model loaded successfully!")

# ─────────────────────────────────────────────
# Autocomplete function
# ─────────────────────────────────────────────
def autocomplete(prefix, n_suggestions=6):
    prefix = prefix.lower().strip()

    if not prefix:
        return "Please enter a prefix."
    if not prefix.isalpha():
        return "Only letters allowed."
    if len(prefix) > WORD_SIZE - 1:
        return f"Prefix too long (max {WORD_SIZE - 1} characters)."

    suggestions = set()
    attempts = 0

    with torch.no_grad():
        while len(suggestions) < n_suggestions and attempts < 50:
            attempts += 1
            hidden_state, cell_state = model.initial_state()
            current_word = prefix

            for char in prefix:
                char_tensor = torch.tensor([char_to_num(char)])
                output, hidden_state, cell_state = model.forward(
                    char_tensor, hidden_state, cell_state
                )

            while len(current_word) < WORD_SIZE:
                probabilities = F.softmax(output, dim=1)
                next_char_num = torch.multinomial(probabilities, 1).item()
                next_char = num_to_char(next_char_num)
                if next_char == '_':
                    break
                current_word += next_char
                char_tensor = torch.tensor([next_char_num])
                output, hidden_state, cell_state = model.forward(
                    char_tensor, hidden_state, cell_state
                )

            if len(current_word) > len(prefix):
                suggestions.add(current_word)

    result = sorted(suggestions)[:n_suggestions]
    return "\n".join(result) if result else "No suggestions found."

# ─────────────────────────────────────────────
# Gradio UI
# ─────────────────────────────────────────────
with gr.Blocks(title="RNN Autocomplete") as demo:
    gr.Markdown("# RNN Word Autocomplete")
    gr.Markdown("Character-level LSTM trained on 8,800+ English words. Type a prefix to get suggestions.")

    with gr.Row():
        prefix_input = gr.Textbox(
            label="Enter prefix",
            placeholder="e.g. univ, comp, neur, algo",
            max_lines=1
        )
        n_input = gr.Slider(
            minimum=1,
            maximum=10,
            value=6,
            step=1,
            label="Number of suggestions"
        )

    submit_btn = gr.Button("Autocomplete", variant="primary")
    output = gr.Textbox(label="Suggestions", lines=8)

    submit_btn.click(
        fn=autocomplete,
        inputs=[prefix_input, n_input],
        outputs=output
    )

    prefix_input.submit(
        fn=autocomplete,
        inputs=[prefix_input, n_input],
        outputs=output
    )

    gr.Examples(
        examples=[["univ"], ["comp"], ["neur"], ["algo"], ["math"], ["prog"]],
        inputs=prefix_input
    )

demo.launch()