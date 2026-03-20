# GatorChef

**Recipes for the discerning student.**

GatorChef is a meal planning and grocery management platform built for college students transitioning to independent living. The app helps students turn pantry items or receipt data into quick, budget-conscious meal options, while generating a shopping list for anything they are missing.

Our goal is simple: help students spend less, waste less, and eat better.

## Table of Contents

- [Overview](#overview)
- [Challenge Statement](#challenge-statement)
- [Our Solution](#our-solution)
- [Project Vision](#project-vision)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Repository and Workflow](#repository-and-workflow)
- [Getting Started](#getting-started)
- [User Stories](#user-stories)
- [Product Backlog Overview](#product-backlog-overview)
- [Sprint 1 Plan](#sprint-1-plan)
- [Risk Management](#risk-management)
- [Roadmap](#roadmap)
- [Why GatorChef Matters](#why-gatorchef-matters)

## Overview

New college students often struggle to feed themselves consistently. Many are dealing with independent living for the first time, tight grocery budgets, limited time, and little cooking experience. Most meal planning apps assume stable routines, flexible budgets, and a level of cooking confidence that many students do not have.

GatorChef is designed around those constraints.

By allowing students to scan receipts or input pantry items, GatorChef matches what they already have to realistic, low-cost meals and creates a shopping list for missing ingredients. This removes friction from meal planning and helps students build sustainable eating habits during high-stress academic transitions.

## Challenge Statement

College students face a real gap between having access to food and knowing how to consistently turn groceries into affordable meals.

Common problems:

- no experience planning meals or budgeting groceries
- no time to think about food during demanding academic schedules
- no money to waste on unnecessary groceries
- no guidance from tools designed for student life

What happens as a result:

- skipped meals
- wasted groceries
- poor nutrition
- lower energy
- worse academic performance when students need support most

## Our Solution

GatorChef provides a pipeline from pantry or receipt to meal recommendation.

How it works:

1. **Scan a receipt** or manually input pantry items
2. **Extract ingredients** with OCR or user input
3. **Match ingredients** to budget-friendly recipes
4. **Rank meals** by pantry overlap
5. **Generate a shopping list** for missing ingredients

This helps students make practical meal decisions based on what they already have instead of starting from scratch.

## Project Vision

Using the Geoffrey Moore product vision template:

**For:** new college students transitioning to independent living

**Who:** struggle with meal planning, grocery budgeting, and maintaining consistent eating habits during high-stress academic transitions

**The:** GatorChef

**Is a:** meal planning and grocery management tool

**That:** converts receipts or pantry lists into quick, low-cost meal options with an automatic shopping list, helping students build sustainable eating habits that support their energy and academic performance

**Unlike:** generic meal planning apps that assume cooking experience, stable routines, and flexible budgets

**Our product:** is designed around student constraints including minimal time, tight budgets, and limited pantry inventory, turning what a student already has into actionable meals

## Key Features

- receipt scanning flow (OCR integration in progress)
- pantry item input and editing
- meal recommendations based on current ingredients
- ingredient overlap ranking using backend logic
- automatic shopping list generation
- user authentication with Firebase Auth
- real-time pantry and user profile data storage with Firestore
- support for dietary filtering
- planned analytics for aggregated meal trends

## Tech Stack

### Frontend

- **React.js with TypeScript**
- **Tailwind CSS**
- **Vite**

The frontend uses React + TypeScript for scalable UI development and type safety. Tailwind enables fast, consistent styling.

### Backend

- **Python**
- **FastAPI**

The backend handles API logic, pantry-to-recipe matching, and service integration. FastAPI was selected for speed, clear typing, and built-in API docs at `/docs`.

### Database

- **Firebase Firestore**

Firestore stores user-specific pantry and profile data in a cloud NoSQL structure.

### Authentication

- **Firebase Auth**

Firebase Auth provides secure login (currently email/password, with Google sign-in support planned).

### OCR / Receipt Scanning

- **Google Cloud Vision API** (planned/in progress)

OCR is handled through the backend so credentials stay server-side.

### DevOps / Tooling

- **Docker**
- **GitHub**
- **Google Cloud Platform**
- **Jira / Confluence**

## System Architecture

GatorChef follows a clean separation between frontend, backend, and external services.

High-level flow:

```text
User -> Frontend -> Backend
Backend -> Firestore
Frontend <-> Firebase Auth
Backend <-> Firebase Auth (token verification)
Backend -> OCR provider (planned)
```

## Project Structure

```text
GatorChef/
	client/
		public/
		src/
			components/
			lib/
			pages/
		.env.example
	server/
		app/
			clients/
			dependencies/
			routes/
			schemas/
			services/
		requirements.txt
		run.py
	docker/
```

## Repository and Workflow

- something

## Getting Started

### 1. Install dependencies

Frontend:

```bash
cd client
npm install
```

Backend:

```bash
cd server
python -m pip install -r requirements.txt
```

### 2. Configure frontend env

Create `client/.env.local` from `client/.env.example` and fill in Firebase web app values:

- `VITE_API_BASE_URL` (usually `http://127.0.0.1:8000`)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### 3. Configure backend Firebase credentials

Provide a Firebase service account key for backend verification and Firestore access.

Option A (easiest):

- place key at `secret/<your-key>.json` in repo root

Option B:

- set `GOOGLE_APPLICATION_CREDENTIALS` to the key path

Do not commit service account keys or `.env.local`.

### 4. Run the app

Backend:

```bash
cd server
python run.py
```

Frontend:

```bash
cd client
npm run dev
```

`python run.py` is a simple wrapper around uvicorn with reload enabled.

### 5. Run the frontend in Docker

This repo now includes an initial containerization scaffold for the frontend.

Start the Vite dev server in Docker:

```bash
docker compose up --build
```

That currently runs the `client` service only and publishes the app on `http://localhost:8080`.

Notes:

- the compose setup is dev-focused for now
- source code is bind-mounted into the container for live editing
- `client/.env.local` is still the right place for local frontend secrets and Firebase config
- the backend is not containerized yet, but `docker-compose.yml` is ready to grow into a multi-service setup

### 6. Build a production frontend image

The client Dockerfile also has a production target that serves the built app with nginx:

```bash
docker build -t gatorchef-client --target prod ./client
docker run --rm -p 8080:80 gatorchef-client
```

### 7. Quick checks

- backend health: `http://127.0.0.1:8000/health`
- frontend dev server: URL printed by Vite

## User Stories

- something

## Product Backlog Overview

- something

## Sprint 1 Plan

- something

## Risk Management

- something

## Roadmap

- something

## Why GatorChef Matters

GatorChef addresses a practical student-life problem that affects health, budget, and academic consistency. By turning what students already have into actionable meals, the app lowers day-to-day friction and helps build better food habits over time.
