# Beacon: ACA Conference Event Chatbot

Beacon is an interactive event chatbot app designed to enhance the attendee experience at the ACA conference. Beacon provides real-time information, answers to frequently asked questions, and helps guide users through conference events and schedules.

---

## File Structure -

```
/
├── client/
│   ├── app/
│   │   ├── globals.css
│   │   ├── favicon.ico
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   ├── lib/
│   ├── public/
│   │   ├── file.svg
│   │   ├── globe.svg
│   │   ├── next.svg
│   │   ├── vercel.svg
│   │   └── window.svg
│   ├── .gitignore
│   ├── Dockerfile
│   ├── eslint.config.mjs
│   ├── next.config.ts
│   ├── next-env.d.ts
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.mjs
│   ├── README.md
│   └── tsconfig.json
├── docker-compose.yml
└── README.md
```

---

## Features

- Real-time Q&A for conference attendees
- Event schedule lookup
- Venue and session information
- Friendly, interactive chat interface

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- (Optional) [Docker](https://www.docker.com/)

### Install Dependencies

```bash
cd client
npm install
```

### Start the Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000) by default.

---

## Running with Docker

You can run the Beacon client in a Docker container, which will watch for file changes and reload automatically.

### Prerequisites

- [Docker](https://www.docker.com/)

### Start with Docker Compose

From the project root, run:

```bash
docker compose up --build
```

The app will be available at [http://localhost:3000](http://localhost:3000).

- Any changes you make to files in the `client` directory will be reflected live in the running app.
- To stop the app, press `Ctrl+C` in the terminal.

---

## Contributing

Pull requests and issues are welcome! Please open an issue to discuss your ideas or report bugs.

---

## License

MIT
