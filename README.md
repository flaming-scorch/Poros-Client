# Poros Mobile Client

A React Native and Expo application that helps students organize job searches, manage resumes, track applications, and prepare for target companies.

## Jojo Osei-Kofi's contributions

I estimate that I contributed approximately 55% of the overall project work, including work completed through a teammate's repository. This is my estimate of effort, not a percentage derived from GitHub commit counts.

- Built React Native and TypeScript authentication flows for account registration and sign-in.
- Implemented resume upload and listing workflows.
- Developed the job-tracker interface for organizing companies and application stages.
- Integrated frontend workflows with the PostgreSQL-backed data service.
- Supported cross-platform testing through Expo.
- Led structured usability sessions with 10 participants, synthesized findings, and documented workflow improvements.

## Implemented features

- Account creation and JWT-backed sign-in
- Resume upload, organization, and AI-assisted tailoring
- Job-application pipeline tracking
- Target-company lists and preparation checklists
- Company event and learning-resource research
- Persistent client state with Redux Toolkit

## Technology

React Native, Expo, TypeScript, React Navigation, Redux Toolkit, AsyncStorage, and a Node/Express/PostgreSQL backend.

AI and search provider credentials remain on the backend. The client calls authenticated Poros API routes and contains no Anthropic, Tavily, database, or Supabase secrets.

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the backend URL

Copy `.env.example` to `.env`.

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

Use `http://10.0.2.2:3000` for an Android emulator. For a physical device, use the development computer's LAN IP and run the phone and computer on the same network.

Follow the [backend setup instructions](https://github.com/flaming-scorch/Poros_data_service) before starting the client.

### 3. Run the app

```bash
npx tsc --noEmit
npm start
```

Scan the Expo QR code or launch an iOS/Android simulator.

## Architecture and documentation

- [Architecture diagram](Documentation/architecture_diagram.png)
- [Deployment guide](Documentation/DEPLOYMENT.md)
- [Developer guide](Documentation/INTERNAL_DEVELOPER_GUIDE.md)
- [Online help](Documentation/ONLINE_HELP_CONTENT.md)
- [Project overview and usability research](https://github.com/flaming-scorch/Poros-Project)

## Academic context

Poros was built by a five-person Calvin University CS 262 team. The project overview contains team attribution and Jojo Osei-Kofi's documented contributions.

## Team

Poros was created for Calvin University's CS 262 Software Engineering course by:

- [Jojo Osei-Kofi](https://github.com/Jojo-Osei-Kofi)
- [Kofi Baah Nyarko](https://github.com/KofiBaahNyarko)
- [Ose Aisuodionoe-Shadrach](https://github.com/Ose-97)
- [Ruhama Getahun](https://github.com/RuhamaGetahun)
- [Youssef Dalil](https://github.com/YoussefDalil24)

The repository preserves team attribution because Poros was collaborative work.

## Provenance

This portfolio copy imports the cleaned snapshot from [the original team repository](https://github.com/Jojo-Osei-Kofi/Poros-Client/tree/0e944732c705219458e5a317e29e877dd343e65b). Original development history remains there. Import commits here do not represent sole authorship. Portfolio cleanup and migration were assisted by Codex.

See [validation results and remaining limitations](VALIDATION.md) before running a demo.
