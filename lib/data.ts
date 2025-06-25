import type { ApiResponse, Subject } from "./types"

// Simple in-memory cache for fetched data to avoid re-fetching on every call during a short period.
// For a production app, consider a more robust caching strategy or ISR.
let allSubjectsData: ApiResponse | null = null
let lastFetchTimestamp = 0
const CACHE_DURATION = 3600 * 1000 // 1 hour in milliseconds

export async function fetchAllSubjects(): Promise<ApiResponse> {
  const now = Date.now()
  if (allSubjectsData && now - lastFetchTimestamp < CACHE_DURATION) {
    return allSubjectsData
  }

  const response = await fetch("https://ceitba.org.ar/api/v1/scheduler/subjects?plan=S10-Rev23")
  if (!response.ok) {
    console.error("Failed to fetch subjects:", response.status, await response.text())
    throw new Error("Failed to fetch subjects")
  }
  allSubjectsData = await response.json()
  lastFetchTimestamp = now
  return allSubjectsData!
}

export async function getElectivas(): Promise<Subject[]> {
  try {
    const data = await fetchAllSubjects()
    // The structure for Electivas is data.Electivas["0"]["0"]
    return data.Electivas?.["0"]?.["0"] || []
  } catch (error) {
    console.error("Error fetching electivas:", error)
    return []
  }
}

export async function getSubjectById(subjectId: string): Promise<Subject | undefined> {
  try {
    const allData = await fetchAllSubjects()
    for (const categoryKey in allData) {
      const category = allData[categoryKey]
      for (const yearKey in category) {
        const year = category[yearKey]
        for (const semesterKey in year) {
          const subjects = year[semesterKey]
          const foundSubject = subjects.find((s) => s.subject_id === subjectId)
          if (foundSubject) {
            return foundSubject
          }
        }
      }
    }
    return undefined
  } catch (error) {
    console.error(`Error fetching subject by ID ${subjectId}:`, error)
    return undefined
  }
}
