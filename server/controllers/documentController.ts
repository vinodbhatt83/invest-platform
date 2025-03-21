import { NextApiRequest, NextApiResponse } from 'next';
import { authOptions } from '../../pages/api/auth/[...nextauth]';
import { ApiError } from '../../utils/api';
import { documentService } from '../services/documentService';
import { validateSchema } from '../../lib/validation';
import { z } from 'zod';

import { getServerSessionSafe } from '../../lib/session';
// Document list schema
const listQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

type ListQuerySchema = z.infer<typeof listQuerySchema>;

const fieldSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  value: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  isValid: z.boolean().optional(),
});

// Define the update extracted data schema
const updateExtractedDataSchema = z.object({
  fields: z.array(fieldSchema).optional(),
  status: z.enum(['processing', 'completed', 'failed']).optional(),
  confidence: z.number().min(0).max(1).optional(),
  error: z.string().optional(),
});

// Define the type for the update data
type UpdateExtractedDataInput = z.infer<typeof updateExtractedDataSchema>;

// Mapping field schema
const mappingFieldSchema = z.object({
  targetFieldId: z.string(),
  extractedFieldId: z.string().nullable(),
});

// Create mapping schema
const createMappingSchema = z.object({
  targetSystemId: z.string(),
  fields: z.array(mappingFieldSchema),
  name: z.string().optional(),
  saveAsTemplate: z.boolean().optional(),
  templateName: z.string().optional(),
  templateDescription: z.string().optional(),
});

type CreateMappingSchema = z.infer<typeof createMappingSchema>;

// Document creation schema
const createDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  fileUrl: z.string().url(),
  fileType: z.string(),
  fileSize: z.number().int().positive(),
  originalFileName: z.string().optional(),
});

type CreateDocumentSchema = z.infer<typeof createDocumentSchema>;

interface ExtractedField {
  id?: string;
  name: string;       // Required
  value: string;      // Required
  confidence: number; // Required
  isValid?: boolean;  // Optional
}

export const documentController = {
  // List documents
  async listDocuments(req: NextApiRequest, res: NextApiResponse) {
    try {
      const session = await getServerSessionSafe(req, res);
      const userId = session?.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      // Validate query parameters
      const queryValidation = validateSchema<ListQuerySchema>(listQuerySchema, req.query);
      if (!queryValidation.success) {
        throw new ApiError(400, "queryValidation.error");
      }

      const {
        page = 1,
        limit = 10,
        sort = 'createdAt',
        order = 'desc',
        search,
        status,
      } = queryValidation.data;

      const result = await documentService.listDocuments({
        userId,
        page,
        limit,
        sort,
        order,
        search,
        status,
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error('List documents error:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get document by ID
  async getDocument(req: NextApiRequest, res: NextApiResponse) {
    try {
      const session = await getServerSessionSafe(req, res);
      const userId = session?.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        throw new ApiError(400, 'Invalid document ID');
      }

      const document = await documentService.getDocumentById(id, userId);
      return res.status(200).json({ document });
    } catch (error) {
      console.error('Get document error:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create document (for direct creation, not via upload)
  async createDocument(req: NextApiRequest, res: NextApiResponse) {
    try {
      const session = await getServerSessionSafe(req, res);
      const userId = session?.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }
      // Validate request body
      const bodyValidation = validateSchema<CreateDocumentSchema>(createDocumentSchema, req.body);
      if (!bodyValidation.success) {
        throw new ApiError(400, "bodyValidation.error");
      }

      const documentData = bodyValidation.data;
      const documentInput = {
        name: documentData.name || 'Untitled Document',
        fileUrl: documentData.fileUrl || '',
        fileType: documentData.fileType || 'unknown',
        fileSize: documentData.fileSize || 0,
        description: documentData.description,
        originalFileName: documentData.originalFileName,
        userId: userId
      };
      const document = await documentService.createDocument(documentInput);

      return res.status(201).json({ document });
    } catch (error) {
      console.error('Create document error:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update document
  async updateDocument(req: NextApiRequest, res: NextApiResponse) {
    try {
      const session = await getServerSessionSafe(req, res);
      const userId = session?.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        throw new ApiError(400, 'Invalid document ID');
      }

      // Document update schema
      const updateDocumentSchema = z.object({
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
        tags: z.array(z.string()).optional(),
      });

      // Validate request body
      const bodyValidation = validateSchema(updateDocumentSchema, req.body);
      if (!bodyValidation.success) {
        throw new ApiError(400, "bodyValidation.error");
      }

      const updateData = bodyValidation.data;
      const document = await documentService.updateDocument(id, updateData, userId);

      return res.status(200).json({ document });
    } catch (error) {
      console.error('Update document error:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete document
  async deleteDocument(req: NextApiRequest, res: NextApiResponse) {
    try {
      const session = await getServerSessionSafe(req, res);
      const userId = session?.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        throw new ApiError(400, 'Invalid document ID');
      }

      await documentService.deleteDocument(id, userId);
      return res.status(204).end();
    } catch (error) {
      console.error('Delete document error:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Process document
  async processDocument(req: NextApiRequest, res: NextApiResponse) {
    try {
      const session = await getServerSessionSafe(req, res);
      const userId = session?.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      // Process document schema
      const processDocumentSchema = z.object({
        documentId: z.string().uuid(),
        force: z.boolean().optional().default(false),
      });

      type ProcessDocumentSchema = z.infer<typeof processDocumentSchema>;

      // Validate request body
      const bodyValidation = validateSchema<ProcessDocumentSchema>(processDocumentSchema, req.body);
      if (!bodyValidation.success) {
        throw new ApiError(400, "bodyValidation.error");
      }

      const { documentId, force } = bodyValidation.data;
      await documentService.processDocument(documentId, userId, force);

      return res.status(200).json({
        success: true,
        message: 'Document queued for processing',
        documentId,
      });
    } catch (error) {
      console.error('Process document error:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get extracted data
  async getExtractedData(req: NextApiRequest, res: NextApiResponse) {
    try {
      const session = await getServerSessionSafe(req, res);
      const userId = session?.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        throw new ApiError(400, 'Invalid document ID');
      }

      const data = await documentService.getExtractedData(id, userId);
      return res.status(200).json({ extractedData: data });
    } catch (error) {
      console.error('Get extracted data error:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update extracted data
  async updateExtractedData(req: NextApiRequest, res: NextApiResponse) {
    try {
      const session = await getServerSessionSafe(req, res);
      const userId = session?.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        throw new ApiError(400, 'Invalid document ID');
      }
      // Validate request body
      const bodyValidation = validateSchema(updateExtractedDataSchema, req.body);
      if (!bodyValidation.success) {
        throw new ApiError(400, "bodyValidation.error");
      }

      const data = await documentService.updateExtractedData(id, bodyValidation.data, userId);

      return res.status(200).json({
        success: true,
        extractedData: data,
      });
    } catch (error) {
      console.error('Update extracted data error:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get mappings
  async getMappings(req: NextApiRequest, res: NextApiResponse) {
    try {
      const session = await getServerSessionSafe(req, res);
      const userId = session?.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { id, systemId } = req.query;
      if (!id || typeof id !== 'string') {
        throw new ApiError(400, 'Invalid document ID');
      }

      const targetSystemId = typeof systemId === 'string' ? systemId : undefined;
      const result = await documentService.getMappings(id, userId, targetSystemId);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Get mappings error:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Create mapping
  async createMapping(req: NextApiRequest, res: NextApiResponse) {
    try {
      const session = await getServerSessionSafe(req, res);
      const userId = session?.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        throw new ApiError(400, 'Invalid document ID');
      }

      // Validate request body
      const bodyValidation = validateSchema(createMappingSchema, req.body);
      if (!bodyValidation.success) {
        throw new ApiError(400, "bodyValidation.error");
      }

      const mappingData = bodyValidation.data as {
        targetSystemId: string;
        fields: { targetFieldId: string; extractedFieldId: string | null }[];
        name?: string;
        saveAsTemplate?: boolean;
        templateName?: string;
        templateDescription?: string;
      };

      const mapping = await documentService.createMapping(id, mappingData, userId);

      return res.status(201).json({
        success: true,
        mapping,
      });
    } catch (error) {
      console.error('Create mapping error:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update mapping
  async updateMapping(req: NextApiRequest, res: NextApiResponse) {
    try {
      const session = await getServerSessionSafe(req, res);
      const userId = session?.user?.id;
      if (!userId) {
        throw new ApiError(401, 'Unauthorized');
      }

      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        throw new ApiError(400, 'Invalid document ID');
      }

      // Mapping field schema
      const mappingFieldSchema = z.object({
        targetFieldId: z.string(),
        extractedFieldId: z.string().nullable(),
      });

      // Update mapping schema
      const updateMappingSchema = z.object({
        targetSystemId: z.string(),
        fields: z.array(mappingFieldSchema),
        name: z.string().optional(),
        saveAsTemplate: z.boolean().optional(),
        templateName: z.string().optional(),
        templateDescription: z.string().optional(),
      });

      // Validate request body
      const bodyValidation = validateSchema(updateMappingSchema, req.body);
      if (!bodyValidation.success) {
        throw new ApiError(400, "bodyValidation.error");
      }

      const mappingData = bodyValidation.data as {
        targetSystemId: string;
        fields: { targetFieldId: string; extractedFieldId: string | null }[];
        name?: string;
        saveAsTemplate?: boolean;
        templateName?: string;
        templateDescription?: string;
      };

      const mapping = await documentService.updateMapping(id, mappingData, userId);

      return res.status(200).json({
        success: true,
        mapping,
      });
    } catch (error) {
      console.error('Update mapping error:', error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
};