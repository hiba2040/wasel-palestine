# 📘 Wasel Palestine — Project Wiki



##  Overview

Wasel Palestine is a backend system designed to manage checkpoints and incidents in real time.

The system provides structured REST APIs with authentication, role-based access control, and reliable data handling.  
It integrates real external APIs for route and weather data, and includes caching and fault-tolerant behavior.

The system is containerized using Docker and is ready for deployment.



##  Core Features

### 1. Authentication
Handles user registration, login, and secure access using JWT tokens.

### 2. Checkpoints Management
Supports full CRUD operations on checkpoints, including status updates and history tracking.

### 3. Incidents Management
Handles incident reporting, updating, filtering, pagination, and verification.



## Additional Features

### 1. Role-Based Authorization
- Admin → full access  
- Moderator → manage incidents & checkpoint status  
- Citizen → read-only access  

### 2. Filtering & Pagination
Efficient data handling for large datasets.

### 3. API Versioning
All endpoints follow:
/api/v1/



##  External API Integration

The system integrates with real external services:

### Route Service
- OpenRouteService API  
- Used for route estimation and analysis  

### Weather Service
- OpenWeather API  
- Provides weather data for routes  

### Endpoints
- /api/v1/routes/estimate  
- /api/v1/routes/analyze  
- /api/v1/routes/safe-corridors  
- /api/v1/routes/history  
- /api/v1/routes/cache-status  

### Caching
- Route responses use `ROUTE_CACHE_TTL`  
- Weather responses use `WEATHER_CACHE_TTL`  

### Error Handling
- External API failures do not crash the server  
- Returns structured error responses  

---
##  Project Architecture

The backend follows a **layered architecture with clear separation of concerns**, ensuring scalability and maintainability.

### Architecture Layers

- **Routes Layer**
  - Defines API endpoints
  - Located in `/src/routes`

- **Middleware Layer**
  - Handles authentication and request processing
  - Located in `/src/middleware`

- **Controllers Layer**
  - Processes requests and implements business logic
  - Located in `/src/controllers`

- **Services Layer**
  - Handles external integrations and reusable logic
  - Includes:
    - OpenRouteService integration
    - OpenWeather integration
    - caching logic
  - Located in `/src/services`

- **Models Layer**
  - Defines database structure and relationships
  - Located in `/src/models`

- **Config Layer**
  - Database connection and environment setup
  - Located in `/src/config`
---
##  Design Approach

The system uses a modular design where each layer has a clear responsibility.

External APIs and caching logic are isolated in the services layer, improving maintainability and allowing easy replacement or extension.

##  System Flow
Client → Routes → Middleware → Controllers → Database → Response


---

## Tools Used

- Node.js  
- Express.js  
- Sequelize ORM  
- PostgreSQL / MySQL  
- JWT Authentication  
- Docker & Docker Compose  
- API-Dog  
- k6 Performance Testing  

---

##  Deployment & Setup

The project is containerized using Docker.

### Docker
- Dockerfile builds the application  
- docker-compose manages services  

### Run with Docker
docker-compose up --build

### Run manually
npm install
npm start


---

## 🔹 Testing

The project includes multiple testing strategies:

### Smoke Testing (End-to-End)

Covers:
- authentication  
- checkpoints CRUD  
- status & history  
- routes & external APIs  
- caching  

File:
- tests/localSmoke.js  

---

### API Testing

Validates API endpoints and responses.

File:
- tests/apiTests.js  

---

### Load Testing

Simulates normal user traffic.

File:
- tests/k6/loadTest.js  

---

### Stress Testing

Gradually increases load to find system limits.

File:
- tests/k6/stressTest.js  

Covers:
- authenticated endpoints  
- checkpoints  
- route estimation  

---

### Soak Testing

Tests system stability over time.

File:
- tests/k6/soakTest.js  

Detects:
- memory leaks  
- performance degradation  
- long-term stability issues  

---

### Test Execution
k6 run tests/k6/loadTest.js
k6 run tests/k6/stressTest.js
k6 run tests/k6/soakTest.js


Scripts:
- tests/run-tests.sh  
- tests/run-tests.ps1  

---

## File Structure
project-root/

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


---

##  Database Design

The database uses a relational model.

Main entities:
- Users  
- Checkpoints  
- Incidents  

Supports:
- status history  
- verification tracking  
- role management  

---

##  Project Database UML

The database schema is designed using a relational model with clear relationships between entities.

Main entities include:
- Users
- Checkpoints
- Incidents
- Reports
- Alerts

### UML Diagram

![Database UML](docs/uml.png)

A detailed UML diagram is provided to illustrate relationships and structure of the database.

## API Documentation

All API endpoints are documented and tested using API-Dog.

The documentation includes:
- endpoint descriptions
- request/response examples
- authentication handling
- error responses

API-Dog export is included in the repository.
API Documentation:
## 🔹 API Collections Mapping

The implemented features in this Wiki are linked with the API-Dog documentation using the same numbering structure.

| Feature No. | Feature Name | API-Dog Collection / Folder |
|---|---|---|
| Feature 1 | Authentication | Feature 1 — Authentication |
| Feature 2 | Checkpoints Management | Feature 2 — Checkpoints |
| Feature 3 | Incidents Management | Feature 3 — Incidents |
| Feature 4 | Routes & External APIs | Feature 4 — Routes & External APIs |
| Feature 5 | Reports & Voting | Feature 5 — Reports |
| Feature 6 | Alerts & Subscriptions | Feature 6 — Alerts |

##  Demo

A demo video is provided showing:

Demo Link:
