-- CreateTable
CREATE TABLE "Analytic" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ordersCount" INTEGER NOT NULL,
    "revenueTotal" DOUBLE PRECISION NOT NULL,
    "maxOrderItems" INTEGER NOT NULL,
    "avgOrderItems" DOUBLE PRECISION NOT NULL,
    "minOrderItems" INTEGER NOT NULL,
    "minOrderRevenue" DOUBLE PRECISION NOT NULL,
    "maxOrderRevenue" DOUBLE PRECISION NOT NULL,
    "avgOrderRevenue" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Analytic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "analyticId" TEXT,
    "billNumber" TEXT NOT NULL,
    "salesNumber" TEXT NOT NULL,
    "datetime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuCode" TEXT,
    "menuName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "qty" INTEGER NOT NULL,
    "netTotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_analyticId_fkey" FOREIGN KEY ("analyticId") REFERENCES "Analytic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
