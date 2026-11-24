-- ============================================================
-- BloodBond - Step 2A - SQL Login for the Backend
-- Run this ONCE in SSMS (Windows Authentication, localhost).
-- ============================================================
-- WHY: Backend (Node.js) needs its own SQL login to connect to the
-- BloodBond database. Windows Authentication is hard for Node.js,
-- so we make one simple login: bloodbond_app.
--
-- STEP 1: Niche 'TomarStrongPassword123' er jaygay TOMAR nijer
-- password bosao. Password strong hobe: boro okkhor + choto okkhor +
-- number, kom pokkhe 8 okkhor. Example: BloodBond2026!
-- STEP 2: Ei password ta TOMAR nijer khata/note e likhe rakho.
-- Kothao pathaba na - amakeo na, chat-eo na.
-- STEP 3: SSMS-e F5 chapo. Asbe: "Commands completed successfully."
-- ============================================================

USE master;
GO

-- Login banano (jodi age banano thake, abar banabe na)
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'bloodbond_app')
BEGIN
    CREATE LOGIN bloodbond_app WITH PASSWORD = N'TomarStrongPassword123';
END
GO

-- BloodBond database-e user banano + full access dewa (local project er jonno)
USE BloodBond;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'bloodbond_app')
BEGIN
    CREATE USER bloodbond_app FOR LOGIN bloodbond_app;
END
GO

ALTER ROLE db_owner ADD MEMBER bloodbond_app;
GO
