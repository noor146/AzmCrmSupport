-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "odoo_partner_id" INTEGER,
ADD COLUMN     "odoo_synced_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "odoo_lead_id" INTEGER,
ADD COLUMN     "odoo_synced_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "odoo_synced_at" TIMESTAMP(3);
