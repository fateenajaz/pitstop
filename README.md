# Pit Stop: Autonomous Vehicle Diagnostic System

Pit Stop is a precision diagnostic tool powered by state-of-the-art AI. It leverages autonomous investigation agents to identify vehicle faults through symptom descriptions and visual evidence, providing professional-grade diagnostic briefs with mechanical precision.

## ✳ Project Philosophy

Pit Stop is designed with the Anthropic/Claude product design language in mind—warm minimalism, trustworthiness, and intentionality. It aims to bridge the gap between complex vehicle diagnostics and user-friendly, expert-driven insights.

## 🚀 Features

- **Autonomous Investigations**: Multi-phase diagnostic process including intake, evidence gap analysis, and verification.
- **Real-time Reasoning**: Live streaming of the agent's internal reasoning process (Powered by Claude 4.7).
- **Annotated Visuals**: AI-driven fault localization on uploaded images with high-resolution pixel precision.
- **Diagnostic Briefs**: Professional summaries including primary faults, confidence scores, urgency levels, and recommended actions.
- **Budget Management**: Transparent token budget tracking for efficient AI resource utilization.
- **Garage Integration**: Seamless connection to certified local garages for immediate booking.

## 🛠 Tech Stack

- **Frontend**: React, Vite, Tailwind CSS v4, Framer Motion, Lucide React.
- **Backend**: Node.js, Express, Multer (for image handling).
- **AI Engine**: Anthropic SDK (Claude 4.7 model).
- **Styling**: Custom design system with warm cream tones and coral accents.

## 📦 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/fateenajaz/opus-4.7-hackathon.git
   cd opus-4.7-hackathon
   ```

2. **Install dependencies**:
   ```bash
   npm install
   cd frontend && npm install
   cd ../backend && npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory:
   ```env
   ANTHROPIC_API_KEY=your_api_key_here
   PORT=3001
   ```

4. **Run the application**:
   From the root directory:
   ```bash
   npm run dev
   ```

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
