import Queue from 'bull';
import { Redis } from '@upstash/redis';

// Create Upstash Redis client instances
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Since Upstash doesn't directly support Bull, we'll need to use a custom adapter approach
// Define queue names
const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: 'document-processing',
};

// Create a lightweight queue implementation using Upstash REST API
class UpstashQueue {
  queueName: string;
  options: any;

  constructor(queueName: string, options: any = {}) {
    this.queueName = queueName;
    this.options = options;
  }

  async add(data: any, options: any = {}): Promise<any> {
    const jobId = `${this.queueName}:job:${Date.now()}:${Math.random().toString(36).substring(2, 10)}`;
    
    const jobData = {
      id: jobId,
      data,
      options: { ...this.options.defaultJobOptions, ...options },
      status: 'waiting',
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: options.attempts || this.options.defaultJobOptions.attempts || 3,
    };
    
    // Store job data in Redis
    await redis.hset(jobId, jobData);
    
    // Add job ID to the queue
    await redis.lpush(`queue:${this.queueName}`, jobId);
    
    return jobData;
  }

  async process(processor: (job: any) => Promise<any>): Promise<void> {
    // This would typically run in a worker process
    // For simplicity, we'll just implement a basic polling mechanism
    
    // In production, you'd want to use a proper worker setup
    // This is a simplified example
    setInterval(async () => {
      // Get next job from queue
      const jobId = await redis.rpop(`queue:${this.queueName}`);
      
      if (jobId) {
        try {
          // Get job data
          const jobData = await redis.hgetall(jobId);
          
          if (!jobData) return;
          
          // Update job status
          await redis.hset(jobId, { status: 'processing' });
          
          // Process job
          const result = await processor(jobData);
          
          // Update job with result
          await redis.hset(jobId, {
            status: 'completed',
            completedAt: Date.now(),
            result: JSON.stringify(result)
          });
          
          // Emit completed event
          this.emit('completed', jobData, result);
          
        } catch (error) {
          console.error(`Error processing job ${jobId}:`, error);
          
          // Get job data
          const jobData = await redis.hgetall(jobId);
          
          if (!jobData) return;
          
          // Increment attempts
          const attempts = parseInt(String(jobData.attempts || '0')) + 1;
          
          if (attempts < parseInt(String(jobData.maxAttempts || '3'))) {
            // Retry job
            await redis.hset(jobId, {
              status: 'waiting',
              attempts,
              lastError: error.message
            });
            
            // Add back to queue
            await redis.lpush(`queue:${this.queueName}`, jobId);
          } else {
            // Mark as failed
            await redis.hset(jobId, {
              status: 'failed',
              failedAt: Date.now(),
              attempts,
              lastError: error.message
            });
            
            // Emit failed event
            this.emit('failed', jobData, error);
          }
        }
      }
    }, 1000); // Poll every second
  }

  // Simple event emitter implementation
  private eventHandlers: Record<string, Function[]> = {};

  on(event: string, handler: Function): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers[event] || [];
    handlers.forEach(handler => handler(...args));
  }

  async close(): Promise<void> {
    // Nothing to close with Upstash REST API
  }
}

// Create the queues
const documentProcessingQueue = new UpstashQueue(QUEUE_NAMES.DOCUMENT_PROCESSING, {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Map of all queues
const queues: Record<string, UpstashQueue> = {
  [QUEUE_NAMES.DOCUMENT_PROCESSING]: documentProcessingQueue,
};

// Queue service (keep the same interface for compatibility)
export const queueService = {
  async addToQueue(queueName: string, data: any, options?: any): Promise<any> {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    return await queue.add(data, options);
  },

  getQueue(queueName: string): any {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} does not exist`);
    }
    return queue;
  },

  setupDocumentProcessor(processor: (job: any) => Promise<any>): void {
    documentProcessingQueue.process(processor);
  },

  setupQueueHandlers(
    queueName: string,
    handlers: {
      completed?: (job: any, result: any) => void;
      failed?: (job: any, error: Error) => void;
      progress?: (job: any, progress: number) => void;
    }
  ): void {
    const queue = this.getQueue(queueName);

    if (handlers.completed) {
      queue.on('completed', handlers.completed);
    }

    if (handlers.failed) {
      queue.on('failed', handlers.failed);
    }

    if (handlers.progress) {
      queue.on('progress', handlers.progress);
    }
  },

  async closeAll(): Promise<void> {
    await Promise.all(Object.values(queues).map((queue) => queue.close()));
  },
};

export default queueService;