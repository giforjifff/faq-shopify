-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFAQ" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "faqId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProductFAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisplaySettings" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{"headingText":"Frequently Asked Questions","backgroundColor":"#f0f3ff","questionColor":"#1a1a2e","answerColor":"#3a3a5c","accentColor":"#5a6acf","borderColor":"#d0d5e8","fontSizeQuestion":"1.15rem","fontSizeAnswer":"1.05rem","borderRadius":"12px"}',
    "customCSS" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisplaySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FAQ_shop_idx" ON "FAQ"("shop");

-- CreateIndex
CREATE INDEX "ProductFAQ_shop_idx" ON "ProductFAQ"("shop");

-- CreateIndex
CREATE INDEX "ProductFAQ_shopifyProductId_idx" ON "ProductFAQ"("shopifyProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFAQ_shopifyProductId_faqId_key" ON "ProductFAQ"("shopifyProductId", "faqId");

-- CreateIndex
CREATE UNIQUE INDEX "DisplaySettings_shop_key" ON "DisplaySettings"("shop");

-- AddForeignKey
ALTER TABLE "ProductFAQ" ADD CONSTRAINT "ProductFAQ_faqId_fkey" FOREIGN KEY ("faqId") REFERENCES "FAQ"("id") ON DELETE CASCADE ON UPDATE CASCADE;
