import { useMemo, useState } from 'react'
import { PageHeader } from '../data/components/layout'
import { Reveal } from '../data/components/landing/Reveal'
import { CommandStaffClassificationTable, CommandStaffCasualtyTable, LogDetailPanel } from '../data/components/command-staff'
import { useCommandStaffData } from '../features/command-staff'
import { mockUsers } from '../data/mockUsers'
import type { DamageClassification, Detection } from '../types/detection'

type DamageFilter = DamageClassification | 'ALL'
type LogTab = 'classifications' | 'casualties'

interface ClassificationRecord {
  detectionId: string
  category: string
  damageClassification?: DamageClassification
  confidence: number
  priority: string
  verifiedAt: string
  verifiedByUserName: string
  detectedAt: string
}

interface CasualtyRecord {
  detectionId: string
  confidence: number
  priority: string
  verifiedAt: string
  verifiedByUserName: string
  detectedAt: string
}

export function CommandStaffLogsPage() {
  const { detections, incidents, mediaAssets } = useCommandStaffData()

  const [activeTab, setActiveTab] = useState<LogTab>('classifications')
  const [damageFilter, setDamageFilter] = useState<DamageFilter>('ALL')
  const [dateFilter, setDateFilter] = useState<string>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Get all verified detections
  const verifiedDetections = useMemo(
    () => detections.filter((d) => d.validationStatus === 'VERIFIED'),
    [detections],
  )

  // Create classification records
  const classificationRecords: ClassificationRecord[] = useMemo(
    () =>
      verifiedDetections
        .filter((d) => d.category === 'DAMAGE')
        .map((detection) => {
          const incident = incidents.find((i) => i.detectionId === detection.id)
          const verifier = mockUsers.find((u) => u.id === detection.reviewedByUserId)
          return {
            detectionId: detection.id,
            category: detection.category,
            damageClassification: detection.damageClassification,
            confidence: detection.confidence,
            priority: incident?.priority ?? 'UNKNOWN',
            verifiedAt: detection.reviewedAt ?? '',
            verifiedByUserName: verifier?.name ?? 'Unknown',
            detectedAt: detection.detectedAt,
          }
        }),
    [verifiedDetections, incidents],
  )

  // Create casualty records
  const casualtyRecords: CasualtyRecord[] = useMemo(
    () =>
      verifiedDetections
        .filter((d) => d.category === 'CASUALTY')
        .map((detection) => {
          const incident = incidents.find((i) => i.detectionId === detection.id)
          const verifier = mockUsers.find((u) => u.id === detection.reviewedByUserId)
          return {
            detectionId: detection.id,
            confidence: detection.confidence,
            priority: incident?.priority ?? 'UNKNOWN',
            verifiedAt: detection.reviewedAt ?? '',
            verifiedByUserName: verifier?.name ?? 'Unknown',
            detectedAt: detection.detectedAt,
          }
        }),
    [verifiedDetections, incidents],
  )

  // Apply filters to classifications
  const filteredClassifications = useMemo(() => {
    return classificationRecords.filter((record) => {
      if (damageFilter !== 'ALL' && record.damageClassification !== damageFilter) {
        return false
      }
      if (dateFilter) {
        const recordDate = new Date(record.detectedAt).toISOString().split('T')[0]
        if (recordDate !== dateFilter) {
          return false
        }
      }
      return true
    })
  }, [classificationRecords, damageFilter, dateFilter])

  // Apply filters to casualties
  const filteredCasualties = useMemo(() => {
    return casualtyRecords.filter((record) => {
      if (dateFilter) {
        const recordDate = new Date(record.detectedAt).toISOString().split('T')[0]
        if (recordDate !== dateFilter) {
          return false
        }
      }
      return true
    })
  }, [casualtyRecords, dateFilter])

  // Sort by verified date, newest first
  const sortedClassifications = useMemo(
    () => [...filteredClassifications].sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt)),
    [filteredClassifications],
  )

  const sortedCasualties = useMemo(
    () => [...filteredCasualties].sort((a, b) => b.verifiedAt.localeCompare(a.verifiedAt)),
    [filteredCasualties],
  )

  // Get selected detection and related data
  const selectedDetection: Detection | null = useMemo(
    () => detections.find((d) => d.id === selectedId) ?? null,
    [detections, selectedId],
  )

  const selectedIncident = useMemo(
    () => (selectedDetection ? incidents.find((i) => i.detectionId === selectedDetection.id) : null),
    [selectedDetection, incidents],
  )

  const selectedReviewerName = useMemo(
    () => (selectedDetection?.reviewedByUserId ? mockUsers.find((u) => u.id === selectedDetection.reviewedByUserId)?.name : undefined),
    [selectedDetection],
  )

  const selectedMediaAsset = useMemo(
    () => (selectedDetection ? mediaAssets.find((m) => m.id === selectedDetection.mediaAssetId) : null),
    [selectedDetection, mediaAssets],
  )

  const isSelectedLiveFeed = useMemo(
    () => selectedMediaAsset?.sourceType === 'LIVE_FEED',
    [selectedMediaAsset],
  )

  return (
    <>
      <PageHeader
        title="Logs"
        description="Displays past detections including classifications and casualties with filtering options."
      />

      <Reveal className="grid grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Left Column: Tabs, Filters, and Table */}
        <div className="flex flex-col gap-4">
          {/* Tabs */}
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => {
                setActiveTab('classifications')
                setSelectedId(null)
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'classifications'
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Classifications ({sortedClassifications.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('casualties')
                setSelectedId(null)
              }}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'casualties'
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
            >
              Casualties ({sortedCasualties.length})
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            {activeTab === 'classifications' && (
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">Damage Level</label>
                <select
                  value={damageFilter}
                  onChange={(e) => setDamageFilter(e.target.value as DamageFilter)}
                  className="rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="ALL">All Damage Levels</option>
                  <option value="STRUCTURAL">Structural</option>
                  <option value="UTILITY">Utility</option>
                  <option value="PROPERTY">Property</option>
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="rounded border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {(damageFilter !== 'ALL' || dateFilter) && (
              <button
                onClick={() => {
                  setDamageFilter('ALL')
                  setDateFilter('')
                }}
                className="rounded bg-accent/10 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/20"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Table */}
          {activeTab === 'classifications' && (
            <CommandStaffClassificationTable
              records={sortedClassifications}
              selectedId={selectedId ?? undefined}
              onSelect={setSelectedId}
            />
          )}
          {activeTab === 'casualties' && (
            <CommandStaffCasualtyTable
              records={sortedCasualties}
              selectedId={selectedId ?? undefined}
              onSelect={setSelectedId}
            />
          )}
        </div>

        {/* Right Column: Detail Panel */}
        <LogDetailPanel
          detection={selectedDetection}
          incident={selectedIncident}
          reviewerName={selectedReviewerName}
          mediaAssetId={selectedMediaAsset?.id}
          isLiveFeed={isSelectedLiveFeed}
        />
      </Reveal>
    </>
  )
}
