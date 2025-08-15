# 🎬 Short Creator: Viral Video Automation 🚀

![Versión](https://img.shields.io/badge/version-1.0.0-blue)
![Licencia](https://img.shields.io/badge/license-MIT-green)
![Node.js](https://img.shields.io/badge/node-%3E%3D14-yellow)

**Short Creator** is a powerful CLI application that automates the creation of viral short videos from your favorite movies, series, or YouTube content. 🎞️

## ✨ Features

*   **Automatic Viral Segment Detection:** Uses Gemini AI to analyze video transcripts and identify the most emotionally impactful segments.
*   **Parallel Processing:**  Efficiently processes multiple videos at once to speed up your workflow.
*   **Customizable Output:** Generates videos in the vertical 9:16 format, perfect for YouTube Shorts, TikTok, and Instagram Reels.
*   **Easy to Use:** Simply add your videos and run a single command to start creating.

## 🛠️ Tech Stack

*   **[Node.js](https://nodejs.org/)**: For the application's core logic.
*   **[ffmpeg](https://ffmpeg.org/)**: For video manipulation and rendering.
*   **[faster-whisper](https://github.com/guillaumekln/faster-whisper)**: For high-performance audio transcription.
*   **[Gemini AI](https://ai.google.dev/)**: For intelligent content analysis and selection.

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed on your system:

*   [Node.js](https://nodejs.org/) (version 14 or higher)
*   [ffmpeg](https://ffmpeg.org/download.html) (must be added to your system's PATH)
*   [faster-whisper](https://github.com/guillaumekln/faster-whisper#installation)

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/short-creator.git
    cd short-creator
    ```

2.  **Install the dependencies:**

    ```bash
    npm install
    ```

3.  **Set up your environment variables:**

    Create a `.env` file in the root of the project and add your Gemini API key:

    ```
    GEMINI_API_KEY=your_gemini_api_key
    ```

## 📖 Usage

1.  **Add your videos:**

    Place your video files (e.g., `.mp4`, `.mkv`) in the `input_shorts` directory.

2.  **Run the application:**

    ```bash
    node index.js create
    ```

3.  **Optional: Adjust the parallel processing limit:**

    By default, the application processes up to 7 videos in parallel. You can change this with the `--parallel-limit` flag:

    ```bash
    node index.js create --parallel-limit 3
    ```

## 📂 Project Structure

```
short-creator/
├── input_shorts/      # Your input videos
├── output_shorts/     # Your generated short videos
├── modules/
│   ├── geminiAnalyzer.js # Interacts with the Gemini AI API
│   └── videoCutter.js    # Cuts videos with ffmpeg
├── .env                 # Your environment variables
├── index.js             # The main application file
├── package.json         # Project dependencies and scripts
└── README.md            # This file
```

## 🤝 Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or create a pull request.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.