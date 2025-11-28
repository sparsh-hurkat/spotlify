
import { GoogleGenAI } from "@google/genai";
import { KnowledgeSnippet, ScoredVectorDoc } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Assuming these are available in the environment
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || '';
const PINECONE_INDEX_URL = process.env.PINECONE_INDEX_URL || ''; 

// Configuration for RAG
const EMBEDDING_MODEL = "text-embedding-004";
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

/**
 * Splits text into overlapping chunks to ensure context is preserved at boundaries.
 */
const chunkText = (text: string): string[] => {
  if (text.length <= CHUNK_SIZE) return [text];
  
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  
  return chunks;
};

/**
 * Generates an embedding vector for a given text using Google GenAI.
 */
export const getEmbedding = async (text: string): Promise<number[]> => {
  try {
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
    });
    
    // The response structure is: response.embeddings[0].values
    // Handle the actual response structure from Google GenAI SDK
    if (response.embeddings && Array.isArray(response.embeddings) && response.embeddings.length > 0) {
      const embedding = response.embeddings[0];
      if (embedding.values && Array.isArray(embedding.values)) {
        return embedding.values;
      }
      // Fallback: if embedding is directly an array
      if (Array.isArray(embedding)) {
        return embedding;
      }
    }
    
    // Debug: log the actual response structure if we can't parse it
    console.error("Unexpected embedding response structure:", JSON.stringify(response, null, 2));
    throw new Error("Failed to extract embedding from response - unexpected structure");
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
};

/**
 * Upserts a knowledge snippet into Pinecone.
 * 1. Chunks the content.
 * 2. Embeds each chunk.
 * 3. Pushes to Pinecone.
 * 4. Stores 'fullContent' in the metadata of the first chunk to allow reconstruction.
 */
export const upsertToVectorDB = async (item: KnowledgeSnippet): Promise<void> => {
  if (!PINECONE_API_KEY || !PINECONE_INDEX_URL) {
    console.warn("Pinecone credentials missing. Skipping Vector DB upload.");
    return;
  }

  const chunks = chunkText(item.content);
  const vectors = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await getEmbedding(chunk);
    
    // We store the FULL content in the first chunk's metadata.
    // This allows us to fetch the complete document later by querying for chunk_0.
    const metadata: any = {
        text: chunk,
        category: item.category,
        sourceId: item.id,
        title: item.title
    };

    if (i === 0) {
        metadata.fullContent = item.content;
    }

    vectors.push({
      id: `${item.id}_chunk_${i}`,
      values: embedding,
      metadata: metadata
    });
  }

  // Pinecone Upsert
  try {
    const response = await fetch(`${PINECONE_INDEX_URL}/vectors/upsert`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json',
        'X-Pinecone-API-Version': '2024-07'
      },
      body: JSON.stringify({ vectors })
    });

    if (!response.ok) {
      throw new Error(`Pinecone Upsert Failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Vector DB Upsert Error:", error);
    throw error;
  }
};

/**
 * Deletes a document from Pinecone by its sourceId.
 * Uses the delete-by-filter capability.
 */
export const deleteFromVectorDB = async (sourceId: string): Promise<void> => {
  if (!PINECONE_API_KEY || !PINECONE_INDEX_URL) return;

  try {
    const response = await fetch(`${PINECONE_INDEX_URL}/vectors/delete`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json',
        'X-Pinecone-API-Version': '2024-07'
      },
      // Delete all vectors where metadata.sourceId == sourceId
      body: JSON.stringify({
        filter: {
            sourceId: { "$eq": sourceId }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Pinecone Delete Failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error("Vector DB Delete Error:", error);
    throw error;
  }
};

/**
 * Fetches all KnowledgeSnippets from Pinecone.
 * Strategy:
 * 1. List all vector IDs.
 * 2. Filter for IDs ending in '_chunk_0' (headers).
 * 3. Fetch specific IDs to get metadata including 'fullContent'.
 */
export const fetchKnowledgeBase = async (): Promise<KnowledgeSnippet[]> => {
    if (!PINECONE_API_KEY || !PINECONE_INDEX_URL) return [];

    try {
        // 1. List IDs (Pagination limit 100 per call, simplistic implementation for now)
        const listResponse = await fetch(`${PINECONE_INDEX_URL}/vectors/list?limit=100`, {
            method: 'GET',
            headers: {
                'Api-Key': PINECONE_API_KEY,
                'X-Pinecone-API-Version': '2024-07'
            }
        });

        if (!listResponse.ok) return [];

        const listData = await listResponse.json();
        const allIds: string[] = listData.vectors ? listData.vectors.map((v: any) => v.id) : [];

        // 2. Find header chunks (chunk_0)
        const headerIds = allIds.filter(id => id.endsWith('_chunk_0'));

        if (headerIds.length === 0) return [];

        // 3. Fetch details for headers
        const fetchResponse = await fetch(`${PINECONE_INDEX_URL}/vectors/fetch?ids=${headerIds.join(',')}`, {
            method: 'GET',
            headers: {
                'Api-Key': PINECONE_API_KEY,
                'X-Pinecone-API-Version': '2024-07'
            }
        });

        if (!fetchResponse.ok) return [];

        const fetchData = await fetchResponse.json();
        const snippets: KnowledgeSnippet[] = [];

        Object.values(fetchData.vectors).forEach((vec: any) => {
             const m = vec.metadata;
             if (m) {
                 snippets.push({
                     id: m.sourceId,
                     title: m.title,
                     category: m.category,
                     // Prefer fullContent if we stored it, fallback to chunk text
                     content: m.fullContent || m.text 
                 });
             }
        });

        return snippets;
    } catch (error) {
        console.error("Fetch Knowledge Base Error:", error);
        return [];
    }
};

/**
 * Queries Pinecone for context relevant to the query string.
 */
export const queryVectorDB = async (query: string, topK: number = 5): Promise<string> => {
  if (!PINECONE_API_KEY || !PINECONE_INDEX_URL) {
    console.warn("Pinecone credentials missing. Returning empty context.");
    return "";
  }

  try {
    const queryEmbedding = await getEmbedding(query);

    const response = await fetch(`${PINECONE_INDEX_URL}/query`, {
      method: 'POST',
      headers: {
        'Api-Key': PINECONE_API_KEY,
        'Content-Type': 'application/json',
        'X-Pinecone-API-Version': '2024-07'
      },
      body: JSON.stringify({
        vector: queryEmbedding,
        topK: topK,
        includeMetadata: true
      })
    });

    if (!response.ok) {
        throw new Error(`Pinecone Query Failed: ${response.statusText}`);
    }

    const data = await response.json();
    const matches = data.matches as ScoredVectorDoc[];

    // Format the results into a context string
    return matches.map(match => 
      `[Source: ${match.metadata.title} (${match.metadata.category})]
       ${match.metadata.text}`
    ).join('\n\n');

  } catch (error) {
    console.error("Vector DB Query Error:", error);
    return "";
  }
};
