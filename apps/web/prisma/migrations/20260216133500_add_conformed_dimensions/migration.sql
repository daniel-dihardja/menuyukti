-- Conformed dimensions for warehouse layer.

CREATE TABLE IF NOT EXISTS warehouse.dim_date (
    date_key INT PRIMARY KEY,
    full_date DATE NOT NULL UNIQUE,
    day_of_month INT NOT NULL,
    month_of_year INT NOT NULL,
    year_number INT NOT NULL,
    weekday_iso INT NOT NULL,
    is_weekend BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS warehouse.dim_location (
    location_key BIGSERIAL PRIMARY KEY,
    operational_location_id INT NOT NULL UNIQUE,
    location_name TEXT NOT NULL,
    currency_code TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse.dim_pos_source (
    pos_source_key BIGSERIAL PRIMARY KEY,
    source_system TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse.dim_menu_item (
    menu_item_key BIGSERIAL PRIMARY KEY,
    location_key BIGINT NOT NULL REFERENCES warehouse.dim_location(location_key),
    menu_name TEXT NOT NULL,
    menu_name_norm TEXT NOT NULL,
    menu_category TEXT NULL,
    menu_category_detail TEXT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NULL,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (location_key, menu_name_norm, is_current)
);

CREATE INDEX IF NOT EXISTS ix_dim_menu_item_location_key
    ON warehouse.dim_menu_item (location_key);

CREATE INDEX IF NOT EXISTS ix_dim_menu_item_name_norm
    ON warehouse.dim_menu_item (menu_name_norm);
