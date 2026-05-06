#  RNN Word Autocomplete

A character-level LSTM model trained on 8,800+ English words that predicts and autocompletes words in real time.

![Python](https://img.shields.io/badge/Python-3.11-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green)
![React](https://img.shields.io/badge/React-Vite-purple)
![PyTorch](https://img.shields.io/badge/PyTorch-LSTM-red)
![HuggingFace](https://img.shields.io/badge/HuggingFace-Spaces-yellow)

---

##  Live Demo

| | URL |
|---|---|
|  **Frontend** | [rnn-autocomplete-ui](https://huggingface.co/spaces/Priyadharshani21/rnn-autocomplete-ui) |
|  **Backend API** | [rnn-autocomplete-api](https://huggingface.co/spaces/Priyadharshani21/rnn-autocomplete-api) |
|  **Model** | [project-rnn-model](https://huggingface.co/Priyadharshani21/project-rnn-model) |

---

##  Project Structure

```
Project_RNN/
├── backend/
│   ├── main.py              # FastAPI backend
│   ├── app.py               # Gradio UI (local testing)
│   ├── Dockerfile           # Docker config for HuggingFace Spaces
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main React component
│   │   └── main.jsx         # React entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── RNN_Assignment.ipynb     # Model training notebook
└── README.md
```

---

##  Model Architecture

| Parameter | Value |
|---|---|
| Model Type | Character-level LSTM |
| Embedding Dim | 64 |
| Hidden Size | 512 |
| Layers | 1 |
| Alphabet Size | 27 (a-z + padding) |
| Max Word Size | 13 characters |
| Training Words | 8,847 |
| Epochs | 15 |

The model takes a character prefix as input and predicts the next character one at a time using multinomial sampling, generating multiple unique word suggestions.

---

##  Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Clone the repository
```bash
git clone https://github.com/PriyadharshaniNavarathnam/rnn-autocomplete.git
cd rnn-autocomplete
```

### 2. Run the Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 3. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

---

##  API Endpoints

### `GET /`
Health check
```json
{"status": "ok", "message": "RNN Autocomplete API is running"}
```

### `POST /autocomplete`
Get word suggestions for a prefix.

**Request:**
```json
{
  "prefix": "univ",
  "n_suggestions": 6
}
```

**Response:**
```json
{
  "prefix": "univ",
  "suggestions": ["universal", "university", "universe", "univocal"]
}
```

### `POST /autocomplete/batch`
Get suggestions for multiple prefixes at once.

---

##  Tech Stack

| Layer | Technology |
|---|---|
| Model | PyTorch (LSTM) |
| Backend | FastAPI + Uvicorn |
| Frontend | React + Vite |
| Model Hosting | HuggingFace Hub |
| Deployment | HuggingFace Spaces (Docker + Static) |

---

##  Deployment

The app is deployed on **HuggingFace Spaces**:

- **Backend** uses Docker SDK with FastAPI running on port 7860
- **Frontend** uses Static SDK with a production Vite build
- **Model** is hosted on HuggingFace Hub and downloaded at runtime

---

##  Author

**Priyadharshani Navarathnam**
- GitHub: [@PriyadharshaniNavarathnam](https://github.com/PriyadharshaniNavarathnam)
- HuggingFace: [@Priyadharshani21](https://huggingface.co/Priyadharshani21)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
