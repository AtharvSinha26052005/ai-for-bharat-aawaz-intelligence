import { UserProfile, Language } from '../../types';
import { ragService } from '../rag/rag-service';
import { db } from '../../db/connection';
import logger from '../../utils/logger';
import { NotFoundError, ValidationError } from '../../utils/errors';

/**
 * Financial lesson topics
 */
export type LessonTopic =
  | 'budgeting'
  | 'loans'
  | 'savings'
  | 'insurance'
  | 'digital-payments'
  | 'government-schemes'
  | 'financial-planning';

/**
 * Lesson difficulty levels
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Financial lesson structure
 */
interface FinancialLesson {
  lessonId: string;
  topic: LessonTopic;
  title: Record<Language, string>;
  content: Record<Language, string>;
  duration: number; // in minutes
  difficulty: DifficultyLevel;
  examples: Record<Language, string[]>;
  keyTerms: Record<Language, Record<string, string>>;
  exercises: Exercise[];
  prerequisites?: string[];
}

/**
 * Exercise structure
 */
interface Exercise {
  exerciseId: string;
  question: Record<Language, string>;
  options?: Record<Language, string[]>;
  correctAnswer: string;
  explanation: Record<Language, string>;
  type: 'multiple-choice' | 'true-false' | 'scenario';
}

/**
 * Learning progress
 */
interface LearningProgress {
  userId: string;
  completedLessons: string[];
  scores: Record<string, number>;
  currentLevel: DifficultyLevel;
  suggestedNextTopics: LessonTopic[];
  totalTimeSpent: number; // in minutes
}

/**
 * Financial Educator Service
 * Provides financial literacy education
 */
export class FinancialEducatorService {
  /**
   * Gets all available lessons
   * @param language - Preferred language
   * @param difficulty - Optional difficulty filter
   * @returns Array of lessons
   */
  async getLessons(language: Language, difficulty?: DifficultyLevel): Promise<FinancialLesson[]> {
    try {
      let query = 'SELECT * FROM financial_lessons WHERE active = true';
      const params: any[] = [];

      if (difficulty) {
        query += ' AND difficulty = $1';
        params.push(difficulty);
      }

      query += ' ORDER BY topic, difficulty';

      const result = await db.query(query, params);

      const lessons = result.rows.map((row) => this.mapRowToLesson(row));

      logger.info('Financial lessons retrieved', { language, difficulty, count: lessons.length });

      return lessons;
    } catch (error) {
      logger.error('Failed to get lessons', { error });
      throw error;
    }
  }

  /**
   * Gets a specific lesson by ID
   * @param lessonId - Lesson ID
   * @param language - Preferred language
   * @returns Financial lesson
   */
  async getLessonById(lessonId: string, language: Language): Promise<FinancialLesson> {
    try {
      const query = 'SELECT * FROM financial_lessons WHERE lesson_id = $1 AND active = true';
      const result = await db.query(query, [lessonId]);

      if (result.rows.length === 0) {
        throw new NotFoundError('Lesson not found');
      }

      const lesson = this.mapRowToLesson(result.rows[0]);

      logger.info('Financial lesson retrieved', { lessonId, language });

      return lesson;
    } catch (error) {
      logger.error('Failed to get lesson', { lessonId, error });
      throw error;
    }
  }

  /**
   * Starts a lesson for a user
   * @param userId - User ID
   * @param lessonId - Lesson ID
   * @returns Lesson with personalized content
   */
  async startLesson(userId: string, lessonId: string): Promise<FinancialLesson> {
    try {
      // Get user profile
      const profile = await this.getUserProfile(userId);

      // Get lesson
      const lesson = await this.getLessonById(lessonId, profile.preferredLanguage);

      // Check prerequisites
      const progress = await this.getLearningProgress(userId);
      if (lesson.prerequisites) {
        const missingPrereqs = lesson.prerequisites.filter(
          (prereq) => !progress.completedLessons.includes(prereq)
        );
        if (missingPrereqs.length > 0) {
          throw new ValidationError(
            `Please complete prerequisite lessons first: ${missingPrereqs.join(', ')}`
          );
        }
      }

      // Record lesson start
      await this.recordLessonStart(userId, lessonId);

      // Personalize examples
      const personalizedLesson = await this.personalizeLesson(lesson, profile);

      logger.info('Lesson started', { userId, lessonId });

      return personalizedLesson;
    } catch (error) {
      logger.error('Failed to start lesson', { userId, lessonId, error });
      throw error;
    }
  }

  /**
   * Submits an exercise answer
   * @param userId - User ID
   * @param exerciseId - Exercise ID
   * @param answer - User's answer
   * @returns Result with feedback
   */
  async submitExercise(
    userId: string,
    exerciseId: string,
    answer: string
  ): Promise<{
    correct: boolean;
    explanation: string;
    score: number;
  }> {
    try {
      // Get user profile
      const profile = await this.getUserProfile(userId);

      // Get exercise
      const exercise = await this.getExercise(exerciseId);

      // Check answer
      const correct = answer.toLowerCase() === exercise.correctAnswer.toLowerCase();

      // Calculate score
      const score = correct ? 100 : 0;

      // Record submission
      await this.recordExerciseSubmission(userId, exerciseId, correct, score);

      // Update learning progress
      await this.updateLearningProgress(userId, exerciseId, score);

      logger.info('Exercise submitted', { userId, exerciseId, correct, score });

      return {
        correct,
        explanation: exercise.explanation[profile.preferredLanguage],
        score,
      };
    } catch (error) {
      logger.error('Failed to submit exercise', { userId, exerciseId, error });
      throw error;
    }
  }

  /**
   * Gets learning progress for a user
   * @param userId - User ID
   * @returns Learning progress
   */
  async getLearningProgress(userId: string): Promise<LearningProgress> {
    try {
      const query = `
        SELECT 
          user_id,
          completed_lessons,
          scores,
          current_level,
          total_time_spent
        FROM learning_progress
        WHERE user_id = $1
      `;

      const result = await db.query(query, [userId]);

      if (result.rows.length === 0) {
        // Create initial progress
        return await this.createInitialProgress(userId);
      }

      const row = result.rows[0];
      const progress: LearningProgress = {
        userId: row.user_id,
        completedLessons: row.completed_lessons || [],
        scores: row.scores || {},
        currentLevel: row.current_level || 'beginner',
        suggestedNextTopics: await this.suggestNextTopics(userId, row.completed_lessons),
        totalTimeSpent: row.total_time_spent || 0,
      };

      logger.info('Learning progress retrieved', { userId });

      return progress;
    } catch (error) {
      logger.error('Failed to get learning progress', { userId, error });
      throw error;
    }
  }

  /**
   * Gets financial term explanation
   * @param term - Financial term
   * @param language - Preferred language
   * @returns Explanation
   */
  async explainTerm(term: string, language: Language): Promise<string> {
    try {
      const query = `Explain the financial term "${term}" in simple language suitable for rural users`;
      const response = await ragService.retrieveAndGenerate(query, language);

      logger.info('Financial term explained', { term, language });

      return response.answer;
    } catch (error) {
      logger.error('Failed to explain term', { term, error });
      throw error;
    }
  }

  /**
   * Personalizes lesson content based on user profile
   * @param lesson - Financial lesson
   * @param profile - User profile
   * @returns Personalized lesson
   */
  private async personalizeLesson(
    lesson: FinancialLesson,
    profile: UserProfile
  ): Promise<FinancialLesson> {
    // Generate contextual examples
    const contextualExamples = await this.generateContextualExamples(lesson.topic, profile);

    return {
      ...lesson,
      examples: {
        ...lesson.examples,
        [profile.preferredLanguage]: contextualExamples,
      },
    };
  }

  /**
   * Generates contextual examples based on user profile
   * @param topic - Lesson topic
   * @param profile - User profile
   * @returns Array of examples
   */
  private async generateContextualExamples(
    topic: LessonTopic,
    profile: UserProfile
  ): Promise<string[]> {
    const query = `Provide 3 practical examples of ${topic} for a ${profile.occupation} earning ${profile.incomeRange} in ${profile.location.district}, ${profile.location.state}`;
    
    const response = await ragService.retrieveAndGenerate(
      query,
      profile.preferredLanguage,
      profile
    );

    // Parse examples from response
    return this.parseExamples(response.answer);
  }

  /**
   * Suggests next topics based on completed lessons
   * @param userId - User ID
   * @param completedLessons - Array of completed lesson IDs
   * @returns Suggested topics
   */
  private async suggestNextTopics(
    userId: string,
    completedLessons: string[]
  ): Promise<LessonTopic[]> {
    // Get user profile to understand needs
    const profile = await this.getUserProfile(userId);

    // Topic progression map
    const topicProgression: Record<LessonTopic, LessonTopic[]> = {
      budgeting: ['savings', 'loans'],
      savings: ['insurance', 'financial-planning'],
      loans: ['budgeting', 'financial-planning'],
      insurance: ['financial-planning'],
      'digital-payments': ['budgeting', 'savings'],
      'government-schemes': ['financial-planning'],
      'financial-planning': [],
    };

    // Get topics from completed lessons
    const completedTopics = new Set<LessonTopic>();
    for (const lessonId of completedLessons) {
      const lesson = await this.getLessonById(lessonId, profile.preferredLanguage);
      completedTopics.add(lesson.topic);
    }

    // Find next topics
    const suggestions = new Set<LessonTopic>();
    for (const topic of completedTopics) {
      const nextTopics = topicProgression[topic];
      for (const nextTopic of nextTopics) {
        if (!completedTopics.has(nextTopic)) {
          suggestions.add(nextTopic);
        }
      }
    }

    // If no suggestions, start with budgeting
    if (suggestions.size === 0) {
      suggestions.add('budgeting');
    }

    return Array.from(suggestions).slice(0, 3);
  }

  /**
   * Records lesson start
   * @param userId - User ID
   * @param lessonId - Lesson ID
   */
  private async recordLessonStart(userId: string, lessonId: string): Promise<void> {
    const query = `
      INSERT INTO lesson_sessions (user_id, lesson_id, started_at)
      VALUES ($1, $2, NOW())
    `;
    await db.query(query, [userId, lessonId]);
  }

  /**
   * Records exercise submission
   * @param userId - User ID
   * @param exerciseId - Exercise ID
   * @param correct - Whether answer was correct
   * @param score - Score achieved
   */
  private async recordExerciseSubmission(
    userId: string,
    exerciseId: string,
    correct: boolean,
    score: number
  ): Promise<void> {
    const query = `
      INSERT INTO exercise_submissions (user_id, exercise_id, correct, score, submitted_at)
      VALUES ($1, $2, $3, $4, NOW())
    `;
    await db.query(query, [userId, exerciseId, correct, score]);
  }

  /**
   * Updates learning progress
   * @param userId - User ID
   * @param exerciseId - Exercise ID
   * @param score - Score achieved
   */
  private async updateLearningProgress(
    userId: string,
    exerciseId: string,
    score: number
  ): Promise<void> {
    // Get exercise to find lesson
    const exercise = await this.getExercise(exerciseId);
    const lessonId = exercise.lessonId;

    // Check if all exercises in lesson are completed
    const allExercisesCompleted = await this.checkLessonCompletion(userId, lessonId);

    if (allExercisesCompleted) {
      // Mark lesson as completed
      const query = `
        UPDATE learning_progress
        SET 
          completed_lessons = array_append(completed_lessons, $2),
          scores = jsonb_set(scores, '{${lessonId}}', $3::text::jsonb),
          updated_at = NOW()
        WHERE user_id = $1
      `;
      await db.query(query, [userId, lessonId, score]);

      // Update difficulty level if needed
      await this.updateDifficultyLevel(userId);
    }
  }

  /**
   * Checks if all exercises in a lesson are completed
   * @param userId - User ID
   * @param lessonId - Lesson ID
   * @returns True if all completed
   */
  private async checkLessonCompletion(userId: string, lessonId: string): Promise<boolean> {
    const query = `
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN es.correct = true THEN 1 END) as completed
      FROM exercises e
      LEFT JOIN exercise_submissions es ON e.exercise_id = es.exercise_id AND es.user_id = $1
      WHERE e.lesson_id = $2
    `;
    const result = await db.query(query, [userId, lessonId]);
    const { total, completed } = result.rows[0];
    return parseInt(total) === parseInt(completed);
  }

  /**
   * Updates difficulty level based on performance
   * @param userId - User ID
   */
  private async updateDifficultyLevel(userId: string): Promise<void> {
    const progress = await this.getLearningProgress(userId);
    
    // Calculate average score
    const scores = Object.values(progress.scores);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    let newLevel: DifficultyLevel = progress.currentLevel;

    if (avgScore >= 80 && progress.completedLessons.length >= 5) {
      newLevel = 'advanced';
    } else if (avgScore >= 60 && progress.completedLessons.length >= 3) {
      newLevel = 'intermediate';
    } else {
      newLevel = 'beginner';
    }

    if (newLevel !== progress.currentLevel) {
      const query = `
        UPDATE learning_progress
        SET current_level = $2, updated_at = NOW()
        WHERE user_id = $1
      `;
      await db.query(query, [userId, newLevel]);
    }
  }

  /**
   * Creates initial progress for a user
   * @param userId - User ID
   * @returns Initial progress
   */
  private async createInitialProgress(userId: string): Promise<LearningProgress> {
    const query = `
      INSERT INTO learning_progress (user_id, completed_lessons, scores, current_level, total_time_spent)
      VALUES ($1, '{}', '{}', 'beginner', 0)
      RETURNING *
    `;
    const result = await db.query(query, [userId]);
    const row = result.rows[0];

    return {
      userId: row.user_id,
      completedLessons: [],
      scores: {},
      currentLevel: 'beginner',
      suggestedNextTopics: ['budgeting'],
      totalTimeSpent: 0,
    };
  }

  /**
   * Gets exercise by ID
   * @param exerciseId - Exercise ID
   * @returns Exercise
   */
  private async getExercise(exerciseId: string): Promise<Exercise & { lessonId: string }> {
    const query = 'SELECT * FROM exercises WHERE exercise_id = $1';
    const result = await db.query(query, [exerciseId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('Exercise not found');
    }

    const row = result.rows[0];
    return {
      exerciseId: row.exercise_id,
      lessonId: row.lesson_id,
      question: row.question,
      options: row.options,
      correctAnswer: row.correct_answer,
      explanation: row.explanation,
      type: row.type,
    };
  }

  /**
   * Parses examples from text
   * @param text - Text containing examples
   * @returns Array of examples
   */
  private parseExamples(text: string): string[] {
    const lines = text.split('\n');
    const examples: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed)) {
        examples.push(trimmed.replace(/^[-•\d.]\s*/, ''));
      }
    }

    return examples.length > 0 ? examples : [text];
  }

  /**
   * Maps database row to lesson
   * @param row - Database row
   * @returns Financial lesson
   */
  private mapRowToLesson(row: Record<string, any>): FinancialLesson {
    return {
      lessonId: row.lesson_id,
      topic: row.topic,
      title: row.title,
      content: row.content,
      duration: row.duration,
      difficulty: row.difficulty,
      examples: row.examples || {},
      keyTerms: row.key_terms || {},
      exercises: [],
      prerequisites: row.prerequisites,
    };
  }

  /**
   * Gets user profile from database
   * @param userId - User ID
   * @returns User profile
   */
  private async getUserProfile(userId: string): Promise<UserProfile> {
    const query = 'SELECT * FROM users WHERE user_id = $1';
    const result = await db.query(query, [userId]);

    if (result.rows.length === 0) {
      throw new NotFoundError('User profile not found');
    }

    const row = result.rows[0];
    return {
      userId: row.user_id,
      age: row.age,
      incomeRange: row.income_range,
      occupation: row.occupation,
      familyComposition: {
        adults: row.family_adults,
        children: row.family_children,
        seniors: row.family_seniors,
      },
      location: {
        state: row.location_state,
        district: row.location_district,
        block: row.location_block,
        village: row.location_village,
        pincode: row.location_pincode,
      },
      primaryNeeds: row.primary_needs,
      preferredLanguage: row.preferred_language,
      preferredMode: row.preferred_mode,
      consentGiven: row.consent_given,
      consentDate: row.consent_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActiveAt: row.last_active_at,
    };
  }
}

export const financialEducatorService = new FinancialEducatorService();
