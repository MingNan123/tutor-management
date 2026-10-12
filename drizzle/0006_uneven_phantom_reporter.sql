CREATE TABLE business_students (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), revision INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
INSERT INTO business_students(id,data) SELECT json_extract(value,'$.id'),value FROM workspaces,json_each(workspaces.data,'$.students') WHERE workspaces.id='enterprise';
--> statement-breakpoint
CREATE TABLE business_orders (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), revision INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
INSERT INTO business_orders(id,data) SELECT json_extract(value,'$.id'),value FROM workspaces,json_each(workspaces.data,'$.orders') WHERE workspaces.id='enterprise';
--> statement-breakpoint
CREATE TABLE business_schedules (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), revision INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
INSERT INTO business_schedules(id,data) SELECT json_extract(value,'$.id'),value FROM workspaces,json_each(workspaces.data,'$.schedules') WHERE workspaces.id='enterprise';
--> statement-breakpoint
CREATE TABLE business_lessons (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), revision INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
INSERT INTO business_lessons(id,data) SELECT json_extract(value,'$.id'),value FROM workspaces,json_each(workspaces.data,'$.lessons') WHERE workspaces.id='enterprise';
--> statement-breakpoint
CREATE TABLE business_trials (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), revision INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
INSERT INTO business_trials(id,data) SELECT json_extract(value,'$.id'),value FROM workspaces,json_each(workspaces.data,'$.trials') WHERE workspaces.id='enterprise';
--> statement-breakpoint
CREATE TABLE business_followups (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), revision INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
INSERT INTO business_followups(id,data) SELECT json_extract(value,'$.id'),value FROM workspaces,json_each(workspaces.data,'$.followups') WHERE workspaces.id='enterprise';
--> statement-breakpoint
CREATE TABLE business_positions (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), revision INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
INSERT INTO business_positions(id,data) SELECT json_extract(value,'$.id'),value FROM workspaces,json_each(workspaces.data,'$.positions') WHERE workspaces.id='enterprise';
--> statement-breakpoint
CREATE TABLE audit_events (id TEXT PRIMARY KEY, date TEXT NOT NULL, actor TEXT NOT NULL, actor_id TEXT, action TEXT NOT NULL, target_id TEXT, details TEXT);
--> statement-breakpoint
INSERT INTO audit_events(id,date,actor,action) SELECT json_extract(value,'$.id'),json_extract(value,'$.date'),json_extract(value,'$.actor'),json_extract(value,'$.action') FROM workspaces,json_each(workspaces.data,'$.logs') WHERE workspaces.id='enterprise';
--> statement-breakpoint
CREATE INDEX audit_events_date ON audit_events(date);
--> statement-breakpoint
ALTER TABLE order_screenshots ADD COLUMN order_id TEXT;
--> statement-breakpoint
CREATE INDEX screenshot_unlinked ON order_screenshots(order_id,created);
--> statement-breakpoint
UPDATE order_screenshots SET order_id=(SELECT id FROM business_orders WHERE json_extract(data,'$.screenshotId')=order_screenshots.id LIMIT 1);
--> statement-breakpoint
UPDATE workspaces SET data=json_remove(data,'$.students','$.orders','$.schedules','$.lessons','$.trials','$.followups','$.positions','$.logs');
--> statement-breakpoint
CREATE INDEX orders_sales ON business_orders(json_extract(data,'$.salesId'));
--> statement-breakpoint
CREATE INDEX trials_sales ON business_trials(json_extract(data,'$.salesId'));
--> statement-breakpoint
CREATE INDEX followups_sales ON business_followups(json_extract(data,'$.salesId'));
--> statement-breakpoint
CREATE INDEX orders_teacher ON business_orders(json_extract(data,'$.teacherId'));
--> statement-breakpoint
CREATE INDEX trials_teacher ON business_trials(json_extract(data,'$.teacherId'));
--> statement-breakpoint
CREATE INDEX schedules_teacher ON business_schedules(json_extract(data,'$.teacherId'));
--> statement-breakpoint
CREATE INDEX lessons_teacher ON business_lessons(json_extract(data,'$.teacherId'));
--> statement-breakpoint
CREATE INDEX schedules_order ON business_schedules(json_extract(data,'$.orderId'));
--> statement-breakpoint
CREATE INDEX lessons_order ON business_lessons(json_extract(data,'$.orderId'));
--> statement-breakpoint
UPDATE business_positions SET data=json_set(data,'$.policy.grants."orders.view"',json('false')) WHERE id IN ('pos_fulltime','pos_parttime') AND json_extract(data,'$.builtin')=1;

--> statement-breakpoint
CREATE TABLE recovery_guards(token TEXT PRIMARY KEY,ok INTEGER NOT NULL CHECK(ok=1));
