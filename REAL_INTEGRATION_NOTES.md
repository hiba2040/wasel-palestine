# Real Integration Notes

This project now uses real external integrations for route and weather data.

## What is real now

- Route estimate and route analyze use OpenRouteService via `src/services/openRouteService.js`.
- Weather snapshot and alerts use OpenWeatherMap via `src/services/openWeatherService.js`.
- Route safety analysis uses real checkpoint coordinates/status from PostgreSQL.

## Endpoints kept unchanged

- `/api/v1/routes/estimate`
- `/api/v1/routes/analyze`
- `/api/v1/routes/safe-corridors`
- `/api/v1/routes/history`
- `/api/v1/routes/cache-status`

## Environment variables required

```env
OPENROUTESERVICE_API_KEY=...
OPENROUTESERVICE_BASE_URL=https://api.openrouteservice.org/v2/directions/driving-car
OPENWEATHER_API_KEY=...
OPENWEATHER_BASE_URL=https://api.openweathermap.org/data/2.5
```

## Caching behavior

- Route response is cached with `ROUTE_CACHE_TTL`.
- Weather response is cached with `WEATHER_CACHE_TTL`.
- Cache status is available in `/api/v1/routes/cache-status`.

## Error handling behavior

- If OpenRouteService fails, route endpoints return:
  - `success: false`
  - `message: external service unavailable`
  - `service: openrouteservice`
- If OpenWeather fails, route estimate returns:
  - `success: false`
  - `message: external service unavailable`
  - `service: openweathermap`

The server does not crash on external API failure.
