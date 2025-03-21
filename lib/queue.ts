import Queue from 'bull';
import Redis from 'ioredis';

// Set up Redis connection options
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

// Create Redis client instances
const redisClient = new Redis(redisOptions);
const redisSubscriber = new Redis(redisOptions);

// Define queue names
const QUEUE_NAMES = {
  DOCUMENT_PROCESSING: 'document-processing',
};

// Create the queues
const documentProcessingQueue = new Queue(QUEUE_NAMES.DOCUMENT_PROCESSING, {
  createClient: (type) => {
    switch (type) {
      case 'client':
        return redisClient;
      case 'subscriber':
        return redisSubscriber;
      default:
        return new Redis(redisOptions);
    }
  },
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
const queues: Record<string, Queue.Queue> = {
  [QUEUE_NAMES.DOCUMENT_PROCESSING]: documentProcessingQueue,
};

// Queue service
export const queueService = {
  /**
   * Add a job to the specified queue
   * @param queueName Name of the queue
   * @param data Job data
   * @param options Job options
   * @returns The created job
   */
  async addToQueue(queueName: string, data: any, options?: Queue.JobOptions): Promise<Queue.Job> {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} does not exist`);
    }

    return await queue.add(data, options);
  },

  /**
   * Get a queue by name
   * @param queueName Name of the queue
   * @returns The queue instance
   */
  getQueue(queueName: string): Queue.Queue {
    const queue = queues[queueName];
    if (!queue) {
      throw new Error(`Queue ${queueName} does not exist`);
    }
    return queue;
  },

  /**
   * Set up a processor for the document processing queue
   * @param processor Function to process jobs
   */
  setupDocumentProcessor(processor: (job: Queue.Job) => Promise<any>): void {
    documentProcessingQueue.process(processor);
  },

  /**
   * Set up event handlers for a queue
   * @param queueName Name of the queue
   * @param handlers Object with event handler functions
   */
  setupQueueHandlers(
    queueName: string,
    handlers: {
      completed?: (job: Queue.Job, result: any) => void;
      failed?: (job: Queue.Job, error: Error) => void;
      progress?: (job: Queue.Job, progress: number) => void;
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

  /**
   * Close all queue connections
   */
  async closeAll(): Promise<void> {
    await Promise.all(Object.values(queues).map((queue) => queue.close()));
    await redisClient.quit();
    await redisSubscriber.quit();
  },
};

export default queueService;