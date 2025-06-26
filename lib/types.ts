// This file defines TypeScript interfaces for the data structures used in the application.
// They are direct mappings of the API response:
// https://ceitba.org.ar/api/v1/scheduler/subjects?plan=S10-Rev23
// an example of the response in api/v1/S10-Rev23.json

export interface ScheduleEntry {
  day: string; // e.g., "MONDAY"
  classroom: string; // e.g., "501F"
  building: string; // e.g., "SDF"
  time_from: string; // e.g., "19:00:00"
  time_to: string; // e.g., "22:00:00"
}

export interface Commission {
  name: string; // e.g., "A"
  schedule: ScheduleEntry[];
}

export interface Subject {
  section: string; // e.g., "Electivas"
  subject_id: string; // e.g., "81.57"
  name: string; // e.g. "Introducción a la Programación"
  credits: number; // e.g., 3
  dependencies: string[]; // e.g., ["81.01", "81.02"]
  credits_required: number | null; // e.g., null or 144
  course_start: string; // e.g., "2025-07-21"
  course_end: string; // e.g., "2025-12-31"
  commissions: Commission[];
}

export interface ApiResponse {
  [category: string]: {
    // "Electivas", "Ciclo Básico", "Ciclo Profesional"
    [year: string]: {
      // e.g., "1", "2", "3", "4", "5", "0" (for electives)
      [semester: string]: Subject[]; // "1", "2", "0" (for electives)
    };
  };
}

export interface Comment {
  id: string; // Unique identifier for the comment
  subjectId: string; // ID of the subject the comment belongs to
  text: string; // The content of the comment
  timestamp: number; // Unix timestamp of when the comment was created
  likes: number; // Number of likes for the comment
  hidden?: boolean;
}
