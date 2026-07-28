CREATE TYPE "public"."member_role" AS ENUM('OWNER', 'MEMBER', 'CLIENT', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('PRIVATE', 'INTERNAL', 'CLIENT_VISIBLE');--> statement-breakpoint
CREATE TYPE "public"."workspace_type" AS ENUM('PERSONAL', 'CLIENT', 'BUSINESS');--> statement-breakpoint
CREATE TABLE "domain_users" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"preferred_timezone" text,
	"locale" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "domain_users_display_name_not_empty" CHECK (trim("display_name") <> ''),
	CONSTRAINT "domain_users_preferred_timezone_not_empty" CHECK ("preferred_timezone" IS NULL OR trim("preferred_timezone") <> '')
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" NOT NULL,
	"status" "member_status" NOT NULL,
	"invited_by" text,
	"invited_at" timestamp with time zone,
	"joined_at" timestamp with time zone,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_members_active_requires_joined_at" CHECK ("status" <> 'ACTIVE' OR "joined_at" IS NOT NULL),
	CONSTRAINT "workspace_members_active_no_removed_at" CHECK ("status" <> 'ACTIVE' OR "removed_at" IS NULL),
	CONSTRAINT "workspace_members_suspended_requires_joined_at" CHECK ("status" <> 'SUSPENDED' OR "joined_at" IS NOT NULL),
	CONSTRAINT "workspace_members_suspended_no_removed_at" CHECK ("status" <> 'SUSPENDED' OR "removed_at" IS NULL),
	CONSTRAINT "workspace_members_removed_requires_removed_at" CHECK ("status" <> 'REMOVED' OR "removed_at" IS NOT NULL),
	CONSTRAINT "workspace_members_invited_requires_invited_at" CHECK ("status" <> 'INVITED' OR "invited_at" IS NOT NULL),
	CONSTRAINT "workspace_members_invited_no_joined_at" CHECK ("status" <> 'INVITED' OR "joined_at" IS NULL),
	CONSTRAINT "workspace_members_invited_no_removed_at" CHECK ("status" <> 'INVITED' OR "removed_at" IS NULL)
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "workspace_type" NOT NULL,
	"default_visibility" "visibility" NOT NULL,
	"timezone" text NOT NULL,
	"cycle_length_days" integer DEFAULT 7 NOT NULL,
	"cycle_start_weekday" integer DEFAULT 1 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "workspaces_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "workspaces_name_not_empty" CHECK (trim("name") <> ''),
	CONSTRAINT "workspaces_timezone_not_empty" CHECK (trim("timezone") <> ''),
	CONSTRAINT "workspaces_cycle_length_days_positive" CHECK ("cycle_length_days" > 0),
	CONSTRAINT "workspaces_cycle_start_weekday_valid" CHECK ("cycle_start_weekday" >= 1 AND "cycle_start_weekday" <= 7)
);
--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_domain_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."domain_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_invited_by_domain_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."domain_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_domain_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."domain_users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_workspace_user_idx" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_active_user_idx" ON "workspace_members" USING btree ("user_id") WHERE "workspace_members"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "workspace_members_active_workspace_idx" ON "workspace_members" USING btree ("workspace_id") WHERE "workspace_members"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "workspace_members_active_owners_idx" ON "workspace_members" USING btree ("workspace_id") WHERE "workspace_members"."status" = 'ACTIVE' AND "workspace_members"."role" = 'OWNER';--> statement-breakpoint
CREATE OR REPLACE FUNCTION check_workspace_has_active_owner(p_workspace_id uuid) RETURNS void AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = p_workspace_id
    AND w.archived_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = p_workspace_id
      AND wm.status = 'ACTIVE'
      AND wm.role = 'OWNER'
    )
  ) THEN
    RAISE EXCEPTION 'Workspace % must have at least one active OWNER', p_workspace_id;
  END IF;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_workspace_owner_invariant_workspaces() RETURNS trigger AS $$
BEGIN
  PERFORM check_workspace_has_active_owner(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE OR REPLACE FUNCTION enforce_workspace_owner_invariant_members() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM check_workspace_has_active_owner(NEW.workspace_id);
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM check_workspace_has_active_owner(OLD.workspace_id);
    IF NEW.workspace_id <> OLD.workspace_id THEN
      PERFORM check_workspace_has_active_owner(NEW.workspace_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM check_workspace_has_active_owner(OLD.workspace_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER enforce_workspace_owner_invariant_workspaces_trigger
AFTER INSERT OR UPDATE OF archived_at ON workspaces
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_workspace_owner_invariant_workspaces();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER enforce_workspace_owner_invariant_members_trigger
AFTER INSERT OR UPDATE OR DELETE ON workspace_members
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION enforce_workspace_owner_invariant_members();