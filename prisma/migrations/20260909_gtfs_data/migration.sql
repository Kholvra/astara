-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "GtfsCoverage" AS ENUM ('COMPLETE', 'LIMITED');

-- CreateEnum
CREATE TYPE "GtfsValidationState" AS ENUM ('ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GtfsIssueClassification" AS ENUM ('BLOCKER', 'WARNING');

-- CreateEnum
CREATE TYPE "GtfsPublicationOutcome" AS ENUM ('PUBLISHED', 'FALLBACK', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "GtfsTimingSemantics" AS ENUM ('EXACT', 'INTERVAL');

-- CreateTable
CREATE TABLE "GtfsSnapshot" (
    "snapshotId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "acquiredAt" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "httpEtag" TEXT,
    "httpLastModified" TEXT,
    "feedVersion" TEXT,
    "serviceDate" TEXT NOT NULL,
    "coverage" "GtfsCoverage" NOT NULL,
    "limitations" TEXT[],
    "rawStorageKey" TEXT NOT NULL,
    "validationState" "GtfsValidationState" NOT NULL,
    "validationCompletedAt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GtfsSnapshot_pkey" PRIMARY KEY ("snapshotId")
);

-- CreateTable
CREATE TABLE "GtfsAgency" (
    "snapshotId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "lineageFileName" TEXT NOT NULL,
    "lineageRowNumber" INTEGER NOT NULL,

    CONSTRAINT "GtfsAgency_pkey" PRIMARY KEY ("snapshotId","agencyId")
);

-- CreateTable
CREATE TABLE "GtfsRoute" (
    "snapshotId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "longName" TEXT NOT NULL,
    "routeType" INTEGER NOT NULL,
    "lineageFileName" TEXT NOT NULL,
    "lineageRowNumber" INTEGER NOT NULL,

    CONSTRAINT "GtfsRoute_pkey" PRIMARY KEY ("snapshotId","routeId")
);

-- CreateTable
CREATE TABLE "GtfsStop" (
    "snapshotId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "stopCode" TEXT,
    "locationType" INTEGER,
    "parentStationId" TEXT,
    "lineageFileName" TEXT NOT NULL,
    "lineageRowNumber" INTEGER NOT NULL,

    CONSTRAINT "GtfsStop_pkey" PRIMARY KEY ("snapshotId","stopId")
);

-- CreateTable
CREATE TABLE "GtfsTrip" (
    "snapshotId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "headsign" TEXT,
    "directionId" INTEGER,
    "shapeId" TEXT,
    "lineageFileName" TEXT NOT NULL,
    "lineageRowNumber" INTEGER NOT NULL,

    CONSTRAINT "GtfsTrip_pkey" PRIMARY KEY ("snapshotId","tripId")
);

-- CreateTable
CREATE TABLE "GtfsStopTime" (
    "snapshotId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "stopSequence" INTEGER NOT NULL,
    "stopId" TEXT NOT NULL,
    "arrivalTimeRaw" TEXT NOT NULL,
    "arrivalTimeSeconds" INTEGER NOT NULL,
    "departureTimeRaw" TEXT NOT NULL,
    "departureTimeSeconds" INTEGER NOT NULL,
    "timepoint" INTEGER,
    "lineageFileName" TEXT NOT NULL,
    "lineageRowNumber" INTEGER NOT NULL,

    CONSTRAINT "GtfsStopTime_pkey" PRIMARY KEY ("snapshotId","tripId","stopSequence")
);

-- CreateTable
CREATE TABLE "GtfsCalendar" (
    "snapshotId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "monday" BOOLEAN NOT NULL,
    "tuesday" BOOLEAN NOT NULL,
    "wednesday" BOOLEAN NOT NULL,
    "thursday" BOOLEAN NOT NULL,
    "friday" BOOLEAN NOT NULL,
    "saturday" BOOLEAN NOT NULL,
    "sunday" BOOLEAN NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "lineageFileName" TEXT NOT NULL,
    "lineageRowNumber" INTEGER NOT NULL,

    CONSTRAINT "GtfsCalendar_pkey" PRIMARY KEY ("snapshotId","serviceId")
);

-- CreateTable
CREATE TABLE "GtfsCalendarDate" (
    "snapshotId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "exceptionType" INTEGER NOT NULL,
    "lineageFileName" TEXT NOT NULL,
    "lineageRowNumber" INTEGER NOT NULL,

    CONSTRAINT "GtfsCalendarDate_pkey" PRIMARY KEY ("snapshotId","serviceId","date")
);

-- CreateTable
CREATE TABLE "GtfsFrequency" (
    "snapshotId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "startTimeRaw" TEXT NOT NULL,
    "startTimeSeconds" INTEGER NOT NULL,
    "endTimeRaw" TEXT NOT NULL,
    "endTimeSeconds" INTEGER NOT NULL,
    "headwaySeconds" INTEGER NOT NULL,
    "timingSemantics" "GtfsTimingSemantics" NOT NULL,
    "lineageFileName" TEXT NOT NULL,
    "lineageRowNumber" INTEGER NOT NULL,

    CONSTRAINT "GtfsFrequency_pkey" PRIMARY KEY ("snapshotId","lineageRowNumber")
);

-- CreateTable
CREATE TABLE "GtfsTransfer" (
    "snapshotId" TEXT NOT NULL,
    "lineageRowNumber" INTEGER NOT NULL,
    "fromStopId" TEXT NOT NULL,
    "toStopId" TEXT NOT NULL,
    "transferType" INTEGER NOT NULL,
    "minimumTransferTimeSeconds" INTEGER,
    "lineageFileName" TEXT NOT NULL,

    CONSTRAINT "GtfsTransfer_pkey" PRIMARY KEY ("snapshotId","lineageRowNumber")
);

-- CreateTable
CREATE TABLE "GtfsShapePoint" (
    "snapshotId" TEXT NOT NULL,
    "shapeId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "lineageFileName" TEXT NOT NULL,
    "lineageRowNumber" INTEGER NOT NULL,

    CONSTRAINT "GtfsShapePoint_pkey" PRIMARY KEY ("snapshotId","shapeId","sequence")
);

-- CreateTable
CREATE TABLE "GtfsFareAttribute" (
    "snapshotId" TEXT NOT NULL,
    "fareId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currencyType" TEXT NOT NULL,
    "paymentMethod" INTEGER NOT NULL,
    "transfers" INTEGER,
    "agencyId" TEXT,
    "transferDurationSeconds" INTEGER,
    "lineageFileName" TEXT NOT NULL,
    "lineageRowNumber" INTEGER NOT NULL,

    CONSTRAINT "GtfsFareAttribute_pkey" PRIMARY KEY ("snapshotId","fareId")
);

-- CreateTable
CREATE TABLE "GtfsFareRule" (
    "snapshotId" TEXT NOT NULL,
    "lineageRowNumber" INTEGER NOT NULL,
    "fareId" TEXT NOT NULL,
    "routeId" TEXT,
    "originId" TEXT,
    "destinationId" TEXT,
    "containsId" TEXT,
    "lineageFileName" TEXT NOT NULL,

    CONSTRAINT "GtfsFareRule_pkey" PRIMARY KEY ("snapshotId","lineageRowNumber")
);

-- CreateTable
CREATE TABLE "GtfsValidationIssue" (
    "snapshotId" TEXT NOT NULL,
    "issueIndex" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "classification" "GtfsIssueClassification" NOT NULL,
    "message" TEXT NOT NULL,
    "fileName" TEXT,
    "rowNumber" INTEGER,
    "fieldName" TEXT,

    CONSTRAINT "GtfsValidationIssue_pkey" PRIMARY KEY ("snapshotId","issueIndex")
);

-- CreateTable
CREATE TABLE "GtfsPublicationDecision" (
    "id" TEXT NOT NULL,
    "candidateSnapshotId" TEXT NOT NULL,
    "outcome" "GtfsPublicationOutcome" NOT NULL,
    "activeSnapshotId" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL,
    "operatorReason" TEXT,

    CONSTRAINT "GtfsPublicationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GtfsActiveSnapshot" (
    "slot" INTEGER NOT NULL DEFAULT 1,
    "snapshotId" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GtfsActiveSnapshot_pkey" PRIMARY KEY ("slot")
);

-- CreateTable
CREATE TABLE "GtfsAccessEvidenceAssociation" (
    "evidenceVersionId" TEXT NOT NULL,
    "transitSnapshotId" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GtfsAccessEvidenceAssociation_pkey" PRIMARY KEY ("evidenceVersionId")
);

-- CreateIndex
CREATE INDEX "GtfsSnapshot_contentHash_idx" ON "GtfsSnapshot"("contentHash");

-- CreateIndex
CREATE INDEX "GtfsSnapshot_validationState_idx" ON "GtfsSnapshot"("validationState");

-- CreateIndex
CREATE INDEX "GtfsRoute_snapshotId_agencyId_idx" ON "GtfsRoute"("snapshotId", "agencyId");

-- CreateIndex
CREATE INDEX "GtfsStop_snapshotId_parentStationId_idx" ON "GtfsStop"("snapshotId", "parentStationId");

-- CreateIndex
CREATE INDEX "GtfsTrip_snapshotId_routeId_idx" ON "GtfsTrip"("snapshotId", "routeId");

-- CreateIndex
CREATE INDEX "GtfsTrip_snapshotId_serviceId_idx" ON "GtfsTrip"("snapshotId", "serviceId");

-- CreateIndex
CREATE INDEX "GtfsStopTime_snapshotId_stopId_idx" ON "GtfsStopTime"("snapshotId", "stopId");

-- CreateIndex
CREATE INDEX "GtfsFrequency_snapshotId_tripId_idx" ON "GtfsFrequency"("snapshotId", "tripId");

-- CreateIndex
CREATE INDEX "GtfsTransfer_snapshotId_fromStopId_idx" ON "GtfsTransfer"("snapshotId", "fromStopId");

-- CreateIndex
CREATE INDEX "GtfsTransfer_snapshotId_toStopId_idx" ON "GtfsTransfer"("snapshotId", "toStopId");

-- CreateIndex
CREATE INDEX "GtfsShapePoint_snapshotId_shapeId_idx" ON "GtfsShapePoint"("snapshotId", "shapeId");

-- CreateIndex
CREATE INDEX "GtfsFareRule_snapshotId_fareId_idx" ON "GtfsFareRule"("snapshotId", "fareId");

-- CreateIndex
CREATE INDEX "GtfsFareRule_snapshotId_routeId_idx" ON "GtfsFareRule"("snapshotId", "routeId");

-- CreateIndex
CREATE INDEX "GtfsValidationIssue_snapshotId_code_idx" ON "GtfsValidationIssue"("snapshotId", "code");

-- CreateIndex
CREATE INDEX "GtfsPublicationDecision_candidateSnapshotId_decidedAt_idx" ON "GtfsPublicationDecision"("candidateSnapshotId", "decidedAt");

-- CreateIndex
CREATE INDEX "GtfsPublicationDecision_activeSnapshotId_idx" ON "GtfsPublicationDecision"("activeSnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "GtfsActiveSnapshot_snapshotId_key" ON "GtfsActiveSnapshot"("snapshotId");

-- CreateIndex
CREATE INDEX "GtfsAccessEvidenceAssociation_transitSnapshotId_recordedAt_idx" ON "GtfsAccessEvidenceAssociation"("transitSnapshotId", "recordedAt");

-- AddForeignKey
ALTER TABLE "GtfsAgency" ADD CONSTRAINT "GtfsAgency_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsRoute" ADD CONSTRAINT "GtfsRoute_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsStop" ADD CONSTRAINT "GtfsStop_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsTrip" ADD CONSTRAINT "GtfsTrip_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsStopTime" ADD CONSTRAINT "GtfsStopTime_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsCalendar" ADD CONSTRAINT "GtfsCalendar_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsCalendarDate" ADD CONSTRAINT "GtfsCalendarDate_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsFrequency" ADD CONSTRAINT "GtfsFrequency_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsTransfer" ADD CONSTRAINT "GtfsTransfer_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsShapePoint" ADD CONSTRAINT "GtfsShapePoint_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsFareAttribute" ADD CONSTRAINT "GtfsFareAttribute_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsFareRule" ADD CONSTRAINT "GtfsFareRule_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsValidationIssue" ADD CONSTRAINT "GtfsValidationIssue_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsPublicationDecision" ADD CONSTRAINT "GtfsPublicationDecision_candidateSnapshotId_fkey" FOREIGN KEY ("candidateSnapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsActiveSnapshot" ADD CONSTRAINT "GtfsActiveSnapshot_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GtfsAccessEvidenceAssociation" ADD CONSTRAINT "GtfsAccessEvidenceAssociation_transitSnapshotId_fkey" FOREIGN KEY ("transitSnapshotId") REFERENCES "GtfsSnapshot"("snapshotId") ON DELETE RESTRICT ON UPDATE CASCADE;
