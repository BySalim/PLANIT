-- Runs once, when the Postgres data volume is first initialised.
-- Creates the dedicated database used by the backend integration tests
-- (see apps/backend/vitest.config.ts and ADR-0003).
CREATE DATABASE planit_test;
