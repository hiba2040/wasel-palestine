# Wasel Palestine Backend

## Overview

Wasel Palestine is a backend system designed to manage checkpoints, incidents, route safety, and related alerts in real time.

The system provides RESTful APIs with authentication, role-based access control, external API integrations for route and weather data, caching, API documentation, performance testing, and Docker-based deployment.

---

## Tech Stack

- Node.js
- Express.js
- Sequelize ORM
- PostgreSQL
- JWT Authentication
- Docker & Docker Compose
- Redis / Cache Manager
- OpenRouteService API
- OpenWeatherMap API
- API-Dog for API documentation and testing
- k6 for performance testing

---

## System Architecture

The system follows a layered architecture:

Client → Routes → Middleware → Controllers → Services → Models/Database → Response

### Layers

- Routes: define API endpoints
- Middleware: authentication and authorization
- Controllers: request handling and business logic
- Services: external APIs, caching, and reusable logic
- Models: database structure and relationships
- Config: database and environment configuration

---

## Core Features

### Feature 1 — Authentication & Authorization

- User registration
- User login
- Refresh token
- Get current user
- JWT access token
- Role-based access control

### Feature 2 — Checkpoints Management

- Checkpoints CRUD
- Filtering and pagination
- Checkpoint current status
- Checkpoint status history
- Admin/moderator authorization checks

### Feature 3 — Incidents Management

- Incidents CRUD
- Filtering and pagination
- Incident verification
- Moderator/admin authorization checks

### Feature 4 — Reports, Voting & Moderation

- Reports management
- Voting
- Duplicate detection
- Moderation actions
- Moderation history

### Feature 5 — Alerts & Subscriptions

- Alerts management
- User subscriptions
- Alert-related API flows

### Feature 6 — Routes, Maps & Weather Integration

- Route estimation
- Route analysis
- Safe corridors
- Weather integration
- External API usage
- Caching

### Feature 7 — Testing & Performance

- Smoke testing
- API testing
- k6 load testing
- k6 stress testing
- k6 soak testing

### Feature 8 — Deployment & DevOps

- Dockerfile
- docker-compose
- .env.example
- Environment-based configuration

---

## URI Structure

All endpoints follow API versioning:

/api/v1/{module}/{resource}

Examples:

/api/v1/auth/login  
/api/v1/checkpoints  
/api/v1/incidents  
/api/v1/routes/estimate  

---

## External API Integrations

### OpenRouteService

- route estimation
- route analysis

### OpenWeatherMap

- weather snapshots
- weather-related route analysis

### Caching

Route and weather responses are cached to improve performance and reduce external API calls.

---

## API Documentation

All APIs are documented and tested using API-Dog.

The API documentation is organized using the same feature numbering used in the Wiki:

- Feature 1 — Authentication & Authorization
- Feature 2 — Checkpoints Management
- Feature 3 — Incidents Management
- Feature 4 — Reports, Voting & Moderation
- Feature 5 — Alerts & Subscriptions
- Feature 6 — Routes, Maps & Weather Integration

API documentation export is available inside:

postman/

---

## Project Wiki

Project Wiki is available inside:

docs/wiki.md

The Wiki includes:

- system overview
- problem statement
- solution
- implemented features
- architecture
- external APIs
- testing
- deployment
- database UML
- API documentation mapping

---

## Testing

### Smoke Testing

- authentication
- checkpoints CRUD
- checkpoint status and history
- routes
- external APIs
- caching

### API Testing

- endpoint validation

### Performance Testing with k6

- Load Test → normal traffic
- Stress Test → increasing load
- Soak Test → long-duration stability

Commands:

k6 run tests/k6/loadTest.js  
k6 run tests/k6/stressTest.js  
k6 run tests/k6/soakTest.js  

---

## Deployment

### Run with Docker

docker-compose up --build

### Run Locally

npm install  
npm start  

---

## Environment Variables

Create a .env file based on .env.example

DB_HOST=...  
DB_USER=...  
DB_PASSWORD=...  
DB_NAME=...  

JWT_SECRET=...  
JWT_REFRESH_SECRET=...  

OPENROUTESERVICE_API_KEY=...  
OPENWEATHER_API_KEY=...  

ROUTE_CACHE_TTL=...  
WEATHER_CACHE_TTL=...  

---

## Project Structure

project-root/
```txt
├── src/
│ ├── config/
│ ├── controllers/
│ ├── middleware/
│ ├── models/
│ ├── routes/
│ ├── services/
│
├── tests/
├── docs/
├── Dockerfile
├── docker-compose.yml
├── app.js
├── package.json
├──.env.example
```

## Git Workflow

integration-core  
- merged Hiba + Raghad work  
- checkpoints + incidents  

integration-modules  
- reports  
- alerts  
- routes  
- external APIs  
- docker  
- k6  

---

## Contributors

Hiba → Checkpoints  
Raghad → Incidents  
Dima → Reports, Voting, Alerts  
Radeena → Routes, External APIs, Docker, k6  

---
## 📘 Project Wiki

See full documentation here:
docs/wiki.md
## Notes

- Uses real external APIs (routing + weather)
- External failures do not crash the system
- API documentation via API-Dog
- Performance tested using k6

