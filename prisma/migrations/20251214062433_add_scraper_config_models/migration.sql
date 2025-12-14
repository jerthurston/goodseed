-- CreateTable
CREATE TABLE "ScraperConfig" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "cms" TEXT,
    "frontend" TEXT,
    "hasAjaxLoading" BOOLEAN NOT NULL DEFAULT false,
    "hasSPA" BOOLEAN NOT NULL DEFAULT false,
    "requiresJS" BOOLEAN NOT NULL DEFAULT false,
    "paginationType" TEXT NOT NULL,
    "paginationPattern" TEXT NOT NULL,
    "maxPages" INTEGER DEFAULT 10,
    "productsPerPage" INTEGER DEFAULT 20,
    "requestDelay" INTEGER NOT NULL DEFAULT 1000,
    "maxConcurrency" INTEGER NOT NULL DEFAULT 1,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "retryDelay" INTEGER NOT NULL DEFAULT 5000,
    "timeout" INTEGER NOT NULL DEFAULT 30000,
    "userAgent" TEXT,
    "customHeaders" JSONB,
    "requiresProxy" BOOLEAN NOT NULL DEFAULT false,
    "allowedRegions" JSONB,
    "dataSource" TEXT NOT NULL DEFAULT 'listing-page',
    "useJsonLd" BOOLEAN NOT NULL DEFAULT false,
    "useMicrodata" BOOLEAN NOT NULL DEFAULT false,
    "selectors" JSONB NOT NULL,
    "fallbackSelectors" JSONB,
    "productUrlPattern" TEXT,
    "requiredFields" JSONB NOT NULL,
    "validationRules" JSONB,
    "cannabisTypeRules" JSONB,
    "seedTypeRules" JSONB,
    "avgResponseTime" INTEGER,
    "successRate" DOUBLE PRECISION,
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScraperConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectorTest" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "testUrl" TEXT NOT NULL,
    "selectorType" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "elementsFound" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "sampleData" JSONB,
    "errorMessage" TEXT,
    "executionTime" INTEGER NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SelectorTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScraperConfig_sellerId_key" ON "ScraperConfig"("sellerId");

-- CreateIndex
CREATE INDEX "ScraperConfig_sellerId_idx" ON "ScraperConfig"("sellerId");

-- CreateIndex
CREATE INDEX "ScraperConfig_dataSource_idx" ON "ScraperConfig"("dataSource");

-- CreateIndex
CREATE INDEX "ScraperConfig_successRate_idx" ON "ScraperConfig"("successRate");

-- CreateIndex
CREATE INDEX "SelectorTest_configId_idx" ON "SelectorTest"("configId");

-- CreateIndex
CREATE INDEX "SelectorTest_selectorType_idx" ON "SelectorTest"("selectorType");

-- CreateIndex
CREATE INDEX "SelectorTest_success_idx" ON "SelectorTest"("success");

-- AddForeignKey
ALTER TABLE "ScraperConfig" ADD CONSTRAINT "ScraperConfig_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectorTest" ADD CONSTRAINT "SelectorTest_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ScraperConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
