import type { ApiResponse, Subject } from './types';
import fallbackData from '@/api/v1/S10-Rev23.json';

// Simple in-memory cache for fetched data to avoid re-fetching on every call during a short period.
// For a production app, consider a more robust caching strategy or ISR.
let allSubjectsData: ApiResponse | null = null;
let lastFetchTimestamp = 0;
const CACHE_DURATION = 3600 * 1000; // 1 hour in milliseconds

// Fetches all subject data from the CEITBA scheduler API.
// Uses in-memory caching to avoid repeated requests within a 1-hour window.
// Throws an error if the API request fails.
export async function fetchAllSubjects(): Promise<ApiResponse> {
  const now = Date.now();
  if (allSubjectsData && now - lastFetchTimestamp < CACHE_DURATION) {
    return allSubjectsData;
  }

  try {
    const response = await fetch(
      'https://ceitba.org.ar/api/v1/scheduler/subjects?plan=S10-Rev23',
    );
    if (!response.ok) throw new Error('Network error');
    allSubjectsData = await response.json();
  } catch (error) {
    console.warn('Using fallback subjects due to fetch failure:', error);
    allSubjectsData = fallbackData;
  }

  lastFetchTimestamp = now;
  return allSubjectsData!;
}

// Returns the list of elective subjects from the API response.
// Specifically extracts data from the "Electivas" > "0" > "0" path.
// If the data is missing or the fetch fails, returns an empty array.
export async function getElectivas(): Promise<Subject[]> {
  try {
    const data = await fetchAllSubjects();
    // The structure for Electivas is data.Electivas["0"]["0"]
    return data.Electivas?.['0']?.['0'] || [];
  } catch (error) {
    console.error('Error fetching electivas:', error);
    return [];
  }
}

// Finds and returns a subject by its subject_id by scanning the entire data tree.
// Iterates over all categories, years, and cuatrimestres to locate the subject.
// Returns undefined if not found or if an error occurs.
export async function getSubjectById(
  subjectId: string,
): Promise<Subject | undefined> {
  try {
    const allData: ApiResponse = await fetchAllSubjects();
    for (const categoryKey in allData) {
      const category = allData[categoryKey];

      for (const yearKey in category) {
        const year = category[yearKey];

        for (const semesterKey in year) {
          const subjects: Subject[] = year[semesterKey]; // Subjects for the specific semester, year, and category
          const foundSubject = subjects.find(s => s.subject_id === subjectId);
          if (foundSubject) {
            return foundSubject;
          }
        }
      }
    }
    return undefined;
  } catch (error) {
    console.error(`Error fetching subject by ID ${subjectId}:`, error);
    return undefined;
  }
}
