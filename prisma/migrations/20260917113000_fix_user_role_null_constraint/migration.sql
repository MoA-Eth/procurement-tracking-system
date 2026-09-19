-- Fix NOT NULL constraint on legacy User.role column
ALTER TABLE "User" ALTER COLUMN "role" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'ProcurementOfficer'::"Role";

-- Auto-sync function from authRole to legacy role column
CREATE OR REPLACE FUNCTION sync_user_role_from_auth_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."role" IS NULL THEN
    CASE NEW."authRole"
      WHEN 'DIRECTOR' THEN NEW."role" := 'ProcurementDirector'::"Role";
      WHEN 'ADMIN' THEN NEW."role" := 'Administrator'::"Role";
      WHEN 'MANAGEMENT' THEN NEW."role" := 'ManagementTeam'::"Role";
      WHEN 'ENDORSING_COMMITTEE' THEN NEW."role" := 'ManagementTeam'::"Role";
      ELSE NEW."role" := 'ProcurementOfficer'::"Role";
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_user_role ON "User";
CREATE TRIGGER trg_sync_user_role
BEFORE INSERT OR UPDATE ON "User"
FOR EACH ROW
EXECUTE FUNCTION sync_user_role_from_auth_role();
