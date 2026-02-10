# Lumina Live

**Transform passive videos into interactive knowledge with Gemini 3-powered real-time Q&A, sentiment analysis, and creator insights.**

---

## 🎯 What is Lumina Live?

Lumina Live is a real-time video intelligence platform that fills the gap between video playback and knowledge extraction. Built entirely on **Gemini 3 Flash Preview**, it transforms recorded videos into interactive knowledge sessions with:

- **Real-time transcription** with automatic timestamps
- **Intelligent Q&A** that classifies and answers questions from video content
- **Intent-based reasoning** that routes queries to transcript (facts) or comments (sentiment)
- **Creator analytics** with engagement metrics, sentiment analysis, and clarity gaps

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Gemini API Key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone or extract the project**
   ```bash
   cd Lumina_Live
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure API Key**
   - Copy `.env.example` to `.env`
   - Add your Gemini API key:
     ```
     GEMINI_API_KEY=your_actual_key_here
     ```

4. **Run the server**
   ```bash
   python Lumina_Live.py
   ```

5. **Open in browser**
   - Navigate to `http://localhost:5000`
   - Upload a video file (MP4, MOV, or audio files)
   - Start asking questions!

---

## 🏗️ Architecture

Lumina Live uses a **4-layer AI architecture**:

1. **Layer 1: Real-Time Transcription** - Streaming transcription with `[MM:SS]` timestamps
2. **Layer 2: Intelligent Q&A** - Classification + grounded extraction from transcript
3. **Layer 3: Lumina AI Active** - Dual-mode search (current video + global library)
4. **Layer 4: Creator Dashboard** - Structured JSON analytics

**Tech Stack:**
- Backend: Python, Flask, Socket.IO
- Frontend: Vanilla HTML/CSS/JavaScript
- AI: Gemini 3 Flash Preview

---

## 📖 Features

### Live Chat Q&A
- Ask questions during or after video playback
- AI classifies as "relevant" or "off-topic"
- Relevant questions get answered with timestamp citations
- Click timestamps to jump to exact moments

### Lumina AI Active Panel
- **Bottom Bar**: Ask about current video (facts from transcript, sentiment from comments)
- **Top Bar**: Search your entire chat history across all uploaded videos

### Creator Dashboard
- Engagement metrics (clearance rate, question pipeline)
- Sentiment analysis (positive/neutral/negative breakdown)
- Top interest topics
- Clarity gaps with evidence quotes

---

## 🎬 Demo

[Link to your demo video here]

---

## 📝 License

Built for the Gemini 3 Hackathon.

---

## 🙏 Acknowledgments

Powered by **Gemini 3 Flash Preview** from Google DeepMind.
