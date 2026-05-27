-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "printing_started_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "material" VARCHAR(50);
