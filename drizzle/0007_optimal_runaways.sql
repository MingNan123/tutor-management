CREATE TABLE business_payments (id TEXT PRIMARY KEY, data TEXT NOT NULL CHECK(json_valid(data)), revision INTEGER NOT NULL DEFAULT 1);
--> statement-breakpoint
UPDATE business_orders SET data=json_set(data,'$.attribution',json_object('salesId',json_extract(data,'$.salesId'),'salesName',coalesce((SELECT name FROM enterprise_accounts WHERE id=json_extract(business_orders.data,'$.salesId')),'原顾问'),'groupId','legacy','groupName','历史归属待核实'),'$.orderType','legacy','$.status','active');
--> statement-breakpoint
INSERT INTO business_payments(id,data) SELECT 'opening:'||id,json_object('id','opening:'||id,'orderId',id,'kind','opening','amount',json_extract(data,'$.paid'),'date',json_extract(data,'$.date'),'method','历史期初','reference','升级前累计实收','reason','历史累计金额，不计入期间排名；新签续费未追溯','actorId','system','actorName','系统迁移','salesId',json_extract(data,'$.salesId'),'salesName',json_extract(data,'$.attribution.salesName'),'groupId','legacy','groupName','历史归属待核实','orderType','legacy','created',strftime('%Y-%m-%dT%H:%M:%fZ','now')) FROM business_orders WHERE coalesce(json_extract(data,'$.paid'),0)>0;
--> statement-breakpoint
UPDATE business_trials SET data=json_set(data,'$.attribution',json_object('salesId',json_extract(data,'$.salesId'),'salesName',coalesce((SELECT name FROM enterprise_accounts WHERE id=json_extract(business_trials.data,'$.salesId')),'原顾问'),'groupId','legacy','groupName','历史归属待核实'));
--> statement-breakpoint
UPDATE business_followups SET data=json_set(data,'$.attribution',json_object('salesId',json_extract(data,'$.salesId'),'salesName',coalesce((SELECT name FROM enterprise_accounts WHERE id=json_extract(business_followups.data,'$.salesId')),'原顾问'),'groupId','legacy','groupName','历史归属待核实'));
--> statement-breakpoint
CREATE INDEX payments_order ON business_payments(json_extract(data,'$.orderId'));
--> statement-breakpoint
CREATE INDEX payments_date ON business_payments(json_extract(data,'$.date'));
