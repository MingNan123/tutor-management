import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const workspaces = sqliteTable('workspaces', {id:text('id').primaryKey(), data:text('data').notNull(), version:integer('version').notNull().default(0)});
export const orderScreenshots = sqliteTable('order_screenshots', {id:text('id').primaryKey(), objectKey:text('object_key').notNull(), uploader:text('uploader').notNull(), name:text('name').notNull(), mime:text('mime').notNull(), orderId:text('order_id'), created:text('created').notNull()});
export const enterpriseAccounts = sqliteTable('enterprise_accounts', {id:text('id').primaryKey(),name:text('name').notNull(),email:text('email').unique(),role:text('role').notNull(),status:text('status').notNull().default('active'),positionId:text('position_id'),permissionOverrides:text('permission_overrides'),authUserId:text('auth_user_id').unique(),username:text('username').unique(),passwordHash:text('password_hash'),passwordSalt:text('password_salt'),groupId:text('group_id'),phone:text('phone').notNull().default(''),subjects:text('subjects').notNull().default(''),stages:text('stages').notNull().default(''),bio:text('bio').notNull().default(''),ownerSalesId:text('owner_sales_id'),adminLevel:integer('admin_level').notNull().default(1),employment:text('employment').notNull().default('parttime'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});
export const accountInitializations = sqliteTable('account_initializations',{id:text('id').primaryKey(),createdAt:text('created_at').notNull()});

export const salesGroups=sqliteTable('sales_groups',{id:text('id').primaryKey(),name:text('name').notNull(),leaderId:text('leader_id').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});
export const loginSessions=sqliteTable('login_sessions',{tokenHash:text('token_hash').primaryKey(),accountId:text('account_id').notNull(),expiresAt:integer('expires_at').notNull(),createdAt:text('created_at').notNull()});
export const authRateLimits=sqliteTable('auth_rate_limits',{id:text('id').primaryKey(),count:integer('count').notNull().default(0),expiresAt:integer('expires_at').notNull()});

export const businessStudents=sqliteTable('business_students',{id:text('id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(1)});

export const businessOrders=sqliteTable('business_orders',{id:text('id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(1)});

export const businessSchedules=sqliteTable('business_schedules',{id:text('id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(1)});

export const businessLessons=sqliteTable('business_lessons',{id:text('id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(1)});

export const businessTrials=sqliteTable('business_trials',{id:text('id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(1)});

export const businessFollowups=sqliteTable('business_followups',{id:text('id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(1)});

export const businessPositions=sqliteTable('business_positions',{id:text('id').primaryKey(),data:text('data').notNull(),revision:integer('revision').notNull().default(1)});

export const auditEvents=sqliteTable('audit_events',{id:text('id').primaryKey(),date:text('date').notNull(),actor:text('actor').notNull(),actorId:text('actor_id'),action:text('action').notNull(),targetId:text('target_id'),details:text('details')});
export const recoveryGuards=sqliteTable('recovery_guards',{token:text('token').primaryKey(),ok:integer('ok').notNull()});
