CREATE TABLE
    `patientcheckups` (
        `id` varchar(255) NOT NULL COMMENT 'Primary Key',
        `scheduledTime` datetime DEFAULT NULL,
        `doctor_id` varchar(50) DEFAULT NULL,
        `create_time` datetime DEFAULT NULL COMMENT 'Create Time',
        `reason` varchar(255) DEFAULT NULL,
        `patient_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
        PRIMARY KEY (`id`),
        KEY `doctor_id` (`doctor_id`),
        KEY `patient_id` (`patient_id`),
        CONSTRAINT `patientcheckups_ibfk_1` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`),
        CONSTRAINT `patientcheckups_ibfk_2` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci