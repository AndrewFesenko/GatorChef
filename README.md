# GatorChef

**Recipes for the discerning student.**

GatorChef is a meal planning and grocery management platform built for college students transitioning to independent living. The app helps students turn pantry items or receipt data into quick, budget conscious meal options, while also generating a shopping list for anything they are missing.

Our goal is simple: help students spend less, waste less, and eat better.

---

## Table of Contents

- [Overview](#overview)
- [Challenge Statement](#challenge-statement)
- [Our Solution](#our-solution)
- [Project Vision](#project-vision)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Repository and Workflow](#repository-and-workflow)
- [Getting Started](#getting-started)
- [User Stories](#user-stories)
- [Product Backlog Overview](#product-backlog-overview)
- [Sprint 1 Plan](#sprint-1-plan)
- [Risk Management](#risk-management)
- [Team](#team)
- [Roadmap](#roadmap)
- [Why GatorChef Matters](#why-gatorchef-matters)

---

## Overview

New college students often struggle to feed themselves consistently. Many are dealing with independent living for the first time, tight grocery budgets, limited time, and little cooking experience. Most meal planning apps assume stable routines, flexible budgets, and a level of cooking confidence that many students simply do not have.

GatorChef is designed around those constraints.

By allowing students to scan receipts or input pantry items, GatorChef matches what they already have to realistic, low cost meals and creates a shopping list for missing ingredients. This removes friction from meal planning and helps students build sustainable eating habits during high stress academic transitions.

---

## Challenge Statement

College students face a real gap between having access to food and knowing how to consistently turn groceries into affordable meals.

### Common problems:
- No experience planning meals or budgeting groceries
- No time to think about food during demanding academic schedules
- No money to waste on unnecessary groceries
- No guidance from tools designed specifically for student life

### What happens as a result:
- Skipped meals
- Wasted groceries
- Poor nutrition
- Lower energy
- Worse academic performance at the times students need support most

---

## Our Solution

GatorChef provides a pipeline from pantry or receipt to meal recommendation.

### How it works:
1. **Scan a receipt** or manually input pantry items
2. **Extract ingredients** using OCR or user input
3. **Match ingredients** to budget friendly recipes
4. **Rank meals** based on pantry overlap
5. **Generate a shopping list** for missing ingredients

This allows students to make practical meal decisions based on what they already have, instead of starting from scratch.

---

## Project Vision

Using the Geoffrey Moore product vision template:

**For:** new college students transitioning to independent living

**Who:** struggle with meal planning, grocery budgeting, and maintaining consistent eating habits during high stress academic transitions

**The:** GatorChef

**Is a:** meal planning and grocery management tool

**That:** converts receipts or pantry lists into quick, low cost meal options with an automatic shopping list, helping students build sustainable eating habits that support their energy and academic performance

**Unlike:** generic meal planning apps that assume cooking experience, stable routines, and flexible budgets

**Our product:** is specifically designed around the constraints of student life, including minimal time, tight budgets, and limited pantry inventory, turning what a student already has into actionable meals with advice tailored to students in Gator Nation

---

## Key Features

- Receipt scanning with OCR
- Pantry item input and editing
- Meal recommendations based on current ingredients
- Ingredient overlap ranking using backend logic
- Automatic shopping list generation
- User authentication with Firebase Auth
- Real time pantry and recipe data storage with Firestore
- Support for dietary filtering
- Future analytics support for aggregated meal trends

---

## Tech Stack

### Frontend
- **React.js with TypeScript**
- **Tailwind CSS**

The frontend is built with React and TypeScript for scalable UI development and stronger type safety. Tailwind CSS allows for fast, consistent styling across the app.

### Backend
- **Python**
- **FastAPI**

The backend handles API logic, OCR processing requests, pantry to recipe matching, and data flow between services. FastAPI was chosen for its performance, simplicity, and built in API documentation at `/docs`.

### Database
- **Firebase Firestore**

Firestore stores pantry data, recipe related data, and user specific information in a cloud based NoSQL structure with real time update support.

### Authentication
- **Firebase Auth**

Firebase Auth provides secure user login with support for Google sign in and email based authentication.

### OCR / Receipt Scanning
- **Google Cloud Vision API**

Google Cloud Vision is used to extract text from grocery receipts with stronger accuracy than local OCR tools. The API is called through the backend so credentials remain secure.

### DevOps / Tooling
- **Docker**
- **GitHub**
- **Google Cloud Platform**
- **Jira / Confluence**

Docker is used to containerize the backend for easier deployment and environment consistency. GitHub is used for version control and collaboration. Jira and Confluence support project management and documentation.

### Hosting
- **TBD**

---

## System Architecture

GatorChef follows a clear separation between frontend, backend, and external services.

### High level flow

```text
User → Frontend → Backend
Backend → Google Cloud Vision API
Backend → Recipe Data Source
Backend → Firebase Firestore
Frontend ↔ Firebase Auth
Backend ↔ Firebase Auth