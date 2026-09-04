CREATE DATABASE IF NOT EXISTS catequesis_adultos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_spanish_ci;

USE catequesis_adultos;

CREATE TABLE IF NOT EXISTS catechesis_groups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  parish_name VARCHAR(160) NOT NULL,
  course_year VARCHAR(9) NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_group_name_course (name, course_year)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS catechumens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  group_id BIGINT UNSIGNED NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(180) NOT NULL,
  birth_date DATE NULL,
  birth_place VARCHAR(180) NULL,
  address VARCHAR(300) NULL,
  city VARCHAR(120) NULL,
  province VARCHAR(120) NULL,
  postal_code VARCHAR(12) NULL,
  country VARCHAR(120) NULL,
  phone VARCHAR(30) NULL,
  email VARCHAR(254) NULL,
  baptized BOOLEAN NULL,
  confirmed BOOLEAN NULL,
  first_communion BOOLEAN NULL,
  parents_information TEXT NULL,
  paternal_grandparents_information TEXT NULL,
  maternal_grandparents_information TEXT NULL,
  baptism_sponsors VARCHAR(300) NULL,
  confirmation_sponsors VARCHAR(300) NULL,
  source_notes VARCHAR(500) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_catechumens_group_name (group_id, last_name, first_name),
  KEY ix_catechumens_email (email),
  CONSTRAINT fk_catechumens_group
    FOREIGN KEY (group_id) REFERENCES catechesis_groups (id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB;
