"""
RNN Autocomplete Backend — FastAPI
Run locally: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
import torch.nn as nn
import torch.nn.functional as F
import os

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
def char_to_num(char: str) -> int:
    return 0 if char == '_' else ord(char) - 96

def num_to_char(num: int) -> str:
    return '_' if num == 0 else chr(num + 96)

# ─────────────────────────────────────────────
# Model definition (must match training code)
# ─────────────────────────────────────────────
class AutocompleteModel(nn.Module):
    def __init__(self, alphabet_size, embed_dim, hidden_size, num_layers):
        super().__init__()
        self.alphabet_size = alphabet_size
        self.embed_dim = embed_dim
        self.hidden_size = hidden_size
        self.num_layers = num_layers
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

    def autocomplete(self, sample: list[str], n_suggestions: int = 5) -> dict:
        self.eval()
        results = {}
        with torch.no_grad():
            for literal in sample:
                suggestions = set()
                attempts = 0
                while len(suggestions) < n_suggestions and attempts < 50:
                    attempts += 1
                    hidden_state, cell_state = self.initial_state()
                    current_word = literal

                    for char in literal:
                        char_tensor = torch.tensor([char_to_num(char)])
                        output, hidden_state, cell_state = self.forward(
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
                        output, hidden_state, cell_state = self.forward(
                            char_tensor, hidden_state, cell_state
                        )

                    if len(current_word) > len(literal):
                        suggestions.add(current_word)

                results[literal] = sorted(suggestions)[:n_suggestions]
        return results


# ─────────────────────────────────────────────
# Load model at startup
# ─────────────────────────────────────────────
MODEL_PATH = os.getenv("MODEL_PATH", "best_model.pth")

model = AutocompleteModel(ALPHABET_SIZE, EMBED_DIM, HIDDEN_SIZE, NUM_LAYERS)

if os.path.exists(MODEL_PATH):
    model.load_state_dict(torch.load(MODEL_PATH, map_location="cpu"))
    print(f"✅ Model loaded from {MODEL_PATH}")
else:
    print(f"⚠️  Model file '{MODEL_PATH}' not found — predictions will be random.")

# ─────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────
app = FastAPI(title="RNN Autocomplete API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Replace with your frontend URL in production
    allow_methods=["*"],
    allow_headers=["*"],
)


class AutocompleteRequest(BaseModel):
    prefix: str
    n_suggestions: int = 5


class AutocompleteResponse(BaseModel):
    prefix: str
    suggestions: list[str]


@app.get("/")
def root():
    return {"status": "ok", "message": "RNN Autocomplete API is running"}


@app.post("/autocomplete", response_model=AutocompleteResponse)
def autocomplete(req: AutocompleteRequest):
    prefix = req.prefix.lower().strip()

    if not prefix:
        raise HTTPException(status_code=400, detail="Prefix cannot be empty")
    if len(prefix) > WORD_SIZE - 1:
        raise HTTPException(status_code=400, detail=f"Prefix too long (max {WORD_SIZE - 1} chars)")
    if not prefix.isalpha():
        raise HTTPException(status_code=400, detail="Prefix must contain only letters")

    results = model.autocomplete([prefix], n_suggestions=req.n_suggestions)
    return AutocompleteResponse(prefix=prefix, suggestions=results[prefix])


@app.post("/autocomplete/batch")
def autocomplete_batch(prefixes: list[str], n_suggestions: int = 5):
    cleaned = [p.lower().strip() for p in prefixes if p.strip().isalpha()]
    if not cleaned:
        raise HTTPException(status_code=400, detail="No valid prefixes provided")
    results = model.autocomplete(cleaned, n_suggestions=n_suggestions)
    return results