import { Language, RAGResponse, UserProfile } from '../../types';
import { vectorDB, QueryResult } from './vector-db';
import { embeddingService } from './embedding-service';
import OpenAI from 'openai';
import { config } from '../../config';
import logger from '../../utils/logger';
import { ExternalServiceError } from '../../utils/errors';

/**
 * RAG (Retrieval Augmented Generation) Service
 * Retrieves relevant documents and generates contextual responses
 */
export class RAGService {
  private llmClient: OpenAI | null = null;

  constructor() {
    if (config.openai.apiKey) {
      this.llmClient = new OpenAI({
        apiKey: config.openai.apiKey,
      });
    } else {
      logger.warn('OpenAI API key not configured, using mock responses');
    }
  }

  /**
   * Retrieves relevant documents and generates response
   * @param query - User query
   * @param language - Preferred language
   * @param userProfile - User profile for personalization
   * @param maxChunks - Maximum number of chunks to retrieve
   * @returns RAG response
   */
  async retrieveAndGenerate(
    query: string,
    language: Language,
    userProfile?: UserProfile,
    maxChunks: number = 5
  ): Promise<RAGResponse> {
    try {
      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Build metadata filter
      const filter: Record<string, any> = {
        language,
      };

      // Add user context to filter if available
      if (userProfile) {
        filter.state = userProfile.location.state;
      }

      // Query vector database
      const results = await vectorDB.query(queryEmbedding, maxChunks, filter);

      // Extract relevant content
      const context = results.map((r) => r.metadata.content).join('\n\n');

      // Generate response using LLM
      const answer = await this.generateResponse(query, context, language, userProfile);

      // Extract sources
      const sources = results.map((r) => ({
        documentId: r.id,
        content: r.metadata.content,
        metadata: {
          schemeId: r.metadata.schemeId,
          schemeName: r.metadata.schemeName,
          officialSource: r.metadata.officialSource,
          lastUpdated: r.metadata.lastUpdated ? new Date(r.metadata.lastUpdated) : undefined,
        },
      }));

      // Calculate confidence based on retrieval scores
      const confidence = results.length > 0 ? results[0].score : 0;

      logger.info('RAG response generated', {
        query: query.substring(0, 100),
        language,
        sourcesCount: sources.length,
        confidence,
      });

      return {
        answer,
        sources,
        confidence,
        language,
      };
    } catch (error) {
      logger.error('RAG retrieval and generation failed', { error });
      throw new ExternalServiceError('Failed to generate response');
    }
  }

  /**
   * Generates response using LLM with retrieved context
   * @param query - User query
   * @param context - Retrieved context
   * @param language - Preferred language
   * @param userProfile - User profile for personalization
   * @returns Generated response
   */
  private async generateResponse(
    query: string,
    context: string,
    language: Language,
    userProfile?: UserProfile
  ): Promise<string> {
    if (!this.llmClient) {
      // Return mock response for development
      return this.generateMockResponse(query, language);
    }

    try {
      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(language, userProfile);

      // Build user prompt with context
      const userPrompt = `Context:\n${context}\n\nQuestion: ${query}\n\nPlease provide a clear, simple answer based on the context above. Use simple language suitable for users with limited literacy.`;

      const response = await this.llmClient.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0].message.content || 'No response generated';
    } catch (error) {
      logger.error('LLM response generation failed', { error });
      return this.generateMockResponse(query, language);
    }
  }

  /**
   * Builds system prompt for LLM
   * @param language - Preferred language
   * @param userProfile - User profile
   * @returns System prompt
   */
  private buildSystemPrompt(language: Language, userProfile?: UserProfile): string {
    const languageNames: Record<Language, string> = {
      hi: 'Hindi',
      ta: 'Tamil',
      te: 'Telugu',
      bn: 'Bengali',
      mr: 'Marathi',
      en: 'English',
    };

    let prompt = `You are a helpful assistant for the Rural Digital Rights AI Companion system. You help rural and semi-urban Indian citizens understand government welfare schemes.

Respond in ${languageNames[language]}. Use simple, clear language suitable for users with limited literacy. Avoid technical jargon and bureaucratic language.`;

    if (userProfile) {
      prompt += `\n\nUser context:
- Age: ${userProfile.age}
- Occupation: ${userProfile.occupation}
- Location: ${userProfile.location.district}, ${userProfile.location.state}
- Income range: ${userProfile.incomeRange}

Personalize your response based on this context.`;
    }

    return prompt;
  }

  /**
   * Generates mock response for development
   * @param query - User query
   * @param language - Preferred language
   * @returns Mock response
   */
  private generateMockResponse(query: string, language: Language): string {
    const responses: Record<Language, string> = {
      hi: 'आपके प्रश्न के आधार पर, कई सरकारी योजनाएं उपलब्ध हैं। कृपया अधिक जानकारी के लिए अपना प्रोफाइल पूरा करें।',
      ta: 'உங்கள் கேள்வியின் அடிப்படையில், பல அரசு திட்டங்கள் கிடைக்கின்றன. மேலும் தகவலுக்கு உங்கள் சுயவிவரத்தை முடிக்கவும்.',
      te: 'మీ ప్రశ్న ఆధారంగా, అనేక ప్రభుత్వ పథకాలు అందుబాటులో ఉన్నాయి. మరింత సమాచారం కోసం మీ ప్రొఫైల్‌ను పూర్తి చేయండి.',
      bn: 'আপনার প্রশ্নের ভিত্তিতে, অনেক সরকারি প্রকল্প উপলব্ধ আছে। আরও তথ্যের জন্য আপনার প্রোফাইল সম্পূর্ণ করুন।',
      mr: 'तुमच्या प्रश्नाच्या आधारे, अनेक सरकारी योजना उपलब्ध आहेत. अधिक माहितीसाठी तुमचे प्रोफाइल पूर्ण करा.',
      en: 'Based on your question, several government schemes are available. Please complete your profile for more information.',
    };

    return responses[language] || responses.en;
  }

  /**
   * Indexes a document in the vector database
   * @param documentId - Document ID
   * @param content - Document content
   * @param metadata - Document metadata
   */
  async indexDocument(
    documentId: string,
    content: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      // Chunk the document
      const chunks = this.chunkDocument(content);

      // Generate embeddings for all chunks
      const embeddings = await embeddingService.generateBatchEmbeddings(chunks);

      // Create vector documents
      const vectors = chunks.map((chunk, index) => ({
        id: `${documentId}_chunk_${index}`,
        values: embeddings[index],
        metadata: {
          ...metadata,
          content: chunk,
          chunkIndex: index,
        },
      }));

      // Upsert to vector database
      await vectorDB.upsert(vectors);

      logger.info('Document indexed', {
        documentId,
        chunksCount: chunks.length,
      });
    } catch (error) {
      logger.error('Document indexing failed', { documentId, error });
      throw error;
    }
  }

  /**
   * Chunks document into smaller pieces
   * @param content - Document content
   * @param maxTokens - Maximum tokens per chunk
   * @returns Array of chunks
   */
  private chunkDocument(content: string, maxTokens: number = 1000): string[] {
    // Simple chunking by paragraphs and sentences
    // In production, use a proper tokenizer
    const paragraphs = content.split('\n\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      // Rough token estimation (4 chars ≈ 1 token)
      const estimatedTokens = (currentChunk + paragraph).length / 4;

      if (estimatedTokens > maxTokens && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((chunk) => chunk.length > 0);
  }
}

export const ragService = new RAGService();
