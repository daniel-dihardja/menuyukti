-- Layered analytics schemas for ETL architecture
-- Safe to rerun due to IF NOT EXISTS guards.

CREATE SCHEMA IF NOT EXISTS staging;
CREATE SCHEMA IF NOT EXISTS warehouse;
CREATE SCHEMA IF NOT EXISTS marts;
