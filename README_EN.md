# PCKontrol - Remote PC Control System

PCKontrol is an open-source project that enables full remote management of Windows-based computers via mobile devices using modern software technologies. This system allows you to manage your computer, control media content, and perform file transfers without leaving your bed or sofa.

## About the Project

The system consists of two main parts:
1. A lightweight Go-based server (Backend) running on Windows with minimal resource consumption.
2. A modern mobile application built with React Native and Expo, compatible with both Android and iOS devices.

## Detailed Features

### Remote Control and Input Management
- **Mouse Simulation:** Use your phone screen as a touchpad to move the cursor smoothly, perform clicks, and scroll.
- **Keyboard Integration:** Send text to your computer using your phone's keyboard and execute special key combinations (Alt+Tab, Enter, Backspace, etc.).

### Multimedia and Application Management
- **Volume Control:** Adjust your computer's volume precisely or mute it entirely.
- **Media Player:** Use play, pause, next, and previous controls for Spotify and other media players.
- **Browser Shortcuts:** Perform actions like opening/closing tabs, refreshing pages, and incognito mode on Google Chrome with a single tap.
- **App-Specific Context:** Custom buttons for specific apps (currently Chrome, Spotify, and Antigravity) appear automatically when their windows are active. A dedicated control bar also appears while watching YouTube.

### Advanced Tools
- **File Transfer:** Send files (photos, documents, etc.) from your mobile device directly to your computer's desktop.
- **Screen Capture:** View your computer's screen in real-time from your phone.
- **System Statistics:** Live monitor CPU usage, RAM status, active application info, and NVIDIA GPU values (temperature and usage) if available.
- **Custom Commands:** Assign frequently used PowerShell or CMD commands to buttons in the app and execute them with one touch.

## Technical Architecture

### Backend (Go)
The backend server uses the `syscall` package to directly access Windows native APIs (user32.dll, dwmapi.dll, psapi.dll). This ensures low-latency window management and input simulation. Upon startup, the server automatically detects the local IP address and generates a QR code for easy pairing with the mobile app.

### Mobile App (React Native)
The mobile app is developed using React Native and Expo. Smooth and fluid animations are provided by React Native Reanimated. Features include:
- **Deck Screen:** Use your phone like a Stream Deck with customizable buttons. You can also lock your PC with a single tap from this screen.
- **Direct Commands:** Send PowerShell commands directly to your PC.
- **Screen Mirroring:** Get instant screenshots of your PC.
- **Remote Mouse/Keyboard:** Use your phone as a wireless input device.
- **Window Management:** Manage open windows on your PC (Currently in development).
- **Quick File Send:** Rapidly send files from phone to PC (Currently supports single image).
- **Modes Page:** Execute sequences of commands with one tap using study/work modes.
- **Live Stats:** Real-time CPU, RAM, and GPU dashboard.

## Installation and Usage

### Server Setup (Windows)
1. Ensure Go is installed on your computer.
2. Navigate to the `backend` directory.
3. Run `go mod tidy` to install dependencies.
4. Run `go run main.go` to start the server.
5. Keep the QR code visible for pairing.

### Mobile App Setup
1. Navigate to the `PCKontrol` directory.
2. Install dependencies using `npm install` or `yarn`.
3. Run `npx expo start` to launch the app.
4. Open the app via Expo Go and scan the QR code from the PC.

## Security Notice

This application has powerful features like Remote Code Execution and file system access. For your safety:
- Only use the app on trusted local networks (e.g., home Wi-Fi).
- Do not open the server port to the internet (Port Forwarding).
- Do not leave the server active on unknown or untrusted networks.

## Contact
You can reach me at **sametbilal34@gmail.com**. While the project is functional, some features are still under development. Thanks to everyone who contributes.
